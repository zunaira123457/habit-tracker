# Solution

## Bug 1: results in completion order, in `services/pool.py`
Each job appended its result to a shared list when it **finished**, so the list was in completion order.

**Fix:** use the return value of `asyncio.gather`, which is always in input order: `return list(await asyncio.gather(...))`.

**Root cause vs. symptom:** sorting the results by job id afterwards works only if results carry their id, and still leaves the pool's contract broken.

## Bug 2: lost update across an `await`, in `utils/stats.py`
`record_success` read `self.completed`, awaited, then wrote `current + 1`. When several jobs finish together, they all read the same old value before any of them writes, so increments are lost.

**Fix:** make the read-modify-write happen with no `await` in between (`self.completed += 1` before awaiting), or guard it with an `asyncio.Lock`.

**Root cause vs. symptom:** the wrong count shows up on the dashboard via `services/resize.py`, but the race is in the shared stats helper. Counting `len(results)` in the resize service would hide it there only.
