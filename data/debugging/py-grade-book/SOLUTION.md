# Solution

## Bug 1: off-by-one loop in `utils/stats.py`
`average` looped over `range(len(values) - 1)`, so it never added the last score, but still divided by the full count. Every average came out too low.

**Fix:** loop over `range(len(values))`, or just use `sum(values) / len(values)`.

**Root cause vs. symptom:** the symptom shows up in `services/report.py` (wrong letter grades), but the cause is in the shared helper. Adjusting the grade boundaries in the report would only hide it.
