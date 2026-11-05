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
        "enabled": key.enabled,
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
            "CONFIGURED_METADATA_ONLY" if len(keys) == 1 and not keys[0].read_only and keys[0].enabled and secret is not None else
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
    stamp = now().astimezone(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    return f"{DEPLOY_KEY_TITLE_PREFIX}-{stamp}"


def _ambiguous_create_result(
    client: AdminClient,
    *,
    kind: str,
    title: str,
    error: Exception,
    extra: dict | None = None,
) -> dict:
    result = {
        "schemaVersion": 1,
        "kind": kind,
        "status": "PARTIAL",
        "reasonCode": "DEPLOY_KEY_CREATE_OUTCOME_UNKNOWN",
        "createReasonCode": getattr(error, "code", "UNEXPECTED_ERROR"),
        "httpStatus": getattr(error, "http_status", None),
        "createdTitle": title,
    }
    if extra:
        result.update(extra)
    try:
        exact = [
            key for key in _matching_keys(client)
            if key.title == title and not key.read_only
        ]
    except Exception as readback_error:
        result["readbackReasonCode"] = getattr(readback_error, "code", "UNEXPECTED_ERROR")
        return result

    result["observedExactTitleCount"] = len(exact)
    if len(exact) != 1:
        if len(exact) > 1:
            result["reasonCode"] = "DEPLOY_KEY_CREATE_IDENTITY_CONFLICT"
        return result

    key = exact[0]
    result["observedKeyId"] = key.id
    try:
        client.delete_deploy_key(key.id)
        result["rollback"] = "DEPLOY_KEY_DELETED"
    except Exception as rollback_error:
        result["rollback"] = "DEPLOY_KEY_DELETE_FAILED"
        result["rollbackReasonCode"] = getattr(rollback_error, "code", "UNEXPECTED_ERROR")
    return result


def _delete_presecret_replacement(
    client: AdminClient,
    *,
    kind: str,
    replacement_id: int,
    reason_code: str,
    status: str,
    fields: dict | None = None,
) -> dict:
    result = {
        "schemaVersion": 1,
        "kind": kind,
        "status": status,
        "reasonCode": reason_code,
        "newKeyId": replacement_id,
    }
    if fields:
        result.update(fields)
    try:
        client.delete_deploy_key(replacement_id)
        result["rollback"] = "REPLACEMENT_KEY_DELETED"
    except Exception as exc:
        result["status"] = "PARTIAL"
        result["reasonCode"] = f"{reason_code}_ROLLBACK_FAILED"
        result["rollbackReasonCode"] = getattr(exc, "code", "UNEXPECTED_ERROR")
    return result


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

        material: KeyMaterial | None = None
        created: DeployKey | None = None
        secret_write_attempted = False
        title = _timestamp_title(now)
        try:
            try:
                material = key_factory(DEPLOY_KEY_TITLE_PREFIX)
            except Exception as exc:
                return _error_result(kind, exc, "BLOCKED")

            try:
                created = client.create_write_deploy_key(title, material.public_key)
            except Exception as exc:
                return _ambiguous_create_result(client, kind=kind, title=title, error=exc)

            encrypted = sealer(env_key.key, material.private_key)

            try:
                prewrite_secret = client.get_environment_secret()
                prewrite_keys = _matching_keys(client)
            except Exception as exc:
                return _delete_presecret_replacement(
                    client,
                    kind=kind,
                    replacement_id=created.id,
                    reason_code="BOOTSTRAP_PREWRITE_METADATA_READ_FAILED",
                    status="BLOCKED",
                    fields={"readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR")},
                )

            if (
                prewrite_secret is not None or
                len(prewrite_keys) != 1 or
                prewrite_keys[0].id != created.id or
                prewrite_keys[0].read_only or
                not prewrite_keys[0].enabled
            ):
                return _delete_presecret_replacement(
                    client,
                    kind=kind,
                    replacement_id=created.id,
                    reason_code="BOOTSTRAP_STATE_CHANGED_BEFORE_SECRET_WRITE",
                    status="CONFLICT",
                    fields={
                        "observedSecretPresent": prewrite_secret is not None,
                        "observedKeyIds": sorted(key.id for key in prewrite_keys),
                    },
                )

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
            if material is not None:
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

        material: KeyMaterial | None = None
        replacement: DeployKey | None = None
        secret_write_attempted = False
        title = _timestamp_title(now)
        try:
            try:
                material = key_factory(DEPLOY_KEY_TITLE_PREFIX)
            except Exception as exc:
                return _error_result(kind, exc, "BLOCKED")

            try:
                replacement = client.create_write_deploy_key(title, material.public_key)
            except Exception as exc:
                return _ambiguous_create_result(
                    client,
                    kind=kind,
                    title=title,
                    error=exc,
                    extra={"oldKeyId": expected_key_id},
                )

            encrypted = sealer(env_key.key, material.private_key)

            try:
                prewrite_secret = client.get_environment_secret()
                prewrite_keys = _matching_keys(client)
            except Exception as exc:
                return _delete_presecret_replacement(
                    client,
                    kind=kind,
                    replacement_id=replacement.id,
                    reason_code="PREWRITE_METADATA_READ_FAILED",
                    status="BLOCKED",
                    fields={
                        "oldKeyId": expected_key_id,
                        "readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                    },
                )

            prewrite_ids = {key.id for key in prewrite_keys}
            if (
                prewrite_secret is None or
                prewrite_secret.updated_at != expected_secret_updated_at or
                len(prewrite_keys) != 2 or
                prewrite_ids != {expected_key_id, replacement.id} or
                any(key.read_only or not key.enabled for key in prewrite_keys)
            ):
                return _delete_presecret_replacement(
                    client,
                    kind=kind,
                    replacement_id=replacement.id,
                    reason_code="EXPECTED_METADATA_CHANGED_BEFORE_SECRET_WRITE",
                    status="CONFLICT",
                    fields={
                        "oldKeyId": expected_key_id,
                        "observedSecretUpdatedAt": None if prewrite_secret is None else prewrite_secret.updated_at,
                        "observedKeyIds": sorted(prewrite_ids),
                    },
                )

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
                    "secretUpdatedAt": expected_secret_updated_at,
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
                    "secretUpdatedAt": expected_secret_updated_at,
                }

            try:
                postwrite_secret = client.get_environment_secret()
                postwrite_keys = _matching_keys(client)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "ROTATION_POSTWRITE_READBACK_UNKNOWN",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                    "readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                }

            postwrite_ids = {key.id for key in postwrite_keys}
            replacement_rows = [
                key for key in postwrite_keys
                if key.id == replacement.id and not key.read_only and key.enabled
            ]
            if len(replacement_rows) != 1:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "REPLACEMENT_KEY_NOT_ENABLED",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                }

            if (
                postwrite_secret is None or
                postwrite_secret.updated_at != changed.updated_at or
                len(postwrite_keys) != 2 or
                postwrite_ids != {expected_key_id, replacement.id} or
                any(key.read_only or not key.enabled for key in postwrite_keys)
            ):
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "ROTATION_POSTWRITE_STATE_NOT_CONVERGED",
                    "oldKeyId": expected_key_id,
                    "newKeyId": replacement.id,
                    "secretUpdatedAt": changed.updated_at,
                    "observedSecretUpdatedAt": (
                        None if postwrite_secret is None else postwrite_secret.updated_at
                    ),
                    "observedKeyIds": sorted(postwrite_ids),
                }

            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "ROTATION_BEHAVIORAL_PROOF_REQUIRED",
                "oldKeyId": expected_key_id,
                "newKeyId": replacement.id,
                "secretUpdatedAt": changed.updated_at,
                "proofOwnerIssue": 3675,
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
            if material is not None:
                material.destroy()


def private_mirror_writer_revoke(
    client: AdminClient,
    expected_key_id: int,
    expected_secret_updated_at: str | None = None,
) -> dict:
    kind = "PRIVATE_MIRROR_WRITER_REVOKE"
    with _MUTATION_LOCK:
        status = private_mirror_writer_status(client)
        if status.get("status") != "PASS":
            return {**status, "kind": kind}

        keys = status.get("deployKeys", [])
        secret = status.get("secret", {})

        if status.get("configurationState") == "ABSENT":
            return {"schemaVersion": 1, "kind": kind, "status": "PASS", "effect": "ALREADY_REVOKED"}

        if (
            status.get("configurationState") == "CONFLICT" and
            status.get("deployKeyCount") == 1 and
            len(keys) == 1 and
            keys[0].get("id") == expected_key_id and
            not keys[0].get("readOnly") and
            keys[0].get("enabled") and
            not secret.get("present")
        ):
            try:
                cleanup_secret = client.get_environment_secret()
                cleanup_keys = _matching_keys(client)
            except Exception as exc:
                return _error_result(kind, exc, "BLOCKED")
            cleanup_ids = {key.id for key in cleanup_keys}
            if (
                cleanup_secret is not None or
                len(cleanup_keys) != 1 or
                cleanup_ids != {expected_key_id} or
                cleanup_keys[0].read_only or
                not cleanup_keys[0].enabled
            ):
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "CONFLICT",
                    "reasonCode": "REVOCATION_CLEANUP_STATE_CHANGED",
                    "observedSecretPresent": cleanup_secret is not None,
                    "observedKeyIds": sorted(cleanup_ids),
                }
            try:
                client.delete_deploy_key(expected_key_id)
            except Exception as exc:
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "DEPLOY_KEY_REVOCATION_PENDING",
                    "keyId": expected_key_id,
                    "deleteReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                }
            final = private_mirror_writer_status(client)
            if final.get("status") != "PASS" or final.get("configurationState") != "ABSENT":
                return {
                    "schemaVersion": 1,
                    "kind": kind,
                    "status": "PARTIAL",
                    "reasonCode": "REVOCATION_CLEANUP_READBACK_NOT_CONVERGED",
                    "keyId": expected_key_id,
                    "finalReasonCode": final.get("reasonCode"),
                }
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PASS",
                "effect": "REVOCATION_CLEANUP_COMPLETED",
                "keyId": expected_key_id,
            }

        if status.get("configurationState") != "CONFIGURED_METADATA_ONLY" or status.get("deployKeyCount") != 1:
            return {**status, "kind": kind, "status": "CONFLICT", "reasonCode": "REVOCATION_REQUIRES_ONE_CONFIGURED_KEY"}

        key = keys[0]
        if expected_secret_updated_at is None:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "CONFLICT",
                "reasonCode": "EXPECTED_SECRET_TIMESTAMP_REQUIRED",
                "observedKeyId": key["id"],
                "observedSecretUpdatedAt": secret.get("updatedAt"),
            }
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
            predelete_secret = client.get_environment_secret()
            predelete_keys = _matching_keys(client)
        except Exception as exc:
            return _error_result(kind, exc, "BLOCKED")
        predelete_ids = {key.id for key in predelete_keys}
        if (
            predelete_secret is None or
            predelete_secret.updated_at != expected_secret_updated_at or
            len(predelete_keys) != 1 or
            predelete_ids != {expected_key_id} or
            predelete_keys[0].read_only or
            not predelete_keys[0].enabled
        ):
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "CONFLICT",
                "reasonCode": "EXPECTED_METADATA_CHANGED_BEFORE_SECRET_DELETE",
                "observedSecretUpdatedAt": None if predelete_secret is None else predelete_secret.updated_at,
                "observedKeyIds": sorted(predelete_ids),
            }

        try:
            client.delete_environment_secret()
        except Exception as exc:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "SECRET_DELETE_OUTCOME_UNKNOWN",
                "keyId": expected_key_id,
                "expectedSecretUpdatedAt": expected_secret_updated_at,
                "deleteReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
                "httpStatus": getattr(exc, "http_status", None),
            }

        try:
            postdelete_secret = client.get_environment_secret()
            postdelete_keys = _matching_keys(client)
        except Exception as exc:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "REVOCATION_POSTDELETE_READBACK_UNKNOWN",
                "keyId": expected_key_id,
                "readbackReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
            }
        postdelete_ids = {key.id for key in postdelete_keys}
        if (
            postdelete_secret is not None or
            len(postdelete_keys) != 1 or
            postdelete_ids != {expected_key_id} or
            postdelete_keys[0].read_only or
            not postdelete_keys[0].enabled
        ):
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "REVOCATION_STATE_CHANGED_AFTER_SECRET_DELETE",
                "keyId": expected_key_id,
                "observedSecretPresent": postdelete_secret is not None,
                "observedKeyIds": sorted(postdelete_ids),
            }

        try:
            client.delete_deploy_key(expected_key_id)
        except Exception as exc:
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "DEPLOY_KEY_REVOCATION_PENDING",
                "keyId": expected_key_id,
                "deleteReasonCode": getattr(exc, "code", "UNEXPECTED_ERROR"),
            }
        final = private_mirror_writer_status(client)
        if final.get("status") != "PASS" or final.get("configurationState") != "ABSENT":
            return {
                "schemaVersion": 1,
                "kind": kind,
                "status": "PARTIAL",
                "reasonCode": "POSTREVOKE_READBACK_NOT_CONVERGED",
                "finalReasonCode": final.get("reasonCode"),
            }
        return {
            "schemaVersion": 1,
            "kind": kind,
            "status": "PASS",
            "effect": "REVOKED",
            "keyId": expected_key_id,
        }
