# BabelDOC HF Space (Docker)

This folder contains a minimal FastAPI wrapper to run BabelDOC in a Hugging Face Docker Space.

## Files

- `Dockerfile`: build image with BabelDOC + FastAPI.
- `server.py`: upload, async translate, status, download APIs.

## HF Space Setup (Docker)

1. Create a new Space and select **Docker**.
2. Upload `Dockerfile` and `server.py` from this folder (or connect a repo that contains them).
3. Add **Secrets** in Space Settings:
   - `NVIDIA_KEYS`: comma-separated NVIDIA NIM keys
   - `NVIDIA_MODELS`: comma-separated model list (randomly chosen per task)
   - `NVIDIA_DEFAULT_MODEL`: fallback model if `NVIDIA_MODELS` is empty
   - `NVIDIA_QPS`: per-key QPS limit (default `0.6` for ~40 RPM). Effective QPS scales by key count when rotating keys.
   - `TRANSLATION_PROVIDER_ORDER`: translation provider priority (default `nim`, options: `nim`, `google`)
   - `TRANSLATION_BASE_URL`: OpenAI-compatible base URL for translation when using `google`
   - `TRANSLATION_KEYS`: comma-separated API keys for translation when using `google`
   - `TRANSLATION_MODELS`: comma-separated model list for translation (overrides `NVIDIA_MODELS`)
   - `TRANSLATION_DEFAULT_MODEL`: fallback translation model if `TRANSLATION_MODELS` is empty (overrides `NVIDIA_DEFAULT_MODEL`)
   - `TERM_EXTRACTION_MODEL`: optional model for term extraction (defaults to the translation model)
   - `TERM_EXTRACTION_BASE_URL`: optional OpenAI-compatible base URL for term extraction (e.g. Gemini)
   - `TERM_EXTRACTION_KEYS`: optional comma-separated API keys for term extraction
   - `TERM_EXTRACTION_PROVIDER_ORDER`: provider order for term extraction (default `term,nim`)
   - `RESULT_TTL_SECONDS`: auto-clean completed tasks after this TTL (default `86400`)
   - `OCR_WORKAROUND`: enable OCR workaround for scanned PDFs (default `true`)
   - `AUTO_ENABLE_OCR`: auto-enable OCR when scanned pages detected (default `true`)
   - `PROXY_SECRET`: shared secret for the Cloudflare Worker

Example:
```
NVIDIA_KEYS=key1,key2,key3
NVIDIA_MODELS=z-ai/glm4.7,minimaxai/minimax-m2.1
TRANSLATION_PROVIDER_ORDER=nim
TERM_EXTRACTION_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
TERM_EXTRACTION_MODEL=gemini-2.5-flash-lite
TERM_EXTRACTION_KEYS=term_key1,term_key2
TERM_EXTRACTION_PROVIDER_ORDER=term,nim
```

Recommended (Google translation + NIM term extraction):
```
TRANSLATION_PROVIDER_ORDER=google,nim
TRANSLATION_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
TRANSLATION_KEYS=google_key1,google_key2,google_key3
TRANSLATION_MODELS=gemini-2.5-flash-lite

TERM_EXTRACTION_PROVIDER_ORDER=nim
NVIDIA_KEYS=nim_key1,nim_key2
NVIDIA_MODELS=z-ai/glm4.7
```
4. Launch the Space. The service exposes:
   - `GET /health`
   - `POST /api/translate`
   - `GET /api/status/{task_id}`
   - `GET /api/download/{task_id}`

`/api/status/{task_id}` includes the selected `model` for internal evaluation.

Download behavior:
- After a successful `/api/download/{task_id}`, the result file and source upload are deleted, and the task is removed.

## Upgrade Workflow

- **Pin version**: `Dockerfile` uses `BabelDOC==0.5.22`.
- **Upgrade steps**:
  1. Change the version in `Dockerfile`.
  2. Check `server.py` for any API/translator signature changes.
  3. Push changes to the repo or re-upload files to the Space.
  4. Trigger rebuild in HF Space.

If you want to track `main` instead, replace the install line with:

```bash
pip install git+https://github.com/funstory-ai/BabelDOC@main
```

Use this only if you accept upstream changes without pinning.
