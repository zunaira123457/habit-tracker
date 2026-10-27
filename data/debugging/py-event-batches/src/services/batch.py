from services.dedupe import dedupe_ids
from utils.chunks import chunk


def plan_batches(events, size):
    return chunk(dedupe_ids([e.id for e in events]), size)
