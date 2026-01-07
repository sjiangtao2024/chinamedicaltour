import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import server


def test_configure_rate_limiter_uses_model_qps(monkeypatch):
    calls = []

    def fake_set_translate_rate_limiter(value):
        calls.append(value)

    monkeypatch.setattr(
        server, "set_translate_rate_limiter", fake_set_translate_rate_limiter
    )

    server.configure_rate_limiters(0.6)

    assert calls == [0.6]


def test_safe_term_extraction_translator_returns_empty_on_error(monkeypatch):
    def fake_init(self, *args, **kwargs):
        return None

    def raise_error(self, *args, **kwargs):
        raise AttributeError("strip")

    monkeypatch.setattr(server.OpenAITranslator, "__init__", fake_init)
    monkeypatch.setattr(server.OpenAITranslator, "llm_translate", raise_error)

    translator = server.SafeTermExtractionTranslator(
        lang_in="en",
        lang_out="zh",
        model="mock-model",
        base_url="http://example.com",
        api_key="mock-key",
    )

    assert translator.llm_translate("hello") == "[]"


class DummyTranslator:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def llm_translate(self, *_args, **_kwargs):
        if self.error:
            raise self.error
        return self.result


def test_fallback_translator_uses_next_on_failure():
    fallback = server.FallbackTermExtractionTranslator(
        [
            DummyTranslator(error=RuntimeError("boom")),
            DummyTranslator(result="[]"),
        ]
    )

    assert fallback.llm_translate("hello") == "[]"


def test_provider_order_prefers_term_then_nim(monkeypatch):
    monkeypatch.setattr(server, "TERM_EXTRACTION_BASE_URL", "https://gemini.local/v1")
    monkeypatch.setattr(server, "TERM_EXTRACTION_KEYS", ["term-key"])
    monkeypatch.setattr(server, "TERM_EXTRACTION_PROVIDER_ORDER", ["term", "nim"])

    configs = server.get_term_extraction_provider_configs(
        "https://nim.local/v1", "nim-key"
    )

    assert configs[0] == ("https://gemini.local/v1", "term-key")
    assert configs[1] == ("https://nim.local/v1", "nim-key")


def test_safe_primary_translator_returns_input_on_error(monkeypatch):
    def fake_init(self, *args, **kwargs):
        return None

    def raise_error(self, *args, **kwargs):
        raise AttributeError("strip")

    monkeypatch.setattr(server.OpenAITranslator, "__init__", fake_init)
    monkeypatch.setattr(server.OpenAITranslator, "llm_translate", raise_error)

    translator = server.SafePrimaryTranslator(
        lang_in="en",
        lang_out="zh",
        model="mock-model",
        base_url="http://example.com",
        api_key="mock-key",
    )

    assert translator.llm_translate("keep me") == "keep me"


def test_safe_primary_translator_returns_input_on_none(monkeypatch):
    def fake_init(self, *args, **kwargs):
        return None

    monkeypatch.setattr(server.OpenAITranslator, "__init__", fake_init)
    monkeypatch.setattr(server.OpenAITranslator, "llm_translate", lambda *_a, **_k: None)

    translator = server.SafePrimaryTranslator(
        lang_in="en",
        lang_out="zh",
        model="mock-model",
        base_url="http://example.com",
        api_key="mock-key",
    )

    assert translator.llm_translate("keep me") == "keep me"
