# Lost cents

A billing service builds invoices and splits them between people.

## Files
- `models/line-item.js`: a `LineItem` (description, price in dollars as a number, quantity)
- `services/invoice.js`: `invoiceTotal(lines, taxRate)` and `splitEvenly(totalCents, people)`
- `utils/currency.js`: dollars → cents, and formatting

## Expected behavior
- `toCents(19.99)` is `1999`, rounded to the nearest cent even when floating point gives `1998.9999…`.
- `invoiceTotal` returns `{ subtotal, tax, total, display }` in cents, with tax rounded to the nearest cent and `display` like `$43.19`.
- `splitEvenly(total, people)` returns shares that are as equal as possible and **add up exactly to the total**. Leftover cents go to the first people in the list.

## Bug report
> Customers buying a $19.99 item are billed $19.98. And when 3 people split a $100.00 bill, they're each asked for $33.33, so the restaurant is short a cent.

There are **2 bugs**.
