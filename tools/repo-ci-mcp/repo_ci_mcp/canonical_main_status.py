from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

from .github_reader import GitHubReadError, GitHubReader

OPS_ISSUE = 485
CAPSULE_HEADING = "## Canonical Operator Capsule"
ACTIVE_HEADING = "## Active P0/P1 incidents"
ATTENTION_HEADING = "## Attention queue (P2)"
PROJECTS_HEADING = "## Projects / products"
FIELD_ORDER = ("STATE", "MAIN", "CHANGE", "WHY", "NEXT", "AUTHORITY", "UNKNOWN")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAIN_RE = re.compile(r"^`([0-9a-f]{40})` / Required (.+)$")
STATE_RE = re.compile(r"^`(CLEAR|ATTENTION|INCIDENT|UNKNOWN)`$")
INCIDENT_ROW_RE = re.compile(
    r"^- \*\*(P[012])\*\* ([A-Z][A-Z0-9_]*) — #([1-9][0-9]*) `([A-Z0-9_:-]{1,128})` — .+$"
)
MAX_FIELD_CHARS = 4096
MAX_TRIAGE_ROWS = 8
MAX_TRIAGE_LINE_CHARS = 1024
NONE_OBSERVED = "- none observed within current adapter coverage"


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


def _section(text: str, heading: str, next_heading: str) -> str | None:
    start = text.find(heading)
    if start < 0:
        return None
    body_start = start + len(heading)
    end = text.find(next_heading, body_start)
    if end < 0:
        return None
    return text[body_start:end]


def _unknown_triage(reason_code: str) -> dict[str, Any]:
    return {
        "known": False,
        "count": None,
        "truncated": False,
        "rows": [],
        "reasonCode": reason_code,
    }


def _parse_incident_section(
    text: str,
    heading: str,
    next_heading: str,
    allowed_severities: set[str],
) -> dict[str, Any]:
    section = _section(text, heading, next_heading)
    if section is None:
        return _unknown_triage("STATUS_TRIAGE_SECTION_MISSING")

    lines = [line.strip() for line in section.splitlines() if line.strip()]
    if lines == [NONE_OBSERVED]:
        return {"known": True, "count": 0, "truncated": False, "rows": []}
    if not lines:
        return _unknown_triage("STATUS_TRIAGE_SECTION_EMPTY")
    if any("UNKNOWN" in line or "unavailable" in line.lower() for line in lines):
        return _unknown_triage("STATUS_TRIAGE_SECTION_UNKNOWN")

    rows: list[dict[str, Any]] = []
    for line in lines:
        if len(line) > MAX_TRIAGE_LINE_CHARS:
            return _unknown_triage("STATUS_TRIAGE_ROW_OVERSIZE")
        match = INCIDENT_ROW_RE.fullmatch(line)
        if not match:
            return _unknown_triage("STATUS_TRIAGE_ROW_INVALID")
        severity, state, issue_number, reason_code = match.groups()
        if severity not in allowed_severities:
            return _unknown_triage("STATUS_TRIAGE_SEVERITY_INVALID")
        rows.append(
            {
                "severity": severity,
                "state": state,
                "issue": int(issue_number),
                "reasonCode": reason_code,
            }
        )

    total = len(rows)
    return {
        "known": True,
        "count": total,
        "truncated": total > MAX_TRIAGE_ROWS,
        "rows": rows[:MAX_TRIAGE_ROWS],
    }


def parse_triage(body: object) -> dict[str, Any]:
    text = body if isinstance(body, str) else ""
    active = _parse_incident_section(text, ACTIVE_HEADING, ATTENTION_HEADING, {"P0", "P1"})
    attention = _parse_incident_section(text, ATTENTION_HEADING, PROJECTS_HEADING, {"P2"})
    reasons = [
        str(section.get("reasonCode"))
        for section in (active, attention)
        if not section.get("known") and section.get("reasonCode")
    ]
    return {
        "known": bool(active.get("known") and attention.get("known")),
        "activeP0P1": active,
        "attentionP2": attention,
        "reasonCodes": sorted(set(reasons)),
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
        "triage": parse_triage(issue.get("body")),
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
