from services.scheduler import schedule


def build_plan(tasks):
    names = [t.name for t in tasks]
    deps = [(dep, t.name) for t in tasks for dep in t.depends_on]
    return [f"{i + 1}. {name}" for i, name in enumerate(schedule(names, deps))]
