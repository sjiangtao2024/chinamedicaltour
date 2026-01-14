# Python Script Rules

## Purpose

Ensure Python scripts run in a consistent, isolated environment.

## Rules

- Use `uv` for Python execution.
- Always run inside a virtual environment (`.venv`).
- Prefer `uv run` for running scripts.

## Setup

```bash
UV_CACHE_DIR=.uv-cache uv venv .venv
```

## Run

```bash
UV_CACHE_DIR=.uv-cache uv run python path/to/script.py
```

## Notes

- If `uv run` is not suitable (e.g., direct interpreter needed), use `.venv/bin/python`.
- Do not install packages globally.
