# Solution

## Bug 1: `deep_merge` changes `base`, in `utils/merge.py`
`result = base` doesn't copy anything. The function wrote the overrides straight into `DEFAULTS`, so every later `load_config` started from polluted defaults.

**Fix:** `result = dict(base)`. Nested dicts that get overridden are rebuilt by the recursive call, and ones that aren't are never modified. `copy.deepcopy(base)` also works.

**Root cause vs. symptom:** copying `DEFAULTS` inside `load_config` hides it there, but `deep_merge` still breaks its own contract for every other caller.

## Bug 2: `bool("false")` is `True`, in `utils/parse.py`
Any non-empty string is truthy in Python.

**Fix:** compare against an explicit set of true values.
