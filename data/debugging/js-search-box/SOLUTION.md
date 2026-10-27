# Solution

## Bug 1: out-of-order responses overwrite newer results, in `services/search.js`
`run` awaited the API and then always set `this.results`. If the request for "cat" is slower than the later request for "car", it finishes last and overwrites the correct results.

**Fix:** give each request an increasing id and only apply the results if it's still the latest:
```js
const id = ++this.latest;
const results = await this.api.search(query);
if (id === this.latest) this.results = results;
```
(Cancelling the old request with an `AbortController` is another good answer.)

**Root cause vs. symptom:** checking `query === this.query` almost works but fails when the user types the same query twice, e.g. `cat` → `car` → `cat`. Debouncing reduces how often the race happens but doesn't remove it.

## Bug 2: the timer is created per call, in `utils/debounce.js`
`let timer` was declared **inside** the returned function, so every call had its own fresh `timer` variable. `clearTimeout(timer)` never cleared the previous call's timer, so every keystroke fired.

**Fix:** move `let timer;` outside the returned function so all calls share it.
