from __future__ import annotations

import importlib.util
import json
import subprocess
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


context_mod = load("build_local_context", "build_local_context.py")
prompt_mod = load("compose_local_prompt", "compose_local_prompt.py")
receipt_mod = load("validate_local_receipt", "validate_local_receipt.py")


class LocalContextTests(unittest.TestCase):
    def make_repo(self):
        td = tempfile.TemporaryDirectory()
        root = Path(td.name)
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.email", "ci@example.invalid"], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.name", "CI"], check=True)
        (root / "a.txt").write_text("one\nplugin:usage-dashboard\nthree\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", "a.txt"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-qm", "one"], check=True)
        return td, root

    def test_bounded_needle_context_records_source_identity(self):
        td, root = self.make_repo()
        self.addCleanup(td.cleanup)
        profile = root / "profile.json"
        profile.write_text(json.dumps({
            "schema_version": 1,
            "profiles": {"plugin-authority-scan": {"1": [{
                "ref": "HEAD", "path": "a.txt", "mode": "needle_windows",
                "needles": ["plugin:usage-dashboard"], "radius": 1, "max_bytes": 1000
            }]}}
        }), encoding="utf-8")
        out = context_mod.build_context(root, profile, "plugin-authority-scan", "1")
        self.assertEqual(out["blocks"][0]["ref"], "HEAD")
        self.assertIn("plugin:usage-dashboard", out["context_text"])
        self.assertRegex(out["blocks"][0]["resolved_commit_sha"], r"^[0-9a-f]{40}$")

    def test_missing_needle_fails_closed(self):
        td, root = self.make_repo()
        self.addCleanup(td.cleanup)
        profile = root / "profile.json"
        profile.write_text(json.dumps({"schema_version": 1, "profiles": {"plugin-authority-scan": {"1": [{
            "ref": "HEAD", "path": "a.txt", "mode": "needle_windows", "needles": ["ABSENT"],
            "radius": 1, "max_bytes": 1000
        }]}}}), encoding="utf-8")
        with self.assertRaises(context_mod.ContextError):
            context_mod.build_context(root, profile, "plugin-authority-scan", "1")

    def test_empty_profile_is_valid_and_hashes_empty_context(self):
        td, root = self.make_repo()
        self.addCleanup(td.cleanup)
        profile = root / "profile.json"
        profile.write_text(json.dumps({"schema_version": 1, "profiles": {"plugin-impact-scope": {"narrow-negative": []}}}), encoding="utf-8")
        out = context_mod.build_context(root, profile, "plugin-impact-scope", "narrow-negative")
        self.assertEqual(out["context_text"], "")
        self.assertEqual(out["blocks"], [])


class PrepareLocalEvalTests(unittest.TestCase):
    def run_prepare(self, model_id=None):
        repo_root = ROOT.parents[1]
        base = ROOT / "prepare_eval.py"
        if not base.is_file():
            self.skipTest("real repository prepare_eval.py not present in isolated test fixture")
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        out = Path(td.name) / "matrix.json"
        cmd = [
            "python", str(ROOT / "prepare_local_eval.py"),
            "--repo-root", str(repo_root),
            "--skill", "plugin-impact-scope",
            "--case-id", "narrow-negative",
            "--repository-sha", "a" * 40,
        ]
        if model_id is not None:
            cmd += ["--model-id", model_id]
        cmd += ["--output", str(out)]
        proc = subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        data = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None
        return proc, data

    def test_real_impact_fixture_defaults_to_1_5b_without_inference(self):
        proc, data = self.run_prepare()
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(data["requested_model"], "qwen2.5-1.5b-instruct-q4_k_m-local")
        self.assertEqual(data["execution_surface"], "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS")

    def test_explicit_3b_local_model_is_allowed(self):
        proc, data = self.run_prepare("qwen2.5-3b-instruct-q4_k_m-local")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(data["requested_model"], "qwen2.5-3b-instruct-q4_k_m-local")

    def test_unallowlisted_local_model_fails_closed(self):
        proc, data = self.run_prepare("latest-local-model")
        self.assertEqual(proc.returncode, 2)
        self.assertIsNone(data)
        self.assertIn("unallowlisted model", proc.stderr)


class PromptTests(unittest.TestCase):
    def test_pair_keeps_user_and_evidence_hashes_equal_but_prompt_differs(self):
        matrix = {"eval_kind": "output", "skill": "plugin-impact-scope", "case_id": "narrow-negative", "prompt": "task"}
        context = {"skill": "plugin-impact-scope", "case_id": "narrow-negative", "context_text": "", "context_sha256": context_mod.sha256_bytes(b"")}
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("UNIQUE_TARGET_RULE_123", encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(matrix, context, skill, "with_skill")
            base_prompt, base_meta = prompt_mod.compose(matrix, context, skill, "baseline_without_target_skill")
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(with_meta["evidence_context_sha256"], base_meta["evidence_context_sha256"])
        self.assertNotEqual(with_meta["full_prompt_sha256"], base_meta["full_prompt_sha256"])
        self.assertIn("UNIQUE_TARGET_RULE_123", with_prompt)
        self.assertNotIn("UNIQUE_TARGET_RULE_123", base_prompt)

    def test_pair_shares_synthesis_first_anti_echo_frame(self):
        matrix = {"eval_kind": "output", "skill": "plugin-impact-scope", "case_id": "service-tier-fidelity", "prompt": "trace it"}
        evidence = "SOURCE_PATH plugins/example.js SYMBOL requestKey"
        context = {
            "skill": "plugin-impact-scope",
            "case_id": "service-tier-fidelity",
            "context_text": evidence,
            "context_sha256": context_mod.sha256_bytes(evidence.encode("utf-8")),
        }
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("target guidance", encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(matrix, context, skill, "with_skill")
            base_prompt, base_meta = prompt_mod.compose(matrix, context, skill, "baseline_without_target_skill")
        required = [
            "Return only the compact final answer",
            "do not restate, quote, summarize, or reproduce TARGET SKILL GUIDANCE",
            "Do not use generic placeholders",
            "For every non-UNKNOWN semantic edge or preservation claim, name the exact source path",
        ]
        for phrase in required:
            self.assertIn(phrase, with_prompt)
            self.assertIn(phrase, base_prompt)
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(with_meta["evidence_context_sha256"], base_meta["evidence_context_sha256"])


class ReceiptTests(unittest.TestCase):
    def make_receipt(self, mode: str, prompt_hash: str, guidance_hash):
        return {
            "schema_version": 1,
            "execution_surface": "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS",
            "repository_sha": "a" * 40,
            "skill": "plugin-impact-scope",
            "skill_sha256": "b" * 64,
            "fixture_sha256": "c" * 64,
            "case_id": "narrow-negative",
            "mode": mode,
            "user_task_sha256": "d" * 64,
            "evidence_context_sha256": "e" * 64,
            "full_prompt_sha256": prompt_hash,
            "skill_guidance_sha256": guidance_hash,
            "model_repository": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
            "model_revision": "a615a81362316d7b9f5a7a9c4313adfdf9b54588",
            "model_file": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
            "model_sha256": "6" * 64,
            "llama_release": "b10516",
            "llama_source_digest": "f" * 40,
            "llama_artifact": "llama-b10516-bin-ubuntu-x64.tar.gz",
            "llama_artifact_sha256": "7" * 64,
            "llama_runtime_version": "version",
            "generation": {"temperature": 0, "seed": 42, "n_predict": 512, "ctx_size": 16384},
            "response_sha256": "8" * 64,
            "process_exit_code": 0,
            "trigger_observability": "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION",
            "qualitative_verdict": None,
        }

    def test_valid_pair_has_no_winner_and_trigger_stays_unobservable(self):
        a = self.make_receipt("with_skill", "1" * 64, "2" * 64)
        b = self.make_receipt("baseline_without_target_skill", "3" * 64, None)
        result = receipt_mod.validate_pair(a, b)
        self.assertEqual(result["status"], "PAIR_VALID")
        self.assertIsNone(result["qualitative_verdict"])
        self.assertEqual(result["trigger_observability"], "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION")

    def test_shared_evidence_mismatch_rejected(self):
        a = self.make_receipt("with_skill", "1" * 64, "2" * 64)
        b = self.make_receipt("baseline_without_target_skill", "3" * 64, None)
        b["evidence_context_sha256"] = "9" * 64
        with self.assertRaises(receipt_mod.LocalReceiptError):
            receipt_mod.validate_pair(a, b)

    def test_same_full_prompt_is_rejected(self):
        a = self.make_receipt("with_skill", "1" * 64, "2" * 64)
        b = self.make_receipt("baseline_without_target_skill", "1" * 64, None)
        with self.assertRaises(receipt_mod.LocalReceiptError):
            receipt_mod.validate_pair(a, b)


class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (ROOT.parents[1] / ".github" / "workflows" / "agent-skill-zero-credit-eval.yml").read_text(encoding="utf-8")
        cls.ci = (ROOT.parents[1] / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")

    def test_zero_credit_workflow_has_bounded_explicit_triggers_and_contents_read(self):
        self.assertIn("workflow_dispatch:", self.workflow)
        self.assertIn("\n  push:\n", self.workflow)
        self.assertIn("'agent-skill-zero-credit-request/**'", self.workflow)
        self.assertIn("'.agent-skill-zero-credit-requests/*.json'", self.workflow)
        self.assertNotIn("pull_request:", self.workflow)
        self.assertIn("permissions:\n  contents: read", self.workflow)
        self.assertNotIn("copilot-requests", self.workflow.lower())

    def test_no_hosted_ai_or_secret_dependency(self):
        lowered = self.workflow.lower()
        self.assertNotIn("secrets.", lowered)
        self.assertNotIn("api_key", lowered)
        self.assertNotIn("openai", lowered)
        self.assertNotIn("github models", lowered)
        self.assertNotIn("copilot ", lowered)

    def test_runtime_and_models_are_sha_verified_before_use(self):
        self.assertIn("f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35", self.workflow)
        self.assertIn("6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e", self.workflow)
        self.assertIn("626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d", self.workflow)
        self.assertLess(self.workflow.index("sha256sum -c llama.sha256"), self.workflow.index("tar -xzf"))
        self.assertLess(self.workflow.index("sha256sum -c model.sha256"), self.workflow.index("Run zero-credit local pair"))

    def test_standard_runner_and_no_inference_in_ordinary_ci(self):
        self.assertIn("runs-on: ubuntu-24.04", self.workflow)
        self.assertIn("agent-skill-zero-credit-eval.yml", self.ci)
        self.assertNotIn("qwen2.5-1.5b-instruct-q4_k_m.gguf", self.ci)
        self.assertNotIn("qwen2.5-3b-instruct-q4_k_m.gguf", self.ci)
        self.assertNotIn("llama-cli", self.ci)


if __name__ == "__main__":
    unittest.main()
