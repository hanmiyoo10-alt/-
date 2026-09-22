import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

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
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_PAIR_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_ON_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_OFF_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_STATUS_ACTION): screen_on.COMPANION_RECEIVER,
            (screen_on.COMPANION_PACKAGE, screen_on.COMPANION_DIAGNOSTIC_ACTION): screen_on.COMPANION_RECEIVER,
        }
        self.broadcasts = {
            screen_on.ADD_ACTION: (0, ""),
            screen_on.REMOVE_ACTION: (0, ""),
            screen_on.COMPANION_PAIR_ACTION: (screen_on.COMPANION_RESULT_PAIRED, "pairing=PAIRED"),
            screen_on.COMPANION_ON_ACTION: (screen_on.COMPANION_RESULT_ON, "overlay=ON"),
            screen_on.COMPANION_OFF_ACTION: (screen_on.COMPANION_RESULT_OFF, "overlay=OFF"),
            screen_on.COMPANION_STATUS_ACTION: (screen_on.COMPANION_RESULT_STATUS_OFF, "overlay=OFF"),
            screen_on.COMPANION_DIAGNOSTIC_ACTION: (screen_on.COMPANION_RESULT_DIAGNOSTIC, "startup_phase=PAIRING_CODE"),
        }
        self.broadcast_returncode = 0
        self.start_returncode = 0
        self.package_path_error = None
        self.receiver_query_error = None

    def __call__(self, args, **kwargs):
        self.calls.append(list(args))
        if args[:2] == ["pm", "path"]:
            package = args[-1]
            if self.package_path_error is not None:
                return subprocess.CompletedProcess(args, 1, "", self.package_path_error)
            return subprocess.CompletedProcess(args, 0, "package:/fake/base.apk\n", "") if package in self.packages else subprocess.CompletedProcess(args, 1, "", "missing")
        if args[:3] == ["cmd", "package", "query-receivers"]:
            if self.receiver_query_error is not None:
                return subprocess.CompletedProcess(args, 1, "", self.receiver_query_error)
            package = args[args.index("-p") + 1]
            action = args[args.index("-a") + 1]
            receiver = self.receivers.get((package, action))
            return subprocess.CompletedProcess(args, 0, f"{receiver}\n" if receiver else "No receivers found\n", "")
        if args[:3] == ["cmd", "activity", "broadcast"]:
            action = args[args.index("-a") + 1]
            code, data = self.broadcasts.get(action, (0, ""))
            suffix = f', data="{data}"' if data else ""
            return subprocess.CompletedProcess(args, self.broadcast_returncode, f"Broadcast completed: result={code}{suffix}\n" if not self.broadcast_returncode else "", "denied" if self.broadcast_returncode else "")
        if args[:2] == ["am", "start"]:
            return subprocess.CompletedProcess(args, self.start_returncode, "", "start failed" if self.start_returncode else "")
        raise AssertionError(f"unexpected command: {args}")


class ScreenOnTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old_token_path = screen_on.COMPANION_TOKEN_PATH
        screen_on.COMPANION_TOKEN_PATH = Path(self.tmp.name) / "config" / "token"

    def tearDown(self):
        screen_on.COMPANION_TOKEN_PATH = self.old_token_path
        self.tmp.cleanup()

    def pair_locally(self, token="a" * 64):
        screen_on._write_companion_token(token)
        return token

    def test_cli_default_backend_preserves_eonsoft_baseline(self):
        self.assertEqual(screen_on.build_parser().parse_args(["doctor"]).backend, "eonsoft")

    def test_eonsoft_doctor_preserves_unknown_effect(self):
        lines = screen_on.command_doctor(FakeRunner())
        self.assertIn("overlay_permission=UNKNOWN", lines)
        self.assertIn("keep_awake_ready=UNKNOWN", lines)

    def test_eonsoft_on_and_off_keep_existing_actions(self):
        runner = FakeRunner()
        screen_on.command_on(runner)
        screen_on.command_off(runner)
        actions = [c[c.index("-a") + 1] for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"]]
        self.assertEqual(actions, [screen_on.ADD_ACTION, screen_on.REMOVE_ACTION])

    def test_eonsoft_transient_package_service_failure_still_fails_closed(self):
        runner = FakeRunner()
        runner.package_path_error = "cmd: Failure calling service package: Failed transaction (2147483646)"
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_on(runner)
        self.assertFalse(any(c[:3] == ["cmd", "activity", "broadcast"] for c in runner.calls))

    def test_missing_eonsoft_package_fails_closed(self):
        runner = FakeRunner(); runner.packages.remove(screen_on.PACKAGE)
        with self.assertRaises(screen_on.ScreenOnError): screen_on.command_on(runner)

    def test_eonsoft_setup_opens_package_overlay_settings(self):
        runner = FakeRunner(); screen_on.command_setup(runner)
        start = next(c for c in runner.calls if c[:2] == ["am", "start"])
        self.assertEqual(start[start.index("-d") + 1], f"package:{screen_on.PACKAGE}")

    def test_companion_setup_without_code_requires_user_launcher_action(self):
        runner = FakeRunner()
        lines = screen_on.command_companion_setup(runner=runner)
        self.assertIsNone(screen_on._load_companion_token())
        self.assertIn("pairing=USER_ACTION_REQUIRED", lines)
        self.assertTrue(any("shown automatically" in line for line in lines))
        self.assertFalse(any(c[:3] == ["cmd", "activity", "broadcast"] for c in runner.calls))

    def test_companion_setup_pairs_with_one_time_code_then_stores_private_token(self):
        runner = FakeRunner()
        with mock.patch.object(screen_on.secrets, "token_hex", return_value="b" * 64):
            lines = screen_on.command_companion_setup("12345678", runner)
        call = next(c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(call[call.index("-a") + 1], screen_on.COMPANION_PAIR_ACTION)
        self.assertEqual(call[call.index("--es") + 1], screen_on.COMPANION_TOKEN_EXTRA)
        self.assertEqual(call[call.index("--es") + 2], "b" * 64)
        pair_index = call.index(screen_on.COMPANION_PAIR_CODE_EXTRA)
        self.assertEqual(call[pair_index + 1], "12345678")
        self.assertEqual(screen_on._load_companion_token(), "b" * 64)
        self.assertEqual(screen_on.COMPANION_TOKEN_PATH.stat().st_mode & 0o777, 0o600)
        self.assertIn("pairing=YES", lines)

    def test_companion_pair_bypasses_only_transient_package_service_preflight_and_broadcasts_once(self):
        runner = FakeRunner()
        runner.package_path_error = "cmd: Failure calling service package: Failed transaction (2147483646)"
        with mock.patch.object(screen_on.secrets, "token_hex", return_value="c" * 64):
            lines = screen_on.command_companion_setup("12345678", runner)
        broadcasts = [c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"]]
        self.assertEqual(len(broadcasts), 1)
        self.assertEqual(
            broadcasts[0][broadcasts[0].index("-a") + 1],
            screen_on.COMPANION_PAIR_ACTION,
        )
        self.assertEqual(screen_on._load_companion_token(), "c" * 64)
        self.assertIn("pairing=YES", lines)

    def test_companion_pair_bypasses_transient_receiver_query_failure_once(self):
        runner = FakeRunner()
        runner.receiver_query_error = "cmd: Failure calling service package: Failed transaction (2147483646)"
        with mock.patch.object(screen_on.secrets, "token_hex", return_value="d" * 64):
            screen_on.command_companion_setup("12345678", runner)
        broadcasts = [c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"]]
        self.assertEqual(len(broadcasts), 1)
        self.assertEqual(screen_on._load_companion_token(), "d" * 64)

    def test_companion_missing_package_still_fails_closed_without_broadcast(self):
        runner = FakeRunner()
        runner.packages.remove(screen_on.COMPANION_PACKAGE)
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_setup("12345678", runner)
        self.assertFalse(any(c[:3] == ["cmd", "activity", "broadcast"] for c in runner.calls))
        self.assertIsNone(screen_on._load_companion_token())

    def test_companion_setup_rejection_does_not_store_token(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_PAIR_ACTION] = (screen_on.COMPANION_RESULT_PAIR_CODE_REJECTED, "pairing=REJECTED")
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_setup("12345678", runner)
        self.assertIsNone(screen_on._load_companion_token())

    def test_companion_setup_rejects_invalid_pair_code_before_broadcast(self):
        runner = FakeRunner()
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_setup("1234", runner)
        self.assertFalse(any(c[:3] == ["cmd", "activity", "broadcast"] for c in runner.calls))

    def test_companion_on_requires_local_pairing_token(self):
        with self.assertRaises(screen_on.ScreenOnError): screen_on.command_companion_on(FakeRunner())

    def test_companion_on_sends_token_and_requires_distinct_ack(self):
        token = self.pair_locally(); runner = FakeRunner()
        lines = screen_on.command_companion_on(runner)
        call = next(c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(call[call.index("--es") + 1], screen_on.COMPANION_TOKEN_EXTRA)
        self.assertEqual(call[call.index("--es") + 2], token)
        self.assertTrue(any("activity_manager_result=101" in line for line in lines))

    def test_companion_auth_required_fails_closed(self):
        self.pair_locally(); runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_ON_ACTION] = (screen_on.COMPANION_RESULT_AUTH_REQUIRED, "pairing=REQUIRED")
        with self.assertRaises(screen_on.ScreenOnError): screen_on.command_companion_on(runner)

    def test_companion_overlay_permission_missing_fails_closed(self):
        self.pair_locally(); runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_ON_ACTION] = (screen_on.COMPANION_RESULT_PERMISSION_REQUIRED, "overlay_permission=DENIED")
        with self.assertRaises(screen_on.ScreenOnError): screen_on.command_companion_on(runner)

    def test_companion_diagnostic_requires_no_pairing_token_and_returns_fixed_phase(self):
        runner = FakeRunner()
        lines = screen_on.command_companion_diagnostic(runner)
        call = next(c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"])
        self.assertEqual(call[call.index("-a") + 1], screen_on.COMPANION_DIAGNOSTIC_ACTION)
        self.assertNotIn("--es", call)
        self.assertIn("startup_phase=PAIRING_CODE", lines)

    def test_companion_diagnostic_rejects_nonfixed_payload(self):
        runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_DIAGNOSTIC_ACTION] = (
            screen_on.COMPANION_RESULT_DIAGNOSTIC,
            "startup_phase=PAIRING_CODE_12345678",
        )
        with self.assertRaises(screen_on.ScreenOnError):
            screen_on.command_companion_diagnostic(runner)

    def test_companion_status_without_token_preserves_unknown_effect(self):
        lines = screen_on.command_companion_status(FakeRunner())
        self.assertIn("pairing=NO", lines)
        self.assertIn("overlay=UNKNOWN", lines)

    def test_companion_status_auth_rejection_is_not_pairing_success(self):
        self.pair_locally(); runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_STATUS_ACTION] = (screen_on.COMPANION_RESULT_AUTH_REQUIRED, "pairing=REQUIRED")
        lines = screen_on.command_companion_status(runner)
        self.assertIn("pairing=NO", lines)
        self.assertIn("overlay=UNKNOWN", lines)

    def test_companion_status_permission_denied_is_authenticated(self):
        self.pair_locally(); runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_STATUS_ACTION] = (screen_on.COMPANION_RESULT_PERMISSION_REQUIRED, "overlay_permission=DENIED")
        lines = screen_on.command_companion_status(runner)
        self.assertIn("pairing=YES", lines)
        self.assertIn("overlay_permission=NO", lines)

    def test_companion_status_attached_keeps_physical_effect_unknown(self):
        self.pair_locally(); runner = FakeRunner()
        runner.broadcasts[screen_on.COMPANION_STATUS_ACTION] = (screen_on.COMPANION_RESULT_STATUS_ON, "overlay=ON")
        lines = screen_on.command_companion_status(runner)
        self.assertIn("overlay=ON", lines)
        self.assertIn("keep_awake_effect=UNKNOWN", lines)

    def test_companion_doctor_checks_all_owned_actions(self):
        self.pair_locally(); runner = FakeRunner()
        screen_on.command_companion_doctor(runner)
        queries = [c for c in runner.calls if c[:3] == ["cmd", "package", "query-receivers"]]
        self.assertEqual(
            {c[c.index("-a") + 1] for c in queries},
            {
                screen_on.COMPANION_PAIR_ACTION,
                screen_on.COMPANION_ON_ACTION,
                screen_on.COMPANION_OFF_ACTION,
                screen_on.COMPANION_STATUS_ACTION,
                screen_on.COMPANION_DIAGNOSTIC_ACTION,
            },
        )
        broadcasts = [c for c in runner.calls if c[:3] == ["cmd", "activity", "broadcast"]]
        diagnostic = next(c for c in broadcasts if c[c.index("-a") + 1] == screen_on.COMPANION_DIAGNOSTIC_ACTION)
        self.assertNotIn("--es", diagnostic)

    def test_invalid_token_file_fails_closed(self):
        screen_on.COMPANION_TOKEN_PATH.parent.mkdir(parents=True)
        screen_on.COMPANION_TOKEN_PATH.write_text("bad\n")
        with self.assertRaises(screen_on.ScreenOnError): screen_on.command_companion_status(FakeRunner())


if __name__ == "__main__": unittest.main()
