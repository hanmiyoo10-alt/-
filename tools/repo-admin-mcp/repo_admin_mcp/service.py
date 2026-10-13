from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Callable, Protocol

from .config import DEPLOY_KEY_TITLE_PREFIX, SECRET_NAME
from .crypto import KeyMaterial, generate_ed25519_keypair, seal_for_github
from .github_client import DeployKey, EnvironmentPublicKey, SecretMetadata


class AdminClient(Protocol):
    def list_deploy_keys(self) -> list[DeployKey]: ...
    def create_write_deploy_key(self, title: str, public_key: str) -> DeployKey: ...
    def delete_deploy_key(self, key_id: int) -> None: ...
    def get_environment_public_key(self) -> EnvironmentPublicKey: ...
    def get_environment_secret(self) -> SecretMetadata | None: ...
    def put_environment_secret(self, encrypted_value: str, key_id: str) -> None: ...
    def delete_environment_secret(self) -> None: ...


_MUTATION_LOCK = threading.RLock()


def _matching_keys(client: AdminClient) -> list[DeployKey]:
    return [key for key in client.list_deploy_keys() if key.title.startswith(DEPLOY_KEY_TITLE_PREFIX)]


def _safe_key(key: DeployKey) -> dict:
    return {
        "id": key.id,
        "title": key.title,
        "readOnly": key.read_only,
        "createdAt": key.created_at,
    }


def _safe_secret(secret: SecretMetadata | None) -> dict:
    if secret is None:
        return {"present": False, "name": SECRET_NAME, "createdAt": None, "updatedAt": None}
    return {
        "present": True,
        "name": SECRET_NAME,
        "createdAt": secret.created_at,
        "updatedAt": secret.updated_at,
    }


def _error_result(kind: str, error: Exception, status: str = "UNKNOWN") -> dict:
    code = getattr(error, "code", "UNEXPECTED_ERROR")
    http_status = getattr(error, "http_status", None)
    return {
        "schemaVersion": 1,
        "kind": kind,
        "status": status,
        "reasonCode": str(code)[:120],
        "httpStatus": http_status if isinstance(http_status, int) else None,
    }


def private_mirror_writer_status(client: AdminClient) -> dict:
    kind = "PRIVATE_MIRROR_WRITER_STATUS"
    try:
        keys = _matching_keys(client)
        secret = client.get_environment_secret()
        client.get_environment_public_key()
    except Exception as exc:
        return _error_result(kind, exc)
    return {
        "schemaVersion": 1,
        "kind": kind,
        "status": "PASS",
        "configurationState": (
            "ABSENT" if not keys and secret is None else
            "CONFIGURED_METADATA_ONLY" if len(keys) == 1 and not keys[0].read_only and secret is not None else
            "CONFLICT"
        ),
        "deployKeyCount": len(keys),
        "deployKeys": [_safe_key(key) for key in keys],
        "secret": _safe_secret(secret),
        "capabilities": {
            "deployKeyRead": "PASS",
            "environmentSecretRead": "PASS",
            "environmentPublicKeyRead": "PASS",
            "deployKeyWrite": "UNKNOWN_UNTIL_EFFECT",
            "environmentSecretWrite": "UNKNOWN_UNTIL_EFFECT",
        },
    }


def _timestamp_title(now: Callable[[], datetime]) -> str:
    stamp = now().astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{DEPLOY_KEY_TITLE_PREFIX}-{stamp}"


def _wait_secret_changed(
    client: AdminClient,
    previous_updated_at: str | None,
    *,
    attempts: int = 5,
    delay: float = 0.25,
    sleep: Callable[[float], None] = time.sleep,
) -> SecretMetadata | None:
    for index in range(attempts):
        current = client.get_environment_secret()
        if current is not None and current.updated_at != previous_updated_at:
            return current
        if index + 1 < attempts:
            sleep(delay)
    return None


def private_mirror_writer_bootstrap(
    client: AdminClient,
    *,
    key_factory: Callable[[str], KeyMaterial] = generate_ed25519_keypair,
    sealer: Callable[[str, bytearray], str] = seal_for_github,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> dict:
    kind = "PRIVATE_MIRROR_WRITER_BOOTSTRAP"
    with _MUTATION_LOCK:
        status = private_mirror_writer_status(client)
        if status.get("status") != "PASS":
            return {**status, "kind": kind}
        state = status["configurationState"]
        if state == "CONFIGURED_METADATA_ONLY":
            return {**status, "kind": kind, "status": "PASS", "effect": "ALREADY_CONFIGURED_METADATA_ONLY"}
        if state != "ABSENT":
            return {**status, "kind": kind, "status": "CONFLICT", "reasonCode": "PARTIAL_OR_AMBIGUOUS_PREEXISTING_STATE"}

        try:
            env_key = client.get_environment_public_key()
        except Exception as exc:
            return _error_result(kind, exc, "BLOCKED")

        material = key_factory(DEPLOY_KEY_TITLE_PREFIX)
        created: DeployKey | None = None
        secret_write_attempted = False
        try:
            created = client.create_write_deploy_key(_timestamp_title(now), material.public_key)
            encrypted = sealer(env_key.key, material.private_key)
            secret_write_attempted = True
            try:
                client.put_environment_secret(encrypted, env_key.key_id)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "SECRET_WRITE_OUTCOME_UNKNOWN",
                    "newKeyId": created.id,
                    "writeReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                    "httpStatus": getattr(exc, "http_status", None),
                }

            final = private_mirror_writer_status(client)
            if (
                final.get("status") != "PASS" or
                final.get("configurationState") != "CONFIGURED_METADATA_ONLY" or
                final.get("deployKeyCount") != 1 or
                final.get("deployKeys", [{}])[0].get("id") != created.id or
                not final.get("secret", {}).get("present")
            ):
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "POSTWRITE_READBACK_NOT_CONVERGED",
                    "newKeyId": created.id,
                    "observedStatus": final.get("status"),
                    "observedConfigurationState": final.get("configurationState"),
                    "observedKeyCount": final.get("deployKeyCount"),
                    "observedSecretUpdatedAt": final.get("secret", {}).get("updatedAt"),
                    "finalReasonCode": final.get("reasonCode"),
                }
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PASS",
                "effect": "BOOTSTRAPPED",
                "deployKey": final["deployKeys"][0],
                "secret": final["secret"],
            }
        except Exception as exc:
            if created is not None and not secret_write_attempted:
                try:
                    client.delete_deploy_key(created.id)
                except Exception:
                    return {
                        "schemaVersion": 1,
                        "kind": kind,
                        "status": "PARTIAL",
                        "reasonCode": "PRESECRET_FAILURE_ROLLBACK_DELETE_FAILED",
                        "newKeyId": created.id,
                    }
                result = _error_result(kind, exc, "BLOCKED")
                result["rollback"] = "DEPLOY_KEY_DELETED"
                return result
            if created is not None:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "POSTSECRET_EFFECT_UNKNOWN",
                    "newKeyId": created.id,
                }
            return _error_result(kind, exc, "BLOCKED")
        finally:
            material.destroy()


def private_mirror_writer_rotate(
    client: AdminClient,
    expected_key_id: int,
    expected_secret_updated_at: str,
    *,
    key_factory: Callable[[str], KeyMaterial] = generate_ed25519_keypair,
    sealer: Callable[[str, bytearray], str] = seal_for_github,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    sleep: Callable[[float], None] = time.sleep,
) -> dict:
    kind = "PRIVATE_MIRROR_WRITER_ROTATE"
    with _MUTATION_LOCK:
        status = private_mirror_writer_status(client)
        if status.get("status") != "PASS":
            return {**status, "kind": kind}
        if status.get("configurationState") != "CONFIGURED_METADATA_ONLY" or status.get("deployKeyCount") != 1:
            return {**status, "kind": kind, "status": "CONFLICT", "reasonCode": "ROTATION_REQUIRES_ONE_CONFIGURED_KEY"}
        current_key = status["deployKeys"][0]
        secret = status["secret"]
        if current_key["id"] != expected_key_id or secret.get("updatedAt") != expected_secret_updated_at:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "CONFLICT",
                "reasonCode": "EXPECTED_METADATA_MISMATCH",
                "observedKeyId": current_key["id"],
                "observedSecretUpdatedAt": secret.get("updatedAt"),
            }
        try:
            env_key = client.get_environment_public_key()
        except Exception as exc:
            return _error_result(kind, exc, "BLOCKED")

        material = key_factory(DEPLOY_KEY_TITLE_PREFIX)
        replacement: DeployKey | None = None
        secret_write_attempted = False
        try:
            replacement = client.create_write_deploy_key(_timestamp_title(now), material.public_key)
            encrypted = sealer(env_key.key, material.private_key)
            secret_write_attempted = True
            try:
                client.put_environment_secret(encrypted, env_key.key_id)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "SECRET_WRITE_OUTCOME_UNKNOWN",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "writeReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                    "httpStatus": getattr(exc, "http_status", None),
                }

            try:
                changed = _wait_secret_changed(client, expected_secret_updated_at, sleep=sleep)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "SECRET_METADATA_READBACK_UNKNOWN",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                }
            if changed is None:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "SECRET_METADATA_NOT_ADVANCED",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                }
            try:
                keys = _matching_keys(client)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "REPLACEMENT_KEY_READBACK_UNKNOWN",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                    "readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                }
            if not any(key.id == replacement.id and not key.read_only for key in keys):
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "REPLACEMENT_KEY_READBACK_MISSING",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                }
            try:
                client.delete_deploy_key(expected_key_id)
            except Exception:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "OLD_KEY_REVOCATION_PENDING",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                }

            final = private_mirror_writer_status(client)
            final_keys = final.get("deployKeys", [])
            final_secret = final.get("secret", {})
            if (
                final.get("status") != "PASS" or
                final.get("configurationState") != "CONFIGURED_METADATA_ONLY" or
                final.get("deployKeyCount") != 1 or
                len(final_keys) != 1 or
                final_keys[0].get("id") != replacement.id or
                not final_secret.get("present") or
                final_secret.get("updatedAt") != changed.updated_at
            ):
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "POSTROTATE_READBACK_NOT_CONVERGED",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "expectedSecretUpdatedAt": changed.updated_at,
                    "observedStatus": final.get("status"),
                    "observedConfigurationState": final.get("configurationState"),
                    "observedKeyCount": final.get("deployKeyCount"),
                    "observedKeyId": final_keys[0].get("id") if len(final_keys) == 1 else None,
                    "observedSecretUpdatedAt": final_secret.get("updatedAt"),
                    "finalReasonCode": final.get("reasonCode"),
                }
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PASS",
                "effect": "ROTATED",
                "oldKeyId": expected_key_id,
                "newKeyId": replacement.id,
                "secretUpdatedAt": final_secret["updatedAt"],
            }
        except Exception as exc:
            if replacement is not None and not secret_write_attempted:
                try:
                    client.delete_deploy_key(replacement.id)
                except Exception:
                    return {
                        "schemaVersion": 1,
                        "kind": kind,
                        "status": "PARTIAL",
                        "reasonCode": "PRESECRET_FAILURE_REPLACEMENT_DELETE_FAILED",
                        "oldKeyId": expected_key_id,
                        "newKeyId": replacement.id,
                    }
                result = _error_result(kind, exc, "BLOCKED")
                result["oldKeyId"] = expected_key_id
                result["rollback"] = "REPLACEMENT_KEY_DELETED"
                return result
            if replacement is not None:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "POSTSECRET_EFFECT_UNKNOWN",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                }
            result = _error_result(kind, exc, "BLOCKED")
            result["oldKeyId"] = expected_key_id
            return result
        finally:
            material.destroy()


def private_mirror_writer_revoke(client: AdminClient, expected_key_id: int, expected_secret_updated_at: str) -> dict:
    kind = "PRIVATE_MIRROR_WRITER_REVOKE"
    with _MUTATION_LOCK:
        status = private_mirror_writer_status(client)
        if status.get("status") != "PASS":
            return {**status, "kind": kind}
        if status.get("configurationState") == "ABSENT":
            return {"schemaVersion": 1, "kind": kind, "status": "PASS", "effect": "ALREADY_REVOKED"}
        if status.get("configurationState") != "CONFIGURED_METADATA_ONLY" or status.get("deployKeyCount") != 1:
            return {**status, "kind": kind, "status": "CONFLICT", "reasonCode": "REVOCATION_REQUIRES_ONE_CONFIGURED_KEY"}
        key = status["deployKeys"][0]
        secret = status["secret"]
        if key["id"] != expected_key_id or secret.get("updatedAt") != expected_secret_updated_at:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "CONFLICT",
                "reasonCode": "EXPECTED_METADATA_MISMATCH",
                "observedKeyId": key["id"],
                "observedSecretUpdatedAt": secret.get("updatedAt"),
            }
        try:
            client.delete_environment_secret()
        except Exception as exc:
            return _error_result(kind, exc, "BLOCKED")
        try:
            client.delete_deploy_key(expected_key_id)
        except Exception:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "DEPLOY_KEY_REVOCATION_PENDING",
                "keyId": expected_key_id,
            }
        final = private_mirror_writer_status(client)
        if final.get("configurationState") != "ABSENT":
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "POSTREVOKE_READBACK_NOT_CONVERGED",
            }
        return {
            "schemaVersion": 1,
            "kind": kind,
            "status": "PASS",
            "effect": "REVOKED",
            "keyId": expected_key_id,
        }
