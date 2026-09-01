from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


server_mod = load("run_local_server_pair", "run_local_server_pair.py")


class ServerCaptureTests(unittest.TestCase):
    def generation(self):
        return {
            "temperature": 0,
            "seed": 42,
            "n_predict": 768,
            "ctx_size": 16384,
            "threads": 4,
            "gpu_layers": 0,
            "transport": "llama-server-v1-chat-completions",
        }

    def test_generation_is_bounded_cpu_only_and_transport_locked(self):
        out = server_mod.validate_generation(self.generation())
        self.assertEqual(out["gpu_layers"], 0)
        self.assertEqual(out["n_predict"], 768)
        self.assertEqual(out["transport"], server_mod.TRANSPORT)

    def test_gpu_layers_fail_closed(self):
        value = self.generation()
        value["gpu_layers"] = 1
        with self.assertRaises(server_mod.ServerPairError):
            server_mod.validate_generation(value)

    def test_generation_over_1024_fails_closed(self):
        value = self.generation()
        value["n_predict"] = 1025
        with self.assertRaises(server_mod.ServerPairError):
            server_mod.validate_generation(value)

    def test_chat_payload_uses_same_prompt_as_one_user_message(self):
        generation = server_mod.validate_generation(self.generation())
        out = server_mod.build_chat_payload("source-backed task", generation)
        self.assertEqual(out["model"], "local-eval")
        self.assertEqual(out["messages"], [{"role": "user", "content": "source-backed task"}])
        self.assertEqual(out["temperature"], 0)
        self.assertEqual(out["seed"], 42)
        self.assertEqual(out["max_tokens"], 768)
        self.assertFalse(out["stream"])

    def test_extract_chat_content_returns_generated_content_only(self):
        payload = {
            "choices": [{
                "finish_reason": "stop",
                "message": {"role": "assistant", "content": "### Impact Scope\nsource-grounded"},
            }]
        }
        content, finish = server_mod.extract_chat_content(payload)
        self.assertEqual(content, "### Impact Scope\nsource-grounded")
        self.assertEqual(finish, "stop")

    def test_extract_chat_content_rejects_empty_or_missing_shape(self):
        with self.assertRaises(server_mod.ServerPairError):
            server_mod.extract_chat_content({"choices": []})
        with self.assertRaises(server_mod.ServerPairError):
            server_mod.extract_chat_content({"choices": [{"finish_reason": "stop", "message": {"content": ""}}]})

    def test_server_command_is_loopback_cpu_and_alias_bounded(self):
        generation = server_mod.validate_generation(self.generation())
        with tempfile.TemporaryDirectory() as td:
            server = Path(td) / "llama-server"
            model = Path(td) / "model.gguf"
            server.write_text("stub", encoding="utf-8")
            model.write_text("stub", encoding="utf-8")
            cmd = server_mod.build_server_command(server, model, generation, 39127)
        joined = " ".join(cmd)
        self.assertIn("--host 127.0.0.1", joined)
        self.assertIn("--port 39127", joined)
        self.assertIn("--alias local-eval", joined)
        self.assertIn("--n-gpu-layers 0", joined)
        self.assertNotIn("0.0.0.0", joined)


if __name__ == "__main__":
    unittest.main()
