from repo_ci_mcp.canonical_main_status import build_canonical_main_status
from repo_ci_mcp.github_reader import GitHubReadError

SHA_A = "a" * 40
SHA_B = "b" * 40


def capsule(sha=SHA_A, state="CLEAR"):
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
"""


class Reader:
    def __init__(self, branches=None, issue=None, error=None):
        self.branches = list(branches or [SHA_A, SHA_A])
        self.issue = issue or {"state": "open", "body": capsule()}
        self.error = error

    def get_branch(self, name):
        assert name == "main"
        if self.error:
            raise self.error
        return {"commit": {"sha": self.branches.pop(0)}}

    def get_issue(self, number):
        assert number == 485
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
    assert result["reasonCodes"] == ["STATUS_EXACT_MAIN_MATCH"]


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
