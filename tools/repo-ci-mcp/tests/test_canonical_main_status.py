from repo_ci_mcp.canonical_main_status import build_canonical_main_status
from repo_ci_mcp.github_reader import GitHubReadError

SHA_A = "a" * 40
SHA_B = "b" * 40
NONE_OBSERVED = "- none observed within current adapter coverage"


def capsule(sha=SHA_A, state="CLEAR", active_rows=None, attention_rows=None, include_triage=True):
    active_rows = [NONE_OBSERVED] if active_rows is None else active_rows
    attention_rows = [NONE_OBSERVED] if attention_rows is None else attention_rows
    triage = ""
    if include_triage:
        triage = f"""
## Active P0/P1 incidents

{chr(10).join(active_rows)}

## Attention queue (P2)

{chr(10).join(attention_rows)}

## Projects / products

| Scope | State |
| --- | --- |
"""
    return f"""# Canonical Main — Operations View

## Canonical Operator Capsule
- STATE: `{state}`
- MAIN: `{sha}` / Required PASS — run 123
- CHANGE: `NONE`
- WHY: `NONE`
- NEXT: `NONE`
- AUTHORITY: Production MATCH
- UNKNOWN: `NONE`

<details>
more
{triage}"""


class Reader:
    def __init__(self, branches=None, issue=None, error=None):
        self.branches = list(branches or [SHA_A, SHA_A])
        self.issue = issue or {"state": "open", "body": capsule()}
        self.error = error
        self.branch_calls = 0
        self.issue_calls = 0

    def get_branch(self, name):
        assert name == "main"
        self.branch_calls += 1
        if self.error:
            raise self.error
        return {"commit": {"sha": self.branches.pop(0)}}

    def get_issue(self, number):
        assert number == 485
        self.issue_calls += 1
        if self.error:
            raise self.error
        return self.issue


def test_matching_capture_is_current():
    result = build_canonical_main_status(Reader())
    assert result["disposition"] == "CURRENT"
    assert result["coherent"] is True
    assert result["directMain"]["sha"] == SHA_A
    assert result["operatorProjection"]["mainSha"] == SHA_A
    assert result["operatorProjection"]["operatorState"] == "CLEAR"
    assert result["operatorProjection"]["triage"] == {
        "known": True,
        "activeP0P1": {"known": True, "count": 0, "truncated": False, "rows": []},
        "attentionP2": {"known": True, "count": 0, "truncated": False, "rows": []},
        "reasonCodes": [],
    }
    assert result["reasonCodes"] == ["STATUS_EXACT_MAIN_MATCH"]


def test_incident_and_attention_rows_are_projected_without_detail_fetch():
    body = capsule(
        state="INCIDENT",
        active_rows=[
            "- **P1** OPEN — #502 `REQUIRED_CHECK_FAILED` — [repo-incident:P1] REQUIRED_CHECK_FAILED — scope:repo"
        ],
        attention_rows=[
            "- **P2** OPEN — #900 `DOC_DRIFT` — [repo-incident:P2] DOC_DRIFT — scope:repo"
        ],
    )
    reader = Reader(issue={"state": "open", "body": body})
    result = build_canonical_main_status(reader)
    triage = result["operatorProjection"]["triage"]

    assert result["disposition"] == "CURRENT"
    assert result["operatorProjection"]["operatorState"] == "INCIDENT"
    assert triage["known"] is True
    assert triage["activeP0P1"]["rows"] == [
        {"severity": "P1", "state": "OPEN", "issue": 502, "reasonCode": "REQUIRED_CHECK_FAILED"}
    ]
    assert triage["attentionP2"]["rows"] == [
        {"severity": "P2", "state": "OPEN", "issue": 900, "reasonCode": "DOC_DRIFT"}
    ]
    assert reader.branch_calls == 2
    assert reader.issue_calls == 1


def test_missing_triage_sections_are_unknown_not_empty():
    result = build_canonical_main_status(
        Reader(issue={"state": "open", "body": capsule(state="ATTENTION", include_triage=False)})
    )
    triage = result["operatorProjection"]["triage"]
    assert result["disposition"] == "CURRENT"
    assert triage["known"] is False
    assert triage["activeP0P1"]["count"] is None
    assert triage["attentionP2"]["count"] is None
    assert triage["reasonCodes"] == ["STATUS_TRIAGE_SECTION_MISSING"]


def test_unknown_triage_section_is_not_false_empty():
    result = build_canonical_main_status(
        Reader(issue={"state": "open", "body": capsule(active_rows=["- UNKNOWN"])})
    )
    triage = result["operatorProjection"]["triage"]
    assert triage["known"] is False
    assert triage["activeP0P1"]["known"] is False
    assert triage["activeP0P1"]["reasonCode"] == "STATUS_TRIAGE_SECTION_UNKNOWN"
    assert triage["activeP0P1"]["rows"] == []


def test_malformed_triage_row_is_explicit_unknown():
    result = build_canonical_main_status(
        Reader(issue={"state": "open", "body": capsule(active_rows=["- **P1** OPEN — malformed"])})
    )
    triage = result["operatorProjection"]["triage"]
    assert triage["known"] is False
    assert triage["activeP0P1"]["reasonCode"] == "STATUS_TRIAGE_ROW_INVALID"


def test_triage_rows_are_bounded_with_total_count_preserved():
    rows = [
        f"- **P1** OPEN — #{1000 + index} `REASON_{index}` — [repo-incident:P1] REASON_{index} — scope:repo"
        for index in range(10)
    ]
    result = build_canonical_main_status(
        Reader(issue={"state": "open", "body": capsule(state="INCIDENT", active_rows=rows)})
    )
    active = result["operatorProjection"]["triage"]["activeP0P1"]
    assert active["known"] is True
    assert active["count"] == 10
    assert active["truncated"] is True
    assert len(active["rows"]) == 8
    assert active["rows"][0]["issue"] == 1000
    assert active["rows"][-1]["issue"] == 1007


def test_capsule_mismatch_is_settling_not_green():
    result = build_canonical_main_status(Reader(issue={"state": "open", "body": capsule(SHA_B)}))
    assert result["disposition"] == "SETTLING_OR_STALE"
    assert result["coherent"] is False
    assert "STATUS_MAIN_OPS_MISMATCH" in result["reasonCodes"]


def test_main_movement_during_capture_fails_closed():
    result = build_canonical_main_status(Reader(branches=[SHA_A, SHA_B]))
    assert result["disposition"] == "UNKNOWN"
    assert result["coherent"] is False
    assert result["directMain"] == {"firstSha": SHA_A, "secondSha": SHA_B}
    assert "STATUS_MAIN_CHANGED_DURING_CAPTURE" in result["reasonCodes"]


def test_missing_capsule_is_unknown():
    result = build_canonical_main_status(Reader(issue={"state": "open", "body": "no capsule"}))
    assert result["disposition"] == "UNKNOWN"
    assert "STATUS_CAPSULE_MISSING" in result["reasonCodes"]


def test_invalid_operator_state_is_unknown():
    result = build_canonical_main_status(Reader(issue={"state": "open", "body": capsule(state="GREEN")}))
    assert result["disposition"] == "UNKNOWN"
    assert "STATUS_CAPSULE_STATE_INVALID" in result["reasonCodes"]


def test_closed_ops_issue_is_unknown():
    result = build_canonical_main_status(Reader(issue={"state": "closed", "body": capsule()}))
    assert result["disposition"] == "UNKNOWN"
    assert "STATUS_OPS_ISSUE_INVALID_STATE" in result["reasonCodes"]


def test_github_read_failure_is_bounded_unknown():
    result = build_canonical_main_status(Reader(error=GitHubReadError("network unavailable")))
    assert result["disposition"] == "UNKNOWN"
    assert result["error"] == "network unavailable"
    assert "STATUS_GITHUB_READ_FAILED" in result["reasonCodes"]


def test_sources_remain_explicit_and_read_only():
    result = build_canonical_main_status(Reader())
    assert result["readOnly"] is True
    assert result["sources"] == {
        "directMain": "refs/heads/main",
        "operatorProjection": "issue:485",
    }


def test_status_capture_read_count_remains_two_main_one_ops_issue():
    reader = Reader()
    build_canonical_main_status(reader)
    assert reader.branch_calls == 2
    assert reader.issue_calls == 1
