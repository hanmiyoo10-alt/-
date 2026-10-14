from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any


class ReceiptError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode((value + padding).encode("ascii"))
    except Exception:
        raise ReceiptError("INVALID_CLEANUP_RECEIPT_ENCODING") from None


@dataclass(frozen=True)
class RotationCleanupEvidence:
    old_key_id: int
    new_key_id: int
    previous_secret_updated_at: str
    post_secret_updated_at: str


class RotationCleanupReceiptSigner:
    PURPOSE = "rotation-old-key-cleanup"
    VERSION = 1

    def __init__(self, key: str | bytes) -> None:
        raw = key.encode("utf-8") if isinstance(key, str) else bytes(key)
        if len(raw) < 32:
            raise ReceiptError("CLEANUP_RECEIPT_SIGNING_KEY_TOO_SHORT")
        self._key = raw

    def issue(
        self,
        *,
        old_key_id: int,
        new_key_id: int,
        previous_secret_updated_at: str,
        post_secret_updated_at: str,
    ) -> str:
        if (
            old_key_id <= 0 or
            new_key_id <= 0 or
            old_key_id == new_key_id or
            not previous_secret_updated_at or
            not post_secret_updated_at
        ):
            raise ReceiptError("INVALID_ROTATION_CLEANUP_EVIDENCE")
        payload = {
            "v": self.VERSION,
            "purpose": self.PURPOSE,
            "oldKeyId": old_key_id,
            "newKeyId": new_key_id,
            "previousSecretUpdatedAt": previous_secret_updated_at,
            "postSecretUpdatedAt": post_secret_updated_at,
            "writeAcknowledged": True,
        }
        body = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(self._key, body, hashlib.sha256).digest()
        return f"{_b64url_encode(body)}.{_b64url_encode(signature)}"

    def verify(self, token: str) -> RotationCleanupEvidence:
        if not isinstance(token, str) or token.count(".") != 1:
            raise ReceiptError("INVALID_CLEANUP_RECEIPT")
        body_part, signature_part = token.split(".", 1)
        body = _b64url_decode(body_part)
        signature = _b64url_decode(signature_part)
        expected = hmac.new(self._key, body, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise ReceiptError("INVALID_CLEANUP_RECEIPT_SIGNATURE")
        try:
            payload: Any = json.loads(body.decode("utf-8"))
        except Exception:
            raise ReceiptError("INVALID_CLEANUP_RECEIPT_PAYLOAD") from None
        post = payload.get("postSecretUpdatedAt")
        if (
            not isinstance(payload, dict) or
            payload.get("v") != self.VERSION or
            payload.get("purpose") != self.PURPOSE or
            payload.get("writeAcknowledged") is not True or
            not isinstance(payload.get("oldKeyId"), int) or
            not isinstance(payload.get("newKeyId"), int) or
            not isinstance(payload.get("previousSecretUpdatedAt"), str) or
            not isinstance(post, str)
        ):
            raise ReceiptError("INVALID_CLEANUP_RECEIPT_PAYLOAD")
        evidence = RotationCleanupEvidence(
            old_key_id=payload["oldKeyId"],
            new_key_id=payload["newKeyId"],
            previous_secret_updated_at=payload["previousSecretUpdatedAt"],
            post_secret_updated_at=post,
        )
        if (
            evidence.old_key_id <= 0 or
            evidence.new_key_id <= 0 or
            evidence.old_key_id == evidence.new_key_id or
            not evidence.previous_secret_updated_at or
            not evidence.post_secret_updated_at
        ):
            raise ReceiptError("INVALID_CLEANUP_RECEIPT_PAYLOAD")
        return evidence
