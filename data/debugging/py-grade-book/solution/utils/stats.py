def average(values):
    if not values:
        return 0.0
    total = 0
    for i in range(len(values)):
        total += values[i]
    return total / len(values)
