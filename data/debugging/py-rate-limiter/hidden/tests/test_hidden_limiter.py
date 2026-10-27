from models.client import Client
from services.limiter import RateLimiter


def test_exact_boundary_is_outside_window():
    limiter = RateLimiter(limit=1, window_seconds=10)
    assert limiter.allow("a", 0)
    assert not limiter.allow("a", 9)
    assert limiter.allow("a", 10), "t=0 is exactly 10s old at t=10, so it no longer counts"


def test_oldest_removed_while_newer_stays():
    limiter = RateLimiter(limit=2, window_seconds=60)
    assert limiter.allow("b", 0)
    assert limiter.allow("b", 50)
    assert limiter.allow("b", 61), "t=0 expired at t=61 even though t=50 hasn't"
    assert not limiter.allow("b", 62)


def test_clients_are_independent():
    limiter = RateLimiter(limit=1, window_seconds=60)
    assert limiter.allow("x", 0)
    assert limiter.allow("y", 0)


def test_log_line():
    limiter = RateLimiter(limit=1, window_seconds=5)
    c = Client("k9", "pro")
    assert limiter.log_line(c, 0) == "k9 (pro) allowed"
    assert limiter.log_line(c, 1) == "k9 (pro) denied"
