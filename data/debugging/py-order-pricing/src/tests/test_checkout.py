from models.order import Order
from services.checkout import checkout


def test_pricing_twice_gives_the_same_total():
    order = Order([("mug", "12.00", 2)])
    first = checkout(order, "SAVE10")
    second = checkout(order, "SAVE10")
    assert first == second, f"{first} then {second}"
