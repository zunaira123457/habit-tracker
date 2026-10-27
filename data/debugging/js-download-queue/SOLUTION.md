# Solution

## Bug 1: freeing the slot before the task finishes, in `services/queue.js`
`_next` started the task, then immediately did `this.running--` and started the next one, without waiting for the task. Every task started at once.

**Fix:** decrement and start the next task only when the task **settles**:
```js
Promise.resolve()
  .then(task)
  .then(resolve, reject)
  .finally(() => {
    this.running--;
    this._next();
  });
```
Starting with `Promise.resolve().then(task)` also handles a task that throws synchronously.

**Root cause vs. symptom:** adding a delay between downloads in `downloader.js` spaces them out but doesn't enforce the limit.

## Bug 2: results in completion order, in `utils/map-limit.js`
Each result was pushed into an array when its task finished.

**Fix:** `return Promise.all(items.map(item => queue.push(() => fn(item))));`. `Promise.all` keeps input order.
