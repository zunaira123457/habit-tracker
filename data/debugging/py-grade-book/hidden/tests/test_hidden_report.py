from models.student import Student
from services.report import class_report, letter_grade
from utils.stats import average


def test_average_uses_every_score():
    assert average([4, 4, 4, 8]) == 5.0, average([4, 4, 4, 8])


def test_single_score():
    assert average([77]) == 77.0, average([77])


def test_no_scores():
    assert average([]) == 0.0


def test_boundaries():
    assert [letter_grade(x) for x in (90, 89.9, 80, 70, 60, 59)] == ["A", "B", "B", "C", "D", "F"]


def test_report_rounds_and_keeps_order():
    rows = class_report([Student("Bo", [100, 95]), Student("Cy", [61, 62, 64])])
    assert rows == [("Bo", 97.5, "A"), ("Cy", 62.3, "D")], f"got {rows}"
