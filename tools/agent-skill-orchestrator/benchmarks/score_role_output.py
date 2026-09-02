from __future__ import annotations

import re
import unicodedata
from copy import deepcopy
from typing import Any, Iterable

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract

CASE_SCHEMA = "role-benchmark-case-v1.schema.json"
RESULT_SCHEMA = "role-benchmark-result-v1.schema.json"
SCORE_SCHEMA = "role-benchmark-score-v1.schema.json"

SCORING_POLICY_ID = "o4a-retrospective-role-benchmark-v1"
SCORING_POLICY = {
    "schema_version": 1,
    "policy_id": SCORING_POLICY_ID,
    "normalization": ["unicode_nfc", "trim"],
    "matching": "fixture_owned_exact_aliases_only",
    "ratio_scale": "basis_points_floor",
    "composite_score": False,
    "retrospective_only": True,
    "semantic_scoring_requires_completed_valid_contract": True,
}
SCORING_POLICY_SHA256 = canonical_sha256(SCORING_POLICY)

ROLES = ("scout", "mapper", "critic", "synthesizer")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
SOURCE_REF_RE = re.compile(r"^S[1-9][0-9]*@L[1-9][0-9]*$")
EXECUTION_STATES = frozenset({"COMPLETED", "INVALID", "EXECUTION_INCOMPLETE", "FAILED"})

ROLE_EXPECTED_KINDS = {
    "scout": frozenset({"source_ref", "authority"}),
    "mapper": frozenset({"owner", "edge"}),
    "critic": frozenset({"boundary", "blocker"}),
    "synthesizer": frozenset({"record"}),
}
ROLE_PREDICTED_KINDS = {
    "scout": frozenset({"source_ref", "authority"}),
    "mapper": frozenset({"owner", "edge"}),
    "critic": frozenset({"boundary", "blocker"}),
    "synthesizer": frozenset({"record", "new_claim"}),
}

RATIO_KEYS = frozenset({"numerator", "denominator", "basis_points"})

SCOUT_METRIC_KEYS = frozenset({
    "source_selection_precision",
    "source_selection_recall",
    "authority_precision",
    "authority_recall",
    "invalid_ref_count",
    "authority_overclaim_count",
})
MAPPER_METRIC_KEYS = frozenset({
    "owner_precision",
    "owner_recall",
    "edge_precision",
    "edge_recall",
    "false_edge_count",
    "grounding_precision",
    "invalid_ref_count",
})
CRITIC_METRIC_KEYS = frozenset({
    "boundary_precision",
    "boundary_recall",
    "blocker_precision",
    "blocker_recall",
    "required_uncertainty_preservation_recall",
    "false_blocker_count",
    "optimism_violation_count",
    "invalid_ref_count",
})
SYNTH_METRIC_KEYS = frozenset({
    "required_record_preservation_recall",
    "required_blocker_conflict_preservation_recall",
    "optional_useful_selection_recall",
    "excess_optional_selection_count",
    "forbidden_new_claim_count",
    "compact_completion_status",
    "invalid_ref_count",
})
ROLE_METRIC_KEYS = {
    "scout": SCOUT_METRIC_KEYS,
    "mapper": MAPPER_METRIC_KEYS,
    "critic": CRITIC_METRIC_KEYS,
    "synthesizer": SYNTH_METRIC_KEYS,
}

RATIO_METRIC_KEYS = frozenset({
    "source_selection_precision",
    "source_selection_recall",
    "authority_precision",
    "authority_recall",
    "owner_precision",
    "owner_recall",
    "edge_precision",
    "edge_recall",
    "grounding_precision",
    "boundary_precision",
    "boundary_recall",
    "blocker_precision",
    "blocker_recall",
    "required_uncertainty_preservation_recall",
    "required_record_preservation_recall",
    "required_blocker_conflict_preservation_recall",
    "optional_useful_selection_recall",
})
COUNT_METRIC_KEYS = frozenset({
    "invalid_ref_count",
    "authority_overclaim_count",
    "false_edge_count",
    "false_blocker_count",
    "optimism_violation_count",
    "excess_optional_selection_count",
    "forbidden_new_claim_count",
})
BOOL_METRIC_KEYS = frozenset({"compact_completion_status"})


class RoleBenchmarkError(ValueError):
    pass


def _fail(message: str) -> None:
    raise RoleBenchmarkError(message)


def _schema_validate(value: dict[str, Any], schema: str, label: str) -> None:
    try:
        validate_contract(value, schema)
    except ContractValidationError as exc:
        raise RoleBenchmarkError(f"{label} schema invalid: {exc}") from exc


def _exact_keys(value: Any, expected: Iterable[str], label: str) -> dict[str, Any]:
    expected_set = frozenset(expected)
    if not isinstance(value, dict) or set(value) != expected_set:
        _fail(f"{label} fields invalid")
    return value


def _nonempty_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value:
        _fail(f"{label} must be a non-empty string")
    return value


def _digest(value: Any, label: str) -> str:
    if not isinstance(value, str) or HEX64_RE.fullmatch(value) is None:
        _fail(f"{label} must be a lowercase sha256 digest")
    return value


def _digest_or_none(value: Any, label: str) -> str:
    if value == "NONE":
        return "NONE"
    return _digest(value, label)


def _commit(value: Any, label: str) -> str:
    if not isinstance(value, str) or COMMIT_RE.fullmatch(value) is None:
        _fail(f"{label} must be a 40-character lowercase git sha")
    return value


def _nonnegative_int(value: Any, label: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        _fail(f"{label} must be a non-negative integer")
    return value


def _nullable_nonnegative_int(value: Any, label: str) -> int | None:
    if value is None:
        return None
    return _nonnegative_int(value, label)


def normalize_fixture_text(value: Any, *, label: str = "text") -> str:
    if not isinstance(value, str):
        _fail(f"{label} must be a string")
    return unicodedata.normalize("NFC", value).strip()


def ratio(numerator: int, denominator: int) -> dict[str, int | None]:
    n = _nonnegative_int(numerator, "ratio.numerator")
    d = _nonnegative_int(denominator, "ratio.denominator")
    if n > d:
        _fail("ratio numerator cannot exceed denominator")
    return {
        "numerator": n,
        "denominator": d,
        "basis_points": None if d == 0 else (10_000 * n) // d,
    }


def validate_ratio(value: Any, label: str) -> dict[str, int | None]:
    item = _exact_keys(value, RATIO_KEYS, label)
    expected = ratio(item["numerator"], item["denominator"])
    if item != expected:
        _fail(f"{label} basis_points does not match deterministic recomputation")
    return deepcopy(expected)


def _normalized_aliases(value: Any, label: str) -> list[str]:
    if not isinstance(value, list):
        _fail(f"{label} must be an array")
    normalized = [normalize_fixture_text(item, label=f"{label}[{i}]") for i, item in enumerate(value)]
    if any(not item for item in normalized):
        _fail(f"{label} cannot contain empty aliases")
    if len(normalized) != len(set(normalized)):
        _fail(f"{label} contains duplicate aliases after normalization")
    return normalized


def _normalized_refs(value: Any, *, label: str, allow_empty: bool = True) -> list[str]:
    if not isinstance(value, list) or (not allow_empty and not value):
        _fail(f"{label} must be an {'non-empty ' if not allow_empty else ''}array")
    refs: list[str] = []
    for index, ref in enumerate(value):
        if not isinstance(ref, str) or SOURCE_REF_RE.fullmatch(ref) is None:
            _fail(f"{label}[{index}] must be a compact source ref")
        refs.append(ref)
    if len(refs) != len(set(refs)):
        _fail(f"{label} contains duplicate refs")
    return refs


def fixture_sha256(case: dict[str, Any]) -> str:
    base = deepcopy(case)
    base.pop("fixture_sha256", None)
    return canonical_sha256(base)


def result_sha256(result: dict[str, Any]) -> str:
    base = deepcopy(result)
    base.pop("result_sha256", None)
    return canonical_sha256(base)


def score_sha256(score: dict[str, Any]) -> str:
    base = deepcopy(score)
    base.pop("score_sha256", None)
    return canonical_sha256(base)


def _validate_model(model: Any) -> dict[str, Any]:
    item = _exact_keys(
        model,
        {"profile_id", "family", "repository", "revision", "file", "sha256"},
        "result.model",
    )
    for key in ("profile_id", "family", "repository", "revision", "file"):
        _nonempty_text(item[key], f"result.model.{key}")
    _digest(item["sha256"], "result.model.sha256")
    return deepcopy(item)


def _validate_runtime(runtime: Any) -> dict[str, Any]:
    item = _exact_keys(runtime, {"id", "version", "binary_sha256"}, "result.runtime")
    _nonempty_text(item["id"], "result.runtime.id")
    _nonempty_text(item["version"], "result.runtime.version")
    _digest(item["binary_sha256"], "result.runtime.binary_sha256")
    return deepcopy(item)


def _validate_telemetry(telemetry: Any) -> dict[str, int | None]:
    item = _exact_keys(
        telemetry,
        {
            "wall_clock_ms",
            "server_cpu_ms",
            "server_peak_rss_bytes",
            "prompt_tokens",
            "completion_tokens",
        },
        "result.telemetry",
    )
    return {
        key: _nullable_nonnegative_int(value, f"result.telemetry.{key}")
        for key, value in item.items()
    }


def _validate_expected_label(raw: Any, *, role: str, index: int) -> dict[str, Any]:
    if not isinstance(raw, dict):
        _fail(f"case.expected_labels[{index}] must be an object")
    kind = raw.get("kind")
    if kind not in ROLE_EXPECTED_KINDS[role]:
        _fail(f"case.expected_labels[{index}] kind {kind!r} invalid for role {role}")
    label_id = _nonempty_text(raw.get("label_id"), f"case.expected_labels[{index}].label_id")

    if kind == "source_ref":
        item = _exact_keys(raw, {"label_id", "kind", "ref"}, f"case.expected_labels[{index}]")
        refs = _normalized_refs([item["ref"]], label=f"case.expected_labels[{index}].ref", allow_empty=False)
        return {"label_id": label_id, "kind": kind, "ref": refs[0]}

    if kind == "authority":
        item = _exact_keys(
            raw,
            {"label_id", "kind", "authority_class", "refs"},
            f"case.expected_labels[{index}]",
        )
        return {
            "label_id": label_id,
            "kind": kind,
            "authority_class": normalize_fixture_text(item["authority_class"], label=f"case.expected_labels[{index}].authority_class"),
            "refs": _normalized_refs(item["refs"], label=f"case.expected_labels[{index}].refs", allow_empty=False),
        }

    if kind == "owner":
        item = _exact_keys(raw, {"label_id", "kind", "value", "aliases"}, f"case.expected_labels[{index}]")
        value = normalize_fixture_text(item["value"], label=f"case.expected_labels[{index}].value")
        aliases = _normalized_aliases(item["aliases"], f"case.expected_labels[{index}].aliases")
        if not value or value in aliases:
            _fail(f"case.expected_labels[{index}] owner canonical/aliases invalid")
        return {"label_id": label_id, "kind": kind, "value": value, "aliases": aliases}

    if kind == "edge":
        item = _exact_keys(
            raw,
            {"label_id", "kind", "from", "to", "from_aliases", "to_aliases"},
            f"case.expected_labels[{index}]",
        )
        source = normalize_fixture_text(item["from"], label=f"case.expected_labels[{index}].from")
        target = normalize_fixture_text(item["to"], label=f"case.expected_labels[{index}].to")
        from_aliases = _normalized_aliases(item["from_aliases"], f"case.expected_labels[{index}].from_aliases")
        to_aliases = _normalized_aliases(item["to_aliases"], f"case.expected_labels[{index}].to_aliases")
        if not source or not target or source == target or source in from_aliases or target in to_aliases:
            _fail(f"case.expected_labels[{index}] edge canonical/aliases invalid")
        return {
            "label_id": label_id,
            "kind": kind,
            "from": source,
            "to": target,
            "from_aliases": from_aliases,
            "to_aliases": to_aliases,
        }

    if kind == "boundary":
        item = _exact_keys(
            raw,
            {"label_id", "kind", "boundary_kind", "subject", "aliases"},
            f"case.expected_labels[{index}]",
        )
        subject = normalize_fixture_text(item["subject"], label=f"case.expected_labels[{index}].subject")
        aliases = _normalized_aliases(item["aliases"], f"case.expected_labels[{index}].aliases")
        if not subject or subject in aliases:
            _fail(f"case.expected_labels[{index}] boundary canonical/aliases invalid")
        return {
            "label_id": label_id,
            "kind": kind,
            "boundary_kind": _nonempty_text(item["boundary_kind"], f"case.expected_labels[{index}].boundary_kind"),
            "subject": subject,
            "aliases": aliases,
        }

    if kind == "blocker":
        item = _exact_keys(
            raw,
            {"label_id", "kind", "blocker_kind", "subject", "aliases", "required_uncertainty"},
            f"case.expected_labels[{index}]",
        )
        subject = normalize_fixture_text(item["subject"], label=f"case.expected_labels[{index}].subject")
        aliases = _normalized_aliases(item["aliases"], f"case.expected_labels[{index}].aliases")
        required = item["required_uncertainty"]
        if not isinstance(required, bool) or not subject or subject in aliases:
            _fail(f"case.expected_labels[{index}] blocker fields invalid")
        return {
            "label_id": label_id,
            "kind": kind,
            "blocker_kind": _nonempty_text(item["blocker_kind"], f"case.expected_labels[{index}].blocker_kind"),
            "subject": subject,
            "aliases": aliases,
            "required_uncertainty": required,
        }

    item = _exact_keys(
        raw,
        {"label_id", "kind", "record_sha256", "disposition"},
        f"case.expected_labels[{index}]",
    )
    if item["disposition"] not in {"required", "optional_useful", "required_blocker_or_conflict"}:
        _fail(f"case.expected_labels[{index}] record disposition invalid")
    return {
        "label_id": label_id,
        "kind": kind,
        "record_sha256": _digest(item["record_sha256"], f"case.expected_labels[{index}].record_sha256"),
        "disposition": item["disposition"],
    }


def _fixture_match_keys(label: dict[str, Any]) -> set[tuple[Any, ...]]:
    kind = label["kind"]
    if kind == "source_ref":
        return {(kind, label["ref"])}
    if kind == "authority":
        return {(kind, normalize_fixture_text(label["authority_class"]), tuple(sorted(label["refs"])))}
    if kind == "owner":
        return {(kind, text) for text in [label["value"], *label["aliases"]]}
    if kind == "edge":
        return {
            (kind, left, right)
            for left in [label["from"], *label["from_aliases"]]
            for right in [label["to"], *label["to_aliases"]]
        }
    if kind == "boundary":
        return {(kind, label["boundary_kind"], text) for text in [label["subject"], *label["aliases"]]}
    if kind == "blocker":
        return {(kind, label["blocker_kind"], text) for text in [label["subject"], *label["aliases"]]}
    return {(kind, label["record_sha256"])}


def validate_case(case: dict[str, Any]) -> dict[str, Any]:
    _schema_validate(case, CASE_SCHEMA, "case")
    if case["schema_version"] != 1:
        _fail("case schema_version must equal 1")
    if case["scoring_policy_id"] != SCORING_POLICY_ID or case["scoring_policy_sha256"] != SCORING_POLICY_SHA256:
        _fail("case scoring policy identity drifted")
    if case["retrospective_only"] is not True:
        _fail("O4 benchmark cases must remain retrospective_only=true")
    role = case["role"]
    if role not in ROLES:
        _fail("case role invalid")
    _nonempty_text(case["case_id"], "case.case_id")
    _nonempty_text(case["case_version"], "case.case_version")
    _nonempty_text(case["source_case_id"], "case.source_case_id")
    if case["source_case_kind"] not in {"RETROSPECTIVE_COMPATIBILITY", "PROSPECTIVE_HELD_OUT_CONSUMED", "RETIRED_DIAGNOSTIC"}:
        _fail("case source_case_kind is not retrospective/consumed/retired")
    _nonempty_text(case["role_contract_id"], "case.role_contract_id")
    _digest(case["evidence_sha256"], "case.evidence_sha256")

    snapshots = case["repository_snapshots"]
    if not isinstance(snapshots, list) or not snapshots:
        _fail("case repository_snapshots must be non-empty")
    seen_snapshot_names: set[str] = set()
    for index, raw in enumerate(snapshots):
        item = _exact_keys(raw, {"name", "sha"}, f"case.repository_snapshots[{index}]")
        name = _nonempty_text(item["name"], f"case.repository_snapshots[{index}].name")
        _commit(item["sha"], f"case.repository_snapshots[{index}].sha")
        if name in seen_snapshot_names:
            _fail("case repository snapshot names must be unique")
        seen_snapshot_names.add(name)

    known_refs = _normalized_refs(case["known_source_refs"], label="case.known_source_refs", allow_empty=False)
    upstream = case["upstream_artifact_sha256"]
    if not isinstance(upstream, list) or len(upstream) > 3:
        _fail("case upstream_artifact_sha256 must have at most three digests")
    for index, digest in enumerate(upstream):
        _digest(digest, f"case.upstream_artifact_sha256[{index}]")
    if len(upstream) != len(set(upstream)):
        _fail("case upstream_artifact_sha256 contains duplicates")
    expected_upstream = {"scout": 0, "mapper": 1, "critic": 1, "synthesizer": 3}[role]
    if len(upstream) != expected_upstream:
        _fail(f"case {role} requires exactly {expected_upstream} frozen upstream artifact digests")

    labels = case["expected_labels"]
    if not isinstance(labels, list):
        _fail("case expected_labels must be an array")
    normalized_labels = [_validate_expected_label(raw, role=role, index=i) for i, raw in enumerate(labels)]
    label_ids = [item["label_id"] for item in normalized_labels]
    if len(label_ids) != len(set(label_ids)):
        _fail("case expected label ids must be unique")

    occupied: dict[tuple[Any, ...], str] = {}
    for item in normalized_labels:
        for key in _fixture_match_keys(item):
            previous = occupied.get(key)
            if previous is not None:
                _fail(f"case expected labels {previous!r} and {item['label_id']!r} have ambiguous exact/alias match keys")
            occupied[key] = item["label_id"]

    if role == "synthesizer":
        dispositions = {item["disposition"] for item in normalized_labels}
        if "required" not in dispositions and "required_blocker_or_conflict" not in dispositions:
            _fail("synthesizer fixture requires at least one required preservation label")

    expected_digest = fixture_sha256(case)
    if case["fixture_sha256"] != expected_digest:
        _fail("case fixture_sha256 does not match deterministic recomputation")

    normalized = deepcopy(case)
    normalized["known_source_refs"] = known_refs
    normalized["expected_labels"] = normalized_labels
    return normalized


def _validate_predicted_atom(raw: Any, *, role: str, known_refs: frozenset[str], index: int) -> tuple[dict[str, Any], int]:
    if not isinstance(raw, dict):
        _fail(f"result.predicted_atoms[{index}] must be an object")
    kind = raw.get("kind")
    if kind not in ROLE_PREDICTED_KINDS[role]:
        _fail(f"result.predicted_atoms[{index}] kind {kind!r} invalid for role {role}")

    invalid = 0
    if kind == "source_ref":
        item = _exact_keys(raw, {"kind", "ref"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs([item["ref"]], label=f"result.predicted_atoms[{index}].ref", allow_empty=False)
        invalid += 0 if refs[0] in known_refs else 1
        return {"kind": kind, "ref": refs[0]}, invalid

    if kind == "authority":
        item = _exact_keys(raw, {"kind", "authority_class", "refs"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs(item["refs"], label=f"result.predicted_atoms[{index}].refs", allow_empty=False)
        invalid += sum(1 for ref in refs if ref not in known_refs)
        return {
            "kind": kind,
            "authority_class": normalize_fixture_text(item["authority_class"], label=f"result.predicted_atoms[{index}].authority_class"),
            "refs": refs,
        }, invalid

    if kind == "owner":
        item = _exact_keys(raw, {"kind", "value", "refs"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs(item["refs"], label=f"result.predicted_atoms[{index}].refs", allow_empty=False)
        invalid += sum(1 for ref in refs if ref not in known_refs)
        return {
            "kind": kind,
            "value": normalize_fixture_text(item["value"], label=f"result.predicted_atoms[{index}].value"),
            "refs": refs,
        }, invalid

    if kind == "edge":
        item = _exact_keys(raw, {"kind", "from", "to", "refs"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs(item["refs"], label=f"result.predicted_atoms[{index}].refs", allow_empty=False)
        invalid += sum(1 for ref in refs if ref not in known_refs)
        source = normalize_fixture_text(item["from"], label=f"result.predicted_atoms[{index}].from")
        target = normalize_fixture_text(item["to"], label=f"result.predicted_atoms[{index}].to")
        if source == target:
            _fail(f"result.predicted_atoms[{index}] self-edge invalid")
        return {"kind": kind, "from": source, "to": target, "refs": refs}, invalid

    if kind == "boundary":
        item = _exact_keys(raw, {"kind", "boundary_kind", "subject", "refs"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs(item["refs"], label=f"result.predicted_atoms[{index}].refs")
        invalid += sum(1 for ref in refs if ref not in known_refs)
        return {
            "kind": kind,
            "boundary_kind": _nonempty_text(item["boundary_kind"], f"result.predicted_atoms[{index}].boundary_kind"),
            "subject": normalize_fixture_text(item["subject"], label=f"result.predicted_atoms[{index}].subject"),
            "refs": refs,
        }, invalid

    if kind == "blocker":
        item = _exact_keys(raw, {"kind", "blocker_kind", "subject", "refs"}, f"result.predicted_atoms[{index}]")
        refs = _normalized_refs(item["refs"], label=f"result.predicted_atoms[{index}].refs")
        invalid += sum(1 for ref in refs if ref not in known_refs)
        return {
            "kind": kind,
            "blocker_kind": _nonempty_text(item["blocker_kind"], f"result.predicted_atoms[{index}].blocker_kind"),
            "subject": normalize_fixture_text(item["subject"], label=f"result.predicted_atoms[{index}].subject"),
            "refs": refs,
        }, invalid

    if kind == "record":
        item = _exact_keys(raw, {"kind", "record_sha256"}, f"result.predicted_atoms[{index}]")
        return {
            "kind": kind,
            "record_sha256": _digest(item["record_sha256"], f"result.predicted_atoms[{index}].record_sha256"),
        }, 0

    item = _exact_keys(raw, {"kind", "claim_sha256"}, f"result.predicted_atoms[{index}]")
    return {
        "kind": kind,
        "claim_sha256": _digest(item["claim_sha256"], f"result.predicted_atoms[{index}].claim_sha256"),
    }, 0


def validate_result(result: dict[str, Any], case: dict[str, Any]) -> dict[str, Any]:
    fixture = validate_case(case)
    _schema_validate(result, RESULT_SCHEMA, "result")
    if result["schema_version"] != 1:
        _fail("result schema_version must equal 1")
    if result["scoring_policy_id"] != SCORING_POLICY_ID or result["scoring_policy_sha256"] != SCORING_POLICY_SHA256:
        _fail("result scoring policy identity drifted")
    for key in ("case_id", "case_version", "fixture_sha256", "role"):
        expected = fixture["fixture_sha256"] if key == "fixture_sha256" else fixture[key]
        if result[key] != expected:
            _fail(f"result {key} does not bind exact fixture")
    _validate_model(result["model"])
    _validate_runtime(result["runtime"])

    state = result["execution_status"]
    if state not in EXECUTION_STATES:
        _fail("result execution_status invalid")
    _nonempty_text(result["finish_reason"], "result.finish_reason")
    if not isinstance(result["parse_valid"], bool) or not isinstance(result["contract_valid"], bool):
        _fail("result parse_valid/contract_valid must be booleans")
    if result["contract_valid"] and not result["parse_valid"]:
        _fail("result contract_valid cannot be true when parse_valid is false")
    _nonnegative_int(result["model_call_count"], "result.model_call_count")
    if result["model_call_count"] not in (0, 1):
        _fail("result model_call_count must be 0 or 1")
    if result["hosted_ai_call_count"] != 0 or isinstance(result["hosted_ai_call_count"], bool):
        _fail("O4 benchmark hosted_ai_call_count must remain zero")
    if state == "COMPLETED" and (result["model_call_count"] != 1 or not result["parse_valid"] or not result["contract_valid"]):
        _fail("completed result requires one local model call and valid parse/contract")
    if state in {"INVALID", "EXECUTION_INCOMPLETE"} and result["model_call_count"] != 1:
        _fail(f"{state} result requires exactly one attempted local model call")
    if state == "FAILED" and result["model_call_count"] not in (0, 1):
        _fail("failed result call count invalid")
    if not isinstance(result["compact_completion_status"], bool):
        _fail("result compact_completion_status must be boolean")
    _digest(result["prompt_sha256"], "result.prompt_sha256")
    _digest_or_none(result["response_sha256"], "result.response_sha256")
    _digest_or_none(result["receipt_sha256"], "result.receipt_sha256")
    _digest_or_none(result["artifact_sha256"], "result.artifact_sha256")
    if state == "COMPLETED":
        if any(result[key] == "NONE" for key in ("response_sha256", "receipt_sha256", "artifact_sha256")):
            _fail("completed result requires response, receipt, and artifact digests")
    elif state in {"INVALID", "EXECUTION_INCOMPLETE"}:
        if result["response_sha256"] == "NONE" or result["receipt_sha256"] == "NONE" or result["artifact_sha256"] != "NONE":
            _fail(f"{state} result requires response/receipt digests and no artifact")
    elif result["artifact_sha256"] != "NONE":
        _fail("failed result cannot claim a role artifact")
    _validate_telemetry(result["telemetry"])

    known_refs = frozenset(fixture["known_source_refs"])
    predicted = result["predicted_atoms"]
    if not isinstance(predicted, list):
        _fail("result predicted_atoms must be an array")
    normalized_atoms: list[dict[str, Any]] = []
    invalid_ref_count = 0
    for index, raw in enumerate(predicted):
        atom, invalid = _validate_predicted_atom(raw, role=fixture["role"], known_refs=known_refs, index=index)
        normalized_atoms.append(atom)
        invalid_ref_count += invalid
    _nonnegative_int(result["invalid_ref_count"], "result.invalid_ref_count")
    if result["invalid_ref_count"] != invalid_ref_count:
        _fail("result invalid_ref_count does not match deterministic predicted-ref validation")
    if state == "COMPLETED" and result["contract_valid"] and invalid_ref_count != 0:
        _fail("completed contract-valid result cannot contain invalid refs")

    expected_digest = result_sha256(result)
    if result["result_sha256"] != expected_digest:
        _fail("result result_sha256 does not match deterministic recomputation")

    normalized = deepcopy(result)
    normalized["predicted_atoms"] = normalized_atoms
    normalized["telemetry"] = _validate_telemetry(result["telemetry"])
    return normalized


def _prediction_match_key(atom: dict[str, Any]) -> tuple[Any, ...]:
    kind = atom["kind"]
    if kind == "source_ref":
        return (kind, atom["ref"])
    if kind == "authority":
        return (kind, normalize_fixture_text(atom["authority_class"]), tuple(sorted(atom["refs"])))
    if kind == "owner":
        return (kind, atom["value"])
    if kind == "edge":
        return (kind, atom["from"], atom["to"])
    if kind == "boundary":
        return (kind, atom["boundary_kind"], atom["subject"])
    if kind == "blocker":
        return (kind, atom["blocker_kind"], atom["subject"])
    if kind == "record":
        return (kind, atom["record_sha256"])
    return (kind, atom["claim_sha256"])


def _match(expected: list[dict[str, Any]], predicted: list[dict[str, Any]], *, kind: str) -> tuple[int, set[int], set[int]]:
    expected_items = [(index, item, _fixture_match_keys(item)) for index, item in enumerate(expected) if item["kind"] == kind]
    predicted_items = [(index, item, _prediction_match_key(item)) for index, item in enumerate(predicted) if item["kind"] == kind]
    matched_expected: set[int] = set()
    matched_predicted: set[int] = set()
    for pred_index, _, key in predicted_items:
        candidates = [exp_index for exp_index, _, keys in expected_items if key in keys and exp_index not in matched_expected]
        if len(candidates) > 1:
            _fail(f"ambiguous fixture match for predicted {kind} atom")
        if candidates:
            matched_expected.add(candidates[0])
            matched_predicted.add(pred_index)
    return len(matched_predicted), matched_expected, matched_predicted


def _semantic_scored(result: dict[str, Any]) -> bool:
    return (
        result["execution_status"] == "COMPLETED"
        and result["parse_valid"]
        and result["contract_valid"]
    )


def _undefined_role_metrics(role: str, invalid_ref_count: int, compact_completion_status: bool) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    for key in ROLE_METRIC_KEYS[role]:
        if key in RATIO_METRIC_KEYS:
            metrics[key] = ratio(0, 0)
        elif key in COUNT_METRIC_KEYS:
            metrics[key] = invalid_ref_count if key == "invalid_ref_count" else 0
        elif key == "compact_completion_status":
            metrics[key] = compact_completion_status
    return metrics


def _score_scout(expected: list[dict[str, Any]], predicted: list[dict[str, Any]], invalid_refs: int) -> dict[str, Any]:
    src_tp, _, _ = _match(expected, predicted, kind="source_ref")
    auth_tp, _, _ = _match(expected, predicted, kind="authority")
    src_pred = sum(item["kind"] == "source_ref" for item in predicted)
    src_exp = sum(item["kind"] == "source_ref" for item in expected)
    auth_pred = sum(item["kind"] == "authority" for item in predicted)
    auth_exp = sum(item["kind"] == "authority" for item in expected)
    return {
        "source_selection_precision": ratio(src_tp, src_pred),
        "source_selection_recall": ratio(src_tp, src_exp),
        "authority_precision": ratio(auth_tp, auth_pred),
        "authority_recall": ratio(auth_tp, auth_exp),
        "invalid_ref_count": invalid_refs,
        "authority_overclaim_count": auth_pred - auth_tp,
    }


def _score_mapper(expected: list[dict[str, Any]], predicted: list[dict[str, Any]], invalid_refs: int, known_refs: frozenset[str]) -> dict[str, Any]:
    owner_tp, _, _ = _match(expected, predicted, kind="owner")
    edge_tp, _, _ = _match(expected, predicted, kind="edge")
    owners_pred = [item for item in predicted if item["kind"] == "owner"]
    edges_pred = [item for item in predicted if item["kind"] == "edge"]
    owners_exp = sum(item["kind"] == "owner" for item in expected)
    edges_exp = sum(item["kind"] == "edge" for item in expected)
    grounded_records = [
        item for item in [*owners_pred, *edges_pred]
        if item["refs"] and all(ref in known_refs for ref in item["refs"])
    ]
    return {
        "owner_precision": ratio(owner_tp, len(owners_pred)),
        "owner_recall": ratio(owner_tp, owners_exp),
        "edge_precision": ratio(edge_tp, len(edges_pred)),
        "edge_recall": ratio(edge_tp, edges_exp),
        "false_edge_count": len(edges_pred) - edge_tp,
        "grounding_precision": ratio(len(grounded_records), len(owners_pred) + len(edges_pred)),
        "invalid_ref_count": invalid_refs,
    }


def _score_critic(expected: list[dict[str, Any]], predicted: list[dict[str, Any]], invalid_refs: int) -> dict[str, Any]:
    boundary_tp, _, _ = _match(expected, predicted, kind="boundary")
    blocker_tp, matched_blockers, _ = _match(expected, predicted, kind="blocker")
    boundaries_pred = sum(item["kind"] == "boundary" for item in predicted)
    blockers_pred = sum(item["kind"] == "blocker" for item in predicted)
    boundaries_exp = sum(item["kind"] == "boundary" for item in expected)
    blockers_exp = sum(item["kind"] == "blocker" for item in expected)
    required_indices = {
        index for index, item in enumerate(expected)
        if item["kind"] == "blocker" and item["required_uncertainty"]
    }
    required_preserved = len(required_indices & matched_blockers)
    required_misses = len(required_indices) - required_preserved
    false_boundaries = boundaries_pred - boundary_tp
    return {
        "boundary_precision": ratio(boundary_tp, boundaries_pred),
        "boundary_recall": ratio(boundary_tp, boundaries_exp),
        "blocker_precision": ratio(blocker_tp, blockers_pred),
        "blocker_recall": ratio(blocker_tp, blockers_exp),
        "required_uncertainty_preservation_recall": ratio(required_preserved, len(required_indices)),
        "false_blocker_count": blockers_pred - blocker_tp,
        "optimism_violation_count": false_boundaries + required_misses,
        "invalid_ref_count": invalid_refs,
    }


def _score_synth(expected: list[dict[str, Any]], predicted: list[dict[str, Any]], invalid_refs: int, compact_completion_status: bool) -> dict[str, Any]:
    _, matched_records, _ = _match(expected, predicted, kind="record")
    required = {
        index for index, item in enumerate(expected)
        if item["kind"] == "record" and item["disposition"] == "required"
    }
    required_bc = {
        index for index, item in enumerate(expected)
        if item["kind"] == "record" and item["disposition"] == "required_blocker_or_conflict"
    }
    optional = {
        index for index, item in enumerate(expected)
        if item["kind"] == "record" and item["disposition"] == "optional_useful"
    }
    predicted_record_count = sum(item["kind"] == "record" for item in predicted)
    matched_any = len(matched_records)
    return {
        "required_record_preservation_recall": ratio(len(required & matched_records), len(required)),
        "required_blocker_conflict_preservation_recall": ratio(len(required_bc & matched_records), len(required_bc)),
        "optional_useful_selection_recall": ratio(len(optional & matched_records), len(optional)),
        "excess_optional_selection_count": predicted_record_count - matched_any,
        "forbidden_new_claim_count": sum(item["kind"] == "new_claim" for item in predicted),
        "compact_completion_status": compact_completion_status,
        "invalid_ref_count": invalid_refs,
    }


def score_role_output(case: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    fixture = validate_case(case)
    execution = validate_result(result, fixture)
    role = fixture["role"]
    semantic_scored = _semantic_scored(execution)

    if not semantic_scored:
        metrics = _undefined_role_metrics(
            role,
            execution["invalid_ref_count"],
            execution["compact_completion_status"],
        )
    elif role == "scout":
        metrics = _score_scout(fixture["expected_labels"], execution["predicted_atoms"], execution["invalid_ref_count"])
    elif role == "mapper":
        metrics = _score_mapper(
            fixture["expected_labels"],
            execution["predicted_atoms"],
            execution["invalid_ref_count"],
            frozenset(fixture["known_source_refs"]),
        )
    elif role == "critic":
        metrics = _score_critic(fixture["expected_labels"], execution["predicted_atoms"], execution["invalid_ref_count"])
    else:
        metrics = _score_synth(
            fixture["expected_labels"],
            execution["predicted_atoms"],
            execution["invalid_ref_count"],
            execution["compact_completion_status"],
        )

    score: dict[str, Any] = {
        "schema_version": 1,
        "scoring_policy_id": SCORING_POLICY_ID,
        "scoring_policy_sha256": SCORING_POLICY_SHA256,
        "case_id": fixture["case_id"],
        "case_version": fixture["case_version"],
        "fixture_sha256": fixture["fixture_sha256"],
        "result_sha256": execution["result_sha256"],
        "role": role,
        "model_profile_id": execution["model"]["profile_id"],
        "model_family": execution["model"]["family"],
        "execution_status": execution["execution_status"],
        "parse_valid": execution["parse_valid"],
        "contract_valid": execution["contract_valid"],
        "semantic_scored": semantic_scored,
        "telemetry": deepcopy(execution["telemetry"]),
        "metrics": metrics,
    }
    score["score_sha256"] = score_sha256(score)
    validate_score(score)
    return score


def validate_score(score: dict[str, Any]) -> dict[str, Any]:
    _schema_validate(score, SCORE_SCHEMA, "score")
    if score["schema_version"] != 1:
        _fail("score schema_version must equal 1")
    if score["scoring_policy_id"] != SCORING_POLICY_ID or score["scoring_policy_sha256"] != SCORING_POLICY_SHA256:
        _fail("score scoring policy identity drifted")
    role = score["role"]
    if role not in ROLES:
        _fail("score role invalid")
    if score["execution_status"] not in EXECUTION_STATES:
        _fail("score execution_status invalid")
    for key in ("parse_valid", "contract_valid", "semantic_scored"):
        if not isinstance(score[key], bool):
            _fail(f"score {key} must be boolean")
    if score["contract_valid"] and not score["parse_valid"]:
        _fail("score contract_valid cannot be true when parse_valid=false")
    expected_semantic = (
        score["execution_status"] == "COMPLETED"
        and score["parse_valid"]
        and score["contract_valid"]
    )
    if score["semantic_scored"] != expected_semantic:
        _fail("score semantic_scored drifted")
    for key in ("fixture_sha256", "result_sha256"):
        _digest(score[key], f"score.{key}")
    _nonempty_text(score["case_id"], "score.case_id")
    _nonempty_text(score["case_version"], "score.case_version")
    _nonempty_text(score["model_profile_id"], "score.model_profile_id")
    _nonempty_text(score["model_family"], "score.model_family")
    _validate_telemetry(score["telemetry"])

    metrics = score["metrics"]
    if not isinstance(metrics, dict) or set(metrics) != ROLE_METRIC_KEYS[role]:
        _fail("score metrics do not match exact role metric vector")
    for key, value in metrics.items():
        if key in RATIO_METRIC_KEYS:
            validate_ratio(value, f"score.metrics.{key}")
        elif key in COUNT_METRIC_KEYS:
            _nonnegative_int(value, f"score.metrics.{key}")
        elif key in BOOL_METRIC_KEYS:
            if not isinstance(value, bool):
                _fail(f"score.metrics.{key} must be boolean")
        else:
            _fail(f"unexpected score metric {key}")
    if not score["semantic_scored"]:
        for key in RATIO_METRIC_KEYS & set(metrics):
            if metrics[key] != ratio(0, 0):
                _fail("non-semantic score ratio metrics must remain undefined")
        for key in (COUNT_METRIC_KEYS & set(metrics)) - {"invalid_ref_count"}:
            if metrics[key] != 0:
                _fail("non-semantic score quality counts must remain zero")

    expected_digest = score_sha256(score)
    if score["score_sha256"] != expected_digest:
        _fail("score score_sha256 does not match deterministic recomputation")
    return deepcopy(score)
