from utils.parse import parse_line


def group_by_level(lines):
    groups = {}
    for line in lines:
        if line.strip():
            entry = parse_line(line)
            groups.setdefault(entry["level"], []).append(entry)
    return groups
