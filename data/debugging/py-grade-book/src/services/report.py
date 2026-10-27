from utils.stats import average


def letter_grade(avg):
    if avg >= 90:
        return "A"
    if avg >= 80:
        return "B"
    if avg >= 70:
        return "C"
    if avg >= 60:
        return "D"
    return "F"


def class_report(students):
    rows = []
    for s in students:
        avg = average(s.scores)
        rows.append((s.name, round(avg, 1), letter_grade(avg)))
    return rows
