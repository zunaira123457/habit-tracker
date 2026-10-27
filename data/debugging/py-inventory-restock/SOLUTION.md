# Solution

## Bug 1: wrong comparison in `services/inventory.py`
`needs_restock` used `item.quantity < item.reorder_level`. The rule is "at **or below**", so an item sitting exactly at its reorder level was skipped.

**Fix:** use `<=`.

**Root cause vs. symptom:** special-casing "quantity equals reorder level" in `restock_report`, or lowering every reorder level by one, would hide the symptom. The real fix is the comparison in the one function that owns the rule.
