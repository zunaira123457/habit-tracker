# Solution

## Bug 1: a set loses order, in `services/dedupe.py`
`list(set(ids))` removes duplicates, but sets have no defined order. For integers it tends to come out sorted, which scrambles the event order.

**Fix:** `list(dict.fromkeys(ids))`. Dicts keep insertion order, so this keeps first occurrences in order. A loop with a `seen` set also works.

## Bug 2: off-by-one in `utils/chunks.py`
`range(0, len(items) - size, size)` stops one chunk early, dropping the final chunk, or everything when there's only one chunk.

**Fix:** `range(0, len(items), size)`.

**Root cause vs. symptom:** the missing events look like a batching problem in `services/batch.py`, but the cause is the shared `chunk` helper.
