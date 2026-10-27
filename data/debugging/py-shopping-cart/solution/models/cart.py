class Cart:
    def __init__(self, owner, items=None):
        self.owner = owner
        self.items = list(items) if items else []

    def add(self, product, qty=1):
        self.items.append((product, qty))
