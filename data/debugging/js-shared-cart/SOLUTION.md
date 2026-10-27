# Solution

## Bug 1: cart lines are the catalog's objects, in `services/cart.js`
`add` pushed the object returned by `getProduct` straight into the cart and set `qty` on it. Every cart (and the catalog) shared that one object, so a quantity change in one cart showed up everywhere.

**Fix:** copy it: `const line = { ...getProduct(sku), qty };`.

**Root cause vs. symptom:** resetting `qty` in the catalog after each add hides it until two carts are used at the same time. Each cart needs its own objects.

## Bug 2: missing two-decimal formatting, in `utils/money.js`
`${cents / 100}` prints `1.5` for 150 cents.

**Fix:** `(cents / 100).toFixed(2)`.
