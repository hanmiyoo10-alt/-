from __future__ import annotations

import json
import unittest

from usage_dashboard_mcp.github_reader import GitHubReadError
from usage_dashboard_mcp.local_reader import LocalBridgeReadError
from usage_dashboard_mcp.status import build_status


MANIFEST = {
    "productVersion": "3.0.0-alpha.5.101",
    "components": {
        "bridge": {"requiredVersion": "1.6.36"},
        "bridgeManager": {
            "version": "1.3.6",
            "managedCliVersion": "1.10.0",
            "managedModelCatalogVersion": "1.280.0",
        },
    },
    "contracts": {"snapshot": 1, "recentRequest": 1},
}


class FakeGitHub:
    repository = "hanmiyoo10-alt/-"
    main_branch = "main"
    release_branch = "release-usage-dashboard"

    def __init__(self, *, fail_release=False, drift=False):
        self.fail_release = fail_release
        self.drift = drift

    def get_branch_sha(self, branch):
        if self.fail_release and branch == self.release_branch:
            raise GitHubReadError("branch:release-usage-dashboard", "boom")
        return "main-sha" if branch == self.main_branch else "release-sha"

    def get_json_file(self, path, ref):
        if self.fail_release and ref == self.release_branch:
            raise GitHubReadError(f"json:{ref}:{path}", "boom")
        blob = "manifest-main" if self.drift and ref == self.main_branch else "manifest-same"
        return dict(MANIFEST), blob

    def get_file(self, path, ref):
        if self.fail_release and ref == self.release_branch:
            raise GitHubReadError(f"file:{ref}:{path}", "boom")
        blob = "latest-main" if self.drift and ref == self.main_branch else "latest-same"
        return "// plugin", blob


class FakeLocal:
    def __init__(self, *, token=True, health_fail=False, snapshot_fail=False, snapshot_errors=False):
        self.token = token
        self.health_fail = health_fail
        self.snapshot_fail = snapshot_fail
        self.snapshot_errors = snapshot_errors

    def get_health(self):
        if self.health_fail:
            raise LocalBridgeReadError("/health", "offline")
        return {"ok": True, "status": "healthy", "version": "1.6.36"}

    def get_light_snapshot(self):
        if self.snapshot_fail:
            raise LocalBridgeReadError("/snapshot?profile=light", "HTTP 401")
        if not self.token:
            return None
        return {
            "ok": True,
            "bridgeVersion": "1.6.36",
            "fetchedAt": 1_000,
            "creditsOrganizationId": "SECRET-ORG-ID",
            "errors": {"usage": "sanitized upstream error"} if self.snapshot_errors else {},
            "modules": {
                "organizations": {"status": "ok"},
                "usage": {"status": "stale"},
                "credits": {"status": "partial"},
            },
        }


class StatusTests(unittest.TestCase):
    def test_exact_status_and_redaction(self):
        result = build_status(FakeGitHub(), FakeLocal(), now_ms=1_250)
        self.assertTrue(result["ok"])
        self.assertEqual(result["github"]["parityState"], "exact")
        self.assertEqual(result["source"]["localBridge"], "ok")
        self.assertEqual(result["product"]["version"], "3.0.0-alpha.5.101")
        self.assertEqual(result["localRuntime"]["staleModules"], 1)
        self.assertEqual(result["localRuntime"]["activeErrors"], 0)
        self.assertEqual(result["localRuntime"]["snapshotAgeMs"], 250)
        serialized = json.dumps(result, sort_keys=True)
        self.assertNotIn("SECRET-ORG-ID", serialized)

    def test_missing_token_preserves_unknown_and_marks_local_partial(self):
        result = build_status(FakeGitHub(), FakeLocal(token=False))
        self.assertTrue(result["ok"])
        self.assertFalse(result["localRuntime"]["snapshotAuthenticated"])
        self.assertIsNone(result["localRuntime"]["activeErrors"])
        self.assertIsNone(result["localRuntime"]["staleModules"])
        self.assertEqual(result["source"]["localBridge"], "partial")
        self.assertEqual(len(result["warnings"]), 1)

    def test_local_failure_does_not_fabricate_github_failure(self):
        result = build_status(FakeGitHub(), FakeLocal(health_fail=True))
        self.assertFalse(result["ok"])
        self.assertEqual(result["source"]["github"], "ok")
        self.assertEqual(result["source"]["localBridge"], "unavailable")
        self.assertEqual(result["github"]["parityState"], "exact")

    def test_github_partial_failure_preserves_local_status(self):
        result = build_status(FakeGitHub(fail_release=True), FakeLocal())
        self.assertFalse(result["ok"])
        self.assertEqual(result["source"]["github"], "partial")
        self.assertEqual(result["localRuntime"]["health"], "healthy")
        self.assertTrue(result["localRuntime"]["snapshotOk"])
        self.assertEqual(result["github"]["parityState"], "unknown")

    def test_parity_drift_fails_top_level_ok_without_mutation(self):
        result = build_status(FakeGitHub(drift=True), FakeLocal())
        self.assertEqual(result["github"]["parityState"], "drift")
        self.assertFalse(result["ok"])

    def test_snapshot_auth_failure_is_reported_as_partial(self):
        result = build_status(FakeGitHub(), FakeLocal(snapshot_fail=True))
        self.assertFalse(result["ok"])
        self.assertFalse(result["localRuntime"]["snapshotAuthenticated"])
        self.assertEqual(result["source"]["github"], "ok")
        self.assertEqual(result["source"]["localBridge"], "partial")
        self.assertIsNone(result["localRuntime"]["activeErrors"])

    def test_snapshot_error_count_fails_top_level_without_returning_error_detail(self):
        result = build_status(FakeGitHub(), FakeLocal(snapshot_errors=True))
        self.assertFalse(result["ok"])
        self.assertEqual(result["localRuntime"]["activeErrors"], 1)
        self.assertNotIn("sanitized upstream error", json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
