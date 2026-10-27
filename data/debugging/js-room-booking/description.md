# Room booking dates

A small hotel books rooms by night.

## Files
- `models/booking.js`: a `Booking` (guest, check-in date, check-out date, as `YYYY-MM-DD` strings)
- `services/booking.js`: overlap checks and pricing
- `utils/dates.js`: parsing and night counting

## Expected behavior
- `nightsBetween('2024-01-30', '2024-02-02')` is 3. It must work across month and year ends.
- The check-out day is free for the next guest: a stay ending on the 5th does **not** overlap one starting on the 5th.
- `canBook(existing, request)` is true when the request overlaps none of the existing bookings.
- `price(booking, nightlyCents)` = nights × nightly rate.

## Bug report
> We can't book a guest checking in the day the previous guest checks out. And a 3-night stay from Jan 30 to Feb 2 was charged as a single night.

There are **2 bugs**.
