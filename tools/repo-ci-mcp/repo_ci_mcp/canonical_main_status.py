from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

from .github_reader import GitHubReadError, GitHubReader

OPS_ISSUE = 485
CAPSULE_HEADING = "## Canonical Operator Capsule"
FIELD_ORDER = ("STATE", "MAIN", "CHANGE", "WHY", "NEXT", "AUTHORITY", "UNKNOWN")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAIN_RE = re.compile(r"^`([0-9a-f]{40})` / Required (.+)$")
STATE_RE = re.compile(r"^`(CLEAR|ATTENTION|INCIDENT|UNKNOWN)`$")
MAX_FIELD_CHARS = 4096


class CanonicalMainReader(GitHubReader):
    def get_branch(self, name: str) -> dict[str, Any]:
        return self._get_json(f"{self._repo_api_prefix}/branches/{quote(name, safe='')}")

    def get_issue(self, number: int) -> dict[str, Any]:
        return self._get_json(f"{self._repo_api_prefix}/issues/{number}")


def _result(disposition: str, reasons: list[str], **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "mode": "CANONICAL_MAIN_STATUS_COMPOSE",
        "disposition": disposition,
        "coherent": disposition == "CURRENT",
        "readOnly": True,
        "reasonCodes": sorted(set(reasons)),
        "sources": {
            "directMain": "refs/heads/main",
            "operatorProjection": f"issue:{OPS_ISSUE}",
        },
        **extra,
    }


def parse_capsule(body: object) -> dict[str, Any]:
    text = body if isinstance(body, str) else ""
    start = text.find(CAPSULE_HEADING)
    if start < 0:
        return {"ok": False, "reasonCode": "STATUS_CAPSULE_MISSING"}
    lines = text[start + len(CAPSULE_HEADING) :].splitlines()[1:]
    fields: dict[str, str] = {}
    for line in lines:
        if not line.strip():
            break
        match = re.fullmatch(r"- ([A-Z]+): (.+)", line)
        if not match:
            return {"ok": False, "reasonCode": "STATUS_CAPSULE_ROW_INVALID"}
        key, value = match.groups()
        if key not in FIELD_ORDER or key in fields:
            return {"ok": False, "reasonCode": "STATUS_CAPSULE_FIELDS_INVALID"}
        if len(value) > MAX_FIELD_CHARS:
            return {"ok": False, "reasonCode": "STATUS_CAPSULE_FIELD_OVERSIZE"}
        fields[key] = value
    if any(field not in fields for field in FIELD_ORDER):
        return {"ok": False, "reasonCode": "STATUS_CAPSULE_FIELDS_INCOMPLETE"}
    main_match = MAIN_RE.fullmatch(fields["MAIN"])
    if not main_match:
        return {"ok": False, "reasonCode": "STATUS_CAPSULE_MAIN_INVALID"}
    state_match = STATE_RE.fullmatch(fields["STATE"])
    if not state_match:
        return {"ok": False, "reasonCode": "STATUS_CAPSULE_STATE_INVALID"}
    return {
        "ok": True,
        "fields": fields,
        "mainSha": main_match.group(1),
        "requiredSummary": main_match.group(2),
        "operatorState": state_match.group(1),
    }


def build_canonical_main_status(reader: Any) -> dict[str, Any]:
    try:
        first = reader.get_branch("main")
        issue = reader.get_issue(OPS_ISSUE)
        second = reader.get_branch("main")
    except GitHubReadError as exc:
        return _result("UNKNOWN", ["STATUS_GITHUB_READ_FAILED"], error=str(exc)[:300])

    first_sha = first.get("commit", {}).get("sha") if isinstance(first, dict) else None
    second_sha = second.get("commit", {}).get("sha") if isinstance(second, dict) else None
    if not SHA_RE.fullmatch(str(first_sha or "")) or not SHA_RE.fullmatch(str(second_sha or "")):
        return _result("UNKNOWN", ["STATUS_MAIN_SHA_INVALID"])
    if first_sha != second_sha:
        return _result(
            "UNKNOWN",
            ["STATUS_MAIN_CHANGED_DURING_CAPTURE"],
            directMain={"firstSha": first_sha, "secondSha": second_sha},
        )
    if not isinstance(issue, dict) or issue.get("pull_request") or issue.get("state") != "open":
        return _result("UNKNOWN", ["STATUS_OPS_ISSUE_INVALID_STATE"], directMain={"sha": first_sha})

    capsule = parse_capsule(issue.get("body"))
    if not capsule.get("ok"):
        return _result(
            "UNKNOWN",
            [str(capsule.get("reasonCode") or "STATUS_CAPSULE_INVALID")],
            directMain={"sha": first_sha},
        )

    projection = {
        "issue": OPS_ISSUE,
        "mainSha": capsule["mainSha"],
        "operatorState": capsule["operatorState"],
        "requiredSummary": capsule["requiredSummary"],
        "fields": capsule["fields"],
    }
    if capsule["mainSha"] != first_sha:
        return _result(
            "SETTLING_OR_STALE",
            ["STATUS_MAIN_OPS_MISMATCH"],
            directMain={"sha": first_sha},
            operatorProjection=projection,
        )
    return _result(
        "CURRENT",
        ["STATUS_EXACT_MAIN_MATCH"],
        directMain={"sha": first_sha},
        operatorProjection=projection,
    )


def canonical_main_status(reader: Any | None = None) -> dict[str, Any]:
    return build_canonical_main_status(reader or CanonicalMainReader())
