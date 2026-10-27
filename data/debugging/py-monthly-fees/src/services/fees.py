from models.money import Money

MONTHLY_FEE = Money(500)


def monthly_fee_with_tax(tax):
    return MONTHLY_FEE.add(tax)
