class Cart:
    def __init__(self, owner, items=[]):
        self.owner = owner
        self.items = items

    def add(self, product, qty=1):
        self.items.append((product, qty))
