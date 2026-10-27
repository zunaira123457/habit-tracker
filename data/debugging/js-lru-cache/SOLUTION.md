# Solution

Both bugs are in `utils/lru.js`. A JavaScript `Map` iterates in **insertion order**, so the first key is the oldest. The cache relies on that order to track recency.

## Bug 1: reads don't update recency
`get` returned the value without moving the key, so frequently *viewed* thumbnails still looked "old" and got evicted.

**Fix:** on a hit, `delete` then `set` the key to move it to the end.

## Bug 2: evicting the newest entry
`[...this.map.keys()].pop()` takes the **last** key, which is the one just added. It's also O(n) per eviction.

**Fix:** `this.map.keys().next().value`, the first (least recent) key, in O(1).

**Root cause vs. symptom:** increasing the cache capacity in `ThumbnailService` makes the re-renders rarer but doesn't fix the eviction order.
