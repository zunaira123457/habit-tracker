from services.shortener import Shortener


def test_first_link_has_a_code():
    code = Shortener().shorten("https://example.com")
    assert code != "", "the first code was empty"
