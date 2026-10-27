from decimal import Decimal

from models.order import Order
from services.checkout import checkout
from services.pricing import apply_discount
from utils.money import to_cents


def test_to_cents_rounds_half_up():
    assert to_cents(Decimal("0.825")) == 83, to_cents(Decimal("0.825"))
    assert to_cents("19.995") == 2000, to_cents("19.995")
    assert to_cents("1.004") == 100, to_cents("1.004")


def test_tax_on_ten_dollars():
    result = checkout(Order([("pen", "10.00", 1)]))
    assert result == {"subtotal_cents": 1000, "tax_cents": 83, "total_cents": 1083}, result


def test_coupon_total():
    result = checkout(Order([("mug", "12.00", 2)]), "SAVE10")
    assert result == {"subtotal_cents": 2160, "tax_cents": 178, "total_cents": 2338}, result


def test_discount_leaves_input_alone():
    order = Order([("a", "5.00", 1)])
    apply_discount(order.lines, 50)
    assert order.lines[0]["unit_price"] == Decimal("5.00"), order.lines[0]


def test_unknown_coupon():
    assert checkout(Order([("a", "2.00", 3)]), "NOPE")["subtotal_cents"] == 600
