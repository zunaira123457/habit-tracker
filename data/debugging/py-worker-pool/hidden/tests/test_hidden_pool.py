import asyncio

from models.job import Job
from services.pool import run_all
from services.resize import resize_batch
from utils.stats import Stats


async def test_count_with_simultaneous_finishes():
    jobs = [Job(i, 0.01) for i in range(8)]
    thumbs, completed = await resize_batch(jobs, concurrency=8)
    assert completed == 8, f"counted {completed} of 8"
    assert thumbs == [f"thumb-{i}" for i in range(8)], thumbs


async def test_concurrency_limit():
    state = {"active": 0, "peak": 0}

    async def worker(n):
        state["active"] += 1
        state["peak"] = max(state["peak"], state["active"])
        await asyncio.sleep(0.01)
        state["active"] -= 1
        return n

    assert await run_all(list(range(9)), worker, 3) == list(range(9))
    assert state["peak"] == 3, state


async def test_order_with_varied_durations():
    async def worker(n):
        await asyncio.sleep((5 - n) * 0.005)
        return n * 10

    stats = Stats()
    assert await run_all([1, 2, 3, 4], worker, 4, stats) == [10, 20, 30, 40]
    assert stats.completed == 4, stats.completed
