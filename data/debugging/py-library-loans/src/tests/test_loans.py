from datetime import date

from models.loan import Loan
from services.loans import late_fee_cents


def test_three_days_late():
    loan = Loan("Dune", "ana", date(2024, 3, 1))
    fee = late_fee_cents(loan, date(2024, 3, 18))
    assert fee == 75, f"charged {fee} cents"
