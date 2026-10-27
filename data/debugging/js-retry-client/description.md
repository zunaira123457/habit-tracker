# Retries that don't retry

A client for a flaky user API retries failed requests.

## Files
- `models/user.js`: builds a `User` from the API's JSON
- `services/client.js`: `fetchUser(api, id)`, which retries up to 2 times
- `utils/retry.js`: `withRetry(fn, retries, delayMs)`
- `utils/sleep.js`: a promise-based delay

## Expected behavior
- `withRetry(fn, retries)` calls `fn`, and if it fails (throws **or** its promise rejects), tries again, up to `retries` **extra** times. So `retries = 2` means at most 3 attempts.
- It resolves with the first success, or rejects with the **last** error once attempts run out.
- `fn` receives the attempt number, starting at 0.

## Bug report
> The user API fails about once in five requests, which retries should handle, but users still see "Service unavailable". Logs show only one attempt per failure.

There are **2 bugs**, both in the retry helper.
