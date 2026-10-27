# Solution

## Bug 1: 1-based month passed to `Date.UTC`, in `utils/dates.js`
JavaScript months are **0-based** in `Date.UTC(year, monthIndex, day)`, but the date strings are 1-based. Every date was parsed one month late, and invalid days rolled over (Jan 30 became Mar 1 and Feb 2 became Mar 2), so night counts across month ends came out wrong.

**Fix:** `Date.UTC(y, m - 1, d)`.

**Root cause vs. symptom:** the bad price shows up in `services/booking.js`. Adding special cases for month ends there would be a symptom patch.

## Bug 2: inclusive overlap check, in `services/booking.js`
`a.checkIn <= b.checkOut && b.checkIn <= a.checkOut` treats touching ranges as overlapping. Check-out day is free, so ranges are half-open `[checkIn, checkOut)`.

**Fix:** use `<` on both sides.
