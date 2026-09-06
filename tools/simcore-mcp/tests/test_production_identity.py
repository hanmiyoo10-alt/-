from __future__ import annotations

import unittest
from copy import deepcopy

from simcore_mcp.github_reader import GitHubReadError
from simcore_mcp.production_identity import verify_production_identity

BASE_MANIFEST = {
    "production_version": "0.70.10",
    "release_branch": "release-simcore",
    "release_commit": "release-head",
    "release_blob": "production-blob",
    "production_files": {
        "latest": "plugins/simcore/latest.js",
        "install": "plugins/simcore/install.js",
        "expected_identical": True,
    },
}
GOOD_PLUGIN = "//@name simcore\n//@version 0.70.10\nconst x = 1;\n"


class FakeReader:
    repository = "owner/repo"
    main_branch = "main"
    release_branch = "release-simcore"

    def __init__(self) -> None:
        self.manifest = deepcopy(BASE_MANIFEST)
        self.manifest_blob = "manifest-blob"
        self.branch_sha = "release-head"
        self.files = {
            ("release-simcore", "plugins/simcore/latest.js"): (GOOD_PLUGIN, "production-blob"),
            ("release-simcore", "plugins/simcore/install.js"): (GOOD_PLUGIN, "production-blob"),
        }
        self.manifest_error: GitHubReadError | None = None
        self.branch_error: GitHubReadError | None = None
        self.file_errors: dict[tuple[str, str], GitHubReadError] = {}

    def get_json_file(self, path: str, ref: str):
        if self.manifest_error:
            raise self.manifest_error
        return deepcopy(self.manifest), self.manifest_blob

    def get_branch_sha(self, branch: str) -> str:
        if self.branch_error:
            raise self.branch_error
        return self.branch_sha

    def get_file(self, path: str, ref: str):
        error = self.file_errors.get((ref, path))
        if error:
            raise error
        try:
            return self.files[(ref, path)]
        except KeyError as exc:
            raise GitHubReadError(f"file:{ref}:{path}", "not found") from exc


def violation_codes(result: dict) -> set[str]:
    return {item["code"] for item in result["violations"]}


class ProductionIdentityTests(unittest.TestCase):
    def test_healthy_identity_passes(self) -> None:
        result = verify_production_identity(FakeReader())
        self.assertTrue(result["pass"])
        self.assertEqual([], result["violations"])
        self.assertEqual([], result["errors"])
        self.assertEqual("0.70.10", result["observed"]["latest_version"])

    def test_release_head_mismatch(self) -> None:
        reader = FakeReader()
        reader.branch_sha = "other"
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("RELEASE_HEAD_MATCH", violation_codes(result))

    def test_release_blob_mismatch(self) -> None:
        reader = FakeReader()
        reader.manifest["release_blob"] = "wrong"
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("RELEASE_BLOB_MATCH", violation_codes(result))

    def test_file_parity_mismatch(self) -> None:
        reader = FakeReader()
        reader.files[("release-simcore", "plugins/simcore/install.js")] = (GOOD_PLUGIN, "different")
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("PRODUCTION_FILE_PARITY", violation_codes(result))

    def test_latest_version_mismatch(self) -> None:
        reader = FakeReader()
        reader.files[("release-simcore", "plugins/simcore/latest.js")] = (
            GOOD_PLUGIN.replace("0.70.10", "0.70.9"),
            "production-blob",
        )
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("LATEST_VERSION_MATCH", violation_codes(result))

    def test_install_version_mismatch(self) -> None:
        reader = FakeReader()
        reader.files[("release-simcore", "plugins/simcore/install.js")] = (
            GOOD_PLUGIN.replace("0.70.10", "0.70.9"),
            "production-blob",
        )
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("INSTALL_VERSION_MATCH", violation_codes(result))

    def test_manifest_failure_fails_closed(self) -> None:
        reader = FakeReader()
        reader.manifest_error = GitHubReadError("json:main:product-manifest.json", "invalid JSON file")
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("MANIFEST_AVAILABLE", violation_codes(result))
        self.assertTrue(result["errors"])

    def test_missing_production_path_fails_closed(self) -> None:
        reader = FakeReader()
        del reader.manifest["production_files"]["latest"]
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("LATEST_PATH_VALID", violation_codes(result))
        self.assertIn("RELEASE_BLOB_MATCH", violation_codes(result))
        self.assertIn("LATEST_VERSION_MATCH", violation_codes(result))

    def test_production_file_read_failure_is_visible(self) -> None:
        reader = FakeReader()
        reader.file_errors[("release-simcore", "plugins/simcore/latest.js")] = GitHubReadError(
            "file:release-simcore:plugins/simcore/latest.js", "HTTP 500"
        )
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertTrue(result["errors"])
        self.assertIn("RELEASE_BLOB_MATCH", violation_codes(result))

    def test_ambiguous_version_fails_closed(self) -> None:
        reader = FakeReader()
        reader.files[("release-simcore", "plugins/simcore/latest.js")] = (
            GOOD_PLUGIN + "//@version 0.70.10\n",
            "production-blob",
        )
        result = verify_production_identity(reader)
        self.assertFalse(result["pass"])
        self.assertIn("LATEST_VERSION_MATCH", violation_codes(result))
        self.assertTrue(any(error["source"].startswith("version:") for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
