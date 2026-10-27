# Concurrent transfers

A small bank service moves money between accounts and writes every transfer to an audit log.

## Files
- `services/bank.js`: `Bank` with `open`, `balance` and `async transfer(from, to, cents)`
- `models/audit-log.js`: `AuditLog`, whose `log()` is async (it simulates a network write)
- `utils/validate.js`: `validateAmount(cents)`

## Expected behavior
- A transfer moves exactly `cents` from one account to another. The total money in the bank never changes.
- Transfers can run **concurrently** (the app doesn't wait for one to finish before starting the next). The final balances must be the same as if they had run one at a time.
- Insufficient funds throws `Insufficient funds` and changes nothing.
- The amount must be a **positive whole number** of cents. Anything else (0, negative, 10.5, `"100"`) throws `Invalid amount` and changes nothing.
- Every successful transfer is written to the audit log.

## Bug report
> During payroll, 50 transfers out of the company account ran in parallel. The company was debited for only one of them, and employees received the rest out of thin air. Also, someone made 0-cent transfers to flood the audit log.

There are **2 bugs**, in different files.
