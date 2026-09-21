from __future__ import annotations

import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "currentness_replay.py"

spec = importlib.util.spec_from_file_location("currentness_replay", SCRIPT)
assert spec and spec.loader
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)


def git(repo: Path, *args: str, check: bool = True) -> str:
    cp = subprocess.run(["git", *args], cwd=repo, text=True, stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE, check=False)
    if check and cp.returncode != 0:
        raise AssertionError(f"git failed: {args}\n{cp.stderr}")
    return cp.stdout.strip()


class CurrentnessReplayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        git(Path(self.tmp.name), "init", str(self.repo))
        git(self.repo, "config", "user.name", "test")
        git(self.repo, "config", "user.email", "test@example.invalid")
        (self.repo / "candidate.txt").write_text("base-candidate\n", encoding="utf-8")
        (self.repo / "main.txt").write_text("base-main\n", encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "base")
        self.base = git(self.repo, "rev-parse", "HEAD")

        git(self.repo, "checkout", "-b", "candidate")
        (self.repo / "candidate.txt").write_text("candidate-change\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "candidate")
        self.candidate = git(self.repo, "rev-parse", "HEAD")

        git(self.repo, "checkout", "-b", "mainline", self.base)
        (self.repo / "main.txt").write_text("main-change\n", encoding="utf-8")
        git(self.repo, "add", "main.txt")
        git(self.repo, "commit", "-m", "main advance")
        self.current = git(self.repo, "rev-parse", "HEAD")

    def tearDown(self):
        self.tmp.cleanup()

    def request(self, **overrides):
        data = {
            "schemaVersion": 1,
            "candidateBase": self.base,
            "candidateHead": self.candidate,
            "currentMain": self.current,
            "owningCi": "Repository Patch Write",
            "requiredValidations": ["packet:focused-tests"],
        }
        data.update(overrides)
        return data
    def test_disjoint_replay_proves_semantic_identity_and_reruns(self):
        before_refs = git(self.repo, "show-ref")
        out = planner.plan_currentization(self.repo, self.request())
        after_refs = git(self.repo, "show-ref")
        self.assertEqual(after_refs, before_refs)
        self.assertEqual(out["state"], "DISJOINT_REPLAY_PROVEN")
        self.assertEqual(out["originalPatchId"], out["replayPatchId"])
        self.assertEqual(out["changedPaths"], ["candidate.txt"])
        self.assertFalse(out["historicalExactHeadEvidenceReusableAsCurrent"])
        self.assertTrue(out["freshBarrierRequiredBeforeMutation"])
        reruns = {row["validationId"] for row in out["rerunPlan"]}
        self.assertEqual(reruns, {
            "protected:Required",
            "owning-ci:Repository Patch Write",
            "packet:focused-tests",
        })
        self.assertFalse(out["mutationAuthorized"])
        self.assertFalse(out["mergeAuthorized"])

    def test_current_base_needs_no_replay(self):
        git(self.repo, "checkout", "-b", "current-candidate", self.current)
        (self.repo / "candidate.txt").write_text("new-on-current\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "current candidate")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(
            candidateBase=self.current, candidateHead=head, currentMain=self.current))
        self.assertEqual(out["state"], "CURRENT")
        self.assertEqual(out["rerunPlan"], [])
    def test_overlap_stops_before_replay(self):
        git(self.repo, "checkout", "-B", "overlap-main", self.base)
        (self.repo / "candidate.txt").write_text("other-main-change\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "overlap main")
        overlap_main = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(currentMain=overlap_main))
        self.assertEqual(out["state"], "OVERLAP")
        self.assertEqual(out["reasonCode"], "CHANGED_PATH_OVERLAP")
        self.assertEqual(out["overlapPaths"], ["candidate.txt"])

    def test_missing_validation_profile_is_unknown(self):
        request = self.request()
        request.pop("requiredValidations")
        out = planner.plan_currentization(self.repo, request)
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "VALIDATION_PROFILE_REQUIRED")

    def test_candidate_base_ancestry_conflict(self):
        out = planner.plan_currentization(self.repo, self.request(
            candidateBase=self.current, candidateHead=self.candidate))
        self.assertEqual(out["state"], "CONFLICT")
        self.assertEqual(out["reasonCode"], "CANDIDATE_BASE_NOT_ANCESTOR")
    def test_executable_mode_is_not_approximated(self):
        git(self.repo, "checkout", "candidate")
        git(self.repo, "checkout", "-b", "mode-candidate", self.base)
        script = self.repo / "candidate.txt"
        script.chmod(0o755)
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "mode change")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(candidateHead=head))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "UNSUPPORTED_MODE")

    def test_patch_identity_mismatch_fails_closed(self):
        with mock.patch.object(planner, "stable_patch_id", return_value="0" * 40):
            out = planner.plan_currentization(self.repo, self.request())
        self.assertEqual(out["state"], "CONFLICT")
        self.assertEqual(out["reasonCode"], "REPLAY_PATCH_ID_MISMATCH")

    def test_git_read_error_uses_stable_unknown_reason(self):
        with mock.patch.object(planner, "name_status", side_effect=RuntimeError("volatile git detail")):
            out = planner.plan_currentization(self.repo, self.request())
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "GIT_EVIDENCE_UNAVAILABLE")
        self.assertIn("volatile git detail", out["detail"])

    def test_boolean_schema_version_is_rejected(self):
        request_file = Path(self.tmp.name) / "request.json"
        request_file.write_text("{\"schemaVersion\":true}", encoding="utf-8")
        with self.assertRaises(ValueError) as caught:
            planner.load_request(request_file)
        self.assertEqual(str(caught.exception), "REQUEST_SCHEMA_INVALID")

    def test_invalid_commit_identity_is_unknown(self):
        out = planner.plan_currentization(self.repo, self.request(candidateHead="bad"))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "COMMIT_IDENTITY_INVALID")

    def test_binary_patch_is_unknown_not_proven(self):
        git(self.repo, "checkout", "-b", "binary-candidate", self.base)
        (self.repo / "binary.dat").write_bytes(b"\x00\x01\x02candidate\n")
        git(self.repo, "add", "binary.dat")
        git(self.repo, "commit", "-m", "binary candidate")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(candidateHead=head))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "UNSUPPORTED_BINARY_PATCH")

    def test_rename_preserves_old_and_new_path_identity(self):
        git(self.repo, "checkout", "-b", "rename-candidate", self.base)
        git(self.repo, "mv", "candidate.txt", "renamed.txt")
        git(self.repo, "commit", "-m", "rename candidate")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(candidateHead=head))
        self.assertEqual(out["state"], "DISJOINT_REPLAY_PROVEN")
        self.assertEqual(out["changedPaths"], ["candidate.txt", "renamed.txt"])
        self.assertIsNone(out["treeIdentity"]["candidate.txt"]["candidateHead"])
        self.assertIsNone(out["treeIdentity"]["candidate.txt"]["replay"])
        self.assertEqual(out["changeIdentity"], [{"status": "R", "paths": ["candidate.txt", "renamed.txt"]}])

    def test_delete_preserves_delete_identity(self):
        git(self.repo, "checkout", "-b", "delete-candidate", self.base)
        (self.repo / "candidate.txt").unlink()
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "delete candidate")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(candidateHead=head))
        self.assertEqual(out["state"], "DISJOINT_REPLAY_PROVEN")
        self.assertEqual(out["changeIdentity"], [{"status": "D", "paths": ["candidate.txt"]}])
        self.assertIsNone(out["treeIdentity"]["candidate.txt"]["candidateHead"])
        self.assertIsNone(out["treeIdentity"]["candidate.txt"]["replay"])

    def test_candidate_merge_history_is_unknown(self):
        git(self.repo, "checkout", "-b", "merge-left", self.base)
        (self.repo / "candidate.txt").write_text("left\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "left")
        git(self.repo, "checkout", "-b", "merge-right", self.base)
        (self.repo / "extra.txt").write_text("right\n", encoding="utf-8")
        git(self.repo, "add", "extra.txt")
        git(self.repo, "commit", "-m", "right")
        git(self.repo, "checkout", "merge-left")
        git(self.repo, "merge", "--no-ff", "merge-right", "-m", "candidate merge")
        head = git(self.repo, "rev-parse", "HEAD")
        out = planner.plan_currentization(self.repo, self.request(candidateHead=head))
        self.assertEqual(out["state"], "UNKNOWN")
        self.assertEqual(out["reasonCode"], "UNSUPPORTED_CANDIDATE_MERGE_HISTORY")


if __name__ == "__main__":
    unittest.main()
