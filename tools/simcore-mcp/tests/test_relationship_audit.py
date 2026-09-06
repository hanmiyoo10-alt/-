from __future__ import annotations

import unittest

from simcore_mcp.github_reader import GitHubReadError
from simcore_mcp.relationship_audit import RelationshipReader, relationship_audit

A = "a" * 40
B = "b" * 40
C = "c" * 40
M = "e" * 40


def pr(**overrides):
    result = {
        "number": 109,
        "state": "open",
        "merged_at": None,
        "closed_at": None,
        "merge_commit_sha": M,
        "head": {"ref": "feature", "sha": B, "repo": {"full_name": "hanmiyoo10-alt/-"}},
        "base": {"ref": "main", "sha": A, "repo": {"full_name": "hanmiyoo10-alt/-"}},
    }
    result.update(overrides)
    return result


class FakeReader:
    repository = "hanmiyoo10-alt/-"

    def __init__(self, pull=None):
        self.pull = pull or pr()
        self.branches = {"main": A, "feature": B}
        self.sequences: dict[str, list[str]] = {}
        self.calls: list[tuple] = []

    def get_pull_request(self, number: int):
        self.calls.append(("get_pull_request", number))
        return self.pull

    def get_branch_sha(self, ref: str):
        self.calls.append(("get_branch_sha", ref))
        if ref in self.sequences and self.sequences[ref]:
            return self.sequences[ref].pop(0)
        if ref not in self.branches:
            raise GitHubReadError(f"branch:{ref}", "HTTP 404")
        return self.branches[ref]

    def compare_commits(self, base: str, head: str):
        self.calls.append(("compare_commits", base, head))
        return {
            "status": "ahead",
            "ahead_by": 1,
            "behind_by": 0,
            "merge_base_commit": {"sha": base},
        }

    def get_commit(self, sha: str):
        self.calls.append(("get_commit", sha))
        return {"sha": sha}


class RelationshipAuditTests(unittest.TestCase):
    @staticmethod
    def codes(result, key="findings"):
        return {item["code"] for item in result[key]}

    def test_generic_clean_merge_sha_trap(self):
        result = relationship_audit(FakeReader(), 109)
        self.assertEqual(result["disposition"], "RELATION_CLEAN")
        self.assertFalse(result["pr"]["merged"])
        self.assertIn("BRI-03", self.codes(result, "observations"))
        self.assertIn("BRI-05", self.codes(result, "observations"))

    def test_exact_base_moved_requires_review(self):
        reader = FakeReader()
        reader.branches["main"] = C
        result = relationship_audit(
            reader,
            109,
            "BR-02",
            "main",
            A,
            "feature",
            B,
            "REQUIRE_EXACT",
            "REQUIRE_EXACT",
        )
        self.assertEqual(result["disposition"], "RELATION_REVIEW_REQUIRED")
        self.assertIn("BRF-06", self.codes(result))

    def test_exact_head_moved_requires_review(self):
        reader = FakeReader()
        reader.branches["feature"] = C
        result = relationship_audit(
            reader,
            109,
            "BR-02",
            "main",
            A,
            "feature",
            B,
            "REQUIRE_EXACT",
            "REQUIRE_EXACT",
        )
        self.assertEqual(result["disposition"], "RELATION_REVIEW_REQUIRED")
        self.assertIn("BRF-08", self.codes(result))

    def test_missing_expected_base_blocks(self):
        result = relationship_audit(
            FakeReader(),
            109,
            "BR-02",
            base_movement_policy="REQUIRE_EXACT",
            head_movement_policy="REQUIRE_EXACT",
        )
        self.assertEqual(result["disposition"], "RELATION_BLOCKED")
        self.assertIn("BRF-05", self.codes(result))

    def test_historical_missing_head_is_allowed(self):
        pull = pr(
            state="closed",
            merged_at="2026-01-01T00:00:00Z",
            closed_at="2026-01-01T00:00:00Z",
        )
        reader = FakeReader(pull)
        del reader.branches["feature"]
        result = relationship_audit(reader, 109, "BR-03")
        self.assertEqual(result["disposition"], "RELATION_CLEAN")
        self.assertIn("BRI-02", self.codes(result, "observations"))

    def test_raced_snapshot_blocks(self):
        reader = FakeReader()
        reader.sequences["main"] = [A, C]
        result = relationship_audit(reader, 109)
        self.assertEqual(result["disposition"], "RELATION_BLOCKED")
        self.assertIn("BRF-12", self.codes(result))

    def test_open_missing_head_blocks(self):
        reader = FakeReader()
        del reader.branches["feature"]
        result = relationship_audit(reader, 109)
        self.assertEqual(result["disposition"], "RELATION_BLOCKED")
        self.assertIn("BRF-04", self.codes(result))

    def test_cross_repository_head_blocks_as_ambiguous(self):
        pull = pr(head={"ref": "x", "sha": B, "repo": {"full_name": "fork/repo"}})
        result = relationship_audit(FakeReader(pull), 109)
        self.assertEqual(result["disposition"], "RELATION_BLOCKED")
        self.assertIn("BRF-13", self.codes(result))

    def test_requested_ancestry_contract_blocks_on_divergence(self):
        reader = FakeReader()
        reader.compare_commits = lambda base, head: {
            "status": "diverged",
            "ahead_by": 1,
            "behind_by": 1,
            "merge_base_commit": {"sha": C},
        }
        result = relationship_audit(reader, 109, require_head_descends_from_base=True)
        self.assertEqual(result["disposition"], "RELATION_BLOCKED")
        self.assertIn("BRF-09", self.codes(result))

    def test_reader_exposes_no_write_primitive(self):
        reader = RelationshipReader()
        for name in ("create_file", "update_file", "delete_file", "update_ref", "merge_pull_request"):
            self.assertFalse(hasattr(reader, name))

    def test_invalid_mode_is_not_applicable(self):
        result = relationship_audit(FakeReader(), 109, "BR-99")
        self.assertEqual(result["disposition"], "RELATION_NOT_APPLICABLE")


if __name__ == "__main__":
    unittest.main()
