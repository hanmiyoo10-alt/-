#!/usr/bin/env python3
import json
import tomllib
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
CFG_PATH = ROOT / "src-tauri" / "tauri.conf.json"
CARGO_PATH = ROOT / "src-tauri" / "Cargo.toml"
EXPECTED_URL = "https://chatgpt.com"
EXPECTED_ID = "io.hanmiyoo.mobilecoder.chatgptnologinsmoke"

cfg = json.loads(CFG_PATH.read_text())
cargo = tomllib.loads(CARGO_PATH.read_text())

def require(condition, message):
    if not condition:
        raise SystemExit(f"WEBVIEW_SHELL_CONTRACT_FAIL: {message}")

def has_key(value, forbidden):
    if isinstance(value, dict):
        return forbidden in value or any(has_key(v, forbidden) for v in value.values())
    if isinstance(value, list):
        return any(has_key(v, forbidden) for v in value)
    return False

require(cfg.get("identifier") == EXPECTED_ID, "unexpected package identifier")
require(cfg.get("build", {}).get("frontendDist") == EXPECTED_URL, "frontendDist must be exact ChatGPT HTTPS origin")
parsed = urlparse(EXPECTED_URL)
require(parsed.scheme == "https" and parsed.netloc == "chatgpt.com", "target must be HTTPS chatgpt.com")
windows = cfg.get("app", {}).get("windows", [])
require(len(windows) == 1, "exactly one WebView window required")
require(windows[0].get("url") == EXPECTED_URL, "window URL must be exact ChatGPT HTTPS origin")
require(windows[0].get("devtools") is False, "devtools must be disabled")
security = cfg.get("app", {}).get("security", {})
require(security.get("capabilities") == [], "Tauri capabilities must be explicitly empty")
require(not has_key(cfg, "remote"), "remote capability block is forbidden")
require(not (ROOT / "src-tauri" / "capabilities").exists(), "capabilities directory is forbidden")
deps = set(cargo.get("dependencies", {}))
require(deps == {"tauri"}, f"unexpected runtime dependencies: {sorted(deps)}")
source = "\n".join(p.read_text() for p in (ROOT / "src-tauri" / "src").glob("*.rs"))
for token in (".plugin(", "invoke_handler", "manage(", "tauri_plugin_shell", "shell::", "clipboard", "fs::", "std::fs", "Command::"):
    require(token not in source, f"forbidden bridge token: {token}")
print("WEBVIEW_SHELL_CONTRACT_PASS")
