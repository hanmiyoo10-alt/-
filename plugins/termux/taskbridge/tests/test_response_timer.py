from __future__ import annotations

import tempfile
import unittest
from unittest.mock import patch

import autowatch
import chatgpt_calibration
import response_timer
from store import Store


class ResponseTimerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name)
        self.package = "com.openai.chatgpt"
        autowatch.enable(self.store, self.package, 5)
        for job_id in ("cal_a", "cal_b", "cal_c"):
            chatgpt_calibration.record_confirmation(self.store, self.package, job_id)

    def tearDown(self):
        self.tmp.cleanup()

    def make_active_observer(self):
        job = self.store.create_job(
            [self.package, "0", "5.0"],
            adapter="chatgpt_notification",
            name=autowatch.AUTO_NAME,
        )
        self.store.transition(
            job["job_id"],
            "ACTIVE",
            event_type="CHATGPT_OBSERVER_STARTED",
            local_state="OBSERVING",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="MEDIUM",
        )
        return self.store.get_job(job["job_id"])

    def start_timer(self):
        observer = self.make_active_observer()
        with patch("response_timer._notification_available", return_value=True), patch(
            "response_timer._daemon_alive", return_value=True
        ), patch("response_timer._notify", return_value=True):
            data = response_timer.start(self.store, self.package)
        return observer, data

    def test_start_binds_active_observer_and_starts_at_zero(self):
        observer = self.make_active_observer()
        with patch("response_timer._notification_available", return_value=True), patch(
            "response_timer._daemon_alive", return_value=True
        ), patch("response_timer._notify", return_value=True) as notify:
            data = response_timer.start(self.store, self.package)

        self.assertEqual(data["state"], "ACTIVE")
        self.assertEqual(data["observer_job_id"], observer["job_id"])
        self.assertEqual(data["elapsed_seconds"], 0)
        self.assertEqual(data["mode"], "explicit_start_auto_high_completion")
        self.assertEqual(notify.call_args.args[1], "응답 시작 · 0초")
        self.assertTrue(notify.call_args.kwargs["ongoing"])
        self.assertFalse(notify.call_args.kwargs["sound"])

    def test_duplicate_active_timer_is_rejected(self):
        self.start_timer()
        with patch("response_timer._notification_available", return_value=True), patch(
            "response_timer._daemon_alive", return_value=True
        ):
            with self.assertRaises(RuntimeError):
                response_timer.start(self.store, self.package)

    def test_live_tick_updates_elapsed_once_per_second(self):
        _observer, data = self.start_timer()
        started = float(data["started_monotonic"])
        with patch("response_timer._notify", return_value=True) as notify:
            active = response_timer.tick(self.store, now_mono=started + 3.2)

        self.assertTrue(active)
        current = response_timer.status(self.store)
        self.assertEqual(current["elapsed_seconds"], 3)
        self.assertEqual(notify.call_args.args[1], "응답 중 · 3초")
        self.assertTrue(notify.call_args.kwargs["ongoing"])

    def test_high_calibrated_completion_stops_timer(self):
        observer, data = self.start_timer()
        self.store.transition(
            observer["job_id"],
            "COMPLETED",
            event_type="CHATGPT_NOTIFICATION_SEEN",
            detail={"semantic": "locally_calibrated_response_completion_signal"},
            local_state="STOPPED",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="HIGH",
        )
        started = float(data["started_monotonic"])
        with patch("response_timer._notify", return_value=True) as notify:
            active = response_timer.tick(self.store, now_mono=started + 7.9)

        self.assertFalse(active)
        final = response_timer.status(self.store)
        self.assertEqual(final["state"], "COMPLETED")
        self.assertEqual(final["elapsed_seconds"], 7)
        self.assertEqual(final["completion_job_id"], observer["job_id"])
        self.assertEqual(final["completion_signal_confidence"], "HIGH")
        self.assertEqual(notify.call_args.args[1], "완료 · 7초")
        self.assertFalse(notify.call_args.kwargs["ongoing"])
        self.assertTrue(notify.call_args.kwargs["sound"])
        self.assertFalse(notify.call_args.kwargs["alert_once"])

    def test_medium_candidate_does_not_auto_complete(self):
        observer, data = self.start_timer()
        self.store.transition(
            observer["job_id"],
            "COMPLETED",
            event_type="CHATGPT_NOTIFICATION_SEEN",
            detail={"semantic": "candidate_only_not_response_completion_proof"},
            local_state="STOPPED",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="MEDIUM",
        )
        started = float(data["started_monotonic"])
        with patch("response_timer._notify", return_value=True):
            active = response_timer.tick(self.store, now_mono=started + 4.1)

        self.assertTrue(active)
        self.assertEqual(response_timer.status(self.store)["state"], "ACTIVE")

    def test_timer_rebinds_after_observer_loss(self):
        first, data = self.start_timer()
        self.store.transition(
            first["job_id"],
            "UNKNOWN",
            event_type="TEST_OBSERVER_LOST",
            local_state="STOPPED",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="LOW",
        )
        second = self.make_active_observer()
        started = float(data["started_monotonic"])
        with patch("response_timer._remove_notification", return_value=True) as remove, patch(
            "response_timer._notify", return_value=True
        ):
            active = response_timer.tick(self.store, now_mono=started + 5.0)

        self.assertTrue(active)
        current = response_timer.status(self.store)
        self.assertEqual(current["observer_job_id"], second["job_id"])
        self.assertEqual(current["observer_rebind_count"], 1)
        remove.assert_called_once()

    def test_startup_reboot_marks_active_timer_unknown(self):
        _observer, data = self.start_timer()
        started = float(data["started_monotonic"])
        with patch("response_timer._notify", return_value=True):
            response_timer.reconcile_after_startup(self.store, now_mono=max(0.0, started - 10.0))
        self.assertEqual(response_timer.status(self.store)["state"], "UNKNOWN")

    def test_manual_stop_unpins_timer_notification(self):
        self.start_timer()
        with patch("response_timer._notify", return_value=True) as notify:
            data = response_timer.stop(self.store)
        self.assertEqual(data["state"], "STOPPED")
        self.assertFalse(notify.call_args.kwargs["ongoing"])
        self.assertFalse(notify.call_args.kwargs["sound"])


if __name__ == "__main__":
    unittest.main()
