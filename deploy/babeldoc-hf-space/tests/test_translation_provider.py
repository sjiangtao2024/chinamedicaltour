import server


def test_select_translation_provider_prefers_google(monkeypatch):
    monkeypatch.setattr(server, "TRANSLATION_PROVIDER_ORDER", ["google", "nim"])
    monkeypatch.setattr(server, "TRANSLATION_BASE_URL", "https://google.example")
    monkeypatch.setattr(server, "TRANSLATION_KEYS", ["g1", "g2"])
    monkeypatch.setattr(server, "NVIDIA_KEYS", ["n1"])

    base_url, keys = server.select_translation_provider_config(
        default_base_url="https://nim.example",
        default_api_key="nim-default",
    )

    assert base_url == "https://google.example"
    assert keys == ["g1", "g2"]


def test_select_translation_provider_falls_back_to_nim(monkeypatch):
    monkeypatch.setattr(server, "TRANSLATION_PROVIDER_ORDER", ["google", "nim"])
    monkeypatch.setattr(server, "TRANSLATION_BASE_URL", "")
    monkeypatch.setattr(server, "TRANSLATION_KEYS", [])
    monkeypatch.setattr(server, "NVIDIA_KEYS", ["n1", "n2"])

    base_url, keys = server.select_translation_provider_config(
        default_base_url="https://nim.example",
        default_api_key="nim-default",
    )

    assert base_url == "https://nim.example"
    assert keys == ["n1", "n2"]


def test_translation_model_pool_override(monkeypatch):
    monkeypatch.setattr(server, "TRANSLATION_MODELS", ["g-model-1", "g-model-2"])
    monkeypatch.setattr(server, "TRANSLATION_DEFAULT_MODEL", "g-default")
    monkeypatch.setattr(server, "NVIDIA_MODELS", ["n-model"])

    assert server.get_translation_model_pool() == ["g-model-1", "g-model-2"]

    monkeypatch.setattr(server, "TRANSLATION_MODELS", [])
    assert server.get_translation_model_pool() == ["g-default"]
