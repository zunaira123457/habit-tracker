def parse_bool(text):
    """'1', 'true', 'yes', 'on' (any case) -> True; anything else -> False."""
    return bool(text.strip())
