from __future__ import annotations

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


resolver = load("resolve_zero_credit_request", "resolve_zero_credit_request.py")


class ResolverTests(unittest.TestCase):
    def make_repo(self):
        td = tempfile.TemporaryDirectory()
        root = Path(td.name)
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.email", "ci@example.invalid"], check=True)
        subprocess.run(["git", "-C", str(root), "config", "user.name", "CI"], check=True)
        (root / "seed.txt").write_text("seed\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", "seed.txt"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-qm", "base"], check=True)
        parent = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
        return td, root, parent

    def commit_request(self, root: Path, parent: str, *, skill="plugin-authority-scan", case_id="1", target=None, extra=False):
        req_dir = root / resolver.REQUEST_DIR
        req_dir.mkdir(parents=True, exist_ok=True)
        request_path = req_dir / "request.json"
        request_path.write_text(json.dumps({
            "schema_version": 1,
            "skill": skill,
            "case_id": case_id,
            "target_repository_sha": target or parent,
        }), encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", request_path.relative_to(root).as_posix()], check=True)
        if extra:
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(root), "add", "extra.txt"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-qm", "request"], check=True)
        return subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()

    def test_valid_single_file_request_resolves_parent_target(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent)
        out = resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)
        self.assertEqual(out["execution_trigger"], "push_request_commit")
        self.assertEqual(out["request_commit_sha"], request_sha)
        self.assertEqual(out["target_repository_sha"], parent)
        self.assertEqual(out["skill"], "plugin-authority-scan")
        self.assertEqual(out["case_id"], "1")

    def test_extra_changed_path_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent, extra=True)
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)

    def test_modified_request_file_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        req_dir = root / resolver.REQUEST_DIR
        req_dir.mkdir(parents=True, exist_ok=True)
        req = req_dir / "request.json"
        req.write_text("{}\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", req.relative_to(root).as_posix()], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-qm", "existing request"], check=True)
        parent2 = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
        req.write_text(json.dumps({
            "schema_version": 1,
            "skill": "plugin-authority-scan",
            "case_id": "1",
            "target_repository_sha": parent2,
        }), encoding="utf-8")
        subprocess.run(["git", "-C", str(root), "add", req.relative_to(root).as_posix()], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-qm", "modify request"], check=True)
        request_sha = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)

    def test_wrong_branch_namespace_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent)
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/main", request_sha)

    def test_target_parent_mismatch_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent, target="0" * 40)
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)

    def test_unallowlisted_skill_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent, skill="simcore")
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)

    def test_empty_case_id_fails_closed(self):
        td, root, parent = self.make_repo()
        self.addCleanup(td.cleanup)
        request_sha = self.commit_request(root, parent, case_id="")
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_push(root, "refs/heads/agent-skill-zero-credit-request/authority-1", request_sha)

    def test_dispatch_resolution_remains_supported(self):
        sha = "a" * 40
        out = resolver.resolve(Path("."), "workflow_dispatch", "refs/heads/main", sha, "plugin-impact-scope", "narrow-negative")
        self.assertEqual(out["execution_trigger"], "workflow_dispatch")
        self.assertEqual(out["target_repository_sha"], sha)
        self.assertIsNone(out["request_path"])


class WorkflowRequestContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (REPO_ROOT / ".github" / "workflows" / "agent-skill-zero-credit-eval.yml").read_text(encoding="utf-8")
        cls.ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")

    def test_push_trigger_is_doubly_bounded(self):
        self.assertIn("branches:\n      - 'agent-skill-zero-credit-request/**'", self.workflow)
        self.assertIn("paths:\n      - '.agent-skill-zero-credit-requests/*.json'", self.workflow)
        self.assertNotIn("pull_request:", self.workflow)

    def test_resolver_and_target_checkout_precede_context_and_inference(self):
        resolver_index = self.workflow.index("resolve_zero_credit_request.py")
        checkout_index = self.workflow.index('git checkout --detach "$EVAL_REPOSITORY_SHA"')
        context_index = self.workflow.index("Prepare output eval and bounded source context")
        inference_index = self.workflow.index("Run zero-credit local pair")
        self.assertLess(resolver_index, checkout_index)
        self.assertLess(checkout_index, context_index)
        self.assertLess(context_index, inference_index)

    def test_target_sha_not_event_sha_feeds_eval_matrix(self):
        self.assertIn('--repository-sha "$EVAL_REPOSITORY_SHA"', self.workflow)
        self.assertNotIn('--repository-sha "$GITHUB_SHA"', self.workflow)

    def test_permissions_and_ordinary_ci_remain_zero_credit(self):
        self.assertIn("permissions:\n  contents: read", self.workflow)
        self.assertNotIn("copilot-requests", self.workflow.lower())
        self.assertIn(".github/workflows/agent-skill-zero-credit-eval.yml", self.ci)
        self.assertNotIn("qwen2.5-1.5b-instruct-q4_k_m.gguf", self.ci)
        self.assertNotIn("llama-cli", self.ci)


if __name__ == "__main__":
    unittest.main()
