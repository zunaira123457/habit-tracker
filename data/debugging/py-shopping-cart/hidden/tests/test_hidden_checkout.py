from models.cart import Cart
from models.product import Product
from services.checkout import cart_total, receipt


def test_new_carts_start_empty():
    Cart("x").add(Product("Pen", 100))
    assert Cart("y").items == [], Cart("y").items


def test_initial_items_are_copied():
    pen = Product("Pen", 100)
    start = [(pen, 1)]
    cart = Cart("z", start)
    start.append((pen, 5))
    assert cart_total(cart) == 100, cart_total(cart)


def test_receipt():
    cart = Cart("q")
    cart.add(Product("Tea", 250), 2)
    assert receipt(cart) == ["2 x Tea", "Total: 500"], receipt(cart)
