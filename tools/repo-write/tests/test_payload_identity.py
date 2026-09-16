from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "payload_identity.py"
spec = importlib.util.spec_from_file_location("payload_identity", SCRIPT)
assert spec and spec.loader
projector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(projector)


def git(repo: Path, *args: str) -> str:
    cp = subprocess.run(
        ["git", *args], cwd=repo, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if cp.returncode != 0:
        raise AssertionError(f"git failed: {args}\n{cp.stderr}")
    return cp.stdout.strip()


class PayloadIdentityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        git(Path(self.tmp.name), "init", str(self.repo))
        git(self.repo, "config", "user.name", "test")
        git(self.repo, "config", "user.email", "test@example.invalid")
        (self.repo / "payload.txt").write_text("base\n", encoding="utf-8")
        git(self.repo, "add", "payload.txt")
        git(self.repo, "commit", "-m", "base")
        self.base = git(self.repo, "rev-parse", "HEAD")

        git(self.repo, "commit", "--allow-empty", "-m", "same tree")
        self.same_tree = git(self.repo, "rev-parse", "HEAD")

        (self.repo / "payload.txt").write_text("changed\n", encoding="utf-8")
        git(self.repo, "add", "payload.txt")
        git(self.repo, "commit", "-m", "different tree")
        self.different_tree = git(self.repo, "rev-parse", "HEAD")
        self.refs = git(self.repo, "show-ref")

    def tearDown(self):
        self.tmp.cleanup()

    def request(self, candidate: str, merge: str) -> dict[str, object]:
        return {
            "schemaVersion": 1,
            "candidateCommit": candidate,
            "mergeCommit": merge,
        }

    def project(self, candidate: str, merge: str):
        before = git(self.repo, "show-ref")
        out = projector.compare_payload(self.repo, self.request(candidate, merge))
        after = git(self.repo, "show-ref")
        self.assertEqual(before, self.refs)
        self.assertEqual(after, self.refs)
        return out

    def test_different_commits_same_tree_are_tree_identical(self):
        out = self.project(self.base, self.same_tree)
        self.assertEqual(out["state"], "TREE_IDENTICAL")
        self.assertEqual(out["reasonCode"], "ROOT_TREE_IDENTICAL")
        self.assertFalse(out["commitEqual"])
        self.assertTrue(out["treeEqual"])
        self.assertEqual(out["candidateTree"], out["mergeTree"])
        self.assertFalse(out["deeperSemanticComparisonRequired"])

    def test_same_commit_is_fully_identical(self):
        out = self.project(self.different_tree, self.different_tree)
        self.assertEqual(out["state"], "TREE_IDENTICAL")
        self.assertTrue(out["commitEqual"])
        self.assertTrue(out["treeEqual"])

    def test_different_root_tree_is_not_semantic_divergence_claim(self):
        out = self.project(self.same_tree, self.different_tree)
        self.assertEqual(out["state"], "TREE_DIFFERENT")
        self.assertEqual(out["reasonCode"], "ROOT_TREE_DIFFERENT")
        self.assertFalse(out["commitEqual"])
        self.assertFalse(out["treeEqual"])
        self.assertFalse(out["semanticPayloadDivergenceClaimed"])
        self.assertTrue(out["deeperSemanticComparisonRequired"])

    def test_malformed_commit_is_unknown_without_echo(self):
        out = projector.compare_payload(self.repo, self.request("bad", self.base))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "COMMIT_IDENTITY_INVALID")
        self.assertEqual(out["invalidFields"], ["candidateCommit"])
        self.assertNotIn("bad", json.dumps(out, sort_keys=True))
        self.assertEqual(git(self.repo, "show-ref"), self.refs)

    def test_unreachable_commit_is_unknown(self):
        out = projector.compare_payload(self.repo, self.request("0" * 40, self.base))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "COMMIT_UNREACHABLE")
        self.assertEqual(out["unreachableFields"], ["candidateCommit"])
        self.assertEqual(git(self.repo, "show-ref"), self.refs)

    def test_result_is_deterministic_and_non_authorizing(self):
        request = self.request(self.base, self.same_tree)
        first = projector.compare_payload(self.repo, request)
        second = projector.compare_payload(self.repo, request)
        self.assertEqual(first, second)
        self.assertEqual(first["proofScope"], "ROOT_TREE_SNAPSHOT_ONLY")
        self.assertFalse(first["mutationAuthorized"])
        self.assertFalse(first["mergeAuthorized"])
        self.assertFalse(first["ciFreshnessAuthorized"])
        self.assertEqual(git(self.repo, "show-ref"), self.refs)

    def test_request_schema_is_strict(self):
        path = Path(self.tmp.name) / "request.json"
        data = self.request(self.base, self.same_tree)
        data["candidateTree"] = "0" * 40
        path.write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaises(ValueError) as caught:
            projector.load_request(path)
        self.assertEqual(str(caught.exception), "REQUEST_SCHEMA_INVALID")

    def test_boolean_schema_version_is_rejected(self):
        path = Path(self.tmp.name) / "request-bool.json"
        data = self.request(self.base, self.same_tree)
        data["schemaVersion"] = True
        path.write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaises(ValueError) as caught:
            projector.load_request(path)
        self.assertEqual(str(caught.exception), "REQUEST_SCHEMA_INVALID")


if __name__ == "__main__":
    unittest.main()
