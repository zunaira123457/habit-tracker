from models.task import Task
from services.planner import build_plan


def test_duplicate_dependency_keeps_every_task():
    tasks = [Task("build"), Task("test", ["build", "build"]), Task("deploy", ["test"])]
    assert build_plan(tasks) == ["1. build", "2. test", "3. deploy"], build_plan(tasks)
