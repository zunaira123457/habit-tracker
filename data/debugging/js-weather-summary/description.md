# No readings today

A weather dashboard summarizes each station's temperature readings for the day.

## Files
- `models/reading.js`: a `Reading` (Celsius value + whether the sensor marked it valid)
- `services/weather.js`: `dailySummary(readings)`
- `utils/stats.js`: `max` and `mean`
- `utils/format.js`: rounds to one decimal place

## Expected behavior
- `dailySummary` uses only valid readings and returns `{ high, average, count }`, with the average rounded to 1 decimal place.
- If there are **no** valid readings, it returns `{ high: null, average: null, count: 0 }`, so the dashboard shows "No data".

## Bug report
> A station whose sensor was offline all day showed a high of -Infinity°C and an average of NaN°C.

There is **1 bug**.
