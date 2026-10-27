# Thumbnail LRU cache

A photo app renders thumbnails and caches the most recently used ones.

## Files
- `utils/lru.js`: `LRUCache(capacity)` with `get`, `set`, `has`, `size`
- `services/thumbnails.js`: `ThumbnailService`, which renders on a cache miss
- `models/image.js`: an `Image` (id + dimensions)

## Expected behavior
- The cache holds at most `capacity` entries.
- When it's full, adding a new key evicts the **least recently used** entry.
- Both `get` (on a hit) and `set` count as a "use".
- `get` on a missing key returns `undefined`.

## Bug report
> Scrolling back and forth between the same few photos re-renders them constantly, and the photo you just opened is often the one that gets thrown out.

There are **2 bugs**, in the cache. The symptom shows up in the thumbnail service.
