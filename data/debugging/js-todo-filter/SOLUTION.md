# Solution

## Bug 1: assignment instead of comparison, in `services/todos.js`
`todos.filter(t => t.done = true)` **assigns** `true` to `done` on every item, and the assignment's value (`true`) keeps every item. Filtering ended up modifying the data.

**Fix:** compare with `t => t.done === true` (or just `t => t.done`).

**Root cause vs. symptom:** copying the array before filtering doesn't help, because the objects inside are still the same objects. The bug is the `=`.
