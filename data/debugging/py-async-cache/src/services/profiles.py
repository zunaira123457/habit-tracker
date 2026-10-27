from models.profile import Profile
from services.cache import AsyncCache


class ProfileService:
    def __init__(self, api, clock=None, ttl=30):
        self.api = api
        self.cache = AsyncCache(self._load, ttl, clock)

    async def _load(self, user_id):
        data = await self.api.fetch_user(user_id)
        return Profile(user_id, data["name"])

    async def get(self, user_id):
        return await self.cache.get(user_id)
