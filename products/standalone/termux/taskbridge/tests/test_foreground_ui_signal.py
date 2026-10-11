from __future__ import annotations

import tempfile
import unittest
from unittest.mock import patch

from adapters import foreground_ui_signal
import runtime
from store import Store


class ForegroundUiSignalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_companion_fingerprint_excludes_notification_text(self):
        base = {
            "packageName": foreground_ui_signal.COMPANION_PACKAGE,
            "id": int(foreground_ui_signal.SIGNAL_NOTIFICATION_ID),
            "key": "signal-key",
            "when": 1234,
            "title": "one",
            "content": "secret one",
        }
        changed_text = dict(base, title="two", content="secret two")
        self.assertEqual(
            foreground_ui_signal.snapshot_from_items([base]),
            foreground_ui_signal.snapshot_from_items([changed_text]),
        )

    def test_companion_signal_completes_chatgpt_observer_without_chatgpt_notification(self):
        job = self.store.create_job(
            ["com.openai.chatgpt", "0", "0.5"],
            adapter="chatgpt_notification",
            name="ChatGPT automatic notification observer",
        )
        ui_signal = {
            "packageName": foreground_ui_signal.COMPANION_PACKAGE,
            "id": int(foreground_ui_signal.SIGNAL_NOTIFICATION_ID),
            "key": "ui-signal",
            "when": 2000,
            "title": "ignored",
            "content": "ignored",
        }
        with patch("runtime.chatgpt_notification.available", return_value=True), patch(
            "runtime.chatgpt_notification.list_notifications", side_effect=[[], [ui_signal]]
        ), patch("runtime.notifier.notify", return_value=True):
            rc = runtime._run_chatgpt_notification_worker(self.store, job["job_id"], interval=0.5)

        self.assertEqual(rc, 0)
        final = self.store.get_job(job["job_id"])
        self.assertEqual(final["logical_state"], "COMPLETED")
        self.assertEqual(final["signal_confidence"], "HIGH")
        self.assertEqual(final["remote_state"], "ANDROID_ACCESSIBILITY_UI")
        events = self.store.events(job["job_id"], 50)
        ui_events = [event for event in events if event["event_type"] == "CHATGPT_UI_COMPLETION_SIGNAL"]
        self.assertEqual(len(ui_events), 1)
        self.assertEqual(ui_events[0]["detail"]["source"], foreground_ui_signal.SOURCE)
        compat = [event for event in events if event["event_type"] == "CHATGPT_NOTIFICATION_SEEN"]
        self.assertEqual(len(compat), 1)
        self.assertEqual(compat[0]["detail"]["source_semantic"], foreground_ui_signal.SEMANTIC)


if __name__ == "__main__":
    unittest.main()
