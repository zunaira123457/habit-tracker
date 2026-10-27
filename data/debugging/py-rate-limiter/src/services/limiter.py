from utils.window import SlidingWindow


class RateLimiter:
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window_seconds = window_seconds
        self.windows = {}

    def allow(self, client_id, now):
        window = self.windows.setdefault(client_id, SlidingWindow(self.window_seconds))
        window.evict_expired(now)
        if len(window) >= self.limit:
            return False
        window.add(now)
        return True

    def log_line(self, client, now):
        return f"{client.label()} {'allowed' if self.allow(client.client_id, now) else 'denied'}"
