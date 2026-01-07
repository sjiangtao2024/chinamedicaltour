from __future__ import annotations

import math

import server


class FakeTranslator:
    def __init__(self, api_key: str | None = None, **_kwargs):
        self.api_key = api_key

    def do_llm_translate(self, _text, _rate_limit_params=None):
        return self.api_key

    def do_translate(self, _text, _rate_limit_params=None):
        return self.api_key


def test_rotating_translator_cycles_keys():
    translator = server.RotatingOpenAITranslator(
        lang_in="en",
        lang_out="zh",
        model="demo",
        base_url="https://example.com",
        api_keys=["key-1", "key-2"],
        translator_class=FakeTranslator,
    )

    assert translator.llm_translate("a", ignore_cache=True) == "key-1"
    assert translator.llm_translate("b", ignore_cache=True) == "key-2"
    assert translator.llm_translate("c", ignore_cache=True) == "key-1"


class RateLimitError(Exception):
    pass


class FakeRateLimitTranslator(FakeTranslator):
    def do_llm_translate(self, _text, _rate_limit_params=None):
        if self.api_key == "key-1":
            raise RateLimitError("rate limit")
        return self.api_key


def test_rotating_translator_skips_rate_limited_key():
    translator = server.RotatingOpenAITranslator(
        lang_in="en",
        lang_out="zh",
        model="demo",
        base_url="https://example.com",
        api_keys=["key-1", "key-2"],
        translator_class=FakeRateLimitTranslator,
    )

    assert translator.llm_translate("x", ignore_cache=True) == "key-2"


def test_effective_qps_scales_with_keys():
    assert math.isclose(server.get_effective_qps(0.6, 3), 1.8)
    assert math.isclose(server.get_effective_qps(0.6, 0), 0.6)
    assert math.isclose(server.get_effective_qps(0, 3), 0.0)
