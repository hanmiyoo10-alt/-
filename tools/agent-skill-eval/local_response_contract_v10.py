from __future__ import annotations

import json
import re
from typing import Any

import local_response_contract_legacy as legacy

V10_CONTRACT_ID = "candidate-grounded-impact-report-v10"
V10_MAX_TEXT_BYTES = 48
V10_MAX_SOURCE_LINE = 9_999_999
V10_SOURCE_REF_RE = re.compile(r"(S(?:[1-9]|1[0-6]))@L([1-9][0-9]{0,6})\Z")
V10_TOP_LEVEL_KEYS = {"scope", "a", "o", "f", "p", "t", "g", "n"}
MAX_COMPACT_WIRE_BYTES = 2400


def _text_schema():
    # JSON Schema maxLength is only a coarse generation constraint; the evaluator
    # enforces the frozen 48 UTF-8 byte limit exactly.
    return {"type": "string", "maxLength": V10_MAX_TEXT_BYTES}


def _ref_schema():
    return {"type": "string", "pattern": r"^S(?:[1-9]|1[0-6])@L[1-9][0-9]{0,6}$", "maxLength": 13}


def _tuple_schema(min_items: int, max_items: int):
    return {
        "type": "array",
        "minItems": min_items,
        "maxItems": max_items,
        "items": {
            "anyOf": [
                _text_schema(),
                {"type": "array", "minItems": 1, "maxItems": 2, "items": _ref_schema()},
            ]
        },
    }


def build_schema(contract: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "scope": {"type": "string", "enum": [contract["expected_scope"]]},
            "a": _tuple_schema(3, 3),
            "o": {"type": "array", "maxItems": 3, "items": _tuple_schema(3, 3)},
            "f": {"type": "array", "maxItems": 3, "items": _tuple_schema(4, 4)},
            "p": {
                "type": "object",
                "properties": {
                    "ri": _tuple_schema(2, 2),
                    "io": _tuple_schema(2, 2),
                    "b": {"type": "array", "maxItems": 2, "items": _tuple_schema(3, 3)},
                },
                "required": ["ri", "io", "b"],
                "additionalProperties": False,
            },
            "t": {"type": "array", "maxItems": 2, "items": _tuple_schema(3, 3)},
            "g": _tuple_schema(3, 3),
            "n": _tuple_schema(3, 3),
        },
        "required": ["scope", "a", "o", "f", "p", "t", "g", "n"],
        "additionalProperties": False,
    }


def compact_wire_bytes(payload: Any) -> int:
    return len(legacy.canonical_json(payload).encode("utf-8"))


def _blocks(context: dict[str, Any]) -> dict[str, dict[str, Any]]:
    blocks = context.get("blocks")
    if not isinstance(blocks, list) or len(blocks) > 16:
        raise legacy.ResponseContractError("context blocks missing or oversized")
    return {f"S{i}": block for i, block in enumerate(blocks, start=1)}


def _line_map(block: dict[str, Any]) -> dict[int, str]:
    text = str(block.get("text", ""))
    extraction = block.get("extraction")
    mode = extraction.get("mode") if isinstance(extraction, dict) else None
    if mode == "full":
        return {i: line for i, line in enumerate(text.splitlines(), start=1)}
    out: dict[int, str] = {}
    for raw in text.splitlines():
        match = re.match(r"^([1-9][0-9]*):(?: |$)(.*)$", raw)
        if match:
            out[int(match.group(1))] = match.group(2)
    return out


def source_context_text(context: dict[str, Any]) -> str:
    parts: list[str] = []
    blocks = context.get("blocks")
    if not isinstance(blocks, list) or len(blocks) > 16:
        raise legacy.ResponseContractError("context blocks missing or oversized")
    for index, block in enumerate(blocks, start=1):
        if not isinstance(block, dict):
            raise legacy.ResponseContractError("context block malformed")
        text = str(block.get("text", ""))
        extraction = block.get("extraction")
        mode = extraction.get("mode") if isinstance(extraction, dict) else None
        if mode == "full":
            text = "\n".join(f"{i}: {line}" for i, line in enumerate(text.splitlines(), start=1))
            if text:
                text += "\n"
        header = (
            f"--- SOURCE {index} {block.get('ref', '')}:{block.get('path', '')}"
            f" @ {block.get('resolved_commit_sha', '')} ---\n"
        )
        parts.append(header + text)
    return "\n".join(parts)


def resolve_source_ref(ref: str, label: str, context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(ref, str):
        raise legacy.ResponseContractError(f"{label} source ref must be a string")
    match = V10_SOURCE_REF_RE.fullmatch(ref)
    if match is None:
        raise legacy.ResponseContractError(f"{label} source ref malformed")
    block_id, line_raw = match.groups()
    line_no = int(line_raw)
    if line_no > V10_MAX_SOURCE_LINE:
        raise legacy.ResponseContractError(f"{label} source line out of bounds")
    blocks = _blocks(context)
    block = blocks.get(block_id)
    if block is None:
        raise legacy.ResponseContractError(f"{label} source block unavailable")
    lines = _line_map(block)
    if line_no not in lines:
        raise legacy.ResponseContractError(f"{label} source line unavailable")
    return {"sourceBlockId": block_id, "sourceLine": line_no, "sourceText": lines[line_no]}


def _text(value: Any, label: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise legacy.ResponseContractError(f"{label} must be a string")
    if not allow_empty and not value:
        raise legacy.ResponseContractError(f"{label} must not be empty")
    if len(value.encode("utf-8")) > V10_MAX_TEXT_BYTES:
        raise legacy.ResponseContractError(f"{label} exceeds {V10_MAX_TEXT_BYTES} UTF-8 bytes")
    return value


def _simple(raw: Any, label: str, context: dict[str, Any], *, with_value: bool) -> dict[str, Any]:
    expected = 3 if with_value else 2
    if not isinstance(raw, list) or len(raw) != expected:
        raise legacy.ResponseContractError(f"{label} tuple invalid")
    status = raw[0]
    if status not in legacy.CLAIM_STATUSES:
        raise legacy.ResponseContractError(f"{label} status invalid")
    if with_value:
        value = _text(raw[1], f"{label} value", allow_empty=True)
        ref = raw[2]
        if status == "UNKNOWN":
            if value != "" or ref != "":
                raise legacy.ResponseContractError(f"{label} UNKNOWN must have empty value/source ref")
            refs: list[dict[str, Any]] = []
        else:
            if not value:
                raise legacy.ResponseContractError(f"{label} affirmative value missing")
            refs = [resolve_source_ref(ref, label, context)]
        return {"status": status, "value": value, "sourceRefs": refs}
    ref = raw[1]
    if status == "UNKNOWN":
        if ref != "":
            raise legacy.ResponseContractError(f"{label} UNKNOWN must have empty source ref")
        refs = []
    else:
        refs = [resolve_source_ref(ref, label, context)]
    return {"status": status, "sourceRefs": refs}


def _named(raw: Any, label: str, context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, list) or len(raw) != 3:
        raise legacy.ResponseContractError(f"{label} tuple invalid")
    name, status, ref = raw
    _text(name, f"{label} label")
    if status not in legacy.EVIDENCE_STATUSES:
        raise legacy.ResponseContractError(f"{label} status invalid")
    return {"label": name, "status": status, "sourceRefs": [resolve_source_ref(ref, label, context)]}


def _named_items(raw: Any, label: str, context: dict[str, Any], max_items: int) -> list[dict[str, Any]]:
    if not isinstance(raw, list) or len(raw) > max_items:
        raise legacy.ResponseContractError(f"{label} invalid")
    return [_named(item, f"{label}[{i}]", context) for i, item in enumerate(raw)]


def _flow(raw: Any, label: str, context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, list) or len(raw) != 4:
        raise legacy.ResponseContractError(f"{label} tuple invalid")
    source, target, status, refs = raw
    _text(source, f"{label} from")
    _text(target, f"{label} to")
    if source == target or status not in legacy.EVIDENCE_STATUSES:
        raise legacy.ResponseContractError(f"{label} endpoints/status invalid")
    if not isinstance(refs, list) or not 1 <= len(refs) <= 2 or len(refs) != len(set(refs)):
        raise legacy.ResponseContractError(f"{label} source refs invalid")
    return {
        "from": source,
        "to": target,
        "status": status,
        "sourceRefs": [resolve_source_ref(ref, f"{label}.sourceRefs[{i}]", context) for i, ref in enumerate(refs)],
    }


def validate_content(content: str, contract: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise legacy.ResponseContractError(f"structured response is not valid JSON: {exc}") from exc
    if not isinstance(payload, dict) or set(payload) != V10_TOP_LEVEL_KEYS or payload.get("scope") != contract["expected_scope"]:
        raise legacy.ResponseContractError("candidate compact report fields/scope invalid")
    wire_bytes = compact_wire_bytes(payload)
    if wire_bytes > MAX_COMPACT_WIRE_BYTES:
        raise legacy.ResponseContractError("candidate compact report exceeds compact-wire byte ceiling")
    preservation = payload["p"]
    if not isinstance(preservation, dict) or set(preservation) != {"ri", "io", "b"}:
        raise legacy.ResponseContractError("candidate compact preservation malformed")

    authority = _simple(payload["a"], "authority", context, with_value=True)
    owners = _named_items(payload["o"], "semanticOwners", context, 3)
    if not isinstance(payload["f"], list) or len(payload["f"]) > 3:
        raise legacy.ResponseContractError("flowEdges invalid")
    flows = [_flow(item, f"flowEdges[{i}]", context) for i, item in enumerate(payload["f"])]
    request_identity = _simple(preservation["ri"], "preservation.requestIdentity", context, with_value=False)
    no_extra_io = _simple(preservation["io"], "preservation.noExtraIo", context, with_value=False)
    other = _named_items(preservation["b"], "preservation.otherBoundaries", context, 2)
    tests = _named_items(payload["t"], "testsContracts", context, 2)
    generated_release = _simple(payload["g"], "generatedRelease", context, with_value=True)
    narrowest = _simple(payload["n"], "narrowestBoundary", context, with_value=True)

    all_status = [authority["status"], request_identity["status"], no_extra_io["status"], generated_release["status"], narrowest["status"]] + [x["status"] for x in owners + flows + other + tests]
    blocked: list[str] = []
    if authority["status"] not in legacy.RESOLVED_STATUSES: blocked.append("authority")
    if not any(x["status"] in legacy.RESOLVED_STATUSES for x in owners): blocked.append("semantic_owners")
    if not any(x["status"] in legacy.RESOLVED_STATUSES for x in flows): blocked.append("flow")
    if request_identity["status"] not in legacy.RESOLVED_STATUSES: blocked.append("request_identity")
    if no_extra_io["status"] not in legacy.RESOLVED_STATUSES: blocked.append("no_extra_io")
    if not any(x["status"] in legacy.RESOLVED_STATUSES for x in tests): blocked.append("tests_contracts")
    if generated_release["status"] not in legacy.RESOLVED_STATUSES: blocked.append("generated_release")
    if narrowest["status"] not in legacy.RESOLVED_STATUSES: blocked.append("narrowest_boundary")

    if "CONFLICT" in all_status:
        blocked.append("conflict")
        verdict = "CONFLICT"
    elif authority["status"] == "UNKNOWN" or not any(x["status"] in legacy.RESOLVED_STATUSES for x in flows):
        verdict = "UNKNOWN"
    elif blocked:
        verdict = "PARTIAL"
    else:
        verdict = "SUPPORTED"

    return {
        "scope": payload["scope"],
        "authority": authority,
        "semanticOwners": owners,
        "flowEdges": flows,
        "preservation": {
            "requestIdentity": request_identity,
            "noExtraIo": no_extra_io,
            "otherBoundaries": [{"boundary": x["label"], "status": x["status"], "sourceRefs": x["sourceRefs"]} for x in other],
        },
        "testsContracts": [{"boundary": x["label"], "status": x["status"], "sourceRefs": x["sourceRefs"]} for x in tests],
        "generatedRelease": generated_release,
        "narrowestBoundary": narrowest,
        "compact_wire_bytes": wire_bytes,
        "derived_blocked_claims": blocked,
        "derived_impact_verdict": verdict,
    }
