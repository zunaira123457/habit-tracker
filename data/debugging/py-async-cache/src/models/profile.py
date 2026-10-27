class Profile:
    def __init__(self, user_id, name):
        self.user_id = user_id
        self.name = name

    def __repr__(self):
        return f"Profile({self.user_id}, {self.name!r})"
