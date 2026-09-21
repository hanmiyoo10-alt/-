import importlib.util
import pathlib
import socket
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

    def test_android_service_is_local_and_peer_uid_bound(self):
        root = ET.parse(MANIFEST).getroot()
        service = root.find("application/service")
        self.assertIsNotNone(service)
        self.assertEqual(service.attrib[ANDROID_NS + "exported"], "false")
        self.assertEqual(service.attrib[ANDROID_NS + "foregroundServiceType"], "specialUse")

        source = (JAVA / "LifelineService.java").read_text()
        required = (
            'TERMUX_PACKAGE = "com.termux"',
            "LocalServerSocket",
            "getPeerCredentials()",
            "credentials.getUid() == app.uid",
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

    def test_heartbeat_client_has_exact_local_protocol(self):
        module_path = TERMUX / "heartbeat-client.py"
        spec = importlib.util.spec_from_file_location("mcl_lifeline_heartbeat", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        self.assertEqual(module.SOCKET_NAME, "\0mcl-m-termux-lifeline-v1")
        self.assertEqual(module.HEARTBEAT, b"MCL_M_TERMUX_LIFELINE_HEARTBEAT_V1\n")
        self.assertEqual(module.RECOVERY_OK, b"MCL_M_TERMUX_LIFELINE_RECOVERY_OK_V1\n")
        self.assertEqual(module.main(["unexpected"]), 2)

        seen = {}

        class FakeSocket:
            def __init__(self, reply):
                self.reply = bytearray(reply)
                self.sent = b""

            def settimeout(self, value):
                seen["timeout"] = value

            def connect(self, address):
                seen["address"] = address

            def sendall(self, value):
                self.sent += value
                seen["sent"] = self.sent

            def recv(self, count):
                if not self.reply:
                    return b""
                data = bytes(self.reply[:count])
                del self.reply[:count]
                return data

            def close(self):
                seen["closed"] = True

        def good_factory(family, kind):
            self.assertEqual(family, socket.AF_UNIX)
            self.assertEqual(kind, socket.SOCK_STREAM)
            return FakeSocket(module.ACK)

        self.assertTrue(module.exchange(module.HEARTBEAT, socket_factory=good_factory))
        self.assertEqual(seen["address"], module.SOCKET_NAME)
        self.assertEqual(seen["sent"], module.HEARTBEAT)
        self.assertTrue(seen["closed"])

        def bad_factory(_family, _kind):
            return FakeSocket(b"NO\n")

        self.assertFalse(module.exchange(module.HEARTBEAT, socket_factory=bad_factory))

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
