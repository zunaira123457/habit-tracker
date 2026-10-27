from models.money import Money


def deposit(account, amount):
    account.balance = account.balance.add(amount)


def total_balance(accounts):
    total = Money(0)
    for a in accounts:
        total = total.add(a.balance)
    return total
