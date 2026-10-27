from models.item import Item
from services.inventory import restock_report


def test_item_below_reorder_level_is_reported():
    report = restock_report([Item("A1", "Tape", 2, 5)])
    assert report == ["A1 Tape: order 8"], f"got {report}"


def test_item_at_reorder_level_is_reported():
    report = restock_report([Item("B2", "Glue", 5, 5)])
    assert report == ["B2 Glue: order 5"], f"got {report}"
