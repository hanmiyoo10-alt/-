from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_attestations import repo_attestations
from repo_ci_mcp.github_reader import GitHubReadError


DIGEST = "sha256:" + "a" * 64


class GithubAttestationTests(unittest.TestCase):
    def test_projection_is_metadata_only_and_normalizes_digest(self):
        reader = Mock()
        reader.list_repository_attestations.return_value = [{
            "repository_id": 7,
            "initiator": "github-actions",
            "bundle_url": "https://signed.invalid/bundle?sig=private",
            "raw": {"private": True},
        }]
        result = repo_attestations(reader, "sha256:" + "A" * 64, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["subject_digest"], DIGEST)
        self.assertEqual(result["count"], 1)
        self.assertIsNone(result["total_count"])
        self.assertEqual(
            result["attestations"],
            [{"repository_id": 7, "initiator": "github-actions"}],
        )
        self.assertNotIn("signed.invalid", repr(result))
        self.assertNotIn("bundle_url", repr(result))
        self.assertFalse(result["artifact_integrity_authority"])
        self.assertFalse(result["provenance_verification_authority"])
        self.assertFalse(result["signer_trust_authority"])
        self.assertFalse(result["security_acceptance_authority"])
        reader.list_repository_attestations.assert_called_once_with(DIGEST, limit=5)

    def test_empty_first_page_is_known_zero(self):
        reader = Mock()
        reader.list_repository_attestations.return_value = []
        result = repo_attestations(reader, DIGEST, 1)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["attestations"], [])
        self.assertIsNone(result["total_count"])

    def test_invalid_digest_and_limit_fail_before_reader_call(self):
        invalid = [
            "",
            "a" * 64,
            "sha512:" + "a" * 64,
            "sha256:" + "g" * 64,
            "sha256:" + "a" * 63,
            "sha256:" + "a" * 65,
            " sha256:" + "a" * 64,
            "sha256:" + "a" * 64 + "\n",
        ]
        for value in invalid:
            with self.subTest(value=value):
                reader = Mock()
                result = repo_attestations(reader, value, 20)
                self.assertEqual(result["status"], "UNKNOWN")
                self.assertEqual(result["reason_code"], "INVALID_SUBJECT_DIGEST")
                self.assertIsNone(result["subject_digest"])
                reader.list_repository_attestations.assert_not_called()

        reader = Mock()
        result = repo_attestations(reader, DIGEST, 0)
        self.assertEqual(result["reason_code"], "INVALID_LIMIT")
        reader.list_repository_attestations.assert_not_called()

    def test_http_404_remains_unknown_not_zero(self):
        reader = Mock()
        reader.list_repository_attestations.side_effect = GitHubReadError(
            "not found", status_code=404
        )
        result = repo_attestations(reader, DIGEST, 5)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "RESOURCE_NOT_FOUND")
        self.assertEqual(result["http_status"], 404)
        self.assertIsNone(result["count"])
        self.assertEqual(result["attestations"], [])

    def test_malformed_rows_fail_closed(self):
        reader = Mock()
        reader.list_repository_attestations.return_value = [{
            "repository_id": True,
            "initiator": "github-actions",
        }]
        result = repo_attestations(reader, DIGEST, 5)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")

        reader.list_repository_attestations.return_value = [{
            "repository_id": 7,
            "initiator": "x" * 513,
        }]
        result = repo_attestations(reader, DIGEST, 5)
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")


if __name__ == "__main__":
    unittest.main()
