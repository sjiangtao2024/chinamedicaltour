from pathlib import Path

import server


def test_cleanup_expired_tasks_removes_completed_files(tmp_path, monkeypatch):
    input_path = tmp_path / "input.pdf"
    result_path = tmp_path / "result.pdf"
    input_path.write_text("in")
    result_path.write_text("out")

    now = 1_700_000_000
    monkeypatch.setenv("RESULT_TTL_SECONDS", "60")
    monkeypatch.setattr(server, "RESULT_TTL_SECONDS", 60)

    task_id = "task-1"
    server.tasks_db[task_id] = {
        "status": "completed",
        "input_path": str(input_path),
        "result_path": str(result_path),
        "completed_at": now - 61,
    }

    removed = server.cleanup_expired_tasks(now=now)

    assert removed == 1
    assert task_id not in server.tasks_db
    assert not input_path.exists()
    assert not result_path.exists()
