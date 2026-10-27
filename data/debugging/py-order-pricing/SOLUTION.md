# Solution

## Bug 1: `apply_discount` changes the order, in `services/pricing.py`
It wrote the discounted price back into each line dict. Those dicts belong to the `Order`, so every pricing call discounted the order again.

**Fix:** build new line dicts instead of modifying the caller's:
```python
factor = 1 - Decimal(percent) / 100
return [{**line, "unit_price": line["unit_price"] * factor} for line in lines]
```

**Root cause vs. symptom:** caching the invoice in `checkout` (so it's only priced once) hides the repeated discount, but the order data is still corrupted after the first call.

## Bug 2: truncation instead of rounding, in `utils/money.py`
`int(Decimal(...) * 100)` drops the fraction, so 82.5 cents became 82.

**Fix:** round half up before converting:
`int((Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))`.

**Root cause vs. symptom:** the wrong tax shows up in `services/pricing.py`, but the cause is the shared conversion helper. Adding `+ 0.005` to the tax would be a symptom patch that breaks other amounts.
