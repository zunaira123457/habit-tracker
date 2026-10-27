from models.settings import Settings
from utils.merge import deep_merge
from utils.parse import parse_bool

DEFAULTS = {"debug": False, "db": {"host": "localhost", "port": 5432}, "features": {"beta": False}}


def load_config(env):
    override = {}
    if "DEBUG" in env:
        override["debug"] = parse_bool(env["DEBUG"])
    if "DB_HOST" in env:
        override["db"] = {"host": env["DB_HOST"]}
    if "BETA" in env:
        override["features"] = {"beta": parse_bool(env["BETA"])}
    return deep_merge(DEFAULTS, override)


def load_settings(env):
    return Settings(load_config(env))
