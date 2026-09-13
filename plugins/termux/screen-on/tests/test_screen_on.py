import subprocess
import unittest
from pathlib import Path
import importlib.util

MODULE_PATH = Path(__file__).resolve().parents[1] / "screen_on.py"
spec = importlib.util.spec_from_file_location("screen_on", MODULE_PATH)
screen_on = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(screen_on)


class FakeRunner:
    def __init__(self):
        self.calls = []
        self.package_present = True
        self.receiver_present = True
        self.broadcast_stdout = "Broadcasting: Intent {}\nBroadcast completed: result=0\n"
        self.broadcast_returncode = 0
        self.setup_returncode = 0

    def __call__(self, args, **kwargs):
        self.calls.append(list(args))
        if args[:2] == ["pm", "path"]:
            if self.package_present:
                return subprocess.CompletedProcess(args, 0, "package:/fake/base.apk\n", "")
            return subprocess.CompletedProcess(args, 1, "", "package not found")

        if args[:3] == ["cmd", "package", "query-receivers"]:
            stdout = f"{screen_on.RECEIVER}\n" if self.receiver_present else "No receivers found\n"
            return subprocess.CompletedProcess(args, 0, stdout, "")

        if args[:3] == ["cmd", "activity", "broadcast"]:
            return subprocess.CompletedProcess(
                args,
                self.broadcast_returncode,
                self.broadcast_stdout,
                "broadcast failed" if self.broadcast_returncode else "",
            )

        if args[:2] == ["am", "start"]:
            return subprocess.CompletedProcess(
                args,
                self.setup_returncode,
                "Starting: Intent {}\n" if not self.setup_returncode else "",
                "start failed" if self.setup_returncode else "",
            )

        raise AssertionError(f"unexpected command: {args}")


class ScreenOnTests(unittest.TestCase):
    def test_doctor_reports_transport_ready_but_effect_unknown(self):
        runner = FakeRunner()
        lines = screen_on.command_doctor(runner)
        self.assertIn("transport_ready=YES", lines)
        self.assertIn("overlay_permission=UNKNOWN", lines)
        self.assertIn("keep_awake_ready=UNKNOWN", lines)

    def test_on_sends_explicit_add_broadcast_and_preserves_unknown_effect(self):
        runner = FakeRunner()
        lines = screen_on.command_on(runner)
        broadcast = next(call for call in runner.calls if call[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(broadcast[broadcast.index("-a") + 1], screen_on.ADD_ACTION)
        self.assertEqual(broadcast[broadcast.index("-n") + 1], screen_on.RECEIVER)
        self.assertIn("keep_awake=UNKNOWN", lines)

    def test_off_sends_explicit_remove_broadcast(self):
        runner = FakeRunner()
        lines = screen_on.command_off(runner)
        broadcast = next(call for call in runner.calls if call[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(broadcast[broadcast.index("-a") + 1], screen_on.REMOVE_ACTION)
        self.assertIn("overlay_release=UNKNOWN", lines)

    def test_missing_package_fails_closed_before_broadcast(self):
        runner = FakeRunner()
        runner.package_present = False
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)
        self.assertFalse(any(call[:3] == ["cmd", "activity", "broadcast"] for call in runner.calls))

    def test_receiver_mismatch_fails_closed_before_broadcast(self):
        runner = FakeRunner()
        runner.receiver_present = False
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)
        self.assertFalse(any(call[:3] == ["cmd", "activity", "broadcast"] for call in runner.calls))

    def test_shell_success_without_activity_manager_result_zero_is_not_accepted(self):
        runner = FakeRunner()
        runner.broadcast_stdout = "Broadcast completed: result=-1\n"
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)

    def test_setup_opens_package_specific_overlay_settings(self):
        runner = FakeRunner()
        lines = screen_on.command_setup(runner)
        start = next(call for call in runner.calls if call[:2] == ["am", "start"])
        self.assertEqual(start[start.index("-a") + 1], screen_on.OVERLAY_SETTINGS_ACTION)
        self.assertEqual(start[start.index("-d") + 1], f"package:{screen_on.PACKAGE}")
        self.assertIn("settings_open_request=OK", lines)


if __name__ == "__main__":
    unittest.main()
