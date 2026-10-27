# The growing monthly fee

A small bank app tracks account balances with a `Money` value type.

## Files
- `models/money.py`: `Money`, an amount in cents
- `models/account.py`: an `Account` with a name and a `Money` balance
- `services/ledger.py`: deposits and totals
- `services/fees.py`: the monthly fee, plus tax

## Expected behavior
- `Money` behaves like a **value**: `a.add(b)` returns a new `Money` and never changes `a` or `b`.
- The monthly fee is 500¢ plus tax, and it's the same every month.
- Deposits and totals add up correctly.

## Bug report
> The monthly fee keeps growing: $5.40 the first month, $5.80 the next, then $6.20. Nobody changed the fee.

There is **1 bug**, and the symptom isn't where the cause is.
