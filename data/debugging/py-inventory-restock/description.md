# Restock report

A small inventory service produces a daily **restock report** for a warehouse.

## Files
- `models/item.py`: an `Item` with a SKU, name, quantity on hand and reorder level
- `services/inventory.py`: decides what needs restocking and how much to order
- `utils/format.py`: formats one line of the report

## Expected behavior
- An item needs restocking when its quantity is **at or below** its reorder level.
- The order amount brings stock up to **twice** the reorder level.
- Report lines look like `A1 Tape: order 8`, in the same order as the input.

## Bug report
> The warehouse ran out of glue even though it was on the reorder list at exactly its reorder level. It never showed up on the report.

There is **1 bug**. Run the visible tests to see it.
