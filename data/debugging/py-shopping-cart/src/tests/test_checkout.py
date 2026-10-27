from models.cart import Cart
from models.product import Product
from services.checkout import cart_total


def test_two_customers_have_separate_carts():
    apple, bread = Product("Apple", 50), Product("Bread", 300)
    a, b = Cart("ana"), Cart("ben")
    a.add(apple, 2)
    b.add(bread)
    assert cart_total(b) == 300, f"Ben's total was {cart_total(b)}"
