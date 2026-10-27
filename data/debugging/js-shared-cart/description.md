# Shared shopping carts

A grocery app keeps a cart per customer, built from a shared product catalog.

## Files
- `models/catalog.js`: the product catalog and `getProduct(sku)`
- `services/cart.js`: `Cart` with `add`, `total` and `receipt`
- `utils/money.js`: formats cents as dollars

## Expected behavior
- Each cart has its own line items. Adding to one cart never changes another cart or the catalog.
- Adding a SKU that's already in the cart increases that line's quantity.
- Money is shown with two decimals: `$1.50`, `$12.00`.

## Bug report
> Two customers added apples. When one bought 3 more, the other customer's cart showed 3 more too. Also, receipts show `$1.5` instead of `$1.50`.

There are **2 bugs**.
