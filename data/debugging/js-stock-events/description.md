# Skipped listeners

An inventory service emits events when stock changes; other parts of the app subscribe.

## Files
- `utils/emitter.js`: a small `Emitter` with `on`, `once`, `off`, `emit`
- `services/inventory.js`: `Inventory`, which emits `low-stock` when an item drops below 5
- `models/stock-item.js`: a `StockItem` (sku + quantity)

## Expected behavior
- `emit` calls **every** listener that was registered for the event when `emit` started, in the order they were added.
- A `once` listener runs one time, then is removed.
- A listener removing itself (or another listener) during `emit` doesn't stop the other listeners from running.

## Bug report
> The first low-stock alert of the day goes to the "send welcome email to new ops lead" one-time hook, and the warehouse team's alert never fires. After that, alerts work normally.

There is **1 bug**, and the symptom isn't where the cause is.
