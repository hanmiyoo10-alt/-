from __future__ import annotations

import unittest

from repo_admin_mcp.receipt import ReceiptError, RotationCleanupReceiptSigner


class ReceiptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.signer = RotationCleanupReceiptSigner("synthetic-receipt-key-" + "x" * 32)

    def test_roundtrip_rotation_cleanup_receipt(self):
        token = self.signer.issue(
            old_key_id=7,
            new_key_id=8,
            previous_secret_updated_at="2026-10-13T10:00:00Z",
            post_secret_updated_at="2026-10-13T10:01:00Z",
        )
        evidence = self.signer.verify(token)
        self.assertEqual(evidence.old_key_id, 7)
        self.assertEqual(evidence.new_key_id, 8)
        self.assertEqual(evidence.previous_secret_updated_at, "2026-10-13T10:00:00Z")
        self.assertEqual(evidence.post_secret_updated_at, "2026-10-13T10:01:00Z")

    def test_acknowledged_put_receipt_allows_missing_post_timestamp(self):
        token = self.signer.issue(
            old_key_id=7,
            new_key_id=8,
            previous_secret_updated_at="2026-10-13T10:00:00Z",
            post_secret_updated_at=None,
        )
        evidence = self.signer.verify(token)
        self.assertEqual(evidence.previous_secret_updated_at, "2026-10-13T10:00:00Z")
        self.assertIsNone(evidence.post_secret_updated_at)

    def test_tampered_receipt_is_rejected(self):
        token = self.signer.issue(
            old_key_id=7,
            new_key_id=8,
            previous_secret_updated_at="2026-10-13T10:00:00Z",
            post_secret_updated_at="2026-10-13T10:01:00Z",
        )
        tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
        with self.assertRaises(ReceiptError) as ctx:
            self.signer.verify(tampered)
        self.assertEqual(ctx.exception.code, "INVALID_CLEANUP_RECEIPT_SIGNATURE")

    def test_invalid_key_identity_is_rejected(self):
        with self.assertRaises(ReceiptError) as ctx:
            self.signer.issue(
                old_key_id=7,
                new_key_id=7,
                previous_secret_updated_at="2026-10-13T10:00:00Z",
                post_secret_updated_at=None,
            )
        self.assertEqual(ctx.exception.code, "INVALID_ROTATION_CLEANUP_EVIDENCE")

    def test_short_signing_key_is_rejected(self):
        with self.assertRaises(ReceiptError) as ctx:
            RotationCleanupReceiptSigner("too-short")
        self.assertEqual(ctx.exception.code, "CLEANUP_RECEIPT_SIGNING_KEY_TOO_SHORT")


if __name__ == "__main__":
    unittest.main()
