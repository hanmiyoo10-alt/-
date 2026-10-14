from __future__ import annotations

import unittest
from datetime import datetime, timezone

from repo_admin_mcp.crypto import KeyMaterial
from repo_admin_mcp.github_client import DeployKey, EnvironmentPublicKey, GitHubAdminError, SecretMetadata
from repo_admin_mcp.service import (
    private_mirror_writer_bootstrap,
    private_mirror_writer_revoke,
    private_mirror_writer_rotate,
    private_mirror_writer_status,
)

SENTINEL = b"SUPER-SECRET-PRIVATE-MATERIAL"
SEALED = "synthetic-sealed-value"
OLD_UPDATED = "2026-10-13T10:00:00Z"
NEW_UPDATED = "2026-10-13T10:01:00Z"


class FakeClient:
    def __init__(self) -> None:
        self.keys: list[DeployKey] = []
        self.secret: SecretMetadata | None = None
        self.public_key = EnvironmentPublicKey(key_id="kid-1", key="synthetic-public-key")
        self.next_id = 7
        self.events: list[str] = []
        self.fail_secret_put = False
        self.apply_secret_before_failure = False
        self.fail_create_after_apply = False
        self.drift_secret_after_create = False
        self._secret_drifted = False
        self.fail_secret_get_after_put = False
        self.fail_key_list_after_put = False
        self.fail_key_list_after_old_delete = False
        self.fail_key_delete_ids: set[int] = set()
        self.fail_secret_delete = False
        self.advance_secret_metadata = True

    def list_deploy_keys(self) -> list[DeployKey]:
        if self.fail_key_list_after_old_delete and "delete_key:7" in self.events:
            raise GitHubAdminError("SYNTHETIC_FINAL_KEY_READ_FAILURE", 503)
        if self.fail_key_list_after_put and "put_secret" in self.events:
            raise GitHubAdminError("SYNTHETIC_REPLACEMENT_KEY_READ_FAILURE", 503)
        return list(self.keys)

    def create_write_deploy_key(self, title: str, public_key: str) -> DeployKey:
        self.events.append("create_key")
        key = DeployKey(self.next_id, title, False, "2026-10-13T09:59:00Z")
        self.next_id += 1
        self.keys.append(key)
        if self.fail_create_after_apply:
            raise GitHubAdminError("SYNTHETIC_CREATE_RESPONSE_LOST", 503)
        return key

    def delete_deploy_key(self, key_id: int) -> None:
        self.events.append(f"delete_key:{key_id}")
        if key_id in self.fail_key_delete_ids:
            raise GitHubAdminError("SYNTHETIC_KEY_DELETE_FAILURE", 500)
        self.keys = [key for key in self.keys if key.id != key_id]

    def get_environment_public_key(self) -> EnvironmentPublicKey:
        self.events.append("read_env_key")
        return self.public_key

    def get_environment_secret(self) -> SecretMetadata | None:
        if (
            self.drift_secret_after_create and
            not self._secret_drifted and
            "create_key" in self.events and
            "put_secret" not in self.events and
            self.secret is not None
        ):
            self._secret_drifted = True
            self.secret = SecretMetadata(
                "MYANG_DISTRIBUTION_SSH_KEY",
                self.secret.created_at,
                "2026-10-13T10:00:30Z",
            )
        if self.fail_secret_get_after_put and "put_secret" in self.events:
            raise GitHubAdminError("SYNTHETIC_SECRET_READ_FAILURE", 503)
        return self.secret

    def put_environment_secret(self, encrypted_value: str, key_id: str) -> None:
        self.events.append("put_secret")
        if self.secret is None:
            updated = NEW_UPDATED
            created = NEW_UPDATED
        else:
            created = self.secret.created_at
            updated = NEW_UPDATED if self.advance_secret_metadata else self.secret.updated_at
        if self.fail_secret_put and not self.apply_secret_before_failure:
            raise GitHubAdminError("SYNTHETIC_SECRET_WRITE_FAILURE", 500)
        self.secret = SecretMetadata("MYANG_DISTRIBUTION_SSH_KEY", created, updated)
        if self.fail_secret_put:
            raise GitHubAdminError("SYNTHETIC_SECRET_WRITE_FAILURE_AFTER_APPLY", 500)

    def delete_environment_secret(self) -> None:
        self.events.append("delete_secret")
        if self.fail_secret_delete:
            raise GitHubAdminError("SYNTHETIC_SECRET_DELETE_FAILURE", 500)
        self.secret = None


def material_holder():
    material = KeyMaterial("ssh-ed25519 SYNTHETIC public", bytearray(SENTINEL))
    return material, lambda _comment: material


def sealer(_public: str, private: bytearray) -> str:
    if bytes(private) != SENTINEL:
        raise AssertionError("unexpected private material")
    return SEALED


def configured(client: FakeClient) -> None:
    client.keys = [DeployKey(7, "myang-private-promotion-writer-old", False, "2026-10-13T09:00:00Z")]
    client.next_id = 8
    client.secret = SecretMetadata("MYANG_DISTRIBUTION_SSH_KEY", OLD_UPDATED, OLD_UPDATED)


class ServiceTests(unittest.TestCase):
    def test_status_is_sanitized(self):
        client = FakeClient()
        configured(client)
        result = private_mirror_writer_status(client)
        rendered = repr(result)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["configurationState"], "CONFIGURED_METADATA_ONLY")
        self.assertNotIn(SENTINEL.decode(), rendered)
        self.assertNotIn(SEALED, rendered)
        self.assertNotIn(client.public_key.key, rendered)

    def test_bootstrap_success_and_scrubs_private_bytearray(self):
        client = FakeClient()
        material, factory = material_holder()
        result = private_mirror_writer_bootstrap(
            client,
            key_factory=factory,
            sealer=sealer,
            now=lambda: datetime(2026, 10, 13, tzinfo=timezone.utc),
        )
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["effect"], "BOOTSTRAPPED")
        self.assertEqual(len(client.keys), 1)
        self.assertIsNotNone(client.secret)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))
        rendered = repr(result)
        self.assertNotIn(SENTINEL.decode(), rendered)
        self.assertNotIn(SEALED, rendered)

    def test_bootstrap_is_idempotent_when_metadata_is_configured(self):
        client = FakeClient()
        configured(client)
        result = private_mirror_writer_bootstrap(client)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["effect"], "ALREADY_CONFIGURED_METADATA_ONLY")
        self.assertEqual(client.events, ["read_env_key"])

    def test_bootstrap_fails_closed_on_partial_state(self):
        client = FakeClient()
        client.keys = [DeployKey(7, "myang-private-promotion-writer-partial", False, None)]
        result = private_mirror_writer_bootstrap(client)
        self.assertEqual(result["status"], "CONFLICT")
        self.assertEqual(result["reasonCode"], "PARTIAL_OR_AMBIGUOUS_PREEXISTING_STATE")

    def test_bootstrap_secret_write_exception_preserves_created_key(self):
        client = FakeClient()
        client.fail_secret_put = True
        material, factory = material_holder()
        result = private_mirror_writer_bootstrap(client, key_factory=factory, sealer=sealer)
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_WRITE_OUTCOME_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7])
        self.assertNotIn("delete_key:7", client.events)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_bootstrap_presecret_failure_rolls_back_created_key(self):
        client = FakeClient()
        material, factory = material_holder()

        def failing_sealer(_public, _private):
            raise GitHubAdminError("SYNTHETIC_SEAL_FAILURE", 500)

        result = private_mirror_writer_bootstrap(client, key_factory=factory, sealer=failing_sealer)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["rollback"], "DEPLOY_KEY_DELETED")
        self.assertEqual(client.keys, [])
        self.assertIn("delete_key:7", client.events)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_bootstrap_presecret_rollback_failure_is_partial(self):
        client = FakeClient()
        client.fail_key_delete_ids.add(7)
        material, factory = material_holder()

        def failing_sealer(_public, _private):
            raise GitHubAdminError("SYNTHETIC_SEAL_FAILURE", 500)

        result = private_mirror_writer_bootstrap(client, key_factory=factory, sealer=failing_sealer)
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "PRESECRET_FAILURE_ROLLBACK_DELETE_FAILED")
        self.assertEqual([key.id for key in client.keys], [7])
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_updates_secret_before_old_key_delete(self):
        client = FakeClient()
        configured(client)
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client,
            7,
            OLD_UPDATED,
            key_factory=factory,
            sealer=sealer,
            now=lambda: datetime(2026, 10, 13, 10, 1, tzinfo=timezone.utc),
            sleep=lambda _delay: None,
        )
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["effect"], "ROTATED")
        self.assertEqual([key.id for key in client.keys], [8])
        self.assertLess(client.events.index("put_secret"), client.events.index("delete_key:7"))
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_rejects_stale_expected_metadata(self):
        client = FakeClient()
        configured(client)
        result = private_mirror_writer_rotate(client, 999, OLD_UPDATED)
        self.assertEqual(result["status"], "CONFLICT")
        self.assertEqual(result["reasonCode"], "EXPECTED_METADATA_MISMATCH")
        self.assertEqual([key.id for key in client.keys], [7])

    def test_rotate_secret_write_exception_preserves_replacement(self):
        client = FakeClient()
        configured(client)
        client.fail_secret_put = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_WRITE_OUTCOME_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7, 8])
        self.assertNotIn("delete_key:8", client.events)
        self.assertNotIn("delete_key:7", client.events)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_bootstrap_ambiguous_secret_write_preserves_created_key(self):
        client = FakeClient()
        client.fail_secret_put = True
        client.apply_secret_before_failure = True
        material, factory = material_holder()
        result = private_mirror_writer_bootstrap(client, key_factory=factory, sealer=sealer)
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_WRITE_OUTCOME_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7])
        self.assertIsNotNone(client.secret)
        self.assertNotIn("delete_key:7", client.events)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_same_second_applied_write_exception_preserves_replacement(self):
        client = FakeClient()
        configured(client)
        client.fail_secret_put = True
        client.apply_secret_before_failure = True
        client.advance_secret_metadata = False
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_WRITE_OUTCOME_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7, 8])
        self.assertEqual(client.secret.updated_at, OLD_UPDATED)
        self.assertNotIn("delete_key:8", client.events)
        self.assertNotIn("delete_key:7", client.events)
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_secret_metadata_read_failure_preserves_replacement(self):
        client = FakeClient()
        configured(client)
        client.fail_secret_get_after_put = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_METADATA_READBACK_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7, 8])
        self.assertNotIn("delete_key:8", client.events)
        self.assertNotIn("delete_key:7", client.events)

    def test_rotate_replacement_key_read_failure_preserves_replacement(self):
        client = FakeClient()
        configured(client)
        client.fail_key_list_after_put = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "REPLACEMENT_KEY_READBACK_UNKNOWN")
        self.assertEqual([key.id for key in client.keys], [7, 8])
        self.assertNotIn("delete_key:8", client.events)
        self.assertNotIn("delete_key:7", client.events)

    def test_rotate_final_readback_failure_is_partial_not_pass(self):
        client = FakeClient()
        configured(client)
        client.fail_key_list_after_old_delete = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "POSTROTATE_READBACK_NOT_CONVERGED")
        self.assertEqual([key.id for key in client.keys], [8])
        self.assertEqual(result["finalReasonCode"], "SYNTHETIC_FINAL_KEY_READ_FAILURE")

    def test_rotate_preserves_both_keys_when_secret_metadata_does_not_advance(self):
        client = FakeClient()
        configured(client)
        client.advance_secret_metadata = False
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "SECRET_METADATA_NOT_ADVANCED")
        self.assertEqual([key.id for key in client.keys], [7, 8])
        self.assertNotIn("delete_key:7", client.events)

    def test_rotate_old_key_delete_failure_is_partial(self):
        client = FakeClient()
        configured(client)
        client.fail_key_delete_ids.add(7)
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client, 7, OLD_UPDATED, key_factory=factory, sealer=sealer, sleep=lambda _delay: None
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "OLD_KEY_REVOCATION_PENDING")
        self.assertEqual([key.id for key in client.keys], [7, 8])

    def test_bootstrap_key_generation_failure_is_sanitized(self):
        client = FakeClient()

        def failing_factory(_comment):
            raise RuntimeError("SYNTHETIC_KEYGEN_SECRET_PAYLOAD")

        result = private_mirror_writer_bootstrap(client, key_factory=failing_factory)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["reasonCode"], "UNEXPECTED_ERROR")
        self.assertNotIn("SYNTHETIC_KEYGEN_SECRET_PAYLOAD", repr(result))
        self.assertEqual(client.keys, [])

    def test_rotate_key_generation_failure_is_sanitized(self):
        client = FakeClient()
        configured(client)

        def failing_factory(_comment):
            raise RuntimeError("SYNTHETIC_KEYGEN_SECRET_PAYLOAD")

        result = private_mirror_writer_rotate(client, 7, OLD_UPDATED, key_factory=failing_factory)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["reasonCode"], "UNEXPECTED_ERROR")
        self.assertNotIn("SYNTHETIC_KEYGEN_SECRET_PAYLOAD", repr(result))
        self.assertEqual([key.id for key in client.keys], [7])

    def test_bootstrap_lost_create_response_is_partial_and_reconciles_exact_title(self):
        client = FakeClient()
        client.fail_create_after_apply = True
        material, factory = material_holder()
        result = private_mirror_writer_bootstrap(
            client,
            key_factory=factory,
            sealer=sealer,
            now=lambda: datetime(2026, 10, 13, 10, 2, 3, 456789, tzinfo=timezone.utc),
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "DEPLOY_KEY_CREATE_OUTCOME_UNKNOWN")
        self.assertEqual(result["observedExactTitleCount"], 1)
        self.assertEqual(result["rollback"], "DEPLOY_KEY_DELETED")
        self.assertEqual(client.keys, [])
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_lost_create_response_is_partial_and_reconciles_exact_title(self):
        client = FakeClient()
        configured(client)
        client.fail_create_after_apply = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client,
            7,
            OLD_UPDATED,
            key_factory=factory,
            sealer=sealer,
            now=lambda: datetime(2026, 10, 13, 10, 2, 3, 456789, tzinfo=timezone.utc),
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertEqual(result["reasonCode"], "DEPLOY_KEY_CREATE_OUTCOME_UNKNOWN")
        self.assertEqual(result["rollback"], "DEPLOY_KEY_DELETED")
        self.assertEqual([key.id for key in client.keys], [7])
        self.assertEqual(bytes(material.private_key), b"\x00" * len(SENTINEL))

    def test_rotate_revalidates_secret_metadata_immediately_before_put(self):
        client = FakeClient()
        configured(client)
        client.drift_secret_after_create = True
        material, factory = material_holder()
        result = private_mirror_writer_rotate(
            client,
            7,
            OLD_UPDATED,
            key_factory=factory,
            sealer=sealer,
        )
        self.assertEqual(result["status"], "CONFLICT")
        self.assertEqual(result["reasonCode"], "EXPECTED_METADATA_CHANGED_BEFORE_SECRET_WRITE")
        self.assertEqual(result["rollback"], "REPLACEMENT_KEY_DELETED")
        self.assertEqual([key.id for key in client.keys], [7])
        self.assertNotIn("put_secret", client.events)

    def test_rotate_pending_old_key_delete_can_be_retried_by_exact_ids(self):
        client = FakeClient()
        configured(client)
        client.fail_key_delete_ids.add(7)
        material, factory = material_holder()
        first = private_mirror_writer_rotate(
            client,
            7,
            OLD_UPDATED,
            key_factory=factory,
            sealer=sealer,
            sleep=lambda _delay: None,
        )
        self.assertEqual(first["status"], "PARTIAL")
        self.assertEqual(first["reasonCode"], "OLD_KEY_REVOCATION_PENDING")
        self.assertEqual([key.id for key in client.keys], [7, 8])

        client.fail_key_delete_ids.clear()
        second = private_mirror_writer_rotate(
            client,
            7,
            first["secretUpdatedAt"],
            pending_new_key_id=first["newKeyId"],
        )
        self.assertEqual(second["status"], "PASS")
        self.assertEqual(second["effect"], "ROTATION_CLEANUP_COMPLETED")
        self.assertEqual([key.id for key in client.keys], [8])

    def test_revoke_pending_key_delete_can_be_retried(self):
        client = FakeClient()
        configured(client)
        client.fail_key_delete_ids.add(7)
        first = private_mirror_writer_revoke(client, 7, OLD_UPDATED)
        self.assertEqual(first["status"], "PARTIAL")
        self.assertEqual(first["reasonCode"], "DEPLOY_KEY_REVOCATION_PENDING")
        self.assertIsNone(client.secret)
        self.assertEqual([key.id for key in client.keys], [7])

        client.fail_key_delete_ids.clear()
        second = private_mirror_writer_revoke(client, 7, OLD_UPDATED)
        self.assertEqual(second["status"], "PASS")
        self.assertEqual(second["effect"], "REVOCATION_CLEANUP_COMPLETED")
        self.assertEqual(client.keys, [])

    def test_revoke_deletes_secret_before_key(self):
        client = FakeClient()
        configured(client)
        result = private_mirror_writer_revoke(client, 7, OLD_UPDATED)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["effect"], "REVOKED")
        self.assertLess(client.events.index("delete_secret"), client.events.index("delete_key:7"))
        self.assertIsNone(client.secret)
        self.assertEqual(client.keys, [])

    def test_revoke_secret_failure_preserves_key(self):
        client = FakeClient()
        configured(client)
        client.fail_secret_delete = True
        result = private_mirror_writer_revoke(client, 7, OLD_UPDATED)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual([key.id for key in client.keys], [7])


if __name__ == "__main__":
    unittest.main()
