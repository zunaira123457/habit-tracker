# Solution

## Bug 1: shared default list in `models/cart.py`
`def __init__(self, owner, items=[])` creates the default list **once**, when the function is defined. Every cart created without items shares that same list, so `add` on one cart changes all of them. Passing a list also stored the caller's list itself, so later changes to it leaked into the cart.

**Fix:** default to `None` and build a fresh list: `self.items = list(items) if items else []`.

**Root cause vs. symptom:** clearing the cart in `checkout` or after each receipt hides the symptom. The cause is the mutable default argument, a classic Python aliasing bug.
