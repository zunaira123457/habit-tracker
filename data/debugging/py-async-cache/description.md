# Async profile cache

A web app loads user profiles from a slow API, with an async cache in front of it.

## Files
- `services/cache.py`: `AsyncCache`, a generic async cache with a time-to-live
- `services/profiles.py`: `ProfileService`, which uses the cache
- `models/profile.py`: the `Profile` returned to callers
- `utils/clock.py`: `Clock` (real time) and `FakeClock` (for tests)

## Expected behavior
- A cached value is fresh for `ttl` seconds after it was stored. Fresh values are returned without calling the loader. After `ttl` seconds the value is loaded again.
- **Concurrent** requests for the same key share **one** in-flight load. If 10 requests for user 7 arrive at once, the API is called once.
- If a load fails, the error reaches the caller and nothing is cached.

## Bug report
> Our profile API gets roughly 10× more traffic than it should. Even a user who refreshes twice in a second causes two API calls. When a page renders 10 widgets for the same user at once, we see 10 identical API requests.

There are **2 bugs**.
