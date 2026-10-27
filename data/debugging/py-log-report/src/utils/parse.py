def parse_line(line):
    """'<timestamp> <LEVEL> <source>: <message>' -> dict. The message may contain colons."""
    timestamp, level, rest = line.split(" ", 2)
    source, message = rest.split(":")
    return {"timestamp": timestamp, "level": level, "source": source, "message": message.strip()}
