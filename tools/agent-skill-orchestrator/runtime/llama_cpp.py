from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path
from typing import Any

from runtime.generation import TRANSPORT, validate_generation

HOST = "127.0.0.1"
MODEL_ALIAS = "agent-skill-scout"


class LlamaRuntimeError(ValueError):
    pass


def sha256_file(path: Path | str) -> str:
    target = Path(path)
    digest = hashlib.sha256()
    with target.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_file_sha256(path: Path | str, expected_sha256: str) -> None:
    actual = sha256_file(path)
    if actual != expected_sha256:
        raise LlamaRuntimeError(f"artifact sha256 mismatch: expected {expected_sha256}, got {actual}")


def build_server_command(
    server_binary: Path | str,
    model_path: Path | str,
    generation: dict[str, Any],
    port: int,
) -> list[str]:
    validate_generation(generation)
    binary = Path(server_binary)
    model = Path(model_path)
    if not binary.is_file():
        raise LlamaRuntimeError("llama-server binary missing")
    if not model.is_file():
        raise LlamaRuntimeError("local model missing")
    if port < 1024 or port > 65535:
        raise LlamaRuntimeError("invalid loopback port")
    return [
        str(binary),
        "-m", str(model),
        "--alias", MODEL_ALIAS,
        "--host", HOST,
        "--port", str(port),
        "--ctx-size", str(generation["ctx_size"]),
        "--threads", str(generation["threads"]),
        "--n-gpu-layers", str(generation["gpu_layers"]),
    ]


def start_server(
    server_binary: Path | str,
    model_path: Path | str,
    generation: dict[str, Any],
    port: int,
    log_handle: Any,
) -> subprocess.Popen[Any]:
    command = build_server_command(server_binary, model_path, generation, port)
    return subprocess.Popen(command, stdout=log_handle, stderr=subprocess.STDOUT)


def stop_server(process: subprocess.Popen[Any]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def classify_finish_reason(finish_reason: str) -> str:
    if not isinstance(finish_reason, str) or not finish_reason.strip():
        return "INVALID"
    return "COMPLETED" if finish_reason == "stop" else "EXECUTION_INCOMPLETE"


def runtime_transport() -> str:
    return TRANSPORT
