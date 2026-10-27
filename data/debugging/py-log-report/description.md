# Log report

An ops dashboard parses service logs and shows a summary.

## Files
- `models/log_file.py`: a `LogFile` (name + lines)
- `utils/parse.py`: parses one log line
- `services/aggregate.py`: groups entries by level
- `services/report.py`: builds the dashboard summary

## Expected behavior
- Lines look like `2024-05-01T10:00:00Z ERROR db: timeout after 30s: retrying`. The source is everything before the **first** colon after the level; the message is everything after it, and may itself contain colons.
- Blank lines are skipped.
- `latest_errors(groups, n)` returns the `n` most recent errors, newest first, **without changing `groups`**.
- `summary(log_file)` returns `{"first_error": ..., "latest": [...], "counts": {...}}`, where `first_error` is the **earliest** error message.

## Bug report
> The dashboard crashed on a log line with a timestamp in the message (`ValueError: too many values to unpack`). Once we skipped those lines, "first error" started showing the most recent error instead of the first.

There are **2 bugs**.
