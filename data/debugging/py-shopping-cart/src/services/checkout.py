def cart_total(cart):
    return sum(product.price_cents * qty for product, qty in cart.items)


def receipt(cart):
    lines = [f"{qty} x {product.name}" for product, qty in cart.items]
    return lines + [f"Total: {cart_total(cart)}"]
