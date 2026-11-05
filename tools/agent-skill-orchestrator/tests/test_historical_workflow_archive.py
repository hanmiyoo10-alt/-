import hashlib
import json
import unittest
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
ARCHIVE_ROOT = PACKAGE_ROOT / "tests" / "fixtures" / "historical-workflows"
MANIFEST_PATH = ARCHIVE_ROOT / "manifest.json"
CI_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml"


EXPECTED = {
    ".github/workflows/agent-skill-orchestrator-o4c-scout-benchmark.yml": ("06a21f585e53f1c977d0615dcb46598f3c5062a0", 33643580938),
    ".github/workflows/agent-skill-orchestrator-o4c-scout-continuation.yml": ("6eb555ee4a9275473315559189939b9d4ac1dedc", 33646050315),
    ".github/workflows/agent-skill-orchestrator-o4c-scout-timeout-recovery.yml": ("4868257686f1f42156c69c7fd06846494f010108", 33649809080),
    ".github/workflows/agent-skill-orchestrator-o4d-scout-schema-validation.yml": ("c679705fd640e4a7a112578818832346f667af3b", 33656712799),
    ".github/workflows/agent-skill-orchestrator-o4e-scout-schema-validation.yml": ("50c3d6f0bfeb8ccd3b3e5107accb1c5dab203add", 33747002415),
    ".github/workflows/agent-skill-orchestrator-o4f-termux-scout-benchmark.yml": ("c1cc6c6f96776bcac9f05c2dc026caed0695c34c", 33763047539),
    ".github/workflows/agent-skill-orchestrator-o4g-termux-scout-uniqueness-diagnostic.yml": ("7e546a0841a3ad12ab66cfc01a9dc95b37b2a663", 33774770994),
}


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()


class HistoricalWorkflowArchiveTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        self.entries = {item["originalPath"]: item for item in self.manifest["entries"]}

    def test_manifest_is_exact_and_source_bound(self) -> None:
        self.assertEqual(self.manifest["schemaVersion"], 1)
        self.assertEqual(self.manifest["ownerIssue"], 1120)
        self.assertEqual(self.manifest["retirementIssue"], 3956)
        self.assertEqual(self.manifest["sourceMainCommit"], "9fcb3ee842dc040988bbb3413fa73e2978707d4f")
        self.assertEqual(set(self.entries), set(EXPECTED))

    def test_frozen_fixture_bytes_match_historical_git_blobs(self) -> None:
        for original, (expected_blob, expected_run) in EXPECTED.items():
            item = self.entries[original]
            fixture = REPO_ROOT / item["fixturePath"]
            data = fixture.read_bytes()
            self.assertEqual(item["blobSha"], expected_blob)
            self.assertEqual(item["terminalRunId"], expected_run)
            self.assertEqual(git_blob_sha(data), expected_blob)
            self.assertFalse((REPO_ROOT / original).exists())

    def test_retired_paths_are_not_active_ci_filters(self) -> None:
        ci = CI_PATH.read_text(encoding="utf-8")
        self.assertGreaterEqual(ci.count("tools/agent-skill-orchestrator/**"), 2)
        for original in EXPECTED:
            self.assertNotIn(original, ci)


if __name__ == "__main__":
    unittest.main()
