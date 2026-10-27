class Settings:
    def __init__(self, config):
        self.debug = config["debug"]
        self.db_host = config["db"]["host"]
        self.db_port = config["db"]["port"]
        self.beta = config["features"]["beta"]
