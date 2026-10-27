import time


class Clock:
    def now(self):
        """Current time in seconds."""
        return time.monotonic()


class FakeClock(Clock):
    def __init__(self, start=0.0):
        self.t = start

    def advance(self, seconds):
        self.t += seconds

    def now(self):
        return self.t
