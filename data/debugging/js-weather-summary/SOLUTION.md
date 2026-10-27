# Solution

## Bug 1: the empty case isn't handled, in `services/weather.js`
With no valid readings, `Math.max(...[])` is `-Infinity` and the mean is `0 / 0 = NaN`.

**Fix:** return `{ high: null, average: null, count: 0 }` from `dailySummary` when `temps` is empty.

**Root cause vs. symptom:** hiding `-Infinity`/`NaN` in the dashboard's display code is a symptom patch. The summary should return a clear "no data" value.
