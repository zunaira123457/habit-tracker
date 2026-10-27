# Solution

## Bug 1: a plain object used as a map, in `services/frequency.js`
`counts[w] || 0` reads inherited properties. For `constructor`, `counts.constructor` is the `Object` function, so `+ 1` produced string concatenation. Words like `__proto__` break it even worse.

**Fix:** use a `Map` (`counts.get(w)`, `counts.set(w, ...)`). `topWords` already handles a `Map`. (An `Object.create(null)` object also avoids inherited keys, but the contract asks for a `Map`.)

**Root cause vs. symptom:** skipping the specific word `constructor` is a symptom patch. Any built-in property name breaks a plain object.

## Bug 2: no normalization, in `utils/text.js`
Splitting on spaces kept case and punctuation, so `The`, `the` and `the,` were three different words.

**Fix:** `text.toLowerCase().match(/[a-z']+/g) || []`.
