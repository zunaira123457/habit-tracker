# Library late fees

A library tracks loans and charges a late fee per day overdue.

## Files
- `models/loan.py`: a `Loan` (book, member, the date it was borrowed)
- `services/loans.py`: due dates, overdue checks and late fees
- `utils/dates.py`: date helpers shared across the app

## Expected behavior
- A loan is due **14 days** after it was borrowed.
- Returning a book **on** its due date is on time. It's overdue only **after** the due date.
- The late fee is 25¢ per day late: 1 day late is 25¢, 3 days late is 75¢.
- `days_between(start, end)` is the number of days from `start` to `end`: 0 for the same day, 1 for the next day.

## Bug report
> A member returned a book on the due date and was told it was overdue. Another member was 3 days late and was charged $1.00 instead of 75¢.

There are **2 bugs**, in different files.
