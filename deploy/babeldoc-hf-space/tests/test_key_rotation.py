import types

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


class FakeOpenAIClient:
    def __init__(self, response_text):
        self._response_text = response_text
        self.chat = types.SimpleNamespace(
            completions=types.SimpleNamespace(create=self._create)
        )

    def _create(self, **_kwargs):
        message = types.SimpleNamespace(content=self._response_text)
        choice = types.SimpleNamespace(message=message)
        return types.SimpleNamespace(choices=[choice])


class FakeOpenAITranslator(server.OpenAITranslator):
    def __init__(self, *args, **kwargs):
        super().__init__(lang_in=kwargs.get("lang_in", ""), lang_out=kwargs.get("lang_out", ""))
        self.model = kwargs.get("model", "test-model")
        self.client = FakeOpenAIClient("ok")
        self.options = {}
        self.extra_body = None
        self.send_temperature = True
        self.enable_json_mode_if_requested = False
        self.send_dashscope_header = False

    def update_token_count(self, _response):
        return None

    def do_llm_translate(self, text, rate_limit_params=None):
        raise RuntimeError("Error code: 429 - Too Many Requests")



def test_rotating_translator_bypasses_openai_retry():
    translator = server.RotatingOpenAITranslator(
        lang_in="en",
        lang_out="zh",
        model="test-model",
        base_url="https://example.com/v1",
        api_keys=["key-1"],
        translator_class=FakeOpenAITranslator,
    )

    result = translator.do_llm_translate("hello")

    assert result == "ok"
