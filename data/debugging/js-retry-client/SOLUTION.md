# Solution

Both bugs are in `utils/retry.js`. The symptom shows up when `services/client.js` calls it.

## Bug 1: returning a promise without awaiting it (async)
Inside `try`, `return fn(attempt)` returns the promise immediately. If it later rejects, the rejection happens **outside** the `try/catch`, so the loop never sees it and never retries. Only synchronous throws were caught.

**Fix:** `return await fn(attempt);`.

## Bug 2: one attempt too few
`attempt < retries` makes `retries` the **total** number of attempts. The contract is 1 attempt + `retries` retries.

**Fix:** `attempt <= retries`.

**Root cause vs. symptom:** bumping the client's retry count from 2 to 3 compensates for bug 2 but not bug 1, and leaves the helper wrong for everyone else.
