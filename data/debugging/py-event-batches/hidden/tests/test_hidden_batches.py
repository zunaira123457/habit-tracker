from models.event import Event
from services.batch import plan_batches
from services.dedupe import dedupe_ids
from utils.chunks import chunk


def test_dedupe_keeps_first_order():
    assert dedupe_ids([9, 3, 9, 7, 3, 1, 8]) == [9, 3, 7, 1, 8], dedupe_ids([9, 3, 9, 7, 3, 1, 8])


def test_chunk_exact_multiple():
    assert chunk([1, 2, 3, 4], 2) == [[1, 2], [3, 4]], chunk([1, 2, 3, 4], 2)


def test_chunk_short_last():
    assert chunk([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]], chunk([1, 2, 3, 4, 5], 2)


def test_single_chunk():
    assert chunk([1], 5) == [[1]], chunk([1], 5)


def test_plan():
    events = [Event(i, "view") for i in [5, 4, 5, 3, 2, 1]]
    assert plan_batches(events, 3) == [[5, 4, 3], [2, 1]], plan_batches(events, 3)
