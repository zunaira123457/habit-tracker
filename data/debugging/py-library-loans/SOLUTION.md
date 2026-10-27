# Solution

## Bug 1: off-by-one in `utils/dates.py`
`days_between` returned `(end - start).days + 1`, counting both the start and end day. 3 days late was charged as 4.

**Fix:** return `(end - start).days`.

**Root cause vs. symptom:** the wrong fee shows up in `services/loans.py`, but the cause is the shared date helper. Subtracting 1 inside `late_fee_cents` would fix the fee but leave `days_between` wrong for everything else that uses it.

## Bug 2: wrong comparison in `services/loans.py`
`is_overdue` used `today >= due_date(loan)`, so the due date itself counted as overdue.

**Fix:** use `>`.
