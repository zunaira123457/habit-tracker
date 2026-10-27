# Solution

## Bug 1: a stack instead of a queue, in `services/routes.js`
BFS finds the fewest-stop path only if it explores paths **first in, first out**. `queue.pop()` takes the newest path, which turns the search into depth-first search. That finds *a* route, not the shortest one.

**Fix:** `queue.shift()` (or keep a head index into the array, to avoid O(n) shifts on big graphs).

## Bug 2: missing stations return `undefined`, in `models/network.js`
`neighbors()` returned `this.edges.get(station)`, which is `undefined` for a station with no outgoing links. `for...of` over `undefined` throws `TypeError` in the search.

**Fix:** return `this.edges.get(station) || []`.

**Root cause vs. symptom:** the crash is in `services/routes.js`. Wrapping the loop in `if (neighbors)` there fixes this caller only; any other code calling `neighbors()` would still break.
