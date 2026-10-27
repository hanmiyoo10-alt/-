from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
from typing import Any, Callable

from .config import (
    CANONICAL_REPOSITORY,
    GH_TIMEOUT_SECONDS,
    LANDING_REPOSITORY,
    LEDGER_ISSUE,
    MAX_COMMENTS,
    MAX_PACKET_NUMBER,
    OWNER_TIMEOUT_SECONDS,
    SHA256_RE_TEXT,
)

_MANIFEST_START = "<!-- mcl-task-manifest:v1 -->"
_MANIFEST_END = "<!-- /mcl-task-manifest:v1 -->"
_SHA256_RE = re.compile(SHA256_RE_TEXT)
_FALSE_AUTHORITY = {
    "repositoryMutationAuthorized": False,
    "deviceMutationAuthorized": False,
    "mergeAuthorized": False,
    "releaseAuthorized": False,
    "productionAuthorized": False,
}

_PACKET_STATES = frozenset({
    "READY", "CLAIMED", "IN_PROGRESS", "REVIEW",
    "DONE", "BLOCKED", "CANCELLED", "SUPERSEDED",
})
_TERMINAL_PACKET_STATES = frozenset({"DONE", "CANCELLED", "SUPERSEDED"})


def _result(
    status: str,
    *,
    packet_number: int | None = None,
    manifest_id: str | None = None,
    workspace_state: str = "UNKNOWN",
    reason_codes: list[str] | tuple[str, ...] = (),
    base_sha: str | None = None,
    head_sha: str | None = None,
) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "kind": "MCL_L_PREPARE_WORKSPACE",
        "status": status,
        "packetNumber": packet_number,
        "manifestId": manifest_id,
        "workspaceState": workspace_state,
        "baseSha": base_sha,
        "headSha": head_sha,
        "reasonCodes": sorted(set(reason_codes)),
        "authority": dict(_FALSE_AUTHORITY),
    }


class AdmissionError(RuntimeError):
    def __init__(self, status: str, *reason_codes: str) -> None:
        super().__init__(reason_codes[0] if reason_codes else status)
        self.status = status
        self.reason_codes = list(reason_codes) or ["ADMISSION_FAILED"]


class GhReader:
    def __init__(
        self,
        *,
        repo: str = CANONICAL_REPOSITORY,
        runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
    ) -> None:
        self.repo = repo
        self._runner = runner or subprocess.run

    def _api(self, endpoint: str) -> Any:
        try:
            cp = self._runner(
                ["/usr/bin/gh", "api", endpoint],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=GH_TIMEOUT_SECONDS,
                check=False,
                env={
                    key: value
                    for key, value in os.environ.items()
                    if key in {"HOME", "PATH", "GH_CONFIG_DIR", "GH_TOKEN"}
                },
            )
        except Exception as exc:
            raise AdmissionError("UNKNOWN", "GITHUB_READ_FAILED") from exc
        if cp.returncode != 0:
            raise AdmissionError("UNKNOWN", "GITHUB_READ_FAILED")
        try:
            return json.loads(cp.stdout)
        except json.JSONDecodeError as exc:
            raise AdmissionError("UNKNOWN", "GITHUB_JSON_INVALID") from exc

    def main_sha(self) -> str:
        value = self._api(f"repos/{self.repo}/branches/main")
        sha = value.get("commit", {}).get("sha") if isinstance(value, dict) else None
        if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha):
            raise AdmissionError("UNKNOWN", "MAIN_SHA_INVALID")
        return sha

    def issue(self, number: int) -> dict[str, Any]:
        value = self._api(f"repos/{self.repo}/issues/{number}")
        if not isinstance(value, dict):
            raise AdmissionError("UNKNOWN", "ISSUE_READ_INVALID")
        return value

    def comments(self, number: int) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for page in range(1, 11):
            value = self._api(
                f"repos/{self.repo}/issues/{number}/comments?per_page=100&page={page}"
            )
            if not isinstance(value, list):
                raise AdmissionError("UNKNOWN", "COMMENTS_READ_INVALID")
            rows.extend(item for item in value if isinstance(item, dict))
            if len(rows) > MAX_COMMENTS:
                raise AdmissionError("UNKNOWN", "COMMENTS_BOUND_EXCEEDED")
            if len(value) < 100:
                return rows
        raise AdmissionError("UNKNOWN", "COMMENTS_PAGINATION_BOUND")


def _packet_state(body: str) -> str:
    patterns = [
        r"\*\*State:\s*([A-Z_]+)\*\*",
        r"## State\s*\n`([A-Z_]+)`",
    ]
    found: list[str] = []
    for pattern in patterns:
        found.extend(re.findall(pattern, body))
    unique = sorted(set(found))
    if len(unique) > 1:
        raise AdmissionError("CONFLICT", "PACKET_STATE_CONFLICT")
    if len(unique) != 1 or unique[0] not in _PACKET_STATES:
        raise AdmissionError("UNKNOWN", "PACKET_LIFECYCLE_UNKNOWN")
    return unique[0]


def _require_packet(packet: dict[str, Any], packet_number: int) -> str:
    if packet.get("number") not in {None, packet_number}:
        raise AdmissionError("CONFLICT", "PACKET_NUMBER_CONFLICT")
    if packet.get("pull_request") is not None:
        raise AdmissionError("BLOCKED", "PACKET_IS_PULL_REQUEST")
    if packet.get("state") != "open":
        raise AdmissionError("BLOCKED", "PACKET_NOT_OPEN")
    body = packet.get("body")
    if not isinstance(body, str):
        raise AdmissionError("UNKNOWN", "PACKET_BODY_INVALID")
    if "- Current stage: `IMPLEMENTATION_PR`" not in body:
        raise AdmissionError("BLOCKED", "PACKET_STAGE_NOT_IMPLEMENTATION_PR")
    state = _packet_state(body)
    if state in _TERMINAL_PACKET_STATES:
        raise AdmissionError("BLOCKED", "PACKET_LIFECYCLE_TERMINAL")
    return body


def _parse_manifest_candidate(body: str) -> dict[str, Any]:
    if body.count(_MANIFEST_START) != 1 or body.count(_MANIFEST_END) != 1:
        raise AdmissionError("UNKNOWN", "MANIFEST_ENVELOPE_INVALID")
    trimmed = body.strip()
    prefix = _MANIFEST_START + "\n```json\n"
    suffix = "\n```\n" + _MANIFEST_END
    if not trimmed.startswith(prefix) or not trimmed.endswith(suffix):
        raise AdmissionError("UNKNOWN", "MANIFEST_ENVELOPE_INVALID")
    try:
        value = json.loads(trimmed[len(prefix) : -len(suffix)])
    except json.JSONDecodeError as exc:
        raise AdmissionError("UNKNOWN", "MANIFEST_JSON_INVALID") from exc
    if not isinstance(value, dict):
        raise AdmissionError("UNKNOWN", "MANIFEST_JSON_INVALID")
    return value


def _select_manifest(comments: list[dict[str, Any]], manifest_id: str) -> str:
    matches: list[str] = []
    for row in comments:
        body = row.get("body")
        if not isinstance(body, str) or manifest_id not in body:
            continue
        if not body.strip().startswith(_MANIFEST_START + "\n"):
            continue
        value = _parse_manifest_candidate(body)
        if value.get("manifestId") == manifest_id:
            matches.append(body.strip())
    if not matches:
        raise AdmissionError("BLOCKED", "MANIFEST_NOT_FOUND")
    if len(matches) != 1:
        raise AdmissionError("CONFLICT", "MANIFEST_ID_AMBIGUOUS")
    return matches[0]


class NodeOwnerRunner:
    def __init__(
        self,
        *,
        repo_root: Path = LANDING_REPOSITORY,
        runner: Callable[..., subprocess.CompletedProcess[str]] | None = None,
    ) -> None:
        self.repo_root = repo_root
        self._runner = runner or subprocess.run

    @property
    def bridge(self) -> Path:
        return Path(__file__).with_name("owner_bridge.cjs")

    def prepare(
        self,
        *,
        packet_number: int,
        manifest_id: str,
        main_sha: str,
        packet_body: str,
        ledger_body: str,
        manifest_text: str,
    ) -> dict[str, Any]:
        payload = {
            "packetNumber": packet_number,
            "manifestId": manifest_id,
            "mainSha": main_sha,
            "packetBody": packet_body,
            "ledgerBody": ledger_body,
            "manifestText": manifest_text,
        }
        try:
            cp = self._runner(
                ["/usr/bin/node", str(self.bridge)],
                input=json.dumps(payload, separators=(",", ":")),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=OWNER_TIMEOUT_SECONDS,
                check=False,
                cwd=str(self.repo_root),
                env={
                    key: value
                    for key, value in os.environ.items()
                    if key in {"HOME", "PATH", "GH_CONFIG_DIR", "GH_TOKEN", "LANG", "LC_ALL"}
                },
            )
        except Exception:
            return _result(
                "UNKNOWN",
                packet_number=packet_number,
                manifest_id=manifest_id,
                reason_codes=["OWNER_BRIDGE_EXECUTION_FAILED"],
            )
        try:
            value = json.loads(cp.stdout)
        except json.JSONDecodeError:
            return _result(
                "UNKNOWN",
                packet_number=packet_number,
                manifest_id=manifest_id,
                reason_codes=["OWNER_BRIDGE_RESULT_INVALID"],
            )
        if not isinstance(value, dict):
            return _result(
                "UNKNOWN",
                packet_number=packet_number,
                manifest_id=manifest_id,
                reason_codes=["OWNER_BRIDGE_RESULT_INVALID"],
            )
        allowed = {
            "schemaVersion",
            "kind",
            "status",
            "packetNumber",
            "manifestId",
            "workspaceState",
            "baseSha",
            "headSha",
            "reasonCodes",
            "authority",
        }
        if set(value) != allowed:
            return _result(
                "UNKNOWN",
                packet_number=packet_number,
                manifest_id=manifest_id,
                reason_codes=["OWNER_BRIDGE_RESULT_SCHEMA_INVALID"],
            )
        return value


class WorkspacePrepareService:
    def __init__(
        self,
        *,
        github: GhReader | None = None,
        owner: NodeOwnerRunner | None = None,
    ) -> None:
        self.github = github or GhReader()
        self.owner = owner or NodeOwnerRunner()

    def prepare_workspace(self, packet_number: int, manifest_id: str) -> dict[str, Any]:
        try:
            if (
                not isinstance(packet_number, int)
                or isinstance(packet_number, bool)
                or packet_number <= 0
                or packet_number > MAX_PACKET_NUMBER
            ):
                raise AdmissionError("BLOCKED", "PACKET_NUMBER_INVALID")
            if not isinstance(manifest_id, str) or not _SHA256_RE.fullmatch(manifest_id):
                raise AdmissionError("BLOCKED", "MANIFEST_ID_INVALID")

            main_sha = self.github.main_sha()
            packet = self.github.issue(packet_number)
            packet_body = _require_packet(packet, packet_number)
            ledger = self.github.issue(LEDGER_ISSUE)
            ledger_body = ledger.get("body")
            if not isinstance(ledger_body, str):
                raise AdmissionError("UNKNOWN", "LEDGER_BODY_INVALID")
            manifest_text = _select_manifest(
                self.github.comments(packet_number), manifest_id
            )
            return self.owner.prepare(
                packet_number=packet_number,
                manifest_id=manifest_id,
                main_sha=main_sha,
                packet_body=packet_body,
                ledger_body=ledger_body,
                manifest_text=manifest_text,
            )
        except AdmissionError as exc:
            return _result(
                exc.status,
                packet_number=packet_number if isinstance(packet_number, int) else None,
                manifest_id=manifest_id if isinstance(manifest_id, str) else None,
                reason_codes=exc.reason_codes,
            )
