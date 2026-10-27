from models.money import Money


class Account:
    def __init__(self, name, balance=None):
        self.name = name
        self.balance = balance if balance is not None else Money(0)
