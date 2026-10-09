from __future__ import annotations

import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SCRIPT = ROOT / "currentize_candidate.py"

spec = importlib.util.spec_from_file_location("currentize_candidate", SCRIPT)
assert spec and spec.loader
currentize = importlib.util.module_from_spec(spec)
spec.loader.exec_module(currentize)


def git(repo: Path, *args: str, check: bool = True) -> str:
    cp = subprocess.run(
        ["git", *args],
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and cp.returncode != 0:
        raise AssertionError(f"git failed {args}: {cp.stderr or cp.stdout}")
    return cp.stdout.strip()


class CurrentizeCandidateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.remote = root / "remote.git"
        self.repo = root / "repo"
        git(root, "init", "--bare", str(self.remote))
        git(root, "init", str(self.repo))
        git(self.repo, "config", "user.name", "fixture")
        git(self.repo, "config", "user.email", "fixture@example.invalid")

        (self.repo / "candidate.txt").write_text("base-candidate\n", encoding="utf-8")
        (self.repo / "main-one.txt").write_text("base-main-one\n", encoding="utf-8")
        (self.repo / "main-two.txt").write_text("base-main-two\n", encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "base")
        git(self.repo, "branch", "-M", "main")
        self.base = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "remote", "add", "origin", str(self.remote))
        git(self.repo, "push", "-u", "origin", "main")

        self.branch = "repo/currentize-test"
        git(self.repo, "checkout", "-b", self.branch, self.base)
        (self.repo / "candidate.txt").write_text("candidate-change\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "candidate")
        self.candidate = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "push", "-u", "origin", self.branch)

        git(self.repo, "checkout", "main")
        (self.repo / "main-one.txt").write_text("main-one-change\n", encoding="utf-8")
        git(self.repo, "add", "main-one.txt")
        git(self.repo, "commit", "-m", "main one")
        self.main1 = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "push", "origin", "main")

    def tearDown(self):
        self.tmp.cleanup()

    def request(self, **overrides):
        data = {
            "schemaVersion": 1,
            "branch": self.branch,
            "expectedHead": self.candidate,
            "generationBase": self.base,
            "currentMain": self.main1,
            "owningCi": "Repository Patch Write",
            "requiredValidations": ["packet:focused-currentization"],
        }
        data.update(overrides)
        return data

    def remote_head(self, branch=None):
        return currentize.remote_head(self.repo, branch or self.branch)

    def advance_main_two(self):
        git(self.repo, "checkout", "main")
        (self.repo / "main-two.txt").write_text("main-two-change\n", encoding="utf-8")
        git(self.repo, "add", "main-two.txt")
        git(self.repo, "commit", "-m", "main two")
        head = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "push", "origin", "main")
        return head

    def test_linear_candidate_currentizes_by_non_force_merge(self):
        out = currentize.apply_currentization(self.repo, self.request())
        self.assertEqual(out["disposition"], "CURRENTIZED")
        self.assertEqual(out["generationShape"], "LINEAR")
        self.assertEqual(out["oldHead"], self.candidate)
        self.assertEqual(out["currentMain"], self.main1)
        self.assertEqual(out["nextGenerationBase"], self.main1)
        self.assertEqual(out["newHead"], self.remote_head())
        self.assertEqual(out["changedPaths"], ["candidate.txt"])
        self.assertFalse(out["forcePushUsed"])
        self.assertFalse(out["rebaseUsed"])
        self.assertFalse(out["historicalExactHeadEvidenceReusableAsCurrent"])
        reruns = {row["validationId"] for row in out["rerunPlan"]}
        self.assertEqual(reruns, {
            "protected:Required",
            "owning-ci:Repository Patch Write",
            "packet:focused-currentization",
        })
        parents = git(self.repo, "rev-list", "--parents", "-n", "1", out["newHead"]).split()
        self.assertEqual(parents[1:], [self.candidate, self.main1])

    def test_once_currentized_candidate_can_currentize_again_same_branch(self):
        first = currentize.apply_currentization(self.repo, self.request())
        first_head = first["newHead"]
        main2 = self.advance_main_two()

        second = currentize.apply_currentization(
            self.repo,
            self.request(
                expectedHead=first_head,
                generationBase=self.main1,
                currentMain=main2,
            ),
        )
        self.assertEqual(second["disposition"], "CURRENTIZED")
        self.assertEqual(second["generationShape"], "PRIOR_CURRENTIZATION")
        self.assertEqual(second["oldHead"], first_head)
        self.assertEqual(second["nextGenerationBase"], main2)
        self.assertEqual(second["newHead"], self.remote_head())
        self.assertTrue(currentize.ancestor(self.repo, first_head, second["newHead"]))
        self.assertTrue(currentize.ancestor(self.repo, main2, second["newHead"]))
        self.assertEqual(second["changedPaths"], ["candidate.txt"])
        self.assertEqual(second["patchId"], first["patchId"])
        self.assertFalse(second["forcePushUsed"])

    def test_overlap_preserves_remote_head_and_planner_disposition(self):
        git(self.repo, "checkout", "main")
        (self.repo / "candidate.txt").write_text("main-overlap\n", encoding="utf-8")
        git(self.repo, "add", "candidate.txt")
        git(self.repo, "commit", "-m", "main overlap")
        overlap_main = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "push", "origin", "main")

        before = self.remote_head()
        out = currentize.apply_currentization(
            self.repo,
            self.request(currentMain=overlap_main),
        )
        self.assertEqual(out["disposition"], "OVERLAP")
        self.assertEqual(out["reasonCode"], "CHANGED_PATH_OVERLAP")
        self.assertEqual(self.remote_head(), before)
        self.assertFalse(out["branchMutationObserved"])

    def test_protected_branch_classes_are_denied(self):
        for branch in ("main", "master", "release-simcore", "release/test"):
            with self.subTest(branch=branch):
                with self.assertRaises(currentize.CurrentizeError) as caught:
                    currentize.validate_branch(self.repo, branch)
                self.assertEqual(caught.exception.reason, "PROTECTED_BRANCH_DENIED")

    def test_request_schema_is_exact_and_boolean_version_is_rejected(self):
        path = Path(self.tmp.name) / "request.json"
        bad = self.request()
        bad["schemaVersion"] = True
        path.write_text(__import__("json").dumps(bad), encoding="utf-8")
        with self.assertRaises(currentize.CurrentizeError) as caught:
            currentize.load_request(path)
        self.assertEqual(caught.exception.reason, "REQUEST_SCHEMA_INVALID")

        extra = self.request()
        extra["remote"] = "origin"
        path.write_text(__import__("json").dumps(extra), encoding="utf-8")
        with self.assertRaises(currentize.CurrentizeError) as caught:
            currentize.load_request(path)
        self.assertEqual(caught.exception.reason, "REQUEST_SCHEMA_INVALID")

    def test_arbitrary_merge_history_is_not_promoted_by_shadow(self):
        other = "repo/other-feature"
        git(self.repo, "checkout", "-b", other, self.base)
        (self.repo / "other.txt").write_text("other\n", encoding="utf-8")
        git(self.repo, "add", "other.txt")
        git(self.repo, "commit", "-m", "other")
        other_head = git(self.repo, "rev-parse", "HEAD")

        git(self.repo, "checkout", self.branch)
        git(self.repo, "merge", "--no-ff", other_head, "-m", "feature merge")
        merged = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "push", "origin", f"{merged}:refs/heads/{self.branch}")

        with self.assertRaises(currentize.CurrentizeError) as caught:
            currentize.apply_currentization(
                self.repo,
                self.request(expectedHead=merged),
            )
        self.assertEqual(caught.exception.reason, "GENERATION_BASE_NOT_CURRENTIZATION_PARENT")
        self.assertEqual(self.remote_head(), merged)

    def test_current_main_race_blocks_before_push(self):
        real = currentize.remote_head
        counts = {"main": 0}

        def fake(repo, branch):
            if branch == "main":
                counts["main"] += 1
                if counts["main"] == 3:
                    return "f" * 40
            return real(repo, branch)

        before = self.remote_head()
        with mock.patch.object(currentize, "remote_head", side_effect=fake):
            with self.assertRaises(currentize.CurrentizeError) as caught:
                currentize.apply_currentization(self.repo, self.request())
        self.assertEqual(caught.exception.reason, "CURRENT_MAIN_MOVED_BEFORE_PUSH")
        self.assertEqual(self.remote_head(), before)

    def test_remote_head_race_blocks_before_push(self):
        real = currentize.remote_head
        counts = {self.branch: 0}

        def fake(repo, branch):
            if branch == self.branch:
                counts[self.branch] += 1
                if counts[self.branch] == 3:
                    return "e" * 40
            return real(repo, branch)

        before = self.remote_head()
        with mock.patch.object(currentize, "remote_head", side_effect=fake):
            with self.assertRaises(currentize.CurrentizeError) as caught:
                currentize.apply_currentization(self.repo, self.request())
        self.assertEqual(caught.exception.reason, "REMOTE_HEAD_MOVED_BEFORE_PUSH")
        self.assertEqual(self.remote_head(), before)

    def test_source_contract_has_fixed_non_force_effect_surface(self):
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn('FIXED_REMOTE = "origin"', source)
        self.assertIn('"merge", "--no-ff"', source)
        self.assertIn('"push", FIXED_REMOTE', source)
        for forbidden in (
            '"push", "--force"',
            '"push", "--force-with-lease"',
            '"rebase"',
            '"reset"',
            '"cherry-pick"',
            '"stash"',
            '"clean"',
        ):
            self.assertNotIn(forbidden, source)

    def test_already_current_head_is_noop(self):
        first = currentize.apply_currentization(self.repo, self.request())
        head = first["newHead"]
        out = currentize.apply_currentization(
            self.repo,
            self.request(
                expectedHead=head,
                generationBase=self.main1,
                currentMain=self.main1,
            ),
        )
        self.assertEqual(out["disposition"], "CURRENT")
        self.assertEqual(out["newHead"], head)
        self.assertEqual(out["rerunPlan"], [])
        self.assertEqual(self.remote_head(), head)


if __name__ == "__main__":
    unittest.main()
