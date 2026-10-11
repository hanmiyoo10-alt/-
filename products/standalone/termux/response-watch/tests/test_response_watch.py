import importlib.util
import json
import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

MODULE_PATH = Path(__file__).resolve().parents[1] / "response_watch.py"
spec = importlib.util.spec_from_file_location("response_watch", MODULE_PATH)
rw = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(rw)


class ResponseWatchTests(unittest.TestCase):
    def test_format_elapsed(self):
        self.assertEqual(rw.format_elapsed(-1), "00:00")
        self.assertEqual(rw.format_elapsed(65.9), "01:05")
        self.assertEqual(rw.format_elapsed(3661), "01:01:01")

    def test_atomic_state_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "state.json"
            rw.atomic_write_json(path, {"status": "running", "schema": 1})
            self.assertEqual(rw.load_state(path)["status"], "running")
            self.assertTrue(path.read_text(encoding="utf-8").endswith("\n"))

    def test_progress_reuses_fixed_notification_id(self):
        calls = []

        def fake_runner(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        rw.Notifier(fake_runner).progress(12.3, "13:24:00")
        args = calls[0]
        self.assertIn("--ongoing", args)
        self.assertEqual(args[args.index("--id") + 1], rw.NOTIFICATION_ID)
        self.assertTrue(any("00:12" in part for part in args))

    def test_complete_alerts_without_ongoing(self):
        calls = []

        def fake_runner(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        rw.Notifier(fake_runner).complete(5)
        args = calls[0]
        self.assertNotIn("--ongoing", args)
        self.assertIn("--sound", args)
        self.assertIn("--vibrate", args)
        self.assertEqual(args[args.index("--id") + 1], rw.NOTIFICATION_ID)

    def test_elapsed_uses_end_when_present(self):
        state = {"started_monotonic": 100.0, "ended_monotonic": 104.25}
        self.assertAlmostEqual(rw.elapsed_from_state(state, lambda: 999.0), 4.25)

    def test_dead_running_pid_becomes_stale(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.dict(os.environ, {"TERMUX_RESPONSE_WATCH_STATE_DIR": tmp}):
                rw.atomic_write_json(rw.state_path(), {
                    "status": "running",
                    "session_id": "abc",
                    "pid": 999999999,
                    "started_monotonic": time.monotonic() - 2,
                    "started_at": rw.now_iso(),
                })
                result = rw.normalize_stale_state(rw.load_state())
                self.assertEqual(result["status"], "stale")
                persisted = json.loads(rw.state_path().read_text(encoding="utf-8"))
                self.assertEqual(persisted["status"], "stale")


if __name__ == "__main__":
    unittest.main()
