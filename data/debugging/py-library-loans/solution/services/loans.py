from utils.dates import add_days, days_between

LOAN_DAYS = 14
FEE_PER_DAY_CENTS = 25


def due_date(loan):
    return add_days(loan.borrowed_on, LOAN_DAYS)


def is_overdue(loan, today):
    return today > due_date(loan)


def late_fee_cents(loan, today):
    if not is_overdue(loan, today):
        return 0
    return days_between(due_date(loan), today) * FEE_PER_DAY_CENTS
