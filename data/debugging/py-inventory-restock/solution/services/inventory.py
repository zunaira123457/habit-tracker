from utils.format import format_restock_line

RESTOCK_TARGET_MULTIPLIER = 2


def needs_restock(item):
    """An item needs restocking when its quantity is at or below its reorder level."""
    return item.quantity <= item.reorder_level


def restock_amount(item):
    """Order enough to bring stock up to twice the reorder level."""
    return item.reorder_level * RESTOCK_TARGET_MULTIPLIER - item.quantity


def restock_report(items):
    return [format_restock_line(i, restock_amount(i)) for i in items if needs_restock(i)]
