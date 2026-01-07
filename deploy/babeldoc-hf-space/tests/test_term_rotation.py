import server


def test_build_term_extraction_translators_rotates_keys(monkeypatch):
    monkeypatch.setattr(server, "TERM_EXTRACTION_PROVIDER_ORDER", ["term", "nim"])
    monkeypatch.setattr(server, "TERM_EXTRACTION_KEYS", ["term-1", "term-2"])
    monkeypatch.setattr(server, "TERM_EXTRACTION_BASE_URL", "https://term.example")
    monkeypatch.setattr(server, "NVIDIA_KEYS", ["nim-1", "nim-2"])

    translators = server.build_term_extraction_translators(
        lang_in="en",
        lang_out="zh",
        term_model="demo",
        default_base_url="https://nim.example",
        default_api_key="nim-default",
    )

    assert len(translators) == 2
    assert isinstance(translators[0], server.RotatingOpenAITranslator)
    assert translators[0].api_keys == ["term-1", "term-2"]
    assert translators[0].base_url == "https://term.example"
    assert isinstance(translators[1], server.RotatingOpenAITranslator)
    assert translators[1].api_keys == ["nim-1", "nim-2"]
    assert translators[1].base_url == "https://nim.example"
