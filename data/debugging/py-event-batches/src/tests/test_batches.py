from models.event import Event
from services.batch import plan_batches


def test_batches_keep_order_and_everything():
    events = [Event(i, "click") for i in [30, 10, 20, 10, 40]]
    batches = plan_batches(events, 2)
    assert batches == [[30, 10], [20, 40]], batches
