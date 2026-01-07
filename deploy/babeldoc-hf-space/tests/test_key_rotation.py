import pytest

import server


class FakeTranslator:
    def __init__(self, *, api_key, **kwargs):
        self.api_key = api_key

    def do_llm_translate(self, text, rate_limit_params=None):
        if self.api_key == "key-1":
            raise RuntimeError("Error code: 429 - Too Many Requests")
        return f"{self.api_key}:{text}"

    def do_translate(self, text, rate_limit_params=None):
        return self.do_llm_translate(text, rate_limit_params)


def test_rotating_translator_skips_rate_limited_key():
    translator = server.RotatingOpenAITranslator(
        lang_in="en",
        lang_out="zh",
        model="test-model",
        base_url="https://example.com/v1",
        api_keys=["key-1", "key-2"],
        translator_class=FakeTranslator,
    )

    result = translator.do_llm_translate("hello")

    assert result == "key-2:hello"
