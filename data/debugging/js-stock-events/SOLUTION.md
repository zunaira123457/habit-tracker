# Solution

## Bug 1: removing listeners while iterating the same array, in `utils/emitter.js`
`emit` iterated `this.listeners[event]` directly. When a `once` listener ran, `off` spliced it out of **that same array** mid-`forEach`, shifting the next listener into the current index, so it was skipped.

**Fix:** iterate over a copy: `const list = [...(this.listeners[event] || [])];`.

**Root cause vs. symptom:** the missing alert shows up in `services/inventory.js`. Re-ordering subscriptions so the `once` hook is registered last hides the bug for that one case.
