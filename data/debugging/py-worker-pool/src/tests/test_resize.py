from models.job import Job
from services.resize import resize_batch


async def test_thumbnails_match_input_order():
    jobs = [Job(1, 0.03), Job(2, 0.01), Job(3, 0.02)]
    thumbs, _ = await resize_batch(jobs)
    assert thumbs == ["thumb-1", "thumb-2", "thumb-3"], thumbs
