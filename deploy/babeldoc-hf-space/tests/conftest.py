import sys
import types


def _install_fastapi_stubs():
    fastapi_module = types.ModuleType("fastapi")

    class FastAPI:
        def __init__(self, *args, **kwargs):
            pass

        def add_middleware(self, *args, **kwargs):
            return None

        def on_event(self, *_args, **_kwargs):
            def decorator(fn):
                return fn

            return decorator

        def middleware(self, *_args, **_kwargs):
            def decorator(fn):
                return fn

            return decorator

        def get(self, *_args, **_kwargs):
            def decorator(fn):
                return fn

            return decorator

        def post(self, *_args, **_kwargs):
            def decorator(fn):
                return fn

            return decorator

    class BackgroundTasks:
        def add_task(self, *_args, **_kwargs):
            return None

    class UploadFile:
        filename = ""

    class Request:
        url = types.SimpleNamespace(path="/")
        headers = {}

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    def File(*_args, **_kwargs):
        return None

    fastapi_module.BackgroundTasks = BackgroundTasks
    fastapi_module.FastAPI = FastAPI
    fastapi_module.File = File
    fastapi_module.HTTPException = HTTPException
    fastapi_module.Request = Request
    fastapi_module.UploadFile = UploadFile

    middleware_module = types.ModuleType("fastapi.middleware")
    cors_module = types.ModuleType("fastapi.middleware.cors")

    class CORSMiddleware:
        pass

    cors_module.CORSMiddleware = CORSMiddleware
    middleware_module.cors = cors_module

    responses_module = types.ModuleType("fastapi.responses")

    class FileResponse:
        def __init__(self, *args, **kwargs):
            pass

    class JSONResponse:
        def __init__(self, *args, **kwargs):
            pass

    responses_module.FileResponse = FileResponse
    responses_module.JSONResponse = JSONResponse

    sys.modules.setdefault("fastapi", fastapi_module)
    sys.modules.setdefault("fastapi.middleware", middleware_module)
    sys.modules.setdefault("fastapi.middleware.cors", cors_module)
    sys.modules.setdefault("fastapi.responses", responses_module)


def _install_babeldoc_stubs():
    babeldoc_module = types.ModuleType("babeldoc")
    assets_module = types.ModuleType("babeldoc.assets")
    assets_assets_module = types.ModuleType("babeldoc.assets.assets")
    format_module = types.ModuleType("babeldoc.format")
    format_pdf_module = types.ModuleType("babeldoc.format.pdf")
    format_pdf_high_level = types.ModuleType("babeldoc.format.pdf.high_level")
    format_pdf_translation = types.ModuleType("babeldoc.format.pdf.translation_config")
    translator_module = types.ModuleType("babeldoc.translator")
    translator_translator = types.ModuleType("babeldoc.translator.translator")

    def warmup():
        return None

    async def async_translate(_config):
        if False:
            yield None

    class TranslationConfig:
        def __init__(self, *args, **kwargs):
            pass

    class WatermarkOutputMode:
        NoWatermark = object()

    class BaseTranslator:
        def __init__(self, lang_in: str, lang_out: str, ignore_cache: bool = False):
            self.lang_in = lang_in
            self.lang_out = lang_out
            self.ignore_cache = ignore_cache

        def llm_translate(self, text, ignore_cache=False, rate_limit_params: dict = None):
            return self.do_llm_translate(text, rate_limit_params)

        def do_llm_translate(self, text, rate_limit_params: dict = None):
            raise NotImplementedError

        def do_translate(self, text, rate_limit_params: dict = None):
            return self.do_llm_translate(text, rate_limit_params)

    class OpenAITranslator(BaseTranslator):
        def __init__(self, *args, **kwargs):
            super().__init__(kwargs.get("lang_in", ""), kwargs.get("lang_out", ""))

    def set_translate_rate_limiter(_qps):
        return None

    assets_assets_module.warmup = warmup
    format_pdf_high_level.async_translate = async_translate
    format_pdf_translation.TranslationConfig = TranslationConfig
    format_pdf_translation.WatermarkOutputMode = WatermarkOutputMode
    translator_translator.BaseTranslator = BaseTranslator
    translator_translator.OpenAITranslator = OpenAITranslator
    translator_translator.set_translate_rate_limiter = set_translate_rate_limiter

    sys.modules.setdefault("babeldoc", babeldoc_module)
    sys.modules.setdefault("babeldoc.assets", assets_module)
    sys.modules.setdefault("babeldoc.assets.assets", assets_assets_module)
    sys.modules.setdefault("babeldoc.format", format_module)
    sys.modules.setdefault("babeldoc.format.pdf", format_pdf_module)
    sys.modules.setdefault("babeldoc.format.pdf.high_level", format_pdf_high_level)
    sys.modules.setdefault("babeldoc.format.pdf.translation_config", format_pdf_translation)
    sys.modules.setdefault("babeldoc.translator", translator_module)
    sys.modules.setdefault("babeldoc.translator.translator", translator_translator)


try:
    import fastapi  # noqa: F401
except ModuleNotFoundError:
    _install_fastapi_stubs()

try:
    import babeldoc  # noqa: F401
except ModuleNotFoundError:
    _install_babeldoc_stubs()
