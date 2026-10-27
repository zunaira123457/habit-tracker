import asyncio


class Stats:
    def __init__(self):
        self.completed = 0

    async def record_success(self):
        current = self.completed
        await asyncio.sleep(0)  # e.g. writing a metrics event
        self.completed = current + 1
