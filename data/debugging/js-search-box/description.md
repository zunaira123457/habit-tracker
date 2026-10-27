# Stale search results

A search box queries an API as the user types.

## Files
- `services/search.js`: `SearchBox`. `run(query)` fetches results; `typed(query)` is the debounced version used by the UI
- `utils/debounce.js`: `debounce(fn, ms)`
- `models/search-api.js`: `FakeSearchApi`, a test double whose response time you can set per query

## Expected behavior
- `results` always shows the results for the **most recent** query, even if responses arrive out of order.
- `debounce(fn, ms)` calls `fn` once, with the **last** arguments, after calls have stopped for `ms` milliseconds.
- Typing `c`, `ca`, `cat` quickly makes **one** API request, for `cat`.

## Bug report
> If you type "cat" and then quickly fix it to "car", the results sometimes show cats. The API team also says every keystroke hits the server.

There are **2 bugs**, in different files.
