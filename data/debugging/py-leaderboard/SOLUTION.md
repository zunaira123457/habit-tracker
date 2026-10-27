# Solution

## Bug 1: min-heap used as a max-heap in `services/leaderboard.py`
Python's `heapq` is a **min**-heap, so popping returns the lowest score first.

**Fix:** push `(-p.score, p.name)`, so the highest score pops first and ties pop alphabetically. `heapq.nsmallest(k, ...)` on the same keys also works.

**Root cause vs. symptom:** reversing the final list "works" for some inputs, but it also reverses the alphabetical tie order. The heap key is what's wrong.

## Bug 2: popping more items than exist
`[heapq.heappop(heap) for _ in range(k)]` raises `IndexError` when there are fewer than `k` players.

**Fix:** pop `min(k, len(heap))` items.
