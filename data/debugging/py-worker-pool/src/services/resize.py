import asyncio

from services.pool import run_all
from utils.stats import Stats


async def resize(job):
    await asyncio.sleep(job.seconds)
    return f"thumb-{job.id}"


async def resize_batch(jobs, concurrency=4):
    stats = Stats()
    thumbs = await run_all(jobs, resize, concurrency, stats)
    return thumbs, stats.completed
