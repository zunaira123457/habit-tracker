from models.student import Student
from services.report import class_report


def test_b_student():
    rows = class_report([Student("Ana", [90, 80, 70])])
    assert rows == [("Ana", 80.0, "B")], f"got {rows}"
