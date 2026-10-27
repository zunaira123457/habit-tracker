"""Runs a small Python project's tests.

Shared by the browser sandbox (Pyodide) and scripts/validate-challenges.mjs (CPython), so both
behave the same. Test files are plain modules with `test_*` functions (sync or async) that use
`assert`. Usage from the command line: python3 py_runner.py <project_root> <test_file>...
"""
import asyncio
import contextlib
import importlib
import importlib.util
import inspect
import io
import json
import os
import sys
import traceback


def _under(path, root):
    return bool(path) and os.path.abspath(str(path)).startswith(root + os.sep)


def _purge(root):
    """Forget modules imported from this project, so every run starts fresh."""
    for name, mod in list(sys.modules.items()):
        paths = [getattr(mod, "__file__", None)] + list(getattr(mod, "__path__", []) or [])
        if any(_under(p, root) for p in paths):
            del sys.modules[name]
    importlib.invalidate_caches()


def _describe(exc, root):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if _under(f.filename, root)]
    message = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
    if isinstance(exc, AssertionError) and not str(exc) and frames:
        message = f"AssertionError: {frames[-1].line}"
    trace = [f"{os.path.relpath(f.filename, root)}:{f.lineno}" for f in frames]
    return {"message": message, "trace": trace[-6:]}


async def run_tests(root, test_files):
    root = os.path.abspath(root)
    _purge(root)
    sys.path.insert(0, root)
    out = io.StringIO()
    results = []
    try:
        for rel in test_files:
            modname = "_challenge_test_" + rel.replace("/", "_").replace(".py", "")
            try:
                spec = importlib.util.spec_from_file_location(modname, os.path.join(root, rel))
                mod = importlib.util.module_from_spec(spec)
                with contextlib.redirect_stdout(out):
                    spec.loader.exec_module(mod)
            except Exception as exc:  # noqa: BLE001 - report any import error
                results.append({"file": rel, "name": "(loading the test file)", "ok": False, "error": _describe(exc, root)})
                continue
            tests = [(n, f) for n, f in vars(mod).items()
                     if n.startswith("test_") and inspect.isfunction(f) and f.__module__ == modname]
            for name, fn in tests:
                try:
                    with contextlib.redirect_stdout(out):
                        result = fn()
                        if inspect.isawaitable(result):
                            await asyncio.wait_for(result, timeout=5)
                    results.append({"file": rel, "name": name, "ok": True})
                except asyncio.TimeoutError:
                    results.append({"file": rel, "name": name, "ok": False,
                                    "error": {"message": "Timed out after 5s (is something never finishing?)", "trace": []}})
                except Exception as exc:  # noqa: BLE001
                    results.append({"file": rel, "name": name, "ok": False, "error": _describe(exc, root)})
    finally:
        if root in sys.path:
            sys.path.remove(root)
        _purge(root)
    passed = sum(1 for r in results if r["ok"])
    logs = out.getvalue()
    return {"results": results, "passed": passed, "failed": len(results) - passed,
            "total": len(results), "logs": logs.splitlines()[-200:]}


if __name__ == "__main__":
    print(json.dumps(asyncio.run(run_tests(sys.argv[1], sys.argv[2:]))))
