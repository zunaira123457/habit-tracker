from services.pricing import invoice

COUPONS = {"SAVE10": 10}


def checkout(order, coupon=None):
    return invoice(order.lines, COUPONS.get(coupon, 0))
