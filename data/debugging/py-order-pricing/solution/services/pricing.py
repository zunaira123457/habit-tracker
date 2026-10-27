from decimal import Decimal

from utils.money import to_cents

TAX_RATE = Decimal("0.0825")


def apply_discount(lines, percent):
    """Lines with `percent` off each unit price. The input lines are not modified."""
    factor = 1 - Decimal(percent) / 100
    return [{**line, "unit_price": line["unit_price"] * factor} for line in lines]


def invoice(lines, discount_percent=0):
    priced = apply_discount(lines, discount_percent) if discount_percent else lines
    subtotal = sum(line["unit_price"] * line["qty"] for line in priced)
    subtotal_cents = to_cents(subtotal)
    tax_cents = to_cents(subtotal * TAX_RATE)
    return {"subtotal_cents": subtotal_cents, "tax_cents": tax_cents, "total_cents": subtotal_cents + tax_cents}
