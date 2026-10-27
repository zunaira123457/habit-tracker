import asyncio

from services.cache import AsyncCache
from services.profiles import ProfileService
from utils.clock import FakeClock


class FakeApi:
    def __init__(self, fail=False):
        self.calls = 0
        self.fail = fail

    async def fetch_user(self, user_id):
        self.calls += 1
        await asyncio.sleep(0.01)
        if self.fail:
            raise RuntimeError("api down")
        return {"name": f"user{user_id}"}


async def test_concurrent_requests_share_one_load():
    api = FakeApi()
    service = ProfileService(api, FakeClock())
    profiles = await asyncio.gather(*(service.get(7) for _ in range(10)))
    assert api.calls == 1, f"API called {api.calls} times for 10 concurrent requests"
    assert all(p.name == "user7" for p in profiles)


async def test_fresh_then_expired():
    api, clock = FakeApi(), FakeClock()
    service = ProfileService(api, clock, ttl=30)
    await service.get(1)
    clock.advance(29)
    await service.get(1)
    assert api.calls == 1, f"fresh value reloaded ({api.calls} calls)"
    clock.advance(2)
    await service.get(1)
    assert api.calls == 2, f"stale value not reloaded ({api.calls} calls)"


async def test_different_keys_load_separately():
    api = FakeApi()
    service = ProfileService(api, FakeClock())
    await asyncio.gather(service.get(1), service.get(2))
    assert api.calls == 2, api.calls


async def test_failures_are_not_cached():
    calls = {"n": 0}

    async def flaky(key):
        calls["n"] += 1
        await asyncio.sleep(0)
        if calls["n"] == 1:
            raise RuntimeError("boom")
        return key * 2

    cache = AsyncCache(flaky, ttl=60, clock=FakeClock())
    try:
        await cache.get(4)
        assert False, "expected the first load to fail"
    except RuntimeError:
        pass
    assert await cache.get(4) == 8
