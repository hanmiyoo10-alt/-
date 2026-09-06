from __future__ import annotations

import unittest
from unittest.mock import patch

from simcore_mcp.candidate_preflight import _PinnedReader, candidate_preflight
from simcore_mcp.github_reader import GitHubReadError

M = "a" * 40
R = "b" * 40
C = "c" * 40
PROFILE = "d" * 40
NAME = "Operator Release Card Metadata Repair"


class FakeReader:
    repository = "hanmiyoo10-alt/-"
    main_branch = "main"
    release_branch = "release-simcore"

    def __init__(self) -> None:
        self.branches = {"main": M, "release-simcore": R, "other": "e" * 40}
        self.calls: list[tuple] = []
        self.fail_main = False
        self.fail_release = False

    def get_branch_sha(self, branch: str):
        self.calls.append(("get_branch_sha", branch))
        if branch == "main" and self.fail_main:
            raise GitHubReadError("branch:main", "boom")
        if branch == "release-simcore" and self.fail_release:
            raise GitHubReadError("branch:release-simcore", "boom")
        return self.branches[branch]

    def get_file(self, path: str, ref: str):
        self.calls.append(("get_file", path, ref))
        return "text", "blob"

    def get_json_file(self, path: str, ref: str):
        self.calls.append(("get_json_file", path, ref))
        return {}, "blob"

    def get_commit(self, ref: str):
        self.calls.append(("get_commit", ref))
        return {"sha": C}

    def compare_commits(self, base: str, head: str):
        self.calls.append(("compare_commits", base, head))
        return {}


def snapshot(**overrides):
    result = {
        "ok": True,
        "resolved": {"sha": C, "immutable": True},
        "identity": {
            "latest": {
                "userscript_version": "0.70.11",
                "release_name": NAME,
            }
        },
        "canonical_candidate_shape": {"pass": True, "reasons": []},
        "production_context": {
            "main_sha": M,
            "release_head": R,
        },
        "validation_profile_context": {
            "blob": PROFILE,
        },
        "violations": [],
        "errors": [],
    }
    result.update(overrides)
    return result


def preflight(**overrides):
    result = {
        "ready": True,
        "target": {"version": "0.70.11"},
        "components": {
            "validation_profile": {
                "release_name": NAME,
                "blob": PROFILE,
            },
            "production_identity": {
                "release": {"sha": R},
            },
        },
        "checks": [],
        "violations": [],
        "errors": [],
    }
    result.update(overrides)
    return result


def check_map(result):
    return {item["code"]: item["pass"] for item in result["checks"]}


class CandidatePreflightTests(unittest.TestCase):
    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_healthy_direct_child_candidate_ready(self, mock_snapshot, mock_preflight):
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "candidate/x")
        self.assertTrue(result["ready"])
        self.assertEqual(len(result["checks"]), 10)
        self.assertEqual(result["violations"], [])
        self.assertEqual(result["errors"], [])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_requested_ref_remains_locator_resolved_sha_is_authority(self, mock_snapshot, mock_preflight):
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "moving/ref")
        self.assertEqual(result["requested_ref"], "moving/ref")
        self.assertEqual(result["authority"]["candidate_sha"], C)

    def test_pinned_reader_freezes_main_and_release_reads(self):
        raw = FakeReader()
        pinned = _PinnedReader(raw, M, R)
        raw.branches["main"] = "f" * 40
        raw.branches["release-simcore"] = "1" * 40
        self.assertEqual(pinned.get_branch_sha("main"), M)
        self.assertEqual(pinned.get_branch_sha("release-simcore"), R)
        pinned.get_file("x", "main")
        pinned.get_json_file("y", "release-simcore")
        self.assertIn(("get_file", "x", M), raw.calls)
        self.assertIn(("get_json_file", "y", R), raw.calls)

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_snapshot_error_fails_closed(self, mock_snapshot, mock_preflight):
        bad = snapshot(ok=False, errors=[{"source": "commit:x", "message": "boom"}])
        mock_snapshot.return_value = bad
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(result["ready"])
        self.assertFalse(check_map(result)["CANDIDATE_SNAPSHOT_OK"])
        self.assertIn("candidate_snapshot:commit:x", [e["source"] for e in result["errors"]])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_canonical_shape_false_fails(self, mock_snapshot, mock_preflight):
        mock_snapshot.return_value = snapshot(canonical_candidate_shape={"pass": False, "reasons": ["X"]})
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(result["ready"])
        self.assertFalse(check_map(result)["CANDIDATE_CANONICAL_SHAPE_PASS"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_invalid_candidate_version_preflight_not_executed(self, mock_snapshot, mock_preflight):
        bad = snapshot()
        bad["identity"]["latest"]["userscript_version"] = "v0.70.11"
        mock_snapshot.return_value = bad
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(result["ready"])
        self.assertFalse(check_map(result)["CANDIDATE_TARGET_VERSION_VALID"])
        self.assertFalse(result["components"]["release_preflight"]["executed"])
        mock_preflight.assert_not_called()

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_nonadvancing_target_fails_via_release_preflight(self, mock_snapshot, mock_preflight):
        snap = snapshot()
        snap["identity"]["latest"]["userscript_version"] = "0.70.10"
        pf = preflight(ready=False, target={"version": "0.70.10"})
        mock_snapshot.return_value = snap
        mock_preflight.return_value = pf
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(result["ready"])
        self.assertFalse(check_map(result)["RELEASE_PREFLIGHT_READY"])
        self.assertTrue(check_map(result)["CANDIDATE_VERSION_MATCHES_PREFLIGHT_TARGET"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_generic_release_preflight_false_fails(self, mock_snapshot, mock_preflight):
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = preflight(ready=False, violations=[{"code": "PROFILE"}])
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(result["ready"])
        self.assertFalse(check_map(result)["RELEASE_PREFLIGHT_READY"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_candidate_release_name_profile_mismatch(self, mock_snapshot, mock_preflight):
        pf = preflight()
        pf["components"]["validation_profile"]["release_name"] = "Other"
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = pf
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(check_map(result)["CANDIDATE_RELEASE_NAME_MATCHES_PROFILE"])
        self.assertFalse(result["ready"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_candidate_profile_blob_preflight_mismatch(self, mock_snapshot, mock_preflight):
        pf = preflight()
        pf["components"]["validation_profile"]["blob"] = "e" * 40
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = pf
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(check_map(result)["CANDIDATE_PROFILE_BLOB_MATCHES_PREFLIGHT"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_snapshot_main_mismatch(self, mock_snapshot, mock_preflight):
        bad = snapshot()
        bad["production_context"]["main_sha"] = "e" * 40
        mock_snapshot.return_value = bad
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(check_map(result)["SNAPSHOT_MAIN_MATCHES_FROZEN_AUTHORITY"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_snapshot_release_mismatch(self, mock_snapshot, mock_preflight):
        bad = snapshot()
        bad["production_context"]["release_head"] = "e" * 40
        mock_snapshot.return_value = bad
        mock_preflight.return_value = preflight()
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(check_map(result)["SNAPSHOT_RELEASE_MATCHES_FROZEN_AUTHORITY"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_preflight_release_identity_mismatch(self, mock_snapshot, mock_preflight):
        pf = preflight()
        pf["components"]["production_identity"]["release"]["sha"] = "e" * 40
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = pf
        result = candidate_preflight(FakeReader(), "x")
        self.assertFalse(check_map(result)["PREFLIGHT_RELEASE_MATCHES_FROZEN_AUTHORITY"])

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_component_errors_copied_with_prefix(self, mock_snapshot, mock_preflight):
        mock_snapshot.return_value = snapshot(errors=[{"source": "snap", "message": "s"}])
        mock_preflight.return_value = preflight(errors=[{"source": "pf", "message": "p"}])
        result = candidate_preflight(FakeReader(), "x")
        sources = [item["source"] for item in result["errors"]]
        self.assertIn("candidate_snapshot:snap", sources)
        self.assertIn("release_preflight:pf", sources)
        self.assertFalse(result["ready"])

    def test_pinned_reader_exposes_no_write_primitive(self):
        pinned = _PinnedReader(FakeReader(), M, R)
        self.assertFalse(hasattr(pinned, "create_file"))
        self.assertFalse(hasattr(pinned, "update_file"))
        self.assertFalse(hasattr(pinned, "delete_file"))
        self.assertFalse(hasattr(pinned, "update_ref"))

    @patch("simcore_mcp.candidate_preflight.release_preflight")
    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_candidate_preflight_passes_pinned_reader_to_both_components(self, mock_snapshot, mock_preflight):
        raw = FakeReader()
        mock_snapshot.return_value = snapshot()
        mock_preflight.return_value = preflight()
        candidate_preflight(raw, "x")
        snap_reader = mock_snapshot.call_args.args[0]
        pf_reader = mock_preflight.call_args.args[0]
        self.assertIsInstance(snap_reader, _PinnedReader)
        self.assertIsInstance(pf_reader, _PinnedReader)
        self.assertEqual(snap_reader.get_branch_sha("main"), M)
        self.assertEqual(pf_reader.get_branch_sha("release-simcore"), R)

    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_main_authority_failure_stops_components(self, mock_snapshot):
        raw = FakeReader()
        raw.fail_main = True
        result = candidate_preflight(raw, "x")
        self.assertFalse(result["ready"])
        self.assertIsNone(result["authority"]["main_sha"])
        mock_snapshot.assert_not_called()

    @patch("simcore_mcp.candidate_preflight.candidate_snapshot")
    def test_release_authority_failure_stops_components(self, mock_snapshot):
        raw = FakeReader()
        raw.fail_release = True
        result = candidate_preflight(raw, "x")
        self.assertFalse(result["ready"])
        self.assertIsNone(result["authority"]["release_sha"])
        mock_snapshot.assert_not_called()


if __name__ == "__main__":
    unittest.main()
