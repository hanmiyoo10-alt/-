from __future__ import annotations

import unittest

from simcore_mcp.candidate_snapshot import INSTALL_PATH, LATEST_PATH, candidate_snapshot
from simcore_mcp.github_reader import GitHubReadError

C = "c" * 40
P = "b" * 40
M = "d" * 40


def src(
    version: str = "0.70.11",
    name: str = "Operator Release Card Metadata Repair",
    runtime: str | None = None,
    host: str | None = None,
    extra_header: bool = False,
) -> str:
    runtime = runtime or version
    host = host or version
    out = f"""//@name simcore
//@api 3.0
//@version {version}
const SIMCORE_RUNTIME_VERSION = '{runtime}';
const HOST_COMPAT_VERSION = '{host}';
// v{version} {name}:
"""
    if extra_header:
        out += f"// v{version} Duplicate:\n"
    return out


class FakeReader:
    repository = "hanmiyoo10-alt/-"
    main_branch = "main"
    release_branch = "release-simcore"

    def __init__(self) -> None:
        self.commit = {
            "sha": C,
            "commit": {
                "message": "SimCore v0.70.11 Operator Release Card Metadata Repair\n\nRelease-Id: x"
            },
            "parents": [{"sha": P}],
        }
        self.files = {
            LATEST_PATH: (src(), "blob"),
            INSTALL_PATH: (src(), "blob"),
        }
        self.branches = {"main": M, "release-simcore": P}
        self.compare = {
            "files": [
                {"filename": LATEST_PATH},
                {"filename": INSTALL_PATH},
            ]
        }
        self.profile = {
            "schemaVersion": 1,
            "releaseVersion": "0.70.11",
            "releaseName": "Operator Release Card Metadata Repair",
        }
        self.profile_blob = "profile"
        self.fail: dict[str, int] = {}

    def get_commit(self, ref: str):
        if "commit" in self.fail:
            raise GitHubReadError("commit:" + ref, "boom")
        return self.commit

    def get_branch_sha(self, branch: str):
        if "branch:" + branch in self.fail:
            raise GitHubReadError("branch:" + branch, "boom")
        return self.branches[branch]

    def get_file(self, path: str, ref: str):
        if "file:" + path in self.fail:
            raise GitHubReadError("file:" + ref + ":" + path, "boom")
        return self.files[path]

    def compare_commits(self, base: str, head: str):
        if "compare" in self.fail:
            raise GitHubReadError("compare", "boom")
        return self.compare

    def get_json_file(self, path: str, ref: str):
        if "profile" in self.fail:
            raise GitHubReadError("json:" + ref + ":" + path, "boom")
        return self.profile, self.profile_blob


def checks(result: dict) -> dict[str, bool]:
    return {item["code"]: item["pass"] for item in result["checks"]}


class CandidateSnapshotTests(unittest.TestCase):
    def test_healthy_canonical(self):
        result = candidate_snapshot(FakeReader(), "feature/candidate")
        self.assertTrue(result["ok"])
        self.assertTrue(result["canonical_candidate_shape"]["pass"])
        self.assertEqual(len(result["checks"]), 23)
        self.assertEqual(result["violations"], [])
        self.assertEqual(result["errors"], [])

    def test_ref_resolves_to_sha(self):
        result = candidate_snapshot(FakeReader(), "moving-ref")
        self.assertEqual(result["resolved"]["sha"], C)

    def test_40hex_input(self):
        result = candidate_snapshot(FakeReader(), "a" * 40)
        self.assertTrue(checks(result)["REF_VALID"])

    def test_invalid_ref(self):
        result = candidate_snapshot(FakeReader(), " bad ")
        self.assertFalse(result["ok"])
        self.assertIn("REF_VALID", result["violations"])

    def test_unresolvable_ref(self):
        fake = FakeReader()
        fake.fail["commit"] = 1
        result = candidate_snapshot(fake, "missing")
        self.assertFalse(result["ok"])
        self.assertIn("REF_RESOLVED", result["violations"])

    def test_latest_missing(self):
        fake = FakeReader()
        fake.fail["file:" + LATEST_PATH] = 1
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("LATEST_AVAILABLE", result["violations"])

    def test_install_missing(self):
        fake = FakeReader()
        fake.fail["file:" + INSTALL_PATH] = 1
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("INSTALL_AVAILABLE", result["violations"])

    def test_parity_mismatch(self):
        fake = FakeReader()
        fake.files[INSTALL_PATH] = (src(), "other")
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertFalse(result["canonical_candidate_shape"]["pass"])
        self.assertIn("LATEST_INSTALL_PARITY", result["violations"])

    def test_runtime_divergence(self):
        fake = FakeReader()
        fake.files[LATEST_PATH] = (src(runtime="0.70.10"), "blob")
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("LATEST_IDENTITY_CONVERGED", result["violations"])

    def test_host_divergence(self):
        fake = FakeReader()
        fake.files[LATEST_PATH] = (src(host="0.70.10"), "blob")
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("LATEST_IDENTITY_CONVERGED", result["violations"])

    def test_release_name_missing_is_fatal(self):
        fake = FakeReader()
        fake.files[LATEST_PATH] = (src(name=""), "blob")
        fake.files[INSTALL_PATH] = (src(name=""), "blob")
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("LATEST_RELEASE_NAME_VALID", result["violations"])

    def test_release_name_ambiguous_is_fatal(self):
        fake = FakeReader()
        fake.files[LATEST_PATH] = (src(extra_header=True), "blob")
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("LATEST_RELEASE_NAME_VALID", result["violations"])

    def test_identity_mismatch(self):
        fake = FakeReader()
        fake.files[INSTALL_PATH] = (src(name="Other"), "blob")
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("LATEST_INSTALL_IDENTITY_MATCH", result["violations"])

    def test_zero_parent(self):
        fake = FakeReader()
        fake.commit["parents"] = []
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("CANDIDATE_SINGLE_PARENT", result["violations"])

    def test_multi_parent(self):
        fake = FakeReader()
        fake.commit["parents"] = [{"sha": P}, {"sha": "e" * 40}]
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("CANDIDATE_SINGLE_PARENT", result["violations"])

    def test_parent_mismatch(self):
        fake = FakeReader()
        fake.branches["release-simcore"] = "f" * 40
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION", result["violations"])

    def test_out_of_scope_path(self):
        fake = FakeReader()
        fake.compare["files"].append({"filename": "README.md"})
        result = candidate_snapshot(fake, "x")
        self.assertIn("CANDIDATE_CHANGED_PATHS_BOUNDED", result["violations"])

    def test_profile_context_present(self):
        result = candidate_snapshot(FakeReader(), "x")
        self.assertTrue(result["validation_profile_context"]["available"])
        self.assertTrue(checks(result)["VALIDATION_PROFILE_VERSION_CONTEXT_MATCH"])

    def test_profile_missing_nonfatal(self):
        fake = FakeReader()
        fake.fail["profile"] = 1
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("VALIDATION_PROFILE_CONTEXT_AVAILABLE", result["violations"])
        self.assertEqual(result["errors"], [])

    def test_profile_version_mismatch_nonfatal(self):
        fake = FakeReader()
        fake.profile["releaseVersion"] = "0.70.12"
        result = candidate_snapshot(fake, "x")
        self.assertTrue(result["ok"])
        self.assertIn("VALIDATION_PROFILE_VERSION_CONTEXT_MATCH", result["violations"])

    def test_compare_failure_is_fatal_transport_error(self):
        fake = FakeReader()
        fake.fail["compare"] = 1
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("CANDIDATE_CHANGED_PATHS_BOUNDED", result["violations"])

    def test_main_context_failure(self):
        fake = FakeReader()
        fake.fail["branch:main"] = 1
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("MAIN_CONTEXT_AVAILABLE", result["violations"])

    def test_release_context_failure_shape_false(self):
        fake = FakeReader()
        fake.fail["branch:release-simcore"] = 1
        result = candidate_snapshot(fake, "x")
        self.assertFalse(result["ok"])
        self.assertIn("CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION", result["violations"])


if __name__ == "__main__":
    unittest.main()
