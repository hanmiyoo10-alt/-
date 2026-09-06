from __future__ import annotations

import unittest
from copy import deepcopy

from simcore_mcp.docs_drift import check_docs_drift
from simcore_mcp.github_reader import GitHubReadError

BASE_MANIFEST = {
    "product": "SimCore",
    "production_version": "0.70.10",
    "release_name": "Host-Local Telemetry Set Cost Attribution",
    "release_branch": "release-simcore",
    "release_commit": "a" * 40,
    "release_blob": "b" * 40,
    "validation_status": "PENDING_REAL_LONG_CHAT",
    "major_update_milestone": "2.0M",
    "major_update_phase": "M2",
    "major_update_checkpoint": "M2-6",
    "current_priority": "07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT",
    "development_memory": "docs/CURRENT_DEVELOPMENT.md",
}


def good_document() -> str:
    return f"""# SimCore Current Development Memory

<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.70.10`
- Release: `Host-Local Telemetry Set Cost Attribution`
- Release branch: `release-simcore`
- Release commit: `{BASE_MANIFEST['release_commit']}`
- Release blob: `{BASE_MANIFEST['release_blob']}`
- Declared validation status: `PENDING_REAL_LONG_CHAT`
- Major update milestone: `2.0M`
- Major update phase: `M2`
- Major update checkpoint: `M2-6`
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->

<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN -->
## Current Release Live Gate
- Production commit: `{BASE_MANIFEST['release_commit']}`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Current priority / live gate: `OLD_HANDOFF_MAY_DIFFER`
<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->

# 1. Current Operational State

## How to read current operational state
Machine blocks above own exact identity. Human prose stays identity-free.

## Historical validated precursor — v0.63.55
Historical commit {'c' * 40}
Historical priority 07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT

# 2. Historical Validation Release Ledger
"""


class FakeReader:
    repository = "owner/repo"
    main_branch = "main"

    def __init__(self) -> None:
        self.manifest = deepcopy(BASE_MANIFEST)
        self.manifest_blob = "manifest-blob"
        self.document = good_document()
        self.document_blob = "document-blob"
        self.manifest_error: GitHubReadError | None = None
        self.file_error: GitHubReadError | None = None

    def get_json_file(self, path: str, ref: str):
        if self.manifest_error:
            raise self.manifest_error
        return deepcopy(self.manifest), self.manifest_blob

    def get_file(self, path: str, ref: str):
        if self.file_error:
            raise self.file_error
        if path != self.manifest.get("development_memory"):
            raise GitHubReadError(f"file:{ref}:{path}", "not found")
        return self.document, self.document_blob


def violation_codes(result: dict) -> set[str]:
    return {item["code"] for item in result["violations"]}


class DocsDriftTests(unittest.TestCase):
    def test_healthy_document_passes(self) -> None:
        result = check_docs_drift(FakeReader())
        self.assertTrue(result["pass"])
        self.assertEqual([], result["violations"])
        self.assertEqual([], result["errors"])
        self.assertEqual("LIVE_PENDING", result["observed"]["release_state_mode"])
        self.assertEqual(23, len(result["checks"]))

    def test_manifest_failure_fails_closed(self) -> None:
        reader = FakeReader()
        reader.manifest_error = GitHubReadError("json:main:product-manifest.json", "invalid JSON file")
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("MANIFEST_AVAILABLE", violation_codes(result))
        self.assertTrue(result["errors"])

    def test_invalid_development_memory_path_fails_closed(self) -> None:
        reader = FakeReader()
        reader.manifest["development_memory"] = ""
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("DEVELOPMENT_MEMORY_PATH_VALID", violation_codes(result))
        self.assertIn("DEVELOPMENT_MEMORY_AVAILABLE", violation_codes(result))

    def test_document_read_failure_is_visible(self) -> None:
        reader = FakeReader()
        reader.file_error = GitHubReadError("file:main:docs/CURRENT_DEVELOPMENT.md", "HTTP 500")
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("DEVELOPMENT_MEMORY_AVAILABLE", violation_codes(result))
        self.assertTrue(result["errors"])

    def test_duplicate_snapshot_marker_fails(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            "<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->",
            "<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->",
            1,
        )
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("PRODUCTION_SNAPSHOT_MARKERS_UNIQUE", violation_codes(result))

    def test_snapshot_mismatch_is_field_specific(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace("- Version: `0.70.10`", "- Version: `0.70.9`", 1)
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("SNAPSHOT_VERSION_MATCH", violation_codes(result))
        self.assertNotIn("SNAPSHOT_PRODUCT_MATCH", violation_codes(result))

    def test_release_state_mode_mismatch_fails(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            "<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->",
            "<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:END -->",
            1,
        )
        result = check_docs_drift(reader)
        self.assertFalse(result["pass"])
        self.assertIn("RELEASE_STATE_MARKERS_VALID", violation_codes(result))

    def test_release_state_commit_and_validation_mismatch_fail(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            f"- Production commit: `{BASE_MANIFEST['release_commit']}`",
            f"- Production commit: `{'d' * 40}`",
            1,
        ).replace(
            "- Validation status: `PENDING_REAL_LONG_CHAT`",
            "- Validation status: `LIVE_PASS`",
            1,
        )
        result = check_docs_drift(reader)
        codes = violation_codes(result)
        self.assertIn("RELEASE_STATE_COMMIT_MATCH", codes)
        self.assertIn("RELEASE_STATE_VALIDATION_MATCH", codes)

    def test_active_human_version_literal_fails(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            "Machine blocks above own exact identity.",
            "Machine blocks above own exact identity. current v0.70.10.",
            1,
        )
        result = check_docs_drift(reader)
        self.assertIn("ACTIVE_HUMAN_VERSION_LITERAL_ABSENT", violation_codes(result))

    def test_active_human_40hex_literal_fails(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            "Machine blocks above own exact identity.",
            f"Machine blocks above own exact identity. {'e' * 40}.",
            1,
        )
        result = check_docs_drift(reader)
        self.assertIn("ACTIVE_HUMAN_40HEX_LITERAL_ABSENT", violation_codes(result))

    def test_active_human_current_priority_literal_fails(self) -> None:
        reader = FakeReader()
        reader.document = reader.document.replace(
            "Machine blocks above own exact identity.",
            f"Machine blocks above own exact identity. {BASE_MANIFEST['current_priority']}.",
            1,
        )
        result = check_docs_drift(reader)
        self.assertIn("ACTIVE_HUMAN_CURRENT_PRIORITY_LITERAL_ABSENT", violation_codes(result))

    def test_historical_identity_literals_do_not_fail(self) -> None:
        result = check_docs_drift(FakeReader())
        codes = violation_codes(result)
        self.assertNotIn("ACTIVE_HUMAN_VERSION_LITERAL_ABSENT", codes)
        self.assertNotIn("ACTIVE_HUMAN_40HEX_LITERAL_ABSENT", codes)
        self.assertNotIn("ACTIVE_HUMAN_CURRENT_PRIORITY_LITERAL_ABSENT", codes)


if __name__ == "__main__":
    unittest.main()
