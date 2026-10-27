# Staff directory order

An intranet page lists staff alphabetically.

## Files
- `models/person.js`: a `Person` with first and last name
- `services/directory.js`: `sortedDirectory(people)` returns display names
- `utils/compare.js`: the sort comparator

## Expected behavior
- Sort by last name, then by first name when last names match.
- Display names look like `Lee, Ana`.
- The input array isn't modified.

## Bug report
> The directory is mostly in order, but some people appear in random spots, and two people named Lee are in the wrong order.

There is **1 bug**.
