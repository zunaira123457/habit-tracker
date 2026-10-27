import asyncio

from utils.stats import Stats


async def run_all(jobs, worker, concurrency, stats=None):
    """Run worker(job) for every job, at most `concurrency` at once. Results keep the order of `jobs`."""
    stats = stats or Stats()
    sem = asyncio.Semaphore(concurrency)
    results = []

    async def run_one(job):
        async with sem:
            result = await worker(job)
            results.append(result)
            await stats.record_success()
            return result

    return list(await asyncio.gather(*(run_one(j) for j in jobs)))
