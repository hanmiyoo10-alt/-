#!/usr/bin/env python3
"""Run a zero-credit Agent Skill pair through a loopback llama-server and capture generated content only."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

from local_response_contract import (
    ResponseContractError,
    contract_sha256,
    load_contract,
    response_format,
    validate_content,
)

MODES = ("with_skill", "baseline_without_target_skill")
HOST = "127.0.0.1"
MODEL_ALIAS = "local-eval"
TRANSPORT = "llama-server-v1-chat-completions"
MAX_RESPONSE_BYTES = 128_000


class ServerPairError(ValueError):
    pass


def _load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ServerPairError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ServerPairError(f"JSON object required: {path}")
    return data


def validate_generation(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ServerPairError("generation settings must be an object")
    required = {"temperature", "seed", "n_predict", "ctx_size", "threads", "gpu_layers"}
    if not required.issubset(value):
        raise ServerPairError("generation settings missing required keys")
    n_predict = int(value["n_predict"])
    ctx_size = int(value["ctx_size"])
    threads = int(value["threads"])
    gpu_layers = int(value["gpu_layers"])
    if n_predict < 1 or n_predict > 1024:
        raise ServerPairError("n_predict outside zero-credit bound")
    if ctx_size < 1024 or ctx_size > 32768:
        raise ServerPairError("ctx_size outside zero-credit bound")
    if threads < 1 or threads > 16:
        raise ServerPairError("threads outside zero-credit bound")
    if gpu_layers != 0:
        raise ServerPairError("zero-credit GitHub-hosted lane requires gpu_layers=0")
    if float(value["temperature"]) != 0:
        raise ServerPairError("zero-credit comparison requires temperature=0")
    return {
        "temperature": 0,
        "seed": int(value["seed"]),
        "n_predict": n_predict,
        "ctx_size": ctx_size,
        "threads": threads,
        "gpu_layers": gpu_layers,
        "transport": TRANSPORT,
    }


def build_server_command(server_binary: Path, model_path: Path, generation: dict[str, Any], port: int) -> list[str]:
    if not server_binary.is_file():
        raise ServerPairError("llama-server binary missing")
    if not model_path.is_file():
        raise ServerPairError("local model missing")
    if port < 1024 or port > 65535:
        raise ServerPairError("invalid loopback port")
    return [
        str(server_binary),
        "-m", str(model_path),
        "--alias", MODEL_ALIAS,
        "--host", HOST,
        "--port", str(port),
        "--ctx-size", str(generation["ctx_size"]),
        "--threads", str(generation["threads"]),
        "--n-gpu-layers", str(generation["gpu_layers"]),
    ]


def build_chat_payload(
    prompt: str,
    generation: dict[str, Any],
    response_contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not prompt.strip():
        raise ServerPairError("prompt is empty")
    payload: dict[str, Any] = {
        "model": MODEL_ALIAS,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": generation["temperature"],
        "seed": generation["seed"],
        "max_tokens": generation["n_predict"],
        "stream": False,
    }
    fmt = response_format(response_contract)
    if fmt is not None:
        payload["response_format"] = fmt
    return payload


def extract_chat_content(payload: dict[str, Any]) -> tuple[str, str]:
    try:
        choice = payload["choices"][0]
        message = choice["message"]
        content = message["content"]
        finish_reason = choice["finish_reason"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ServerPairError("chat completion response shape is invalid") from exc
    if not isinstance(content, str) or not content.strip():
        raise ServerPairError("chat completion content is empty")
    if not isinstance(finish_reason, str) or not finish_reason.strip():
        raise ServerPairError("chat completion finish_reason is missing")
    if len(content.encode("utf-8")) > MAX_RESPONSE_BYTES:
        raise ServerPairError("chat completion content exceeds bound")
    return content, finish_reason


def _get_json(url: str, timeout: float) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise ServerPairError("HTTP response exceeds bound")
        return int(resp.status), json.loads(raw.decode("utf-8"))


def _post_json(url: str, payload: dict[str, Any], timeout: float) -> tuple[int, dict[str, Any]]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise ServerPairError("HTTP response exceeds bound")
        return int(resp.status), json.loads(raw.decode("utf-8"))


def wait_for_health(base_url: str, process: subprocess.Popen[Any], timeout_seconds: float) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error = "not ready"
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise ServerPairError(f"llama-server exited during startup: {process.returncode}")
        try:
            status, payload = _get_json(base_url + "/health", timeout=2.0)
            if status == 200 and payload.get("status") == "ok":
                return
            last_error = f"health status={status} payload={payload!r}"
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ServerPairError) as exc:
            last_error = str(exc)
        time.sleep(0.5)
    raise ServerPairError(f"llama-server health timeout: {last_error}")


def _resolve_response_contract(
    eval_root: Path,
    response_contracts_path: Path | None,
) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    matrix = _load_json(eval_root / "matrix.json")
    context = _load_json(eval_root / "context.json")
    contract = None
    if response_contracts_path is not None:
        try:
            contract = load_contract(
                response_contracts_path,
                str(matrix.get("skill")),
                str(matrix.get("case_id")),
            )
        except ResponseContractError as exc:
            raise ServerPairError(str(exc)) from exc
    expected_hash = contract_sha256(contract)
    for mode in MODES:
        meta = _load_json(eval_root / mode / "prompt-meta.json")
        if meta.get("response_contract_sha256") != expected_hash:
            raise ServerPairError(f"prompt response-contract hash mismatch for {mode}")
    if contract is not None:
        (eval_root / "response-contract.json").write_text(
            json.dumps(contract, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (eval_root / "response-contract-sha256.txt").write_text(expected_hash + "\n", encoding="utf-8")
    return contract, context


def _write_structured_validation(
    path: Path,
    status: str,
    contract_hash: str | None,
    error: str | None = None,
) -> None:
    payload = {
        "status": status,
        "response_contract_sha256": contract_hash,
        "error": error,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run_pair(
    server_binary: Path,
    model_path: Path,
    eval_root: Path,
    generation: dict[str, Any],
    port: int,
    startup_timeout: float,
    request_timeout: float,
    response_contracts_path: Path | None = None,
) -> dict[str, Any]:
    generation = validate_generation(generation)
    eval_root.mkdir(parents=True, exist_ok=True)
    response_contract, context = _resolve_response_contract(eval_root, response_contracts_path)
    response_contract_hash = contract_sha256(response_contract)
    server_log_path = eval_root / "llama-server.log"
    command = build_server_command(server_binary, model_path, generation, port)
    base_url = f"http://{HOST}:{port}"
    results: dict[str, Any] = {
        "transport": TRANSPORT,
        "base_url": base_url,
        "response_contract_id": response_contract.get("id") if response_contract else None,
        "response_contract_sha256": response_contract_hash,
        "modes": {},
    }

    with server_log_path.open("wb") as server_log:
        process = subprocess.Popen(command, stdout=server_log, stderr=subprocess.STDOUT)
        try:
            wait_for_health(base_url, process, startup_timeout)
            for mode in MODES:
                mode_dir = eval_root / mode
                mode_dir.mkdir(parents=True, exist_ok=True)
                prompt_path = mode_dir / "prompt.txt"
                response_path = mode_dir / "response.txt"
                envelope_path = mode_dir / "response-envelope.json"
                finish_path = mode_dir / "finish-reason.txt"
                validation_path = mode_dir / "structured-validation.json"
                error_path = mode_dir / "request-error.txt"
                exit_path = mode_dir / "exit-code.txt"
                try:
                    prompt = prompt_path.read_text(encoding="utf-8")
                    request_payload = build_chat_payload(prompt, generation, response_contract)
                    status, response_payload = _post_json(
                        base_url + "/v1/chat/completions",
                        request_payload,
                        timeout=request_timeout,
                    )
                    envelope_path.write_text(
                        json.dumps(response_payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                        encoding="utf-8",
                    )
                    if status != 200:
                        raise ServerPairError(f"chat completion HTTP status {status}")
                    content, finish_reason = extract_chat_content(response_payload)
                    response_path.write_text(content.rstrip() + "\n", encoding="utf-8")
                    finish_path.write_text(finish_reason + "\n", encoding="utf-8")
                    if response_contract is not None:
                        if finish_reason != "stop":
                            raise ResponseContractError(f"structured response must finish with stop, got {finish_reason}")
                        validate_content(content, response_contract, context)
                        _write_structured_validation(validation_path, "VALID", response_contract_hash)
                    exit_path.write_text("0\n", encoding="utf-8")
                    results["modes"][mode] = {
                        "exit_code": 0,
                        "finish_reason": finish_reason,
                        "structured_validation": "VALID" if response_contract is not None else None,
                    }
                except ResponseContractError as exc:
                    _write_structured_validation(validation_path, "INVALID", response_contract_hash, str(exc))
                    error_path.write_text(str(exc) + "\n", encoding="utf-8")
                    exit_path.write_text("1\n", encoding="utf-8")
                    results["modes"][mode] = {
                        "exit_code": 1,
                        "error": str(exc),
                        "structured_validation": "INVALID",
                    }
                except (OSError, UnicodeError, urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ServerPairError) as exc:
                    error_path.write_text(str(exc) + "\n", encoding="utf-8")
                    exit_path.write_text("1\n", encoding="utf-8")
                    results["modes"][mode] = {"exit_code": 1, "error": str(exc)}
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)

    (eval_root / "server-pair-summary.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server-binary", required=True)
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--eval-root", required=True)
    parser.add_argument("--generation-json", required=True)
    parser.add_argument("--response-contracts")
    parser.add_argument("--port", type=int, default=39127)
    parser.add_argument("--startup-timeout", type=float, default=120.0)
    parser.add_argument("--request-timeout", type=float, default=600.0)
    args = parser.parse_args(argv)
    try:
        generation = json.loads(args.generation_json)
        results = run_pair(
            Path(args.server_binary).resolve(),
            Path(args.model_path).resolve(),
            Path(args.eval_root).resolve(),
            generation,
            args.port,
            args.startup_timeout,
            args.request_timeout,
            Path(args.response_contracts).resolve() if args.response_contracts else None,
        )
        for mode in MODES:
            info = results["modes"].get(mode, {})
            print(f"ZERO_CREDIT_MODE_EXIT:{mode}:{info.get('exit_code', 1)}")
            if info.get("finish_reason"):
                print(f"ZERO_CREDIT_MODE_FINISH:{mode}:{info['finish_reason']}")
            if info.get("structured_validation"):
                print(f"ZERO_CREDIT_MODE_STRUCTURED:{mode}:{info['structured_validation']}")
        if results.get("response_contract_sha256"):
            print("ZERO_CREDIT_RESPONSE_CONTRACT_SHA256:" + str(results["response_contract_sha256"]))
        return 0
    except (ServerPairError, ResponseContractError, OSError, json.JSONDecodeError) as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
