import importlib.util
import pathlib
import subprocess
import unittest
from unittest import mock
import xml.etree.ElementTree as ET

OWNER = pathlib.Path(__file__).resolve().parents[1]
ANDROID = OWNER / "android-companion"
APP = ANDROID / "app"
JAVA = APP / "src/main/java/io/hanmiyoo/mcl/termuxlifeline"
TERMUX = OWNER / "termux"
MANIFEST = APP / "src/main/AndroidManifest.xml"
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


class LifelineContractTest(unittest.TestCase):
    def test_android_manifest_has_only_reviewed_permissions(self):
        root = ET.parse(MANIFEST).getroot()
        permissions = {
            node.attrib[ANDROID_NS + "name"]
            for node in root.findall("uses-permission")
        }
        self.assertEqual(
            permissions,
            {
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
                "com.termux.permission.RUN_COMMAND",
            },
        )
        text = MANIFEST.read_text()
        for forbidden in (
            "android.permission.INTERNET",
            "android.permission.SYSTEM_ALERT_WINDOW",
            "android.permission.BIND_ACCESSIBILITY_SERVICE",
            "android.permission.WAKE_LOCK",
            "android.permission.PACKAGE_USAGE_STATS",
            "sharedUserId",
            "device_admin",
        ):
            self.assertNotIn(forbidden, text)

    def test_android_service_is_local_and_sender_uid_bound(self):
        root = ET.parse(MANIFEST).getroot()
        service = root.find("application/service")
        self.assertIsNotNone(service)
        self.assertIsNone(root.find("application/receiver"))
        self.assertEqual(service.attrib[ANDROID_NS + "exported"], "false")
        self.assertEqual(service.attrib[ANDROID_NS + "foregroundServiceType"], "specialUse")

        source = (JAVA / "LifelineService.java").read_text()
        required = (
            'TERMUX_PACKAGE = "com.termux"',
            "BroadcastReceiver",
            "Context.RECEIVER_EXPORTED",
            "getSentFromUid()",
            "senderUidMatchesTermux",
            "ApplicationInfo.FLAG_STOPPED",
            'RUN_COMMAND_ACTION = "com.termux.RUN_COMMAND"',
            'RUN_COMMAND_SERVICE = "com.termux.app.RunCommandService"',
            '"/data/data/com.termux/files/home/.local/bin/mcl-m-termux-lifeline-recover"',
            "new String[0]",
            '"com.termux.RUN_COMMAND_BACKGROUND", true',
        )
        for needle in required:
            self.assertIn(needle, source)
        for forbidden in (
            "PendingIntent",
            "LocalServerSocket",
            "getPeerCredentials()",
            "RUN_COMMAND_STDIN",
            "RUN_COMMAND_COMMAND_LABEL",
            "ProcessBuilder",
            "Runtime.getRuntime",
            "force-stop",
            "setApplicationEnabledSetting",
        ):
            self.assertNotIn(forbidden, source)

    def test_force_stop_is_separate_domain_and_prerequisites_are_manual(self):
        policy = (JAVA / "LifelinePolicy.java").read_text()
        activity = (JAVA / "MainActivity.java").read_text()
        self.assertIn("BLOCKED_FORCE_STOP_DOMAIN", policy)
        self.assertIn("UNKNOWN_PACKAGE_STATE", policy)
        self.assertIn("NEEDS_MANUAL_RUN_COMMAND_PERMISSION", policy)
        self.assertIn("NEEDS_MANUAL_TERMUX_POLICY", policy)
        self.assertIn("allow-external-apps=true", activity)
        self.assertIn("사용자가 별도로 직접 설정해야 합니다", activity)
        self.assertNotIn("putString", activity)
        self.assertNotIn("Settings.Global", activity)
        self.assertNotIn("Settings.Secure", activity)

    def test_termux_scripts_are_syntax_valid_and_fixed_surface(self):
        scripts = (
            TERMUX / "30-mcl-m-termux-lifeline-heartbeat",
            TERMUX / "mcl-m-termux-lifeline-recover",
            TERMUX / "install.sh",
        )
        for script in scripts:
            result = subprocess.run(
                ["sh", "-n", str(script)],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

        recovery = (TERMUX / "mcl-m-termux-lifeline-recover").read_text()
        self.assertIn('$HOME_DIR/.local/bin/mcl-m-rdc-supervisor-guard', recovery)
        self.assertIn('$HOME_DIR/.local/bin/mcl-m-tailscale-supervisor-guard', recovery)
        self.assertIn('"$RDC_GUARD" --once', recovery)
        self.assertIn('"$TAILSCALE_GUARD" --once', recovery)
        self.assertNotIn('$HOME_DIR/.termux/boot/31-mcl-m-rdc-supervisor-guard', recovery)
        self.assertNotIn('$HOME_DIR/.termux/boot/32-mcl-m-tailscale-supervisor-guard', recovery)
        self.assertIn('"$PYTHON" "$CLIENT" --status', recovery)
        self.assertIn('"$PYTHON" "$CLIENT" --heartbeat-once', recovery)
        self.assertIn('"$PYTHON" "$CLIENT" --recovery-ok', recovery)
        self.assertIn("schema=mcl-m-termux-lifeline-recovery.v3", recovery)
        self.assertIn("rdc_target=", recovery)
        self.assertIn("tailscale_target=", recovery)
        self.assertIn("heartbeat_dispatch=", recovery)
        self.assertIn("recovery_ok_dispatch=", recovery)
        self.assertIn("guard_ring_started=false", recovery)
        self.assertNotIn("rdc_launcher=", recovery)
        self.assertNotIn("tailscale_launcher=", recovery)
        self.assertNotIn("companion_ack=", recovery)

        rdc_pos = recovery.index('if "$RDC_GUARD" --once')
        tailscale_pos = recovery.index('if "$TAILSCALE_GUARD" --once')
        heartbeat_pos = recovery.index('"$NOHUP" "$PYTHON" "$CLIENT"')
        first_status_pos = recovery.index('"$PYTHON" "$CLIENT" --status')
        heartbeat_once_pos = recovery.index('"$PYTHON" "$CLIENT" --heartbeat-once')
        second_status_pos = recovery.index(
            '"$PYTHON" "$CLIENT" --status',
            first_status_pos + 1,
        )
        recovery_ok_pos = recovery.index('"$PYTHON" "$CLIENT" --recovery-ok')
        self.assertLess(rdc_pos, tailscale_pos)
        self.assertLess(tailscale_pos, heartbeat_pos)
        self.assertLess(heartbeat_pos, first_status_pos)
        self.assertLess(first_status_pos, heartbeat_once_pos)
        self.assertLess(heartbeat_once_pos, second_status_pos)
        self.assertLess(second_status_pos, recovery_ok_pos)
        for forbidden in (
            "runsvdir",
            "pkill",
            "killall",
            "am force-stop",
            "settings put",
            "allow-external-apps",
            "termux.properties",
            "PocketRisu",
            "RUN_COMMAND",
        ):
            self.assertNotIn(forbidden, recovery)

    def test_install_helper_only_materializes_fixed_files(self):
        source = (TERMUX / "install.sh").read_text()
        self.assertIn("case ", source)
        self.assertIn("$" + "{1:-}", source)
        self.assertIn("--check)", source)
        self.assertIn("--install)", source)
        self.assertIn("settings_mutated=false", source)
        self.assertIn("permissions_mutated=false", source)
        self.assertIn("runtime_started=false", source)
        for forbidden in (
            "allow-external-apps",
            "termux.properties",
            "pm grant",
            "appops",
            "settings put",
            "nohup",
            "runsv",
            "startForegroundService",
        ):
            self.assertNotIn(forbidden, source)

    def test_effect_scripts_reject_caller_arguments_before_any_effect(self):
        for script in (
            TERMUX / "30-mcl-m-termux-lifeline-heartbeat",
            TERMUX / "mcl-m-termux-lifeline-recover",
        ):
            result = subprocess.run(
                ["sh", str(script), "unexpected"],
                check=False,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 2)

    def test_heartbeat_client_has_exact_local_broadcast_surface(self):
        module_path = TERMUX / "heartbeat-client.py"
        spec = importlib.util.spec_from_file_location("mcl_lifeline_heartbeat", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        self.assertEqual(module.AM_PATH, "/data/data/com.termux/files/usr/bin/am")
        self.assertEqual(module.COMPANION_PACKAGE, "io.hanmiyoo.mcl.termuxlifeline")
        self.assertEqual(
            module.HEARTBEAT_ACTION,
            "io.hanmiyoo.mcl.termuxlifeline.action.HEARTBEAT_V1",
        )
        self.assertEqual(
            module.RECOVERY_OK_ACTION,
            "io.hanmiyoo.mcl.termuxlifeline.action.RECOVERY_OK_V1",
        )
        self.assertEqual(module.main(["unexpected"]), 2)

        with mock.patch.object(module, "wait_singleton_active", return_value=True):
            self.assertEqual(module.main(["--status"]), 0)
        with mock.patch.object(module, "wait_singleton_active", return_value=False):
            self.assertEqual(module.main(["--status"]), 1)
        with mock.patch.object(module, "dispatch", return_value=True) as dispatched:
            self.assertEqual(module.main(["--heartbeat-once"]), 0)
            dispatched.assert_called_once_with(module.HEARTBEAT_ACTION)
        with mock.patch.object(module, "dispatch", return_value=False):
            self.assertEqual(module.main(["--heartbeat-once"]), 1)

        seen = {}

        class Result:
            returncode = 0

        def good_runner(argv, **kwargs):
            seen["argv"] = argv
            seen["kwargs"] = kwargs
            return Result()

        self.assertTrue(module.dispatch(module.HEARTBEAT_ACTION, runner=good_runner))
        self.assertEqual(
            seen["argv"],
            [
                module.AM_PATH,
                "broadcast",
                "-a",
                module.HEARTBEAT_ACTION,
                "-p",
                module.COMPANION_PACKAGE,
            ],
        )
        self.assertEqual(seen["kwargs"]["timeout"], module.DISPATCH_TIMEOUT_SECONDS)
        self.assertFalse(module.dispatch("unexpected", runner=good_runner))

        class FailedResult:
            returncode = 1

        self.assertFalse(
            module.dispatch(module.RECOVERY_OK_ACTION, runner=lambda *_a, **_k: FailedResult())
        )
        source = module_path.read_text()
        self.assertNotIn("socket", source)
        self.assertNotIn("MCL_M_TERMUX_LIFELINE_ACK_V1", source)
        self.assertNotIn("SOCKET_NAME", source)

    def test_heartbeat_singleton_status_is_lock_backed_and_bounded(self):
        module_path = TERMUX / "heartbeat-client.py"
        spec = importlib.util.spec_from_file_location("mcl_lifeline_heartbeat_status", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        closed = []
        unlocked = []

        def open_missing(*_args, **_kwargs):
            raise FileNotFoundError()

        self.assertFalse(module.singleton_active(open_fn=open_missing))

        def blocking_flock(_fd, operation):
            if operation & module.fcntl.LOCK_NB:
                raise BlockingIOError()
            unlocked.append(operation)

        self.assertTrue(
            module.singleton_active(
                open_fn=lambda *_a, **_k: 11,
                flock_fn=blocking_flock,
                close_fn=closed.append,
            )
        )
        self.assertEqual(closed, [11])

        clock = iter([0.0, 0.1, 0.2, 0.3])
        sleeps = []
        self.assertTrue(
            module.wait_singleton_active(
                timeout=1.0,
                interval=0.05,
                now=lambda: next(clock),
                sleep=sleeps.append,
                probe=iter([False, False, True]).__next__,
            )
        )
        self.assertEqual(sleeps, [0.05, 0.05])

    def test_no_network_or_generic_command_surface_in_owner(self):
        all_text = "\n".join(
            path.read_text()
            for path in OWNER.rglob("*")
            if path.is_file()
            and "build/" not in path.as_posix()
            and "tests/" not in path.as_posix()
            and path.suffix in {".java", ".py", ".sh", ".gradle", ""}
        )
        for forbidden in (
            "android.permission.INTERNET",
            "http://",
            "https://",
            "java.net.",
            "curl ",
            "wget ",
            "ssh ",
            "su ",
            "Runtime.getRuntime",
            "ProcessBuilder",
        ):
            self.assertNotIn(forbidden, all_text)


if __name__ == "__main__":
    unittest.main()
