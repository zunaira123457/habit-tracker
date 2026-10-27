import asyncio

from utils.clock import Clock


class AsyncCache:
    """Caches an async loader's results for `ttl` seconds.
    Concurrent requests for the same key share one in-flight load."""

    def __init__(self, loader, ttl, clock=None):
        self.loader = loader
        self.ttl = ttl
        self.clock = clock or Clock()
        self.values = {}      # key -> (value, stored_at)
        self.inflight = {}    # key -> asyncio.Task

    async def get(self, key):
        if key in self.values:
            value, stored_at = self.values[key]
            if self.clock.now() - stored_at < self.ttl:
                return value
        if key in self.inflight:
            return await self.inflight[key]
        task = asyncio.ensure_future(self.loader(key))
        self.inflight[key] = task
        try:
            value = await task
        finally:
            del self.inflight[key]
        self.values[key] = (value, self.clock.now())
        return value
