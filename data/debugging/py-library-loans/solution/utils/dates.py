from datetime import timedelta


def add_days(d, days):
    return d + timedelta(days=days)


def days_between(start, end):
    """Number of days from start to end (0 for the same day)."""
    return (end - start).days
