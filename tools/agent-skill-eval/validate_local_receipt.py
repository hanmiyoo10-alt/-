#!/usr/bin/env python3
"""Build and validate provenance receipts for zero-credit local-model Agent Skill eval pairs."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

from local_response_contract import ResponseContractError, validate_content

SCHEMA_VERSION = 1
MODES = {"with_skill", "baseline_without_target_skill"}
PAIR_FIELDS = (
    "repository_sha",
    "skill",
    "skill_sha256",
    "fixture_sha256",
    "case_id",
    "user_task_sha256",
    "evidence_context_sha256",
    "response_contract_sha256",
    "model_repository",
    "model_revision",
    "model_file",
    "model_sha256",
    "llama_release",
    "llama_source_digest",
    "llama_artifact",
    "llama_artifact_sha256",
    "llama_runtime_version",
    "generation",
)
FORBIDDEN = {"winner", "skill_better", "quality_score", "promoted"}
DERIVED_IMPACT_VERDICTS = {"SUPPORTED", "PARTIAL", "UNKNOWN", "CONFLICT"}


class LocalReceiptError(ValueError):
    pass


def _load(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise LocalReceiptError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise LocalReceiptError("JSON object required")
    return data


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _derive_structured_impact_verdict(
    response_path: Path,
    response_contract_hash: str,
    exit_code: int,
) -> str | None:
    if response_contract_hash == "NONE":
        return None
    if exit_code != 0:
        return None
    if not response_path.is_file():
        raise LocalReceiptError("structured successful execution requires response file")

    eval_root = response_path.parent.parent
    contract = _load(eval_root / "response-contract.json")
    context = _load(eval_root / "context.json")
    validation_path = response_path.parent / "structured-validation.json"
    validation = _load(validation_path)
    if validation.get("status") != "VALID":
        raise LocalReceiptError("successful structured execution requires VALID structured-validation")
    if validation.get("response_contract_sha256") != response_contract_hash:
        raise LocalReceiptError("structured-validation response-contract hash mismatch")

    try:
        result = validate_content(response_path.read_text(encoding="utf-8"), contract, context)
    except (OSError, UnicodeError, ResponseContractError) as exc:
        raise LocalReceiptError(f"structured response revalidation failed: {exc}") from exc
    if not isinstance(result, dict):
        raise LocalReceiptError("structured response revalidation result missing")
    derived = result.get("derived_impact_verdict")
    if derived not in DERIVED_IMPACT_VERDICTS:
        raise LocalReceiptError("structured response derived impact verdict missing or invalid")

    validation["derived_impact_verdict"] = derived
    validation["validated_response_sha256"] = _sha(response_path)
    validation_path.write_text(
        json.dumps(validation, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return str(derived)


def make_receipt(
    matrix: dict[str, Any],
    context: dict[str, Any],
    prompt_meta: dict[str, Any],
    response_path: Path,
    exit_code: int,
    mode: str,
    model_repository: str,
    model_revision: str,
    model_file: str,
    model_sha256: str,
    llama_release: str,
    llama_source_digest: str,
    llama_artifact: str,
    llama_artifact_sha256: str,
    llama_runtime_version: str,
    generation: dict[str, Any],
    workflow_run_id: str,
    workflow_run_attempt: str,
) -> dict[str, Any]:
    if mode not in MODES:
        raise LocalReceiptError("invalid mode")
    if matrix.get("eval_kind") != "output":
        raise LocalReceiptError("zero-credit lane only supports output evals")
    skill = matrix.get("skill")
    case_id = str(matrix.get("case_id"))
    if context.get("skill") != skill or str(context.get("case_id")) != case_id:
        raise LocalReceiptError("context identity mismatch")
    if prompt_meta.get("mode") != mode or prompt_meta.get("skill") != skill or str(prompt_meta.get("case_id")) != case_id:
        raise LocalReceiptError("prompt metadata identity mismatch")
    if prompt_meta.get("user_task_sha256") != matrix.get("prompt_sha256"):
        raise LocalReceiptError("user task hash does not match matrix prompt")
    if prompt_meta.get("evidence_context_sha256") != context.get("context_sha256"):
        raise LocalReceiptError("prompt evidence hash does not match context")
    if mode == "with_skill" and not prompt_meta.get("skill_guidance_sha256"):
        raise LocalReceiptError("with_skill prompt missing skill guidance hash")
    if mode == "baseline_without_target_skill" and prompt_meta.get("skill_guidance_sha256") not in (None, ""):
        raise LocalReceiptError("baseline prompt unexpectedly contains skill guidance hash")
    response_contract_hash = prompt_meta.get("response_contract_sha256") or "NONE"
    if response_contract_hash != "NONE" and (not isinstance(response_contract_hash, str) or len(response_contract_hash) != 64):
        raise LocalReceiptError("response contract hash is malformed")
    required_strings = [
        model_repository, model_revision, model_file, model_sha256, llama_release,
        llama_source_digest, llama_artifact, llama_artifact_sha256, llama_runtime_version,
    ]
    if any(not str(x).strip() for x in required_strings):
        raise LocalReceiptError("local model/runtime identity is incomplete")
    if not isinstance(generation, dict) or not generation:
        raise LocalReceiptError("generation parameters missing")
    exists = response_path.is_file()
    response_hash = _sha(response_path) if exists else None
    if exit_code == 0 and not response_hash:
        raise LocalReceiptError("successful execution requires response hash")

    derived_impact_verdict = _derive_structured_impact_verdict(
        response_path,
        response_contract_hash,
        int(exit_code),
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "execution_surface": "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS",
        "repository_sha": matrix.get("repository_sha"),
        "workflow_run_id": str(workflow_run_id),
        "workflow_run_attempt": str(workflow_run_attempt),
        "skill": skill,
        "skill_sha256": matrix.get("skill_sha256"),
        "fixture_sha256": matrix.get("fixture_sha256"),
        "case_id": case_id,
        "mode": mode,
        "user_task_sha256": prompt_meta.get("user_task_sha256"),
        "evidence_context_sha256": prompt_meta.get("evidence_context_sha256"),
        "response_contract_sha256": response_contract_hash,
        "full_prompt_sha256": prompt_meta.get("full_prompt_sha256"),
        "skill_guidance_sha256": prompt_meta.get("skill_guidance_sha256"),
        "model_repository": model_repository,
        "model_revision": model_revision,
        "model_file": model_file,
        "model_sha256": model_sha256,
        "llama_release": llama_release,
        "llama_source_digest": llama_source_digest,
        "llama_artifact": llama_artifact,
        "llama_artifact_sha256": llama_artifact_sha256,
        "llama_runtime_version": llama_runtime_version,
        "generation": generation,
        "response_sha256": response_hash,
        "process_exit_code": int(exit_code),
        "derived_impact_verdict": derived_impact_verdict,
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        "trigger_observability": "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION",
        "qualitative_verdict": None,
    }


def _validate(receipt: dict[str, Any]) -> None:
    if receipt.get("schema_version") != SCHEMA_VERSION:
        raise LocalReceiptError("unsupported receipt schema")
    if receipt.get("execution_surface") != "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS":
        raise LocalReceiptError("unexpected execution surface")
    if receipt.get("mode") not in MODES:
        raise LocalReceiptError("invalid receipt mode")
    for field in PAIR_FIELDS:
        value = receipt.get(field)
        if value is None or value == "":
            raise LocalReceiptError(f"missing identity field: {field}")
    if receipt.get("trigger_observability") != "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION":
        raise LocalReceiptError("local lane must not claim trigger observability")
    if receipt.get("qualitative_verdict") not in (None, ""):
        raise LocalReceiptError("mechanical local receipt must not carry qualitative verdict")
    for key in receipt:
        if key.lower() in FORBIDDEN:
            raise LocalReceiptError(f"forbidden verdict key: {key}")
    exit_code = int(receipt.get("process_exit_code", -999))
    if exit_code == 0 and not receipt.get("response_sha256"):
        raise LocalReceiptError("successful receipt missing response hash")
    if receipt["mode"] == "with_skill" and not receipt.get("skill_guidance_sha256"):
        raise LocalReceiptError("with_skill receipt missing skill guidance hash")
    if receipt["mode"] == "baseline_without_target_skill" and receipt.get("skill_guidance_sha256") not in (None, ""):
        raise LocalReceiptError("baseline receipt contains skill guidance hash")

    contract_hash = receipt.get("response_contract_sha256")
    derived = receipt.get("derived_impact_verdict")
    if contract_hash == "NONE":
        if derived not in (None, ""):
            raise LocalReceiptError("unstructured receipt must not carry derived impact verdict")
    elif exit_code == 0 and derived not in DERIVED_IMPACT_VERDICTS:
        raise LocalReceiptError("successful structured receipt missing derived impact verdict")
    elif derived not in (None, "") and derived not in DERIVED_IMPACT_VERDICTS:
        raise LocalReceiptError("derived impact verdict invalid")


def validate_pair(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    _validate(a)
    _validate(b)
    if {a["mode"], b["mode"]} != MODES:
        raise LocalReceiptError("pair must contain exactly one mode of each kind")
    mismatches = [field for field in PAIR_FIELDS if a.get(field) != b.get(field)]
    if mismatches:
        raise LocalReceiptError("pair identity mismatch: " + ",".join(mismatches))
    if a.get("full_prompt_sha256") == b.get("full_prompt_sha256"):
        raise LocalReceiptError("paired full prompts must differ because only with_skill includes target guidance")
    complete = int(a["process_exit_code"]) == 0 and int(b["process_exit_code"]) == 0
    mode_verdicts = {
        a["mode"]: a.get("derived_impact_verdict"),
        b["mode"]: b.get("derived_impact_verdict"),
    }
    return {
        "schema_version": SCHEMA_VERSION,
        "status": "PAIR_VALID" if complete else "EXECUTION_INCOMPLETE",
        "execution_surface": a["execution_surface"],
        "repository_sha": a["repository_sha"],
        "skill": a["skill"],
        "case_id": a["case_id"],
        "user_task_sha256": a["user_task_sha256"],
        "evidence_context_sha256": a["evidence_context_sha256"],
        "response_contract_sha256": a["response_contract_sha256"],
        "model_sha256": a["model_sha256"],
        "llama_artifact_sha256": a["llama_artifact_sha256"],
        "mode_derived_impact_verdicts": mode_verdicts,
        "trigger_observability": "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION",
        "qualitative_verdict": None,
    }


def _write(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    make = sub.add_parser("make")
    for name in ("matrix", "context", "prompt-meta", "response", "mode", "model-repository", "model-revision", "model-file", "model-sha256", "llama-release", "llama-source-digest", "llama-artifact", "llama-artifact-sha256", "llama-runtime-version", "generation-json", "workflow-run-id", "workflow-run-attempt"):
        make.add_argument("--" + name, required=True)
    make.add_argument("--exit-code", type=int, required=True)
    make.add_argument("--output")
    pair = sub.add_parser("pair")
    pair.add_argument("--with-receipt", required=True)
    pair.add_argument("--baseline-receipt", required=True)
    pair.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        if args.command == "make":
            generation = json.loads(args.generation_json)
            payload = make_receipt(
                _load(Path(args.matrix)), _load(Path(args.context)), _load(Path(args.prompt_meta)),
                Path(args.response), args.exit_code, args.mode,
                args.model_repository, args.model_revision, args.model_file, args.model_sha256,
                args.llama_release, args.llama_source_digest, args.llama_artifact,
                args.llama_artifact_sha256, args.llama_runtime_version, generation,
                args.workflow_run_id, args.workflow_run_attempt,
            )
        else:
            payload = validate_pair(_load(Path(args.with_receipt)), _load(Path(args.baseline_receipt)))
        _write(Path(args.output) if args.output else None, payload)
    except (LocalReceiptError, json.JSONDecodeError) as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
