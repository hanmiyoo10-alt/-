#!/usr/bin/env python3
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[5]
OWNER = REPO / "products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-reboot-recovery"
ANDROID = OWNER / "android-companion"
MANIFEST = ANDROID / "app/src/main/AndroidManifest.xml"
JAVA = ANDROID / "app/src/main/java/io/hanmiyoo/mcl/wirelessadbrecovery"

EXPECTED_FILES = {
    "README.md",
    "android-companion/build.gradle",
    "android-companion/settings.gradle",
    "android-companion/app/build.gradle",
    "android-companion/app/src/main/AndroidManifest.xml",
    "android-companion/app/src/main/java/io/hanmiyoo/mcl/wirelessadbrecovery/MainActivity.java",
    "android-companion/app/src/main/java/io/hanmiyoo/mcl/wirelessadbrecovery/WirelessAdbBootReceiver.java",
    "android-companion/app/src/main/java/io/hanmiyoo/mcl/wirelessadbrecovery/WirelessAdbRecoveryJobService.java",
    "tests/test_contract.py",
}

ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.manifest = ET.parse(MANIFEST).getroot()
        self.activity = (JAVA / "MainActivity.java").read_text()
        self.receiver = (JAVA / "WirelessAdbBootReceiver.java").read_text()
        self.job = (JAVA / "WirelessAdbRecoveryJobService.java").read_text()
        self.build = (ANDROID / "app/build.gradle").read_text()
        self.readme = (OWNER / "README.md").read_text()

    def test_exact_source_file_set(self):
        actual = {
            path.relative_to(OWNER).as_posix()
            for path in OWNER.rglob("*")
            if path.is_file()
        }
        self.assertEqual(EXPECTED_FILES, actual)

    def test_permission_surface_is_exact(self):
        permissions = {
            node.attrib[ANDROID_NS + "name"]
            for node in self.manifest.findall("uses-permission")
        }
        self.assertEqual(
            {
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.ACCESS_NETWORK_STATE",
                "android.permission.WRITE_SECURE_SETTINGS",
            },
            permissions,
        )

    def test_boot_receiver_accepts_only_system_boot_actions(self):
        receiver_node = self.manifest.find("application/receiver")
        self.assertIsNotNone(receiver_node)
        self.assertEqual("true", receiver_node.attrib[ANDROID_NS + "exported"])
        self.assertEqual("true", receiver_node.attrib[ANDROID_NS + "directBootAware"])
        actions = {
            node.attrib[ANDROID_NS + "name"]
            for node in receiver_node.findall("intent-filter/action")
        }
        self.assertEqual(
            {
                "android.intent.action.LOCKED_BOOT_COMPLETED",
                "android.intent.action.BOOT_COMPLETED",
            },
            actions,
        )
        self.assertIn("Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)", self.receiver)
        self.assertIn("Intent.ACTION_BOOT_COMPLETED.equals(action)", self.receiver)
        self.assertEqual(1, self.receiver.count("scheduleFixedAttempts(context)"))

    def test_job_service_is_private_and_system_bound(self):
        service = self.manifest.find("application/service")
        self.assertIsNotNone(service)
        self.assertEqual("false", service.attrib[ANDROID_NS + "exported"])
        self.assertEqual(
            "android.permission.BIND_JOB_SERVICE",
            service.attrib[ANDROID_NS + "permission"],
        )

    def test_setting_effect_is_literal_and_single_purpose(self):
        self.assertEqual(1, self.job.count('"adb_wifi_enabled"'))
        self.assertEqual(1, self.job.count("Settings.Global.putInt("))
        self.assertNotIn("Settings.Secure", self.job)
        self.assertNotIn("Settings.System", self.job)
        self.assertIn("private static final int ENABLED = 1;", self.job)
        self.assertIn("current != ENABLED", self.job)

    def test_retry_budget_is_fixed_and_bounded(self):
        self.assertIn(
            "private static final int[] JOB_IDS = {372201, 372202, 372203};",
            self.job,
        )
        self.assertIn(
            "private static final long[] MIN_LATENCIES_MS = "
            "{10_000L, 60_000L, 180_000L};",
            self.job,
        )
        self.assertIn(".setPersisted(false)", self.job)
        self.assertNotIn(".setPersisted(true)", self.job)
        self.assertEqual(1, self.job.count("scheduler.schedule(job)"))

    def test_effect_requires_active_wifi(self):
        self.assertIn("getActiveNetwork()", self.job)
        self.assertIn("NetworkCapabilities.TRANSPORT_WIFI", self.job)
        self.assertRegex(
            self.job,
            re.compile(r"if \(!hasActiveWifi\(this\)\) \{\s*return false;", re.S),
        )

    def test_launcher_has_no_setting_effect(self):
        self.assertNotIn("Settings.", self.activity)
        self.assertNotIn("scheduleFixedAttempts", self.activity)
        self.assertIn("does not change Android settings", self.activity)

    def test_no_generic_or_privileged_side_channels(self):
        joined = "\n".join([self.activity, self.receiver, self.job, self.build])
        for forbidden in (
            "Runtime.getRuntime",
            "ProcessBuilder",
            "java.net.",
            "Socket(",
            "ServerSocket",
            "VpnService",
            "AccessibilityService",
            "DevicePolicyManager",
            "startForegroundService",
            "5555",
            "adb connect",
            "adb pair",
        ):
            self.assertNotIn(forbidden, joined)

    def test_build_has_no_third_party_dependencies(self):
        self.assertIn("compileSdk 35", self.build)
        self.assertIn("targetSdk 35", self.build)
        self.assertIn("minSdk 31", self.build)
        dependencies = re.search(r"dependencies\s*\{(?P<body>.*?)\}", self.build, re.S)
        self.assertIsNotNone(dependencies)
        self.assertEqual("", dependencies.group("body").strip())

    def test_readme_preserves_later_live_boundary(self):
        self.assertIn("Live activation is a later, separately reviewed phase", self.readme)
        self.assertIn("without adb connect, adb pair, ADB restart", self.readme)
        self.assertIn("debug APK produced by IMPLEMENTATION_PR", self.readme)


if __name__ == "__main__":
    unittest.main(verbosity=2)
