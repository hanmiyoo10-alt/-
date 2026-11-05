from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 512
SHA256_DIGEST_RE = re.compile(r"^sha256:[0-9a-fA-F]{64}$")


def _subject_digest(value: object) -> str | None:
    if not isinstance(value, str) or not SHA256_DIGEST_RE.fullmatch(value):
        return None
    return "sha256:" + value[7:].lower()


def _text(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or (required and not value) or len(value) > MAX_TEXT:
        raise ValueError("invalid bounded text")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _positive_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError("invalid positive integer")
    return value


def _safe_limit(limit: object) -> int | None:
    return limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None


def _project_attestation(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "repository_id": _positive_int(item.get("repository_id")),
        "initiator": _text(item.get("initiator"), required=True),
    }


def _reason_for_error(exc: GitHubReadError) -> str:
    if exc.status_code == 403:
        return "HTTP_403"
    if exc.status_code == 404:
        return "RESOURCE_NOT_FOUND"
    if exc.status_code is not None and 500 <= exc.status_code <= 599:
        return "GITHUB_SERVER_ERROR"
    if exc.status_code is not None:
        return "GITHUB_HTTP_ERROR"
    return "GITHUB_READ_ERROR"


def _result(
    *,
    subject_digest: str | None,
    items: list[dict[str, Any]],
    limit: int | None,
    ok: bool,
    reason_code: str | None,
    http_status: int | None,
) -> dict[str, Any]:
    return {
        "schema": "repo-attestations.v1",
        "ok": ok,
        "status": "OK" if ok else "UNKNOWN",
        "scope": "first_page",
        "ordering": "server_default",
        "subject_digest": subject_digest,
        "limit": limit,
        "count": len(items) if ok else None,
        "total_count": None,
        "attestations": items,
        "http_status": http_status,
        "reason_code": reason_code,
        "ci_authority": False,
        "required_authority": False,
        "release_authority": False,
        "production_authority": False,
        "deployment_authority": False,
        "artifact_integrity_authority": False,
        "provenance_verification_authority": False,
        "signer_trust_authority": False,
        "security_acceptance_authority": False,
    }


def repo_attestations(reader: GitHubReader, subject_digest: str, limit: int = 20) -> dict[str, Any]:
    safe_digest = _subject_digest(subject_digest)
    safe_limit = _safe_limit(limit)
    if safe_digest is None:
        return _result(
            subject_digest=None,
            items=[],
            limit=safe_limit,
            ok=False,
            reason_code="INVALID_SUBJECT_DIGEST",
            http_status=None,
        )
    if safe_limit is None:
        return _result(
            subject_digest=safe_digest,
            items=[],
            limit=None,
            ok=False,
            reason_code="INVALID_LIMIT",
            http_status=None,
        )
    try:
        items = [
            _project_attestation(item)
            for item in reader.list_repository_attestations(safe_digest, limit=safe_limit)
        ]
        return _result(
            subject_digest=safe_digest,
            items=items,
            limit=safe_limit,
            ok=True,
            reason_code=None,
            http_status=200,
        )
    except GitHubReadError as exc:
        return _result(
            subject_digest=safe_digest,
            items=[],
            limit=safe_limit,
            ok=False,
            reason_code=_reason_for_error(exc),
            http_status=exc.status_code,
        )
    except ValueError:
        return _result(
            subject_digest=safe_digest,
            items=[],
            limit=safe_limit,
            ok=False,
            reason_code="MALFORMED_EVIDENCE",
            http_status=None,
        )
