# Rate limiter

An API allows each client at most `limit` requests in any rolling window of `window_seconds`.

## Files
- `services/limiter.py`: `RateLimiter.allow(client_id, now)`
- `utils/window.py`: `SlidingWindow`, the request times for one client
- `models/client.py`: client info used in log messages

## Expected behavior
- A request at time `now` is allowed if fewer than `limit` earlier requests happened in the window `(now - window_seconds, now]`.
- A request made **exactly** `window_seconds` ago is outside the window.
- Timestamps are added in increasing order. Old timestamps must be removed so they stop counting.
- Allowed requests are recorded; denied requests are not.

## Bug report
> A client made 2 requests a minute apart with a limit of 2 per minute, and was blocked for the rest of the day.

There are **2 bugs**.
