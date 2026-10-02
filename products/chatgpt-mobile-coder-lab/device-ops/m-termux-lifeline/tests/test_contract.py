import importlib.util
import pathlib
import subprocess
import unittest
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
        self.assertIn('$HOME_DIR/.termux/boot/31-mcl-m-rdc-supervisor-guard', recovery)
        self.assertIn('$HOME_DIR/.termux/boot/32-mcl-m-tailscale-supervisor-guard', recovery)
        self.assertIn('"$PYTHON" "$CLIENT" --recovery-ok', recovery)
        self.assertIn("schema=mcl-m-termux-lifeline-recovery.v2", recovery)
        self.assertIn("recovery_ok_dispatch=", recovery)
        self.assertNotIn("companion_ack=", recovery)
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
