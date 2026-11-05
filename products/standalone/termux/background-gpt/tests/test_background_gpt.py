import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


state_store = load_module("state_store_test", "state_store.py")
backend = load_module("openai_backend_test", "openai_backend.py")
notifications = load_module("notifications_test", "notifications.py")


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


class BackgroundGptTests(unittest.TestCase):
    def test_state_roundtrip_and_stale_watcher_keeps_remote_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "state.json"
            state_store.atomic_write_json(path, {
                "schema": 1,
                "remote_status": "in_progress",
                "watcher_status": "running",
                "watcher_pid": 999999999,
            })
            result = state_store.normalize_local_watcher(state_store.load_state(path), path)
            self.assertEqual(result["watcher_status"], "stale")
            self.assertEqual(result["remote_status"], "in_progress")

    def test_elapsed_prefers_remote_timestamps(self):
        state = {"submitted_at_epoch": 5, "response_created_at": 10, "response_completed_at": 25}
        self.assertEqual(state_store.elapsed_seconds(state, lambda: 999), 15)

    def test_submit_sets_background_true_and_bearer_header(self):
        captured = {}

        def opener(req, timeout):
            captured["req"] = req
            captured["timeout"] = timeout
            return FakeResponse({"id": "resp_123", "status": "queued"})

        client = backend.OpenAIBackend(api_key="secret-test-key", opener=opener)
        response = client.submit("hello", "gpt-test")
        self.assertEqual(response["id"], "resp_123")
        req = captured["req"]
        self.assertEqual(req.get_method(), "POST")
        self.assertEqual(req.get_header("Authorization"), "Bearer secret-test-key")
        body = json.loads(req.data.decode("utf-8"))
        self.assertTrue(body["background"])
        self.assertEqual(body["input"], "hello")
        self.assertEqual(body["model"], "gpt-test")

    def test_retrieve_and_cancel_paths(self):
        paths = []

        def opener(req, timeout):
            paths.append((req.get_method(), req.full_url))
            return FakeResponse({"id": "resp_abc", "status": "in_progress"})

        client = backend.OpenAIBackend(api_key="x", base_url="https://example.test/v1", opener=opener)
        client.retrieve("resp_abc")
        client.cancel("resp_abc")
        self.assertEqual(paths[0], ("GET", "https://example.test/v1/responses/resp_abc"))
        self.assertEqual(paths[1], ("POST", "https://example.test/v1/responses/resp_abc/cancel"))

    def test_output_text_extraction(self):
        response = {
            "output": [
                {"type": "message", "content": [
                    {"type": "output_text", "text": "first"},
                    {"type": "output_text", "text": "second"},
                ]}
            ]
        }
        self.assertEqual(backend.extract_output_text(response), "first\nsecond")

    def test_complete_notification_is_not_ongoing_and_alerts(self):
        calls = []

        def runner(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        notifications.Notifier(runner).complete(65)
        args = calls[0]
        self.assertNotIn("--ongoing", args)
        self.assertIn("--sound", args)
        self.assertIn("--vibrate", args)
        self.assertEqual(args[args.index("--id") + 1], notifications.NOTIFICATION_ID)

    def test_uncertain_notification_does_not_claim_remote_failure(self):
        calls = []

        def runner(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        notifications.Notifier(runner).uncertain()
        joined = " ".join(calls[0])
        self.assertIn("서버 작업 실패로 간주하지 않음", joined)

    def test_api_error_string_never_contains_key(self):
        err = backend.ApiError(401, "bad credentials")
        self.assertNotIn("secret-key", str(err))


if __name__ == "__main__":
    unittest.main()
