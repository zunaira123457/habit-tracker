# Solution

## Bug 1: balances read before an `await` and written after it, in `services/bank.js`
`transfer` read both balances, then awaited the audit log, then wrote `fromBalance - cents` and `toBalance + cents`. Concurrent transfers all read the **same starting balances** during the await, and each write overwrote the others, so updates were lost (a classic lost update).

**Fix:** do the check and both balance updates with **no `await` in between**, then log:
```js
if (this.balance(from) < cents) throw new Error('Insufficient funds');
this.balances.set(from, this.balance(from) - cents);
this.balances.set(to, this.balance(to) + cents);
await this.audit.log({ from, to, cents });
```
A per-account lock or a promise chain that serializes transfers is also a valid answer. If the audit write must happen first, the balances have to be re-read after the await.

**Root cause vs. symptom:** making payroll call `transfer` one at a time (`for ... await`) hides the bug for payroll, but the bank method itself is still unsafe.

## Bug 2: weak amount validation, in `utils/validate.js`
`cents < 0` let `0` through, and `typeof cents !== 'number'` let `10.5` through.

**Fix:** `if (!Number.isInteger(cents) || cents <= 0) throw ...`.
