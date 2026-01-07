import itertools
import logging
import os
import random
import shutil
import time
import uuid
from pathlib import Path

from fastapi import BackgroundTasks
from fastapi import FastAPI
from fastapi import File
from fastapi import HTTPException
from fastapi import Request
from fastapi import UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse

from babeldoc.assets.assets import warmup
from babeldoc.format.pdf.high_level import async_translate
from babeldoc.format.pdf.translation_config import TranslationConfig
from babeldoc.format.pdf.translation_config import WatermarkOutputMode
from babeldoc.translator.translator import OpenAITranslator
from babeldoc.translator.translator import set_translate_rate_limiter

from result_files import find_glossary_result
from result_files import find_pdf_result

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabelDOC-Backend")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def warmup_assets():
    try:
        warmup()
        logger.info("BabelDOC assets warmup completed.")
    except Exception:
        logger.exception("BabelDOC assets warmup failed.")

NVIDIA_KEYS = [k.strip() for k in os.getenv("NVIDIA_KEYS", "").split(",") if k.strip()]
NVIDIA_MODELS = [
    m.strip() for m in os.getenv("NVIDIA_MODELS", "").split(",") if m.strip()
]
DEFAULT_MODEL = os.getenv("NVIDIA_DEFAULT_MODEL", "z-ai/glm4.7")
MODEL_QPS = float(os.getenv("NVIDIA_QPS", "0.6"))
TERM_EXTRACTION_MODEL = os.getenv("TERM_EXTRACTION_MODEL", "").strip()
TERM_EXTRACTION_BASE_URL = os.getenv("TERM_EXTRACTION_BASE_URL", "").strip()
TERM_EXTRACTION_KEYS = [
    k.strip() for k in os.getenv("TERM_EXTRACTION_KEYS", "").split(",") if k.strip()
]
TERM_EXTRACTION_PROVIDER_ORDER = [
    item.strip()
    for item in os.getenv("TERM_EXTRACTION_PROVIDER_ORDER", "term,nim").split(",")
    if item.strip()
]
RESULT_TTL_SECONDS = int(os.getenv("RESULT_TTL_SECONDS", "86400"))
OCR_WORKAROUND = os.getenv("OCR_WORKAROUND", "true").lower() in {"1", "true", "yes"}
AUTO_ENABLE_OCR = os.getenv("AUTO_ENABLE_OCR", "true").lower() in {"1", "true", "yes"}
PROXY_SECRET = os.getenv("PROXY_SECRET", "")
MODEL_COOLDOWN_SECONDS = 300
key_cycle = itertools.cycle(NVIDIA_KEYS)
term_key_cycle = itertools.cycle(TERM_EXTRACTION_KEYS) if TERM_EXTRACTION_KEYS else None

BASE_DIR = Path(os.getenv("BABELDOC_TMP", "/tmp/babeldoc"))
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"
for directory in (UPLOAD_DIR, RESULT_DIR):
    directory.mkdir(parents=True, exist_ok=True)

tasks_db = {}
model_cooldowns = {}


class RetryableModelError(Exception):
    pass


class TranslationError(Exception):
    pass


def configure_rate_limiters(qps: float) -> None:
    if qps and qps > 0:
        set_translate_rate_limiter(qps)


def get_term_extraction_config(
    default_base_url: str, default_api_key: str
) -> tuple[str, str]:
    base_url = TERM_EXTRACTION_BASE_URL or default_base_url
    if TERM_EXTRACTION_KEYS:
        api_key = next(itertools.cycle(TERM_EXTRACTION_KEYS))
    else:
        api_key = default_api_key
    return base_url, api_key


def get_term_extraction_provider_configs(
    default_base_url: str, default_api_key: str
) -> list[tuple[str, str]]:
    configs: list[tuple[str, str]] = []
    for provider in TERM_EXTRACTION_PROVIDER_ORDER:
        if provider == "term":
            if TERM_EXTRACTION_BASE_URL or TERM_EXTRACTION_KEYS:
                base_url = TERM_EXTRACTION_BASE_URL or default_base_url
                keys = TERM_EXTRACTION_KEYS or [default_api_key]
                configs.extend((base_url, key) for key in keys)
        elif provider == "nim":
            configs.append((default_base_url, default_api_key))
    if not configs:
        configs.append((default_base_url, default_api_key))
    return configs


def is_retryable_error(error: object) -> bool:
    message = str(error).lower()
    retryable_markers = (
        "internal server error",
        "error code: 500",
        "status code: 500",
        "status: 500",
        "enginecore encountered an issue",
        "inference connection error",
    )
    return any(marker in message for marker in retryable_markers)


def get_model_pool() -> list[str]:
    return NVIDIA_MODELS if NVIDIA_MODELS else [DEFAULT_MODEL]


def select_model(avoid: set[str] | None = None, now: float | None = None) -> str | None:
    timestamp = time.time() if now is None else now
    avoid_models = avoid or set()
    available = [
        model
        for model in get_model_pool()
        if model not in avoid_models
        and model_cooldowns.get(model, 0) <= timestamp
    ]
    if not available:
        return None
    return random.choice(available)


def mark_model_cooldown(model: str, now: float | None = None) -> None:
    timestamp = time.time() if now is None else now
    model_cooldowns[model] = timestamp + MODEL_COOLDOWN_SECONDS


def cleanup_task_results(task_id: str) -> None:
    for result_file in RESULT_DIR.glob(f"*{task_id}*"):
        try:
            result_file.unlink(missing_ok=True)
        except OSError:
            logger.warning("Failed to delete result file: %s", result_file)


def cleanup_expired_tasks(now: float | None = None) -> int:
    if RESULT_TTL_SECONDS <= 0:
        return 0

    timestamp = time.time() if now is None else now
    expired = []

    for task_id, task in list(tasks_db.items()):
        completed_at = task.get("completed_at")
        if task.get("status") != "completed" or completed_at is None:
            continue
        if timestamp - completed_at < RESULT_TTL_SECONDS:
            continue

        for path_key in ("result_path", "input_path"):
            raw_path = task.get(path_key)
            if not raw_path:
                continue
            try:
                Path(raw_path).unlink(missing_ok=True)
            except OSError:
                logger.warning("Failed to delete %s file: %s", path_key, raw_path)

        expired.append(task_id)

    for task_id in expired:
        tasks_db.pop(task_id, None)

    return len(expired)


class SafeTermExtractionTranslator(OpenAITranslator):
    def llm_translate(self, text, ignore_cache=False, rate_limit_params: dict = None):
        try:
            result = super().llm_translate(
                text, ignore_cache=ignore_cache, rate_limit_params=rate_limit_params
            )
        except Exception as exc:
            logger.warning("Term extraction LLM failed: %s", exc)
            return "[]"
        return result if result is not None else "[]"


class FallbackTermExtractionTranslator:
    def __init__(self, translators: list[OpenAITranslator]):
        self.translators = translators

    def llm_translate(self, text, ignore_cache=False, rate_limit_params: dict = None):
        last_error = None
        for translator in self.translators:
            try:
                result = translator.llm_translate(
                    text,
                    ignore_cache=ignore_cache,
                    rate_limit_params=rate_limit_params,
                )
            except Exception as exc:
                last_error = exc
                logger.warning("Term extraction provider failed: %s", exc)
                continue
            if result is None:
                last_error = ValueError("Empty response")
                logger.warning("Term extraction provider returned empty response")
                continue
            return result
        if last_error:
            logger.warning("Term extraction fallback exhausted: %s", last_error)
        return "[]"


@app.middleware("http")
async def check_auth(request: Request, call_next):
    if request.url.path in {"/", "/health"}:
        return await call_next(request)
    if PROXY_SECRET and request.headers.get("X-Proxy-Secret") != PROXY_SECRET:
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)


@app.get("/health")
async def health():
    cleanup_expired_tasks()
    return {"status": "online", "keys": len(NVIDIA_KEYS), "active": len(tasks_db)}


@app.post("/api/translate")
async def translate_pdf(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    lang_out: str = "zh",
    lang_in: str = "en",
):
    cleanup_expired_tasks()
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF only")

    task_id = str(uuid.uuid4())
    input_path = UPLOAD_DIR / f"{task_id}.pdf"
    with input_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    tasks_db[task_id] = {
        "status": "processing",
        "progress": 0,
        "filename": file.filename,
        "model": None,
        "model_attempts": [],
        "input_path": str(input_path),
        "created_at": time.time(),
    }
    bg.add_task(run_pipeline, task_id, str(input_path), lang_in, lang_out)
    return {"task_id": task_id}


async def run_pipeline(task_id: str, path: str, lang_in: str, lang_out: str):
    attempted = []
    model_pool = get_model_pool()
    if not model_pool:
        tasks_db[task_id].update({"status": "error", "error": "No available models"})
        return

    while True:
        model = select_model(avoid=set(attempted))
        if not model:
            tasks_db[task_id].update(
                {"status": "error", "error": "All models are in cooldown"}
            )
            return

        tasks_db[task_id]["model"] = model
        tasks_db[task_id]["model_attempts"].append(model)
        cleanup_task_results(task_id)
        current_key = next(key_cycle)

        try:
            await run_translate_with_model(
                task_id=task_id,
                path=path,
                lang_in=lang_in,
                lang_out=lang_out,
                model=model,
                api_key=current_key,
            )
            return
        except RetryableModelError as exc:
            mark_model_cooldown(model)
            attempted.append(model)
            tasks_db[task_id]["last_error"] = str(exc)
            if len(attempted) >= len(model_pool):
                tasks_db[task_id].update(
                    {
                        "status": "error",
                        "error": "All models failed with internal server error",
                    }
                )
                return
            continue
        except Exception as exc:
            tasks_db[task_id].update({"status": "error", "error": str(exc)})
            return


async def run_translate_with_model(
    task_id: str,
    path: str,
    lang_in: str,
    lang_out: str,
    model: str,
    api_key: str,
):
    configure_rate_limiters(MODEL_QPS)
    base_url = "https://integrate.api.nvidia.com/v1"
    translator = OpenAITranslator(
        lang_in=lang_in,
        lang_out=lang_out,
        model=model,
        base_url=base_url,
        api_key=api_key,
    )
    term_model = TERM_EXTRACTION_MODEL or model
    term_translators = []
    for term_base_url, term_api_key in get_term_extraction_provider_configs(
        base_url, api_key
    ):
        term_translators.append(
            OpenAITranslator(
                lang_in=lang_in,
                lang_out=lang_out,
                model=term_model,
                base_url=term_base_url,
                api_key=term_api_key,
            )
        )
    term_translator = FallbackTermExtractionTranslator(term_translators)
    config = TranslationConfig(
        input_file=path,
        output_dir=str(RESULT_DIR),
        translator=translator,
        term_extraction_translator=term_translator,
        lang_in=lang_in,
        lang_out=lang_out,
        doc_layout_model=None,
        qps=MODEL_QPS,
        pool_max_workers=1,
        term_pool_max_workers=1,
        watermark_output_mode=WatermarkOutputMode.NoWatermark,
        ocr_workaround=OCR_WORKAROUND,
        auto_enable_ocr_workaround=AUTO_ENABLE_OCR,
    )
    try:
        async for event in async_translate(config):
            if event["type"] == "progress_update":
                tasks_db[task_id]["progress"] = event["overall_progress"]
            if event["type"] == "error":
                error_detail = event.get("error", "translate_error")
                if is_retryable_error(error_detail):
                    raise RetryableModelError(error_detail)
                raise TranslationError(error_detail)
            if event["type"] == "finish":
                result_pdf = find_pdf_result(RESULT_DIR, task_id)
                glossary = find_glossary_result(RESULT_DIR, task_id)
                if result_pdf:
                    tasks_db[task_id]["result_path"] = str(result_pdf)
                if glossary:
                    tasks_db[task_id]["glossary_path"] = str(glossary)
                if not result_pdf:
                    raise TranslationError("Result PDF not found")
                tasks_db[task_id].update(
                    {
                        "status": "completed",
                        "progress": 100,
                        "completed_at": time.time(),
                    }
                )
    except RetryableModelError:
        raise
    except Exception as exc:
        if is_retryable_error(exc):
            raise RetryableModelError(exc) from exc
        raise TranslationError(str(exc)) from exc


@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    cleanup_expired_tasks()
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Not found")
    return tasks_db[task_id]


@app.get("/api/download/{task_id}")
async def download(task_id: str):
    cleanup_expired_tasks()
    task = tasks_db.get(task_id)
    if not task or task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Not ready")
    result_path = Path(task["result_path"])
    if not result_path.exists():
        discovered = find_pdf_result(RESULT_DIR, task_id)
        if not discovered:
            raise HTTPException(status_code=404, detail="Result not found")
        result_path = discovered
        task["result_path"] = str(discovered)
    input_path = Path(task.get("input_path", ""))
    response = FileResponse(result_path, filename=f"Translated_{task['filename']}")
    try:
        result_path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Failed to delete result file: %s", result_path)
    if input_path:
        try:
            input_path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Failed to delete input file: %s", input_path)
    tasks_db.pop(task_id, None)
    return response
