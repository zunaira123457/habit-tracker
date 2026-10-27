class Client:
    def __init__(self, client_id, plan="free"):
        self.client_id = client_id
        self.plan = plan

    def label(self):
        return f"{self.client_id} ({self.plan})"
