# Solution

## Bug 1: splitting on every colon, in `utils/parse.py`
`rest.split(":")` splits the message too, so any message containing a colon produced 3+ parts and the unpacking raised `ValueError`.

**Fix:** `rest.split(":", 1)`, splitting only on the first colon.

**Root cause vs. symptom:** the crash surfaces in `services/report.py` when it builds the summary. Wrapping the parse in `try/except` and skipping bad lines (what the team tried first) hides the crash but silently drops real errors.

## Bug 2: sorting the caller's list in place, in `services/report.py`
`latest_errors` called `errors.sort(...)` on the list stored inside `groups`. That reordered the shared list newest-first, so `first_error`, which reads `groups["ERROR"][0]` afterwards, got the newest error.

**Fix:** `sorted(...)` makes a new list and leaves `groups` alone.
