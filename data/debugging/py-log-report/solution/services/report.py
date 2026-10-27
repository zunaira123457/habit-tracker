from services.aggregate import group_by_level


def latest_errors(groups, n):
    """The n most recent errors, newest first. Does not modify groups."""
    errors = sorted(groups.get("ERROR", []), key=lambda e: e["timestamp"], reverse=True)
    return errors[:n]


def summary(log_file, n=2):
    groups = group_by_level(log_file.lines)
    latest = latest_errors(groups, n)
    errors = groups.get("ERROR", [])
    return {
        "first_error": errors[0]["message"] if errors else None,
        "latest": [e["message"] for e in latest],
        "counts": {level: len(entries) for level, entries in groups.items()},
    }
