from models.item import Item
from services.inventory import needs_restock, restock_amount, restock_report


def test_at_level_needs_restock():
    assert needs_restock(Item("X", "x", 3, 3)) is True


def test_above_level_does_not():
    assert needs_restock(Item("X", "x", 4, 3)) is False


def test_empty_shelf():
    assert restock_amount(Item("X", "x", 0, 4)) == 8


def test_report_keeps_input_order_and_skips_stocked_items():
    items = [Item("C", "Cups", 10, 10), Item("D", "Dice", 11, 10), Item("E", "Eggs", 1, 6)]
    report = restock_report(items)
    assert report == ["C Cups: order 10", "E Eggs: order 11"], f"got {report}"
