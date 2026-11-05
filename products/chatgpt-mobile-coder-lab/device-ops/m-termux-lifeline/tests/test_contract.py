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
                "android.permission.POST_NOTIFICATIONS",
                "android.permission.RECEIVE_BOOT_COMPLETED",
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

    def test_android_service_uses_fixed_run_command_result_probe(self):
        root = ET.parse(MANIFEST).getroot()
        service = root.find("application/service")
        self.assertIsNotNone(service)
        receivers = root.findall("application/receiver")
        self.assertEqual(len(receivers), 1)
        receiver = receivers[0]
        self.assertEqual(receiver.attrib[ANDROID_NS + "name"], ".BootReceiver")
        self.assertEqual(receiver.attrib[ANDROID_NS + "enabled"], "true")
        self.assertEqual(receiver.attrib[ANDROID_NS + "exported"], "false")
        filters = receiver.findall("intent-filter")
        self.assertEqual(len(filters), 1)
        actions = filters[0].findall("action")
        self.assertEqual(len(actions), 1)
        self.assertEqual(
            actions[0].attrib[ANDROID_NS + "name"],
            "android.intent.action.BOOT_COMPLETED",
        )
        self.assertEqual(filters[0].findall("category"), [])
        self.assertEqual(filters[0].findall("data"), [])
        self.assertIsNone(root.find("application/provider"))
        self.assertEqual(service.attrib[ANDROID_NS + "exported"], "false")

        source = (JAVA / "LifelineService.java").read_text()
        required = (
            'RUN_COMMAND_ACTION = "com.termux.RUN_COMMAND"',
            'RUN_COMMAND_SERVICE = "com.termux.app.RunCommandService"',
            'RUN_COMMAND_PENDING_INTENT = "com.termux.RUN_COMMAND_PENDING_INTENT"',
            'RESULT_BUNDLE = "result"',
            'RESULT_EXIT_CODE = "exitCode"',
            'RESULT_ERROR_CODE = "err"',
            '"/data/data/com.termux/files/home/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py"',
            '"/data/data/com.termux/files/home/.local/bin/mcl-m-termux-lifeline-recover"',
            '"/data/data/com.termux/files/home/.termux/boot/31-mcl-m-rdc-supervisor-guard"',
            '"/data/data/com.termux/files/home/.termux/boot/32-mcl-m-tailscale-supervisor-guard"',
            'new String[] {"--status"}',
            "new String[0]",
            "PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_MUTABLE",
            "intent.getDataString()",
            "Activity.RESULT_OK",
            "if (!running)",
            "lastRecoveryReceiptMs.set(now)",
        )
        for needle in required:
            self.assertIn(needle, source)

        for forbidden in (
            "BroadcastReceiver",
            "getSentFromUid()",
            "ContentProvider",
            "LocalServerSocket",
            "getPeerCredentials()",
            "result.getString(",
            '"stdout"',
            '"stderr"',
            "ProcessBuilder",
            "Runtime.getRuntime",
        ):
            self.assertNotIn(forbidden, source)

    def test_boot_rearm_surface_is_fixed_and_fail_closed(self):
        receiver = (JAVA / "BootReceiver.java").read_text()
        policy = (JAVA / "BootRearmPolicy.java").read_text()
        activity = (JAVA / "MainActivity.java").read_text()

        for required in (
            "Intent.ACTION_BOOT_COMPLETED",
            "MainActivity.isBootAutoRearmEnabled(context)",
            "LifelineService.RUN_COMMAND_PERMISSION",
            "Manifest.permission.POST_NOTIFICATIONS",
            "ApplicationInfo.FLAG_STOPPED",
            "MainActivity.isPolicyAcknowledged(context)",
            "context.startForegroundService(new Intent(context, LifelineService.class))",
        ):
            self.assertIn(required, receiver)

        for forbidden in (
            "LOCKED_BOOT_COMPLETED",
            "RUN_COMMAND_PATH",
            "RUN_COMMAND_ARGUMENTS",
            "getStringExtra",
            "getSerializableExtra",
            "Settings.Global",
            "Settings.Secure",
            "device_config",
            "force-stop",
            "runsvdir",
        ):
            self.assertNotIn(forbidden, receiver)

        self.assertIn("termuxPackageState == LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED", policy)
        self.assertIn('BOOT_AUTO_REARM = "boot_auto_rearm_v1"', activity)
        self.assertIn('bootAutoRearmEnable.setText("재부팅 후 Lifeline 자동 재무장 사용")', activity)
        self.assertIn('bootAutoRearmDisable.setText("재부팅 후 Lifeline 자동 재무장 사용 안 함")', activity)
        arm = activity.index('arm.setText("Lifeline arm")')
        disarm = activity.index('disarm.setText("Lifeline disarm")')
        self.assertNotIn("setBootAutoRearmEnabled", activity[arm:disarm])
        disarm_block = activity[disarm:activity.index("TextView note", disarm)]
        self.assertIn("setBootAutoRearmEnabled(this, false);", disarm_block)
        self.assertLess(
            disarm_block.index("setBootAutoRearmEnabled(this, false);"),
            disarm_block.index("stopService("),
        )

    def test_run_command_review_findings_are_fail_closed(self):
        source = (JAVA / "LifelineService.java").read_text()

        self.assertIn("UUID.randomUUID().toString()", source)
        self.assertNotIn("nextGeneration", source)
        self.assertNotIn("nextRequestCode", source)
        self.assertIn('"/" + kind + "/" + operationToken', source)

        pending_pos = source.index("recoveryPending = true;")
        dispatch_pos = source.index("if (dispatchFixedRecovery(now))", pending_pos)
        self.assertLess(pending_pos, dispatch_pos)

        self.assertIn("RecoveryOutcome.VERIFY_TIMEOUT_MS", source)
        self.assertGreaterEqual(source.count("recoveryDeadlineExpired(now)"), 2)
        result_handler = source.index("private synchronized void handleRunCommandResult")
        deadline_check = source.index("recoveryDeadlineExpired(now)", result_handler)
        success_check = source.index("runCommandSucceeded(intent)", result_handler)
        self.assertLess(deadline_check, success_check)

        self.assertIn("private boolean recoveryProbePrerequisitesSatisfied()", source)
        helper = source.index("private boolean recoveryProbePrerequisitesSatisfied()")
        helper_text = source[helper:]
        self.assertIn("readPackageState()", helper_text)
        self.assertIn("hasRunCommandPermission()", helper_text)
        self.assertIn("MainActivity.isPolicyAcknowledged(this)", helper_text)
        recovery_branch = source.index("if (recoveryPending)")
        recheck = source.index("recoveryProbePrerequisitesSatisfied()", recovery_branch)
        probe = source.index("dispatchFixedProbe(now)", recheck)
        self.assertLess(recheck, probe)

    def test_post_recovery_durability_rearm_is_bounded_and_single_attempt(self):
        source = (JAVA / "LifelineService.java").read_text()

        recovered = source.index("outcome == RecoveryOutcome.State.RECOVERED")
        pending = source.index("postRecoveryDurabilityPending = true;", recovered)
        recovered_at = source.index("recoveredAtMs = now;", pending)
        self.assertLess(recovered, pending)
        self.assertLess(pending, recovered_at)

        helper = source.index("private void tickPostRecoveryDurability(long now)")
        helper_text = source[helper:]
        self.assertIn("recoveryProbePrerequisitesSatisfied()", helper_text)
        self.assertIn("LifelinePolicy.COOLDOWN_MS", helper_text)
        self.assertIn("LifelinePolicy.STALE_AFTER_MS", helper_text)
        self.assertIn("postRecoveryDurabilityAttempted = true;", helper_text)
        self.assertIn("RDC_GUARD_LAUNCHER_PATH", helper_text)
        self.assertIn("TAILSCALE_GUARD_LAUNCHER_PATH", helper_text)
        self.assertIn("KIND_DURABILITY_RDC", source)
        self.assertIn("KIND_DURABILITY_TAILSCALE", source)

        attempt = source.index("postRecoveryDurabilityAttempted = true;", helper)
        rdc_dispatch = source.index("RDC_GUARD_LAUNCHER_PATH", attempt)
        rdc_handler = source.index('if (KIND_DURABILITY_RDC.equals(kind))')
        tailscale_dispatch = source.index("TAILSCALE_GUARD_LAUNCHER_PATH", rdc_handler)
        tailscale_handler = source.index('if (KIND_DURABILITY_TAILSCALE.equals(kind))')
        self.assertLess(attempt, rdc_dispatch)
        self.assertLess(rdc_handler, tailscale_dispatch)
        self.assertLess(tailscale_dispatch, tailscale_handler)

        self.assertIn('setStatus("POST_RECOVERY_SETTLING")', source)
        self.assertIn('setStatus("POST_RECOVERY_DURABILITY_REARMING")', source)
        self.assertIn('setStatus("POST_RECOVERY_DURABILITY_REARMED")', source)
        self.assertIn('setStatus("POST_RECOVERY_DURABILITY_FAILED")', source)

        stale = source.index(
            "heartbeat <= 0L || now - heartbeat >= LifelinePolicy.STALE_AFTER_MS",
            helper,
        )
        stale_stop = source.index("stopPostRecoveryDurability();", stale)
        cooldown = source.index(
            "now - recoveredAtMs < LifelinePolicy.COOLDOWN_MS",
            helper,
        )
        post_settle_heartbeat = source.index(
            "heartbeat < recoveredAtMs + LifelinePolicy.COOLDOWN_MS",
            cooldown,
        )
        attempt = source.index(
            "postRecoveryDurabilityAttempted = true;",
            post_settle_heartbeat,
        )
        self.assertLess(stale, cooldown)
        self.assertLess(cooldown, post_settle_heartbeat)
        self.assertLess(post_settle_heartbeat, attempt)
        self.assertLess(stale_stop, attempt)
        cooldown_block = source[cooldown:post_settle_heartbeat]
        heartbeat_block = source[post_settle_heartbeat:attempt]
        self.assertIn("probeDue(now)", cooldown_block)
        self.assertIn("dispatchFixedProbe(now)", cooldown_block)
        self.assertIn("probeDue(now)", heartbeat_block)
        self.assertIn("dispatchFixedProbe(now)", heartbeat_block)
        self.assertNotIn("probeDue(now)", source[attempt:rdc_dispatch])
        self.assertNotIn(
            'setStatus("POST_RECOVERY_DURABILITY_VERIFYING")',
            source[stale:attempt],
        )

        recovery = (TERMUX / "mcl-m-termux-lifeline-recover").read_text()
        self.assertNotIn("31-mcl-m-rdc-supervisor-guard", recovery)
        self.assertNotIn("32-mcl-m-tailscale-supervisor-guard", recovery)

    def test_force_stop_is_separate_domain_and_prerequisites_are_manual(self):
        policy = (JAVA / "LifelinePolicy.java").read_text()
        activity = (JAVA / "MainActivity.java").read_text()
        service = (JAVA / "LifelineService.java").read_text()
        self.assertIn("BLOCKED_FORCE_STOP_DOMAIN", policy)
        self.assertIn("UNKNOWN_PACKAGE_STATE", policy)
        self.assertIn("NEEDS_MANUAL_RUN_COMMAND_PERMISSION", policy)
        self.assertIn("NEEDS_MANUAL_TERMUX_POLICY", policy)
        self.assertIn("ApplicationInfo.FLAG_STOPPED", service)
        self.assertIn("hasRunCommandPermission()", service)
        self.assertIn("MainActivity.isPolicyAcknowledged(this)", service)
        self.assertIn("allow-external-apps=true", activity)
        self.assertNotIn("putString", activity)
        self.assertNotIn("Settings.Global", activity)
        self.assertNotIn("Settings.Secure", activity)

    def test_notification_permission_is_explicit_user_action_only(self):
        activity = (JAVA / "MainActivity.java").read_text()
        self.assertIn('notificationPermission.setText("알림 권한 요청")', activity)
        self.assertIn("notificationPermission.setOnClickListener", activity)
        self.assertEqual(activity.count("requestNotificationPermission()"), 2)
        self.assertIn("Build.VERSION.SDK_INT >= 33", activity)
        self.assertIn("Manifest.permission.POST_NOTIFICATIONS", activity)
        self.assertIn("requestPermissions(", activity)
        self.assertNotIn("pm grant", activity)
        self.assertNotIn("appops", activity)

    def test_recovery_script_is_target_only_and_v4(self):
        recovery = (TERMUX / "mcl-m-termux-lifeline-recover").read_text()
        result = subprocess.run(
            ["sh", "-n", str(TERMUX / "mcl-m-termux-lifeline-recover")],
            check=False,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

        self.assertIn('$HOME_DIR/.local/bin/mcl-m-rdc-supervisor-guard', recovery)
        self.assertIn('$HOME_DIR/.local/bin/mcl-m-tailscale-supervisor-guard', recovery)
        self.assertIn('"$RDC_GUARD" --once', recovery)
        self.assertIn('"$TAILSCALE_GUARD" --once', recovery)
        self.assertIn('"$NOHUP" "$PYTHON" "$CLIENT"', recovery)
        self.assertIn('"$PYTHON" "$CLIENT" --status', recovery)
        self.assertIn("schema=mcl-m-termux-lifeline-recovery.v4", recovery)
        self.assertIn("heartbeat_active=", recovery)
        self.assertIn("guard_ring_started=false", recovery)

        rdc_pos = recovery.index('if "$RDC_GUARD" --once')
        tailscale_pos = recovery.index('if "$TAILSCALE_GUARD" --once')
        heartbeat_pos = recovery.index('"$NOHUP" "$PYTHON" "$CLIENT"')
        status_pos = recovery.index('"$PYTHON" "$CLIENT" --status')
        self.assertLess(rdc_pos, tailscale_pos)
        self.assertLess(tailscale_pos, heartbeat_pos)
        self.assertLess(heartbeat_pos, status_pos)

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
            "--heartbeat-once",
            "--recovery-ok",
            "recovery_ok_dispatch",
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

    def test_heartbeat_client_is_singleton_only(self):
        module_path = TERMUX / "heartbeat-client.py"
        spec = importlib.util.spec_from_file_location("mcl_lifeline_heartbeat", module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        self.assertEqual(module.main(["unexpected"]), 2)
        with mock.patch.object(module, "wait_singleton_active", return_value=True):
            self.assertEqual(module.main(["--status"]), 0)
        with mock.patch.object(module, "wait_singleton_active", return_value=False):
            self.assertEqual(module.main(["--status"]), 1)

        source = module_path.read_text()
        for forbidden in (
            "subprocess",
            "socket",
            "broadcast",
            "content://",
            "HEARTBEAT_ACTION",
            "RECOVERY_OK_ACTION",
            "--heartbeat-once",
            "--recovery-ok",
        ):
            self.assertNotIn(forbidden, source)

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
