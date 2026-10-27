import asyncio

from services.profiles import ProfileService
from utils.clock import FakeClock


class FakeApi:
    def __init__(self):
        self.calls = 0

    async def fetch_user(self, user_id):
        self.calls += 1
        await asyncio.sleep(0.01)
        return {"name": f"user{user_id}"}


async def test_second_request_uses_the_cache():
    api = FakeApi()
    service = ProfileService(api, FakeClock())
    await service.get(7)
    await service.get(7)
    assert api.calls == 1, f"API called {api.calls} times"
