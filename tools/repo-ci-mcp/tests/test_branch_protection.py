from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.branch_protection import repo_branch_protection
from repo_ci_mcp.github_reader import GitHubReadError


PROTECTED_SUMMARY = {
    "protected": True,
    "protection": {
        "required_status_checks": {
            "enforcement_level": "everyone",
            "contexts": ["Required"],
            "checks": [{"context": "Required", "app_id": 15368}],
        }
    },
}


def protection_detail() -> dict:
    disabled = {"enabled": False}
    return {
        "required_status_checks": {
            "strict": True,
            "contexts": ["Required"],
            "checks": [{"context": "Required", "app_id": 15368}],
        },
        "enforce_admins": {"enabled": True},
        "required_signatures": disabled,
        "required_linear_history": disabled,
        "allow_force_pushes": disabled,
        "allow_deletions": disabled,
        "block_creations": disabled,
        "required_conversation_resolution": disabled,
        "lock_branch": disabled,
        "allow_fork_syncing": disabled,
    }


class BranchProtectionTests(unittest.TestCase):
    def reader(self) -> Mock:
        reader = Mock()
        reader.get_branch.return_value = PROTECTED_SUMMARY
        reader.get_branch_protection.return_value = protection_detail()
        return reader

    def test_full_detail_success_is_bounded(self):
        reader = self.reader()
        result = repo_branch_protection(reader, "main")
        self.assertEqual(result["status"], "OK")
        self.assertTrue(result["protected"])
        self.assertEqual(result["detail_disposition"], "AVAILABLE")
        self.assertTrue(result["detail"]["required_status_checks"]["strict"])
        self.assertFalse(result["detail"]["required_pull_request_reviews"]["configured"])
        self.assertFalse(result["detail"]["restrictions"]["configured"])
        reader.get_branch.assert_called_once_with("main")
        reader.get_branch_protection.assert_called_once_with("main")

    def test_protected_403_preserves_partial_summary(self):
        reader = self.reader()
        reader.get_branch_protection.side_effect = GitHubReadError("forbidden", status_code=403)
        result = repo_branch_protection(reader)
        self.assertEqual(result["status"], "PARTIAL")
        self.assertTrue(result["ok"])
        self.assertTrue(result["protected"])
        self.assertEqual(result["detail_disposition"], "DETAIL_READ_BLOCKED_PERMISSION")
        self.assertEqual(result["reason_codes"], ["DETAIL_READ_BLOCKED_PERMISSION"])

    def test_unprotected_is_distinct_and_skips_detail(self):
        reader = self.reader()
        reader.get_branch.return_value = {"protected": False, "protection": None}
        result = repo_branch_protection(reader, "feature/x")
        self.assertEqual(result["status"], "UNPROTECTED")
        self.assertFalse(result["protected"])
        self.assertEqual(result["detail_disposition"], "NOT_CONFIGURED")
        reader.get_branch_protection.assert_not_called()

    def test_non_permission_detail_failure_stays_unknown(self):
        reader = self.reader()
        reader.get_branch_protection.side_effect = GitHubReadError("not found", status_code=404)
        result = repo_branch_protection(reader)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertTrue(result["protected"])
        self.assertEqual(result["reason_codes"], ["DETAIL_READ_FAILED"])

    def test_invalid_branch_fails_before_transport(self):
        reader = self.reader()
        result = repo_branch_protection(reader, "")
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["BRANCH_INPUT_INVALID"])
        reader.get_branch.assert_not_called()
        reader.get_branch_protection.assert_not_called()

    def test_malformed_detail_fails_closed(self):
        reader = self.reader()
        detail = protection_detail()
        detail.pop("allow_force_pushes")
        reader.get_branch_protection.return_value = detail
        result = repo_branch_protection(reader)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["DETAIL_RESPONSE_INVALID"])

    def test_summary_failure_does_not_guess_protection(self):
        reader = self.reader()
        reader.get_branch.side_effect = GitHubReadError("transport")
        result = repo_branch_protection(reader)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["protected"])
        self.assertEqual(result["reason_codes"], ["BRANCH_SUMMARY_READ_FAILED"])


if __name__ == "__main__":
    unittest.main()
