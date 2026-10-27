# Solution

## Bug 1: zero isn't handled in `utils/base62.py`
`encode` builds digits with `while n > 0`. For `n == 0` the loop never runs, so it returns `""`. The shortener's first id is 0, so the first link got an empty code.

**Fix:** return `ALPHABET[0]` (`"0"`) when `n == 0`.

**Root cause vs. symptom:** starting the shortener's ids at 1 hides the symptom, but `encode(0)` is still wrong for every other caller. Fix the edge case in the encoder.
