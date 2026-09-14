import importlib.util
from pathlib import Path
import subprocess
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / "screen_on.py"
spec = importlib.util.spec_from_file_location("screen_on", MODULE_PATH)
screen_on = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(screen_on)


class FakeRunner:
    def __init__(self):
        self.calls = []
        self.packages = {screen_on.PACKAGE, screen_on.COMPANION_PACKAGE}
        self.receivers = {
            (screen_on.PACKAGE, screen_on.ADD_ACTION): screen_on.RECEIVER,
            (screen_on.PACKAGE, screen_on.REMOVE_ACTION): screen_on.RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_ON_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_OFF_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_STATUS_ACTION): screen_on.COMPANION_RECEIVER,
        }
        self.broadcasts = {
            screen_on.ADD_ACTION: (0, ""),
            screen_on.REMOVE_ACTION: (0, ""),
            screen_on.COMPANION_ON_ACTION: (screen_on.COMPANION_RESULT_ON, "overlay=ON"),
            screen_on.COMPANION_OFF_ACTION: (screen_on.COMPANION_RESULT_OFF, "overlay=OFF"),
            screen_on.COMPANION_STATUS_ACTION: (screen_on.COMPANION_RESULT_STATUS_OFF, "overlay=OFF"),
        }
        self.broadcast_returncode = 0
        self.setup_returncode = 0

    def __call__(self, args, **kwargs):
        self.calls.append(list(args))
        if args[:2] == ["pm", "path"]:
            package = args[-1]
            if package in self.packages:
                return subprocess.CompletedProcess(args, 0, "package:/fake/base.apk\n", "")
            return subprocess.CompletedProcess(args, 1, "", "package not found")

        if args[:3] == ["cmd", "package", "query-receivers"]:
            package = args[args.index("-p") + 1]
            action = args[args.index("-a") + 1]
            receiver = self.receivers.get((package, action))
            stdout = f"{receiver}\n" if receiver else "No receivers found\n"
            return subprocess.CompletedProcess(args, 0, stdout, "")

        if args[:3] == ["cmd", "activity", "broadcast"]:
            action = args[args.index("-a") + 1]
            code, data = self.broadcasts.get(action, (0, ""))
            suffix = f', data="{data}"' if data else ""
            stdout = f"Broadcasting: Intent {{}}\nBroadcast completed: result={code}{suffix}\n"
            return subprocess.CompletedProcess(
                args,
                self.broadcast_returncode,
                stdout if not self.broadcast_returncode else "",
                "broadcast denied" if self.broadcast_returncode else "",
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
    def test_cli_default_backend_preserves_eonsoft_baseline(self):
        args = screen_on.build_parser().parse_args(["doctor"])
        self.assertEqual(args.backend, "eonsoft")

    def test_eonsoft_doctor_preserves_unknown_effect(self):
        runner = FakeRunner()
        lines = screen_on.command_doctor(runner)
        self.assertIn("transport_ready=YES", lines)
        self.assertIn("overlay_permission=UNKNOWN", lines)
        self.assertIn("keep_awake_ready=UNKNOWN", lines)

    def test_eonsoft_on_sends_existing_explicit_broadcast(self):
        runner = FakeRunner()
        lines = screen_on.command_on(runner)
        broadcast = next(call for call in runner.calls if call[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(broadcast[broadcast.index("-a") + 1], screen_on.ADD_ACTION)
        self.assertEqual(broadcast[broadcast.index("-n") + 1], screen_on.RECEIVER)
        self.assertIn("keep_awake=UNKNOWN", lines)

    def test_eonsoft_off_sends_existing_remove_broadcast(self):
        runner = FakeRunner()
        lines = screen_on.command_off(runner)
        broadcast = next(call for call in runner.calls if call[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(broadcast[broadcast.index("-a") + 1], screen_on.REMOVE_ACTION)
        self.assertIn("overlay_release=UNKNOWN", lines)

    def test_missing_eonsoft_package_fails_closed_before_broadcast(self):
        runner = FakeRunner()
        runner.packages.remove(screen_on.PACKAGE)
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)
        self.assertFalse(any(call[:3] == ["cmd", "activity", "broadcast"] for call in runner.calls))

    def test_receiver_mismatch_fails_closed_before_broadcast(self):
        runner = FakeRunner()
        del runner.receivers[(screen_on.PACKAGE, screen_on.ADD_ACTION)]
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)
        self.assertFalse(any(call[:3] == ["cmd", "activity", "broadcast"] for call in runner.calls))

    def test_eonsoft_nonzero_activity_manager_result_is_not_accepted(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.ADD_ACTION] = (-1, "")
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)

    def test_eonsoft_setup_opens_package_specific_overlay_settings(self):
        runner = FakeRunner()
        lines = screen_on.command_setup(runner)
        start = next(call for call in runner.calls if call[:2] == ["am", "start"])
        self.assertEqual(start[start.index("-d") + 1], f"package:{screen_on.PACKAGE}")
        self.assertIn("settings_open_request=OK", lines)

    def test_companion_on_requires_distinct_receiver_ack(self):
        runner = FakeRunner()
        lines = screen_on.command_companion_on(runner)
        self.assertIn("transport=OK activity_manager_result=101", lines)
        self.assertIn("overlay=ON", lines)
        self.assertIn("keep_awake_effect=UNKNOWN", lines)

    def test_companion_on_fails_closed_when_overlay_permission_is_missing(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_ON_ACTION] = (
            screen_on.COMPANION_RESULT_PERMISSION_REQUIRED,
            "overlay_permission=DENIED",
        )
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_on(runner)

    def test_companion_status_reports_permission_denied_without_fabricating_overlay_state(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_STATUS_ACTION] = (
            screen_on.COMPANION_RESULT_PERMISSION_REQUIRED,
            "overlay_permission=DENIED",
        )
        lines = screen_on.command_companion_status(runner)
        self.assertIn("overlay_permission=NO", lines)
        self.assertIn("overlay=UNKNOWN", lines)

    def test_companion_status_reports_attached_overlay_but_effect_stays_unknown(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_STATUS_ACTION] = (
            screen_on.COMPANION_RESULT_STATUS_ON,
            "overlay=ON",
        )
        lines = screen_on.command_companion_status(runner)
        self.assertIn("overlay_permission=YES", lines)
        self.assertIn("overlay=ON", lines)
        self.assertIn("keep_awake_effect=UNKNOWN", lines)

    def test_companion_transport_permission_denial_is_an_error(self):
        runner = FakeRunner()
        runner.broadcast_returncode = 255
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_on(runner)

    def test_companion_setup_targets_repo_owned_package(self):
        runner = FakeRunner()
        lines = screen_on.command_companion_setup(runner)
        start = next(call for call in runner.calls if call[:2] == ["am", "start"])
        self.assertEqual(start[start.index("-d") + 1], f"package:{screen_on.COMPANION_PACKAGE}")
        self.assertIn(f"package={screen_on.COMPANION_PACKAGE}", lines)

    def test_companion_doctor_checks_all_three_owned_actions(self):
        runner = FakeRunner()
        lines = screen_on.command_companion_doctor(runner)
        queries = [call for call in runner.calls if call[:3] == ["cmd", "package", "query-receivers"]]
        actions = {call[call.index("-a") + 1] for call in queries}
        self.assertEqual(
            actions,
            {
                screen_on.COMPANION_ON_ACTION,
                screen_on.COMPANION_OFF_ACTION,
                screen_on.COMPANION_STATUS_ACTION,
            },
        )
        self.assertIn(f"package=OK {screen_on.COMPANION_PACKAGE}", lines)


if __name__ == "__main__":
    unittest.main()
