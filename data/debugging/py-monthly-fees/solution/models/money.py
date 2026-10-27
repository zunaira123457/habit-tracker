class Money:
    def __init__(self, cents):
        self.cents = cents

    def add(self, other):
        return Money(self.cents + other.cents)

    def __eq__(self, other):
        return isinstance(other, Money) and self.cents == other.cents

    def __repr__(self):
        return f"Money({self.cents})"
