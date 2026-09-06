from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class LocalBridgeReadError(RuntimeError):
    def __init__(self, source: str, message: str) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message


@dataclass(frozen=True)
class LocalBridgeConfig:
    base_url: str = "http://127.0.0.1:39117"
    timeout_seconds: float = 5.0
    token_file: str | None = None

    @classmethod
    def from_env(cls) -> "LocalBridgeConfig":
        try:
            timeout = float(os.getenv("USAGE_DASHBOARD_MCP_BRIDGE_TIMEOUT_SECONDS", "5"))
        except ValueError:
            timeout = 5.0
        timeout = min(max(timeout, 0.5), 15.0)
        return cls(
            base_url=os.getenv("USAGE_DASHBOARD_MCP_BRIDGE_URL", "http://127.0.0.1:39117").rstrip("/"),
            timeout_seconds=timeout,
            token_file=os.getenv("USAGE_DASHBOARD_MCP_BRIDGE_TOKEN_FILE") or None,
        )


class LocalBridgeReader:
    """Exact-allowlist localhost reader. Credentials never leave this object."""

    def __init__(self, config: LocalBridgeConfig | None = None) -> None:
        self.config = config or LocalBridgeConfig.from_env()

    def _validated_base_url(self) -> str:
        parsed = urllib.parse.urlsplit(self.config.base_url)
        if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "::1"}:
            raise LocalBridgeReadError("local-bridge", "bridge URL must use loopback HTTP")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise LocalBridgeReadError("local-bridge", "bridge URL contains unsupported components")
        return self.config.base_url.rstrip("/")

    def _request_json(self, path: str, *, token: str | None = None) -> dict[str, Any]:
        if path not in ("/health", "/snapshot?profile=light"):
            raise LocalBridgeReadError("local-bridge", "route not allowlisted")
        base_url = self._validated_base_url()
        headers = {"Accept": "application/json", "Cache-Control": "no-cache"}
        if token:
            headers["X-DevPass-Bridge-Key"] = token
        request = urllib.request.Request(f"{base_url}{path}", headers=headers, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                payload = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raise LocalBridgeReadError(path, f"HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise LocalBridgeReadError(path, f"network error: {exc.reason}") from exc
        except TimeoutError as exc:
            raise LocalBridgeReadError(path, "request timeout") from exc
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise LocalBridgeReadError(path, "invalid JSON response") from exc
        if not isinstance(parsed, dict):
            raise LocalBridgeReadError(path, "JSON root is not an object")
        return parsed

    def _token_candidates(self) -> list[Path]:
        candidates: list[Path] = []
        if self.config.token_file:
            candidates.append(Path(self.config.token_file).expanduser())
        home = Path.home()
        candidates.extend(
            [
                home / ".config" / "llmgateway-devpass-bridge" / "token",
                home / ".config" / "local-usage-dashboard" / "token",
            ]
        )
        return candidates

    def read_token(self) -> str | None:
        for path in self._token_candidates():
            try:
                value = path.read_text(encoding="utf-8").strip()
            except OSError:
                continue
            if value:
                return value
        return None

    def get_health(self) -> dict[str, Any]:
        return self._request_json("/health")

    def get_light_snapshot(self) -> dict[str, Any] | None:
        token = self.read_token()
        if not token:
            return None
        return self._request_json("/snapshot?profile=light", token=token)
