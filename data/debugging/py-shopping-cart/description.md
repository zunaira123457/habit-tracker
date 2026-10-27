# Carts that share items

An online shop keeps a `Cart` per customer and totals it at checkout.

## Files
- `models/product.py`: a `Product` with a name and a price in cents
- `models/cart.py`: a customer's `Cart`
- `services/checkout.py`: totals a cart and prints a receipt

## Expected behavior
- Each cart owns its own list of items. Adding to one cart never changes another cart.
- A cart can start with some items: `Cart("ana", [(apple, 2)])`. Changing the list you passed in afterwards doesn't change the cart.
- `cart_total` returns the total in cents.

## Bug report
> Customer B's receipt included the apples customer A added. It gets worse the more carts are created.

There is **1 bug**.
