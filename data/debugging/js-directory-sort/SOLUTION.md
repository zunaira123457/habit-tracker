# Solution

## Bug 1: a comparator that returns a boolean, in `utils/compare.js`
`Array.prototype.sort` expects a comparator that returns a **negative, zero or positive number**. `a.lastName > b.lastName` returns `true`/`false` (1/0), never negative, so the sort can't tell "less than" from "equal" and the result depends on the engine's algorithm. It also never compared first names.

**Fix:** `return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);`

**Root cause vs. symptom:** sorting twice or reversing the input "fixes" some lists by luck. The comparator contract is the bug.
