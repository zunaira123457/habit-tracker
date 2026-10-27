class Task:
    def __init__(self, name, depends_on=()):
        self.name = name
        self.depends_on = list(depends_on)
