# Solution

## Bug 1: `Money.add` changes itself, in `models/money.py`
`add` did `self.cents += other.cents; return self`. That changes the **original** object. `services/fees.py` adds tax to the shared `MONTHLY_FEE` constant, so every charge permanently increased the constant.

**Fix:** return a new object: `return Money(self.cents + other.cents)`.

**Root cause vs. symptom:** the symptom is in `services/fees.py`. "Fixing" it there by copying `MONTHLY_FEE` before adding hides it, but any other caller (deposits, totals) that reuses a `Money` would hit the same problem. A value type must not modify itself.
