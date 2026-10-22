"""Run the real unittest suite and save machine-readable and human reports."""
import argparse
import io
import json
import os
import platform
from pathlib import Path
import time
import unittest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-dir", type=Path, default=Path("../reports/backend"))
    args = parser.parse_args()
    args.report_dir.mkdir(parents=True, exist_ok=True)
    suite = unittest.defaultTestLoader.discover(str(Path(__file__).parent / "tests"))
    log = io.StringIO()
    started = time.perf_counter()
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    seconds = round(time.perf_counter() - started, 3)
    details = {
        "commit": os.environ.get("GITHUB_SHA", "local"),
        "python": platform.python_version(), "platform": platform.platform(),
        "tests_run": result.testsRun, "failures": len(result.failures),
        "errors": len(result.errors), "skipped": len(result.skipped),
        "successful": result.wasSuccessful(), "seconds": seconds,
        "failure_details": [{"test": str(test), "traceback": trace} for test, trace in result.failures + result.errors],
    }
    (args.report_dir / "regressions.json").write_text(json.dumps(details, indent=2), encoding="utf-8")
    (args.report_dir / "regressions.log").write_text(log.getvalue(), encoding="utf-8")
    summary = (f"## Backend regression results\n\n"
               f"| Tests | Failures | Errors | Skipped | Duration |\n|---:|---:|---:|---:|---:|\n"
               f"| {result.testsRun} | {len(result.failures)} | {len(result.errors)} | {len(result.skipped)} | {seconds}s |\n\n"
               f"Python {platform.python_version()}; {platform.system()}.\n")
    (args.report_dir / "summary.md").write_text(summary, encoding="utf-8")
    print(log.getvalue())
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
