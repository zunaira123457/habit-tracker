# Coupons and cents

A checkout service prices orders, with optional coupons and sales tax.

## Files
- `models/order.py`: an `Order` holding line items (`{"sku", "unit_price", "qty"}`, prices as `Decimal` dollars)
- `services/checkout.py`: applies coupon codes
- `services/pricing.py`: discounts and the invoice math
- `utils/money.py`: converts dollar amounts to whole cents

## Expected behavior
- `SAVE10` takes 10% off every unit price. Pricing an order **never changes the order**: pricing the same order twice gives the same result.
- Tax is 8.25% of the subtotal.
- `to_cents` converts dollars to whole cents, **rounding half up**: `0.825` dollars is 83 cents and `19.995` is 2000.
- The invoice has `subtotal_cents`, `tax_cents` and `total_cents = subtotal_cents + tax_cents`.

## Bug report
> A customer with SAVE10 refreshed the checkout page and the price dropped again: 10% off, then 19% off, then 27% off. Separately, accounting says tax is regularly 1 cent short.

There are **2 bugs**, in different files.
