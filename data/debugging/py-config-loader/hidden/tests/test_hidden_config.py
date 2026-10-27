from services.config import DEFAULTS, load_settings
from utils.merge import deep_merge
from utils.parse import parse_bool


def test_merge_does_not_modify_inputs():
    base = {"a": {"x": 1, "y": 2}, "b": 1}
    override = {"a": {"y": 3}}
    merged = deep_merge(base, override)
    assert merged == {"a": {"x": 1, "y": 3}, "b": 1}, merged
    assert base == {"a": {"x": 1, "y": 2}, "b": 1}, base


def test_defaults_untouched():
    load_settings({"DB_HOST": "x", "BETA": "yes", "DEBUG": "1"})
    assert DEFAULTS == {"debug": False, "db": {"host": "localhost", "port": 5432}, "features": {"beta": False}}, DEFAULTS


def test_parse_bool():
    assert [parse_bool(s) for s in ["1", "TRUE", " yes ", "On"]] == [True] * 4
    assert [parse_bool(s) for s in ["0", "false", "no", "off", ""]] == [False] * 5


def test_settings():
    s = load_settings({"DB_HOST": "db.internal", "BETA": "no"})
    assert (s.db_host, s.db_port, s.beta, s.debug) == ("db.internal", 5432, False, False), vars(s)
