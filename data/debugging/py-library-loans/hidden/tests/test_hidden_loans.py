from datetime import date

from models.loan import Loan
from services.loans import due_date, is_overdue, late_fee_cents
from utils.dates import days_between

LOAN = Loan("Emma", "bo", date(2024, 1, 25))


def test_due_date_crosses_month():
    assert due_date(LOAN) == date(2024, 2, 8), due_date(LOAN)


def test_on_due_date_is_not_overdue():
    assert is_overdue(LOAN, date(2024, 2, 8)) is False
    assert late_fee_cents(LOAN, date(2024, 2, 8)) == 0


def test_one_day_late():
    assert is_overdue(LOAN, date(2024, 2, 9)) is True
    assert late_fee_cents(LOAN, date(2024, 2, 9)) == 25, late_fee_cents(LOAN, date(2024, 2, 9))


def test_ten_days_late():
    assert late_fee_cents(LOAN, date(2024, 2, 18)) == 250, late_fee_cents(LOAN, date(2024, 2, 18))


def test_days_between():
    assert days_between(date(2024, 5, 1), date(2024, 5, 1)) == 0
    assert days_between(date(2024, 2, 28), date(2024, 3, 1)) == 2
