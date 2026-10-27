# Solution

Both bugs are in `utils/window.py`, but the symptom (clients blocked forever) shows up in `services/limiter.py`.

## Bug 1: evicting from the wrong end
Timestamps are appended in time order, so the **oldest** is `times[0]`. The loop checked `times[-1]` (the newest) and stopped as soon as the newest was still inside the window, so old entries were never removed.

**Fix:** check and remove from the front (`times[0]`, `pop(0)`), or better, use `collections.deque` and `popleft()`.

## Bug 2: off-by-one at the window edge
`_expired` used `t < now - seconds`. The window is `(now - seconds, now]`, so a timestamp exactly `seconds` old is already out.

**Fix:** `t <= now - self.seconds`.

**Root cause vs. symptom:** clearing all of a client's timestamps when they're denied, or raising the limit, hides the symptom without fixing the window.
