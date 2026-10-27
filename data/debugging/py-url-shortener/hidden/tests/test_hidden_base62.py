from services.shortener import Shortener
from utils.base62 import decode, encode


def test_zero():
    assert encode(0) == "0", repr(encode(0))


def test_round_trip():
    for n in [0, 1, 61, 62, 3843, 3844, 10 ** 9]:
        assert decode(encode(n)) == n, n


def test_first_two_links_resolve():
    s = Shortener()
    a, b = s.shorten("https://a.example"), s.shorten("https://b.example")
    assert a and b and a != b, (a, b)
    assert s.resolve(a) == "https://a.example"
    assert s.resolve(b) == "https://b.example"


def test_unknown_code():
    try:
        Shortener().resolve("zz")
    except KeyError:
        return
    assert False, "expected KeyError"
