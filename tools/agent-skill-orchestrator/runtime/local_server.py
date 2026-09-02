from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

from runtime.generation import TRANSPORT, validate_generation
from runtime.llama_cpp import HOST, MODEL_ALIAS, LlamaRuntimeError

MAX_RESPONSE_BYTES = 128_000


def _read_json_response(response: Any) -> dict[str, Any]:
    raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise LlamaRuntimeError("HTTP response exceeds bound")
    payload = json.loads(raw.decode("utf-8"))
    if not isinstance(payload, dict):
        raise LlamaRuntimeError("HTTP response must be a JSON object")
    return payload


def wait_for_health(port: int, process: Any, timeout_seconds: float = 120.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    url = f"http://{HOST}:{port}/health"
    last_error = "not ready"
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise LlamaRuntimeError(f"llama-server exited during startup: {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=2.0) as response:
                payload = _read_json_response(response)
                if int(response.status) == 200 and payload.get("status") == "ok":
                    return
                last_error = repr(payload)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, UnicodeError, json.JSONDecodeError, LlamaRuntimeError) as exc:
            last_error = str(exc)
        time.sleep(0.5)
    raise LlamaRuntimeError(f"llama-server health timeout: {last_error}")


def build_chat_payload(
    prompt: str,
    generation: dict[str, Any],
    response_schema: dict[str, Any],
) -> dict[str, Any]:
    validate_generation(generation)
    if not isinstance(prompt, str) or not prompt.strip():
        raise LlamaRuntimeError("prompt is empty")
    if not isinstance(response_schema, dict) or not response_schema:
        raise LlamaRuntimeError("response schema is missing")
    return {
        "model": MODEL_ALIAS,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": generation["temperature"],
        "seed": generation["seed"],
        "max_tokens": generation["n_predict"],
        "stream": False,
        "response_format": {"type": "json_object", "schema": response_schema},
    }


def post_chat_completion(
    port: int,
    prompt: str,
    generation: dict[str, Any],
    response_schema: dict[str, Any],
    timeout_seconds: float = 600.0,
) -> tuple[str, str, dict[str, Any]]:
    payload = build_chat_payload(prompt, generation, response_schema)
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        f"http://{HOST}:{port}/v1/chat/completions",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        if int(response.status) != 200:
            raise LlamaRuntimeError(f"chat completion HTTP status {response.status}")
        envelope = _read_json_response(response)
    try:
        choice = envelope["choices"][0]
        content = choice["message"]["content"]
        finish_reason = choice["finish_reason"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LlamaRuntimeError("chat completion response shape is invalid") from exc
    if not isinstance(content, str) or not content.strip():
        raise LlamaRuntimeError("chat completion content is empty")
    if not isinstance(finish_reason, str) or not finish_reason.strip():
        raise LlamaRuntimeError("chat completion finish reason is missing")
    return content, finish_reason, envelope


def transport_id() -> str:
    return TRANSPORT
