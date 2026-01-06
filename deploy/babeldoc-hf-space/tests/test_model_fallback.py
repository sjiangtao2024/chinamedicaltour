import server


def test_is_retryable_error_detects_500():
    assert server.is_retryable_error(
        "Error code: 500 - Internal Server Error"
    )


def test_is_retryable_error_rejects_non_500():
    assert not server.is_retryable_error("Timeout while reading response")


def test_select_model_skips_cooldown(monkeypatch):
    monkeypatch.setattr(server, "NVIDIA_MODELS", ["model-a", "model-b"])
    server.model_cooldowns.clear()
    server.model_cooldowns["model-a"] = 200

    selected = server.select_model(now=100)

    assert selected == "model-b"


def test_select_model_returns_none_when_all_cooled(monkeypatch):
    monkeypatch.setattr(server, "NVIDIA_MODELS", ["model-a", "model-b"])
    server.model_cooldowns.clear()
    server.model_cooldowns["model-a"] = 200
    server.model_cooldowns["model-b"] = 300

    selected = server.select_model(now=100)

    assert selected is None
