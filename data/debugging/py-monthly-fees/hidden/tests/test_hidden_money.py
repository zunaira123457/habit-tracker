from models.account import Account
from models.money import Money
from services.ledger import deposit, total_balance


def test_add_returns_new_value():
    a, b = Money(100), Money(25)
    c = a.add(b)
    assert c == Money(125) and a == Money(100) and b == Money(25), (a, b, c)


def test_same_deposit_reused():
    ten = Money(1000)
    x, y = Account("x"), Account("y", Money(500))
    deposit(x, ten)
    deposit(y, ten)
    assert ten == Money(1000), ten
    assert x.balance == Money(1000) and y.balance == Money(1500), (x.balance, y.balance)


def test_total_does_not_change_accounts():
    accounts = [Account("a", Money(300)), Account("b", Money(200))]
    assert total_balance(accounts) == Money(500)
    assert accounts[0].balance == Money(300), accounts[0].balance
