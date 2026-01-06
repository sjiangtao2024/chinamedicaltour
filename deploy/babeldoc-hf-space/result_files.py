from pathlib import Path
from typing import Iterable


def _select_latest(paths: Iterable[Path]) -> Path | None:
    candidates = list(paths)
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def find_pdf_result(result_dir: Path | str, task_id: str) -> Path | None:
    directory = Path(result_dir)
    candidates = [
        path
        for path in directory.glob(f"*{task_id}*")
        if path.suffix.lower() == ".pdf"
    ]
    return _select_latest(candidates)


def find_glossary_result(result_dir: Path | str, task_id: str) -> Path | None:
    directory = Path(result_dir)
    candidates = [
        path
        for path in directory.glob(f"*{task_id}*")
        if path.name.endswith(".glossary.csv")
    ]
    return _select_latest(candidates)
