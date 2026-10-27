# Solution

## Bug 1: flooring floating-point dollars, in `utils/currency.js`
`19.99 * 100` is `1998.9999999999998` in floating point. `Math.floor` turns that into 1998.

**Fix:** `Math.round(amount * 100)`.

**Root cause vs. symptom:** the wrong total shows up in `services/invoice.js`. Adding `+ 1` there, or `+ 0.0001` before flooring, fixes some prices and breaks others.

## Bug 2: remainder cents dropped, in `services/invoice.js`
`Math.floor(total / people)` for every person loses `total % people` cents.

**Fix:** give the first `total % people` people one extra cent:
```js
const base = Math.floor(totalCents / people);
const extra = totalCents % people;
return Array.from({ length: people }, (_, i) => base + (i < extra ? 1 : 0));
```
