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
    "android-companion/app/src/main/java/io/hanmiyoo/mcl/wirelessadbrecovery/WirelessAdbDiagnosticReceipt.java",
    "tests/test_contract.py",
}

ANDROID_NS = "{http://schemas.android.com/apk/res/android}"
GENERATED_ROOTS = {
    ANDROID / ".gradle",
    ANDROID / "build",
    ANDROID / "app/build",
}


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.manifest = ET.parse(MANIFEST).getroot()
        self.activity = (JAVA / "MainActivity.java").read_text()
        self.receiver = (JAVA / "WirelessAdbBootReceiver.java").read_text()
        self.job = (JAVA / "WirelessAdbRecoveryJobService.java").read_text()
        self.receipt = (JAVA / "WirelessAdbDiagnosticReceipt.java").read_text()
        self.build = (ANDROID / "app/build.gradle").read_text()
        self.readme = (OWNER / "README.md").read_text()

    def test_exact_source_file_set(self):
        actual = {
            path.relative_to(OWNER).as_posix()
            for path in OWNER.rglob("*")
            if path.is_file()
            and not any(root == path or root in path.parents for root in GENERATED_ROOTS)
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
        self.assertEqual(2, self.job.count("Settings.Global.putInt("))
        self.assertEqual(2, self.job.count("getContentResolver().notifyChange("))
        self.assertEqual(
            2, self.job.count("Settings.Global.getUriFor(ADB_WIFI_ENABLED_SETTING)")
        )
        self.assertNotIn("Settings.Secure", self.job)
        self.assertNotIn("Settings.System", self.job)
        self.assertIn("private static final int DISABLED = 0;", self.job)
        self.assertIn("private static final int ENABLED = 1;", self.job)
        self.assertNotIn("recordWriteNotNeeded(this, attempt)", self.job)
        self.assertNotIn("Thread.sleep", self.job)
        self.assertNotIn("SystemClock.sleep", self.job)

    def test_stale_true_path_requests_bounded_off_on_sequence(self):
        self.assertIn("if (preEnabled)", self.job)
        self.assertNotIn("recordWriteNotNeeded(this, attempt)", self.job)
        pre = self.job.index("recordSettingPre(this, attempt, preEnabled);")
        branch = self.job.index("if (preEnabled)", pre)
        disable = self.job.index("ADB_WIFI_ENABLED_SETTING, DISABLED);", branch)
        disabled_post = self.job.index("int disabledPost = Settings.Global.getInt(", disable)
        disabled_guard = self.job.index("if (disabledPost == DISABLED)", disabled_post)
        disabled_notify = self.job.index(
            "getContentResolver().notifyChange(", disabled_guard
        )
        enable = self.job.index("ADB_WIFI_ENABLED_SETTING, ENABLED);", disabled_notify)
        post = self.job.index("int post = Settings.Global.getInt(", enable)
        enabled_guard = self.job.index("if (post == ENABLED)", post)
        enabled_notify = self.job.index(
            "getContentResolver().notifyChange(", enabled_guard
        )
        accepted = self.job.index(
            "boolean accepted = disableAccepted && enableAccepted;", enabled_notify
        )
        self.assertLess(pre, branch)
        self.assertLess(branch, disable)
        self.assertLess(disable, disabled_post)
        self.assertLess(disabled_post, disabled_guard)
        self.assertLess(disabled_guard, disabled_notify)
        self.assertLess(disabled_notify, enable)
        self.assertLess(enable, post)
        self.assertLess(post, enabled_guard)
        self.assertLess(enabled_guard, enabled_notify)
        self.assertLess(enabled_notify, accepted)
        self.assertEqual(2, self.job.count("Settings.Global.putInt("))
        self.assertEqual(2, self.job.count("getContentResolver().notifyChange("))
        self.assertIn("boolean disableAccepted = true;", self.job)
        self.assertIn("boolean enableAccepted = Settings.Global.putInt(", self.job)
        self.assertIn("If the pre-read is already enabled", self.readme)
        self.assertIn("disabled-state readback plus fixed-URI notify", self.readme)
        self.assertIn("enabled-state readback plus the same fixed-URI notify", self.readme)

    def test_explicit_notify_preserves_off_on_order_when_auto_notify_is_deferred(self):
        logical_value = 1
        internal_enabled = True
        deferred = []
        observed = []

        def observer():
            nonlocal internal_enabled
            observed.append(logical_value)
            requested = logical_value == 1
            if requested != internal_enabled:
                internal_enabled = requested

        def write(value):
            nonlocal logical_value
            logical_value = value
            deferred.append(observer)
            return True

        self.assertTrue(write(0))
        self.assertEqual(0, logical_value)
        observer()
        self.assertFalse(internal_enabled)

        self.assertTrue(write(1))
        self.assertEqual(1, logical_value)
        observer()
        self.assertTrue(internal_enabled)

        for callback in deferred:
            callback()

        self.assertEqual([0, 1, 1, 1], observed)
        self.assertTrue(internal_enabled)

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
        self.assertIn("NetworkState networkState = inspectNetworkState(this);", self.job)
        self.assertRegex(
            self.job,
            re.compile(r"if \(!networkState\.wifiTransport\) \{.*?return false;", re.S),
        )

    def test_diagnostics_use_fixed_bounded_vocabulary(self):
        self.assertIn('private static final String LOG_TAG = "MclWirelessAdbRecovery";', self.receiver)
        self.assertIn('private static final String LOG_TAG = "MclWirelessAdbRecovery";', self.job)
        self.assertIn('event=boot_received action=', self.receiver)

        for event in (
            "event=job_network",
            "event=job_result",
            "event=setting_pre",
            "event=setting_write_start",
            "event=setting_write_result",
            "event=setting_post",
            "event=job_exception",
        ):
            self.assertIn(event, self.job)

        for token in (
            "LOCKED_BOOT_COMPLETED",
            "BOOT_COMPLETED",
            "outcome=no_active_wifi",
            "SECURITY_EXCEPTION",
            "ILLEGAL_ARGUMENT_EXCEPTION",
        ):
            self.assertIn(token, self.receiver + self.job)

    def test_diagnostic_attempt_identity_is_fixed(self):
        self.assertIn("attemptLabel(params.getJobId())", self.job)
        self.assertIn("if (jobId == JOB_IDS[0])", self.job)
        self.assertIn("if (jobId == JOB_IDS[1])", self.job)
        self.assertIn("if (jobId == JOB_IDS[2])", self.job)
        self.assertIn('return "unmapped";', self.job)
        self.assertNotIn('" job_id=" + params.getJobId()', self.job)
        self.assertNotIn('" job_id=" + jobId', self.job)

    def test_diagnostics_do_not_expose_network_or_exception_identity(self):
        joined = "\n".join([self.receiver, self.job])
        for forbidden in (
            "getSSID(",
            "getBSSID(",
            "getLinkProperties(",
            "getAllNetworks(",
            "getTransportInfo(",
            "InetAddress",
            "LinkProperties",
            "intent.getExtras(",
            "intent.toString(",
            "exception.getMessage(",
            "exception.toString(",
            "printStackTrace",
            "Log.getStackTraceString",
            "active.toString(",
            "capabilities.toString(",
        ):
            self.assertNotIn(forbidden, joined)

        self.assertIn("active_network_present=", self.job)
        self.assertIn("wifi_transport=", self.job)
        self.assertIn("enabled=" + '" + preEnabled', self.job)
        self.assertIn("enabled=" + '" + (post == ENABLED)', self.job)

    def test_persistent_receipt_uses_fixed_device_protected_atomic_storage(self):
        self.assertIn("createDeviceProtectedStorageContext()", self.receipt)
        self.assertIn("AtomicFile", self.receipt)
        self.assertIn(
            '"mcl_wireless_adb_diagnostic_receipt_v1.txt"', self.receipt
        )
        self.assertIn("private static final int MAX_BYTES = 4_096;", self.receipt)
        self.assertIn("bytes.length > MAX_BYTES", self.receipt)
        self.assertIn("readFully()", self.receipt)
        self.assertIn("startWrite()", self.receipt)
        self.assertIn("finishWrite(output)", self.receipt)
        self.assertIn("failWrite(output)", self.receipt)
        self.assertNotIn("SharedPreferences", self.receipt)
        self.assertNotIn("getExternal", self.receipt)
        self.assertNotIn("Environment.", self.receipt)
        self.assertNotIn("RandomAccessFile", self.receipt)
        self.assertNotIn("FileWriter", self.receipt)

    def test_persistent_receipt_schema_is_fixed_and_bounded(self):
        for token in (
            '"schema=1"',
            '"armed="',
            '"locked_boot_received="',
            '"boot_completed_received="',
            '"seen="',
            '"active_network="',
            '"wifi_transport="',
            '"setting_pre="',
            '"write="',
            '"setting_post="',
            '"exception="',
            '"not_reached"',
            '"not_needed"',
            '"started"',
            '"accepted"',
            '"rejected"',
            '"security"',
            '"illegal_argument"',
        ):
            self.assertIn(token, self.receipt)

        self.assertIn("renderAttempt(lines, 4, 0, 1, state);", self.receipt)
        self.assertIn("renderAttempt(lines, 11, 1, 2, state);", self.receipt)
        self.assertIn("renderAttempt(lines, 18, 2, 3, state);", self.receipt)
        self.assertIn("lines.length != 25", self.receipt)
        self.assertIn('if ("1".equals(attempt))', self.receipt)
        self.assertIn('if ("2".equals(attempt))', self.receipt)
        self.assertIn('if ("3".equals(attempt))', self.receipt)

    def test_new_network_execution_resets_downstream_attempt_evidence(self):
        start = self.receipt.index("static void recordNetwork(")
        end = self.receipt.index("    static void recordSettingPre", start)
        body = self.receipt[start:end]
        seen = "state.attemptSeen[slot] = true;"
        quote = chr(34)
        resets = (
            "state.settingPre[slot] = " + quote + "unknown" + quote + ";",
            "state.write[slot] = " + quote + "not_reached" + quote + ";",
            "state.settingPost[slot] = " + quote + "unknown" + quote + ";",
            "state.exception[slot] = " + quote + "not_reached" + quote + ";",
        )
        for reset in resets:
            self.assertIn(reset, body)
            self.assertLess(body.index(reset), body.index(seen))

    def test_receipt_privacy_surface_has_no_variable_identity_fields(self):
        forbidden = (
            "System.currentTimeMillis",
            "Instant.",
            "LocalDate",
            "UUID",
            "getSSID(",
            "getBSSID(",
            "getLinkProperties(",
            "InetAddress",
            "LinkProperties",
            "getTransportInfo(",
            "intent.getExtras(",
            "intent.toString(",
            "exception.getMessage(",
            "exception.toString(",
            "printStackTrace",
            "Log.getStackTraceString",
            "boot_id",
            "serial",
            "pairing",
            "JSONObject",
            "Bundle",
            "Map<",
        )
        for token in forbidden:
            self.assertNotIn(token, self.receipt)

    def test_receipt_hooks_are_observational_only(self):
        self.assertIn(
            "WirelessAdbDiagnosticReceipt.resetForActivation(this);", self.activity
        )
        self.assertIn(
            "WirelessAdbDiagnosticReceipt.recordBoot(context, lockedBoot);",
            self.receiver,
        )
        self.assertLess(
            self.receiver.index("WirelessAdbDiagnosticReceipt.recordBoot"),
            self.receiver.index("scheduleFixedAttempts(context)"),
        )
        for call in (
            "recordNetwork(",
            "recordSettingPre(",
            "recordWriteStarted(",
            "recordWriteResult(",
            "recordSettingPost(",
            "recordSecurityException(",
            "recordIllegalArgumentException(",
        ):
            self.assertIn("WirelessAdbDiagnosticReceipt." + call, self.job)

        self.assertEqual(2, self.job.count("Settings.Global.putInt("))
        self.assertIn("if (!networkState.wifiTransport)", self.job)
        self.assertIn(".setPersisted(false)", self.job)
        self.assertNotIn("throws ", self.receipt)
        self.assertIn("catch (IOException | RuntimeException ignored)", self.receipt)

    def test_readme_owns_fixed_post_restore_receipt_retrieval(self):
        self.assertIn("## Persistent diagnostic receipt", self.readme)
        self.assertIn("device-protected app-private internal storage", self.readme)
        self.assertIn("4096 UTF-8 bytes", self.readme)
        self.assertIn(
            "adb shell run-as io.hanmiyoo.mcl.wirelessadbrecovery cat "
            "/data/user_de/0/io.hanmiyoo.mcl.wirelessadbrecovery/files/"
            "mcl_wireless_adb_diagnostic_receipt_v1.txt",
            self.readme,
        )
        self.assertIn(
            "never counts as recovery success or failure by itself", self.readme
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
        self.assertIn("## Bounded diagnostics contract", self.readme)
        self.assertIn("Diagnostics never emit SSID, BSSID, IP address, port, serial", self.readme)
        self.assertIn("diagnostic revision itself did not introduce OFF→ON forcing", self.readme)
        self.assertIn("bounded stale-true 0 → 1 setting sequence", self.readme)
        self.assertIn("fixed-URI observer sequencing", self.readme)
        self.assertNotIn("Thread.sleep", self.job)
        self.assertNotIn("SystemClock.sleep", self.job)


if __name__ == "__main__":
    unittest.main(verbosity=2)
