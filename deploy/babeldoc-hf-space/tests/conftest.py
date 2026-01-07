from __future__ import annotations

from enum import Enum
from pathlib import Path
import sys
import types


def _ensure_module(name: str) -> types.ModuleType:
    if name in sys.modules:
        return sys.modules[name]
    module = types.ModuleType(name)
    sys.modules[name] = module
    return module


# Ensure the server module can be imported without the heavy babeldoc dependency.
def pytest_configure():  # type: ignore[override]
    sys.path.append(str(Path(__file__).resolve().parents[1]))

    babeldoc = _ensure_module("babeldoc")
    _ensure_module("babeldoc.assets")
    assets_assets = _ensure_module("babeldoc.assets.assets")
    assets_assets.warmup = lambda: None

    _ensure_module("babeldoc.format")
    _ensure_module("babeldoc.format.pdf")
    high_level = _ensure_module("babeldoc.format.pdf.high_level")

    async def async_translate(_config):
        raise RuntimeError("async_translate should not be used in unit tests")

    high_level.async_translate = async_translate

    translation_config = _ensure_module("babeldoc.format.pdf.translation_config")

    class WatermarkOutputMode(str, Enum):
        NoWatermark = "no_watermark"

    class TranslationConfig:
        def __init__(self, **_kwargs):
            pass

    translation_config.TranslationConfig = TranslationConfig
    translation_config.WatermarkOutputMode = WatermarkOutputMode

    _ensure_module("babeldoc.translator")
    translator_module = _ensure_module("babeldoc.translator.translator")

    class BaseTranslator:
        name = "base"

        def __init__(self, lang_in, lang_out, ignore_cache=False):
            self.lang_in = lang_in
            self.lang_out = lang_out
            self.ignore_cache = ignore_cache

        def add_cache_impact_parameters(self, _k: str, _v):
            return None

        def llm_translate(self, text, ignore_cache=False, rate_limit_params: dict = None):
            return self.do_llm_translate(text, rate_limit_params)

        def translate(self, text, ignore_cache=False, rate_limit_params: dict = None):
            return self.do_translate(text, rate_limit_params)

    class OpenAITranslator:
        def __init__(self, **_kwargs):
            pass

        def llm_translate(self, *_args, **_kwargs):
            return ""

        def do_llm_translate(self, *_args, **_kwargs):
            return ""

        def do_translate(self, *_args, **_kwargs):
            return ""

    def set_translate_rate_limiter(_qps: float) -> None:
        return None

    translator_module.BaseTranslator = BaseTranslator
    translator_module.OpenAITranslator = OpenAITranslator
    translator_module.set_translate_rate_limiter = set_translate_rate_limiter
