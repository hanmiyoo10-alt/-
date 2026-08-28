from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import autowatch
import coordinator
from store import Store


class RebootRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name)
        autowatch.enable(self.store, poll_interval=5)

    def tearDown(self):
        self.tmp.cleanup()

    def _active_auto_observer(self, *, started_at: float, worker_pid: int = 10516):
        job = autowatch.arm_if_needed(self.store, now=started_at - 2)
        self.store.update_fields(job["job_id"], worker_pid=worker_pid, started_at=started_at)
        self.store.transition(
            job["job_id"],
            "ACTIVE",
            event_type="CHATGPT_OBSERVER_STARTED",
            local_state="OBSERVING",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="MEDIUM",
            last_seen=started_at,
        )
        return self.store.get_job(job["job_id"])

    def test_previous_boot_observer_is_invalidated_even_if_pid_number_could_be_reused(self):
        old = self._active_auto_observer(started_at=900.0)
        self.store.set_meta(coordinator.BOOT_ID_META, "boot-old")

        stale = coordinator.reconcile_rebooted_autowatch(
            self.store,
            current_boot_id="boot-new",
            boot_epoch=1000.0,
        )

        self.assertEqual(stale, [old["job_id"]])
        updated = self.store.get_job(old["job_id"])
        self.assertEqual(updated["logical_state"], "SUSPECTED_STALL")
        self.assertEqual(updated["local_state"], "STALE")
        self.assertIsNone(updated["worker_pid"])
        event = self.store.events(old["job_id"])[-1]
        self.assertEqual(event["event_type"], "AUTOWATCH_REBOOT_STALE")
        self.assertTrue(event["detail"]["boot_id_changed"])
        self.assertTrue(event["detail"]["predates_current_boot"])

        replacement = autowatch.arm_if_needed(self.store, now=1001.0, force=True)
        self.assertIsNotNone(replacement)
        self.assertNotEqual(replacement["job_id"], old["job_id"])
        self.assertEqual(replacement["desired_action"], "RUN")
        self.assertEqual(replacement["command"], ["com.openai.chatgpt", "0", "5.0"])

    def test_preboot_timestamp_handles_first_upgrade_without_previous_boot_id(self):
        old = self._active_auto_observer(started_at=900.0)
        self.assertIsNone(self.store.get_meta(coordinator.BOOT_ID_META))

        stale = coordinator.reconcile_rebooted_autowatch(
            self.store,
            current_boot_id="boot-current",
            boot_epoch=1000.0,
        )

        self.assertEqual(stale, [old["job_id"]])
        self.assertEqual(self.store.get_meta(coordinator.BOOT_ID_META), "boot-current")
        self.assertEqual(self.store.get_job(old["job_id"])["logical_state"], "SUSPECTED_STALL")

    def test_same_boot_live_observer_is_not_invalidated(self):
        current = self._active_auto_observer(started_at=1100.0)
        self.store.set_meta(coordinator.BOOT_ID_META, "boot-current")

        stale = coordinator.reconcile_rebooted_autowatch(
            self.store,
            current_boot_id="boot-current",
            boot_epoch=1000.0,
        )

        self.assertEqual(stale, [])
        self.assertEqual(self.store.get_job(current["job_id"])["logical_state"], "ACTIVE")

    def test_force_rearm_still_refuses_duplicate_active_observer(self):
        current = self._active_auto_observer(started_at=1100.0)
        duplicate = autowatch.arm_if_needed(self.store, now=1200.0, force=True)
        self.assertIsNone(duplicate)
        active = autowatch.find_active_observer(self.store, autowatch.DEFAULT_PACKAGE)
        self.assertEqual(active["job_id"], current["job_id"])

    def test_stale_heartbeat_with_missing_worker_identity_is_invalidated(self):
        old = self._active_auto_observer(started_at=900.0)
        with patch("coordinator.read_process_cmdline", return_value=None), patch("coordinator.pid_alive", return_value=True):
            stale = coordinator.reconcile_stale_autowatch_workers(self.store, now=1000.0)

        self.assertEqual(stale, [old["job_id"]])
        updated = self.store.get_job(old["job_id"])
        self.assertEqual(updated["logical_state"], "SUSPECTED_STALL")
        self.assertIsNone(updated["worker_pid"])
        event = self.store.events(old["job_id"])[-1]
        self.assertEqual(event["event_type"], "AUTOWATCH_WORKER_IDENTITY_STALE")
        self.assertFalse(event["detail"]["cmdline_readable"])
        self.assertTrue(event["detail"]["pid_alive_hint"])

    def test_reused_pid_with_wrong_cmdline_is_invalidated(self):
        old = self._active_auto_observer(started_at=900.0)
        wrong = ["/system/bin/app_process", "com.example.other"]
        with patch("coordinator.read_process_cmdline", return_value=wrong):
            stale = coordinator.reconcile_stale_autowatch_workers(self.store, now=1000.0)
        self.assertEqual(stale, [old["job_id"]])

    def test_matching_worker_identity_survives_stale_heartbeat(self):
        current = self._active_auto_observer(started_at=900.0)
        cmdline = [sys.executable, str(ROOT / "taskbridge.py"), "--state-dir", self.tmp.name, "_worker", current["job_id"]]
        with patch("coordinator.read_process_cmdline", return_value=cmdline):
            stale = coordinator.reconcile_stale_autowatch_workers(self.store, now=1000.0)
        self.assertEqual(stale, [])
        self.assertEqual(self.store.get_job(current["job_id"])["logical_state"], "ACTIVE")

    def test_fresh_heartbeat_is_not_invalidated_when_cmdline_unreadable(self):
        current = self._active_auto_observer(started_at=980.0)
        with patch("coordinator.read_process_cmdline", return_value=None):
            stale = coordinator.reconcile_stale_autowatch_workers(self.store, now=1000.0)
        self.assertEqual(stale, [])
        self.assertEqual(self.store.get_job(current["job_id"])["logical_state"], "ACTIVE")

    def test_identity_stale_can_force_rearm_once(self):
        old = self._active_auto_observer(started_at=900.0)
        with patch("coordinator.read_process_cmdline", return_value=None):
            stale = coordinator.reconcile_stale_autowatch_workers(self.store, now=1000.0)
        self.assertEqual(stale, [old["job_id"]])

        replacement = autowatch.arm_if_needed(self.store, now=1000.0, force=True)
        self.assertIsNotNone(replacement)
        duplicate = autowatch.arm_if_needed(self.store, now=1001.0, force=True)
        self.assertIsNone(duplicate)


if __name__ == "__main__":
    unittest.main()
