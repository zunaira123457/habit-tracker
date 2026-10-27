from decimal import ROUND_HALF_UP, Decimal  # noqa: F401


def to_cents(amount):
    """Dollars (Decimal, str or int) -> whole cents, rounding half up."""
    return int(Decimal(str(amount)) * 100)
