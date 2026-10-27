from models.log_file import LogFile
from services.aggregate import group_by_level
from services.report import latest_errors, summary
from utils.parse import parse_line


def test_parse_message_with_colons():
    entry = parse_line("2024-01-01T00:00:00Z WARN cache: key=a:b:c evicted")
    assert entry == {"timestamp": "2024-01-01T00:00:00Z", "level": "WARN", "source": "cache", "message": "key=a:b:c evicted"}, entry


def test_latest_errors_does_not_reorder_groups():
    groups = group_by_level([
        "2024-01-01T00:00:01Z ERROR a: one",
        "2024-01-01T00:00:02Z ERROR a: two",
        "2024-01-01T00:00:03Z ERROR a: three",
    ])
    assert [e["message"] for e in latest_errors(groups, 2)] == ["three", "two"]
    assert [e["message"] for e in groups["ERROR"]] == ["one", "two", "three"], groups["ERROR"]


def test_summary_counts_and_blank_lines():
    log = LogFile("x", ["", "2024-01-01T00:00:00Z INFO a: hi", "2024-01-01T00:00:09Z ERROR b: no: really", "  "])
    result = summary(log)
    assert result == {"first_error": "no: really", "latest": ["no: really"], "counts": {"INFO": 1, "ERROR": 1}}, result
