# The first short link

A URL shortener gives each link an increasing numeric id and turns it into a short base-62 code.

## Files
- `models/link.py`: a `Link` (code + URL)
- `services/shortener.py`: creates and resolves links
- `utils/base62.py`: encodes and decodes ids

## Expected behavior
- Ids start at 0. Every id maps to a **non-empty** code, and `decode(encode(n)) == n` for every n ≥ 0.
- `resolve(code)` returns the original URL, or raises `KeyError` for unknown codes.

## Bug report
> The first link anyone created came back with an empty code, so `https://sho.rt/` showed the home page instead of redirecting.

There is **1 bug**.
