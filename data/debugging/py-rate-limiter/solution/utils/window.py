class SlidingWindow:
    """Request timestamps for one client, oldest first."""

    def __init__(self, seconds):
        self.seconds = seconds
        self.times = []

    def add(self, t):
        self.times.append(t)

    def _expired(self, t, now):
        return t <= now - self.seconds

    def evict_expired(self, now):
        while self.times and self._expired(self.times[0], now):
            self.times.pop(0)

    def __len__(self):
        return len(self.times)
