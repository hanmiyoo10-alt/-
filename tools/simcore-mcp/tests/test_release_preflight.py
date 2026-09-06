from __future__ import annotations

import unittest
from copy import deepcopy
from unittest.mock import patch

from simcore_mcp.github_reader import GitHubReadError
from simcore_mcp.release_preflight import release_preflight

GOOD_PROFILE = {
    "schemaVersion": 1,
    "releaseVersion": "0.70.11",
    "releaseName": "Operator Release Card Metadata Repair",
    "contracts": {
        "reload-cache-continuity": {
            "mode": "INHERIT_BEHAVIOR",
            "authorityVersion": "0.69.2",
        },
        "operator-release-card": {
            "mode": "CHANGED_CONTRACT",
            "authorityVersion": "0.70.11",
        },
        "host-local-telemetry": {
            "mode": "EXACT_CURRENT_IDENTITY",
            "authorityVersion": "0.70.11",
            "rejectVersions": ["0.70.10"],
        },
        "bounded-telemetry-capsule": {
            "mode": "INHERIT_BEHAVIOR",
            "authorityVersion": "0.69.2",
        },
    },
}

GOOD_PRODUCTION = {
    "pass": True,
    "declared": {"production_version": "0.70.10"},
    "violations": [],
    "errors": [],
}
GOOD_DOCS = {"pass": True, "violations": [], "errors": []}


class FakeReader:
    repository = "owner/repo"
    main_branch = "main"

    def __init__(self):
        self.profile = deepcopy(GOOD_PROFILE)
        self.profile_blob = "profile-blob"
        self.error = None

    def get_json_file(self, path, ref):
        if self.error:
            raise self.error
        return deepcopy(self.profile), self.profile_blob


def codes(result):
    return {item["code"] for item in result["violations"]}


class ReleasePreflightTests(unittest.TestCase):
    def run_preflight(self, reader=None, version="0.70.11", production=None, docs=None):
        reader = reader or FakeReader()
        production = deepcopy(production if production is not None else GOOD_PRODUCTION)
        docs = deepcopy(docs if docs is not None else GOOD_DOCS)
        with patch("simcore_mcp.release_preflight.verify_production_identity", return_value=production), patch(
            "simcore_mcp.release_preflight.check_docs_drift", return_value=docs
        ):
            return release_preflight(reader, version)

    def test_healthy_preflight_ready(self):
        result = self.run_preflight()
        self.assertTrue(result["ready"])
        self.assertTrue(result["components"]["validation_profile"]["pass"])
        self.assertEqual([], result["violations"])
        self.assertEqual([], result["errors"])
        self.assertEqual(12, len(result["checks"]))

    def test_malformed_target_fails(self):
        result = self.run_preflight(version="v0.70.11")
        self.assertFalse(result["ready"])
        self.assertIn("TARGET_VERSION_VALID", codes(result))
        self.assertIsNone(result["target"]["profile_path"])

    def test_equal_target_fails(self):
        result = self.run_preflight(version="0.70.10")
        self.assertFalse(result["ready"])
        self.assertIn("TARGET_ADVANCES_PRODUCTION", codes(result))

    def test_older_target_fails(self):
        result = self.run_preflight(version="0.70.9")
        self.assertFalse(result["ready"])
        self.assertIn("TARGET_ADVANCES_PRODUCTION", codes(result))

    def test_production_component_failure_fails(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["pass"] = False
        result = self.run_preflight(production=production)
        self.assertFalse(result["ready"])
        self.assertIn("PRODUCTION_IDENTITY_PASS", codes(result))

    def test_docs_component_failure_fails(self):
        docs = deepcopy(GOOD_DOCS)
        docs["pass"] = False
        result = self.run_preflight(docs=docs)
        self.assertFalse(result["ready"])
        self.assertIn("DOCS_DRIFT_PASS", codes(result))

    def test_component_errors_propagate(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["pass"] = False
        production["errors"] = [{"source": "x", "message": "boom"}]
        result = self.run_preflight(production=production)
        self.assertFalse(result["ready"])
        self.assertTrue(any(e.get("component") == "production_identity" for e in result["errors"]))

    def test_missing_profile_visible(self):
        reader = FakeReader()
        reader.error = GitHubReadError("json:main:profile", "not found")
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_AVAILABLE", codes(result))
        self.assertTrue(any(e.get("component") == "validation_profile" for e in result["errors"]))

    def test_schema_mismatch(self):
        reader = FakeReader()
        reader.profile["schemaVersion"] = 2
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_SCHEMA_SUPPORTED", codes(result))

    def test_profile_version_mismatch(self):
        reader = FakeReader()
        reader.profile["releaseVersion"] = "0.70.12"
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_VERSION_MATCH", codes(result))

    def test_missing_required_contract(self):
        reader = FakeReader()
        del reader.profile["contracts"]["host-local-telemetry"]
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_REQUIRED_CONTRACTS_PRESENT", codes(result))

    def test_unknown_mode(self):
        reader = FakeReader()
        reader.profile["contracts"]["host-local-telemetry"]["mode"] = "MAGIC"
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_CONTRACTS_VALID", codes(result))
        issues = result["components"]["validation_profile"]["contracts"]["host-local-telemetry"]["issues"]
        self.assertTrue(any(i["code"] == "VALIDATION_PROFILE_MODE_INVALID" for i in issues))

    def test_inherited_self_reference(self):
        reader = FakeReader()
        reader.profile["contracts"]["reload-cache-continuity"]["authorityVersion"] = "0.70.11"
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_CONTRACTS_VALID", codes(result))

    def test_exact_current_authority_mismatch(self):
        reader = FakeReader()
        reader.profile["contracts"]["operator-release-card"]["authorityVersion"] = "0.70.10"
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        self.assertIn("VALIDATION_PROFILE_CONTRACTS_VALID", codes(result))

    def test_current_identity_inherit_requires_identity(self):
        reader = FakeReader()
        reader.profile["contracts"]["reload-cache-continuity"] = {
            "mode": "CURRENT_IDENTITY_INHERIT_BEHAVIOR",
            "authorityVersion": "0.69.2",
        }
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        issues = result["components"]["validation_profile"]["contracts"]["reload-cache-continuity"]["issues"]
        self.assertTrue(any(i["code"] == "VALIDATION_PROFILE_AUTHORITY_IDENTITY_MISSING" for i in issues))

    def test_reject_versions_must_be_array(self):
        reader = FakeReader()
        reader.profile["contracts"]["host-local-telemetry"]["rejectVersions"] = "0.70.10"
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])

    def test_duplicate_reject_version_fails(self):
        reader = FakeReader()
        reader.profile["contracts"]["host-local-telemetry"]["rejectVersions"] = ["0.70.10", "0.70.10"]
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        issues = result["components"]["validation_profile"]["contracts"]["host-local-telemetry"]["issues"]
        self.assertTrue(any(i["code"] == "VALIDATION_PROFILE_REJECT_VERSION_DUPLICATE" for i in issues))

    def test_reject_target_version_fails(self):
        reader = FakeReader()
        reader.profile["contracts"]["host-local-telemetry"]["rejectVersions"] = ["0.70.11"]
        result = self.run_preflight(reader=reader)
        self.assertFalse(result["ready"])
        issues = result["components"]["validation_profile"]["contracts"]["host-local-telemetry"]["issues"]
        self.assertTrue(any(i["code"] == "VALIDATION_PROFILE_REJECT_CURRENT_IDENTITY" for i in issues))

    def test_contract_output_is_sorted(self):
        result = self.run_preflight()
        keys = list(result["components"]["validation_profile"]["contracts"])
        self.assertEqual(sorted(keys), keys)


if __name__ == "__main__":
    unittest.main()
