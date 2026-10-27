from services.config import load_config


def test_environments_do_not_leak():
    load_config({"DB_HOST": "staging.db"})
    config = load_config({})
    assert config["db"]["host"] == "localhost", config["db"]


def test_debug_false():
    assert load_config({"DEBUG": "false"})["debug"] is False
