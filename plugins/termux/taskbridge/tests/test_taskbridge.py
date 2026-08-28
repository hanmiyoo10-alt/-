from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

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
    def test_chatgpt_notification_is_candidate_signal(self, _available, snapshot, notify):
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
        self.assertEqual(final["remote_state"], "ANDROID_NOTIFICATION")
        events = self.store.events(job["job_id"])
        self.assertEqual(events[-1]["event_type"], "CHATGPT_NOTIFICATION_SEEN")
        self.assertEqual(events[-1]["detail"]["semantic"], "candidate_only_not_response_completion_proof")
        notify.assert_called_once()


if __name__ == "__main__":
    unittest.main()
