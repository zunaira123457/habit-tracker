# Sticky config

A service builds its configuration from defaults plus environment variables.

## Files
- `services/config.py`: the defaults and `load_config(env)`
- `utils/merge.py`: deep-merges two nested dicts
- `utils/parse.py`: parses environment strings
- `models/settings.py`: a typed view of the final config

## Expected behavior
- `deep_merge(base, override)` returns a **new** dict. Neither input is modified.
- `load_config` always starts from the same defaults. Loading one environment must not affect the next.
- `parse_bool` treats `1/true/yes/on` (any case) as `True` and everything else (`false`, `0`, `no`, ``) as `False`.

## Bug report
> In our test suite, once one test set `DB_HOST`, every later test talked to that host. Also, `DEBUG=false` turned debug mode **on**.

There are **2 bugs**.
