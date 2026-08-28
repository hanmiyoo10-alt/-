from __future__ import annotations

import json
import os
from typing import Any, Callable
from urllib import error, parse, request

API_BASE_URL = "https://api.openai.com/v1"
TERMINAL_STATUSES = {"completed", "failed", "cancelled", "incomplete"}
ACTIVE_STATUSES = {"queued", "in_progress"}
KNOWN_STATUSES = TERMINAL_STATUSES | ACTIVE_STATUSES


class ApiError(RuntimeError):
    def __init__(self, status_code: int | None, message: str) -> None:
        self.status_code = status_code
        self.safe_message = message
        label = f"HTTP {status_code}" if status_code is not None else "network"
        super().__init__(f"OpenAI API {label}: {message}")


def _safe_error_message(raw: bytes) -> str:
    try:
        payload = json.loads(raw.decode("utf-8", errors="replace"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return "request failed"
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict) and isinstance(err.get("message"), str):
            return err["message"][:500]
    return "request failed"


class OpenAIBackend:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = API_BASE_URL,
        timeout: float = 30.0,
        opener: Callable[..., Any] = request.urlopen,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ApiError(None, "OPENAI_API_KEY is not set")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.opener = opener

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        body = None
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "termux-background-gpt/0.1-prototype",
        }
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = request.Request(self.base_url + path, data=body, headers=headers, method=method)
        try:
            with self.opener(req, timeout=self.timeout) as response:
                raw = response.read()
        except error.HTTPError as exc:
            raw = exc.read() if hasattr(exc, "read") else b""
            raise ApiError(exc.code, _safe_error_message(raw)) from None
        except error.URLError as exc:
            raise ApiError(None, str(exc.reason)[:300]) from None
        try:
            result = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ApiError(None, "API returned invalid JSON") from None
        if not isinstance(result, dict):
            raise ApiError(None, "API returned a non-object response")
        return result

    def submit(self, prompt: str, model: str) -> dict[str, Any]:
        if not prompt.strip():
            raise ValueError("prompt must not be empty")
        if not model.strip():
            raise ValueError("model must not be empty")
        return self._request(
            "POST",
            "/responses",
            {"model": model, "input": prompt, "background": True},
        )

    def retrieve(self, response_id: str) -> dict[str, Any]:
        response_id = _validate_response_id(response_id)
        return self._request("GET", f"/responses/{parse.quote(response_id, safe='')}")

    def cancel(self, response_id: str) -> dict[str, Any]:
        response_id = _validate_response_id(response_id)
        return self._request("POST", f"/responses/{parse.quote(response_id, safe='')}/cancel", {})


def _validate_response_id(response_id: str) -> str:
    value = str(response_id).strip()
    if not value or "/" in value or "\\" in value:
        raise ValueError("invalid response id")
    return value


def response_status(response: dict[str, Any]) -> str:
    value = response.get("status")
    return value if isinstance(value, str) else "unknown"


def response_id(response: dict[str, Any]) -> str:
    value = response.get("id")
    if not isinstance(value, str) or not value:
        raise ApiError(None, "response did not contain an id")
    return value


def extract_output_text(response: dict[str, Any]) -> str:
    direct = response.get("output_text")
    if isinstance(direct, str) and direct:
        return direct

    chunks: list[str] = []
    output = response.get("output")
    if not isinstance(output, list):
        return ""
    for item in output:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                chunks.append(part["text"])
            elif part.get("type") == "refusal" and isinstance(part.get("refusal"), str):
                chunks.append(part["refusal"])
    return "\n".join(chunk for chunk in chunks if chunk)
