from fastapi.testclient import TestClient

import server  # noqa: E402


def test_download_cleans_up_after_response(tmp_path):
    server.tasks_db.clear()

    result_path = tmp_path / "task-1.no_watermark.zh.dual.pdf"
    input_path = tmp_path / "task-1.pdf"
    result_path.write_bytes(b"pdf-output")
    input_path.write_bytes(b"pdf-input")

    task_id = "task-1"
    server.tasks_db[task_id] = {
        "status": "completed",
        "result_path": str(result_path),
        "input_path": str(input_path),
        "filename": "input.pdf",
    }

    client = TestClient(server.app)
    response = client.get(f"/api/download/{task_id}")

    assert response.status_code == 200
    assert response.content == b"pdf-output"
    assert not result_path.exists()
    assert not input_path.exists()
    assert task_id not in server.tasks_db
