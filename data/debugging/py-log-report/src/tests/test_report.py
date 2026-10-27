from models.log_file import LogFile
from services.report import summary

LINES = [
    "2024-05-01T10:00:00Z INFO api: started",
    "2024-05-01T10:01:00Z ERROR db: connection refused",
    "2024-05-01T10:05:00Z ERROR db: timeout after 30s: retrying at 10:05:30",
]


def test_summary():
    result = summary(LogFile("api.log", LINES))
    assert result["first_error"] == "connection refused", result
    assert result["latest"] == ["timeout after 30s: retrying at 10:05:30", "connection refused"], result
