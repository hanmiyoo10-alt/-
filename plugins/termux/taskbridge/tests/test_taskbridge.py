from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import chatgpt_calibration
import taskbridge
from runtime import run_worker
from state_machine import can_transition
from store import Store


class StateMachineTests(unittest.TestCase):
    def test_stall_is_not_failure(self):
        self.assertTrue(can_transition("ACTIVE", "SUSPECTED_STALL"))
        self.assertFalse(can_transition("COMPLETED", "FAILED"))


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_and_events(self):
        job = self.store.create_job([sys.executable, "-c", "print('ok')"])
        self.assertEqual(job["logical_state"], "CREATED")
        events = self.store.events(job["job_id"])
        self.assertEqual(events[0]["event_type"], "JOB_CREATED")

    def test_successful_worker(self):
        job = self.store.create_job([sys.executable, "-c", "print('hello')"])
        rc = run_worker(self.store, job["job_id"], heartbeat_interval=0.05)
        self.assertEqual(rc, 0)
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["logical_state"], "COMPLETED")
        self.assertEqual(final["exit_code"], 0)
        self.assertTrue(Path(final["result_ref"]).read_text().strip().endswith("hello"))

    def test_failed_worker(self):
        job = self.store.create_job([sys.executable, "-c", "raise SystemExit(3)"])
        rc = run_worker(self.store, job["job_id"], heartbeat_interval=0.05)
        self.assertEqual(rc, 3)
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["logical_state"], "FAILED")
        self.assertEqual(final["exit_code"], 3)

    def test_stale_observer_preserves_uncertainty(self):
        job = self.store.create_job([sys.executable, "-c", "print('x')"])
        self.store.transition(job["job_id"], "ACTIVE", event_type="TEST_ACTIVE", local_state="RUNNING")
        self.store.transition(job["job_id"], "SUSPECTED_STALL", event_type="TEST_STALL", local_state="STALE", signal_confidence="LOW")
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["logical_state"], "SUSPECTED_STALL")
        self.assertEqual(final["remote_state"], "UNKNOWN")

    @patch("runtime.notifier.notify")
    @patch("runtime.chatgpt_notification.snapshot")
    @patch("runtime.chatgpt_notification.available", return_value=True)
    def test_chatgpt_notification_is_candidate_signal_without_calibration(self, _available, snapshot, notify):
        snapshot.side_effect = [{"baseline"}, {"baseline", "new"}]
        job = self.store.create_job(
            ["com.openai.chatgpt", "30"],
            adapter="chatgpt_notification",
            name="ChatGPT notification observer",
        )
        rc = run_worker(self.store, job["job_id"], heartbeat_interval=0.01)
        self.assertEqual(rc, 0)
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["logical_state"], "COMPLETED")
        self.assertEqual(final["signal_confidence"], "MEDIUM")
        events = self.store.events(job["job_id"])
        self.assertEqual(events[-1]["detail"]["semantic"], "candidate_only_not_response_completion_proof")
        notify.assert_called_once()

    @patch("runtime.notifier.notify")
    @patch("runtime.chatgpt_notification.snapshot")
    @patch("runtime.chatgpt_notification.available", return_value=True)
    def test_chatgpt_notification_is_high_after_three_local_confirmations(self, _available, snapshot, notify):
        package = "com.openai.chatgpt"
        for job_id in ("job_a", "job_b", "job_c"):
            chatgpt_calibration.record_confirmation(self.store, package, job_id)
        snapshot.side_effect = [{"baseline"}, {"baseline", "new"}]
        job = self.store.create_job(
            [package, "30"],
            adapter="chatgpt_notification",
            name="ChatGPT notification observer",
        )
        rc = run_worker(self.store, job["job_id"], heartbeat_interval=0.01)
        self.assertEqual(rc, 0)
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["signal_confidence"], "HIGH")
        event = self.store.events(job["job_id"])[-1]
        self.assertEqual(event["detail"]["semantic"], "locally_calibrated_response_completion_signal")
        self.assertEqual(event["detail"]["calibration_count"], 3)
        self.assertIn("응답 완료 감지", notify.call_args.args[0])

    def test_calibration_deduplicates_confirmed_jobs(self):
        package = "com.openai.chatgpt"
        first = chatgpt_calibration.record_confirmation(self.store, package, "job_one")
        second = chatgpt_calibration.record_confirmation(self.store, package, "job_one")
        self.assertTrue(first["added"])
        self.assertFalse(second["added"])
        self.assertEqual(second["confirmed_count"], 1)
        self.assertFalse(second["trusted"])

    def test_active_chatgpt_observer_is_detected(self):
        package = "com.openai.chatgpt"
        job = self.store.create_job([package, "600"], adapter="chatgpt_notification")
        found = taskbridge.find_active_chatgpt_observer(self.store, package)
        self.assertEqual(found["job_id"], job["job_id"])
        self.store.transition(job["job_id"], "UNKNOWN", event_type="TEST_UNKNOWN", local_state="STOPPED")
        self.assertIsNone(taskbridge.find_active_chatgpt_observer(self.store, package))

    def test_confirm_chatgpt_uses_completed_observer_job(self):
        package = "com.openai.chatgpt"
        job = self.store.create_job([package, "600"], adapter="chatgpt_notification")
        self.store.transition(job["job_id"], "ACTIVE", event_type="CHATGPT_OBSERVER_STARTED", local_state="OBSERVING")
        self.store.transition(
            job["job_id"],
            "COMPLETED",
            event_type="CHATGPT_NOTIFICATION_SEEN",
            detail={"semantic": "candidate_only_not_response_completion_proof"},
            local_state="STOPPED",
            signal_confidence="MEDIUM",
        )
        out = io.StringIO()
        with redirect_stdout(out):
            rc = taskbridge.main(["--state-dir", self.tmp.name, "confirm-chatgpt", job["job_id"]])
        self.assertEqual(rc, 0)
        data = json.loads(out.getvalue())
        self.assertEqual(data["confirmed_count"], 1)
        self.assertTrue(data["added"])
        self.assertEqual(self.store.events(job["job_id"])[-1]["event_type"], "CHATGPT_COMPLETION_CONFIRMED")

    def test_ensure_daemon_prefers_lean_coordinator(self):
        root = Path(self.tmp.name)
        script = root / "taskbridge.py"
        coordinator = root / "coordinator.py"
        script.write_text("# test\n")
        coordinator.write_text("# test\n")

        with patch("runtime.pid_alive", side_effect=[False, True]), patch("runtime.launch_detached", return_value=4321) as launch:
            pid = taskbridge.ensure_daemon(self.store, script)

        self.assertEqual(pid, 4321)
        command = launch.call_args.args[0]
        self.assertEqual(Path(command[1]).name, "coordinator.py")
        self.assertIn("--taskbridge-script", command)
        self.assertNotIn("_daemon", command)


if __name__ == "__main__":
    unittest.main()
