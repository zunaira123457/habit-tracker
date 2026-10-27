# Solution

Both bugs are in `services/cache.py`.

## Bug 1: concurrent requests don't share the in-flight load (async race)
`get` checks `self.inflight`, but nothing ever adds to it. Ten concurrent `get(7)` calls all miss the cache and each one awaits its own `loader(7)` before any of them stores a value.

**Fix:** start the load as a task, store it in `self.inflight[key]` **before awaiting**, await it, and remove it in a `finally` so failures aren't cached:
```python
task = asyncio.ensure_future(self.loader(key))
self.inflight[key] = task
try:
    value = await task
finally:
    del self.inflight[key]
```

**Root cause vs. symptom:** an `asyncio.Lock` around the whole `get` also stops duplicate loads, but it serializes loads for *every* key. The intended design (and the expected answer in an interview) is to share the in-flight task per key.

## Bug 2: inverted freshness check
`if now - stored_at > ttl: return value` returns the cached value only once it's **stale**, and reloads it while it's fresh.

**Fix:** `< self.ttl`.
