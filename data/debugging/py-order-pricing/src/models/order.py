from decimal import Decimal


class Order:
    def __init__(self, lines):
        self.lines = [{"sku": sku, "unit_price": Decimal(price), "qty": qty} for sku, price, qty in lines]
