from models.money import Money
from services.fees import monthly_fee_with_tax


def test_fee_is_the_same_every_month():
    first = monthly_fee_with_tax(Money(40))
    second = monthly_fee_with_tax(Money(40))
    assert first == Money(540), first
    assert second == Money(540), second
