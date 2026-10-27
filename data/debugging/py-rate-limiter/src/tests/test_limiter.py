from services.limiter import RateLimiter


def test_allowed_again_when_the_oldest_request_expires():
    limiter = RateLimiter(limit=2, window_seconds=60)
    assert limiter.allow("c1", 0)
    assert limiter.allow("c1", 50)
    assert not limiter.allow("c1", 55)
    assert limiter.allow("c1", 70), "at t=70 only the t=50 request is inside the last 60s"
