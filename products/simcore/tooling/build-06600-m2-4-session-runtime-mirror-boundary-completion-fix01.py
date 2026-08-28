#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re
import subprocess
import sys

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
BASE_BUILDER = Path("products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion.py")
BASE_BUILDER_RAW_SHA256 = "ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50"
TARGET_VERSION = "0.66.0"
LEGACY_ADAPTER = Path("scripts/simcore-06406-closure-completion-gate-test.mjs")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def module_bounds(text: str, name: str):
    start_token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(start_token)
    if start < 0:
        raise SystemExit(f"06600_FIX01_MODULE_MISSING {name}")
    next_start = text.find('\nSimCore.define("', start + len(start_token))
    end = next_start if next_start >= 0 else len(text)
    return start, end


def module_text(text: str, name: str) -> str:
    start, end = module_bounds(text, name)
    return text[start:end]


def replace_module(text: str, name: str, replacement: str) -> str:
    start, end = module_bounds(text, name)
    return text[:start] + replacement.rstrip() + "\n" + text[end:]


def run_checked(command, label: str):
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode != 0:
        if result.stdout:
            print(result.stdout, file=sys.stderr, end="" if result.stdout.endswith("\n") else "\n")
        if result.stderr:
            print(result.stderr, file=sys.stderr, end="" if result.stderr.endswith("\n") else "\n")
        raise SystemExit(f"06600_FIX01_{label}_FAIL exit={result.returncode}")
    return result


def patch_session_export(text: str) -> str:
    session = module_text(text, "session")
    stale_export = "  prepareTurn: lifecycle.prepareTurn,\n  recovery,\n};"
    repaired_export = "  prepareTurn: lifecycle.prepareTurn,\n};"
    count = session.count(stale_export)
    if count != 1:
        raise SystemExit(f"06600_FIX01_SESSION_EXPORT_ANCHOR_INVALID count={count}")
    session = session.replace(stale_export, repaired_export, 1)

    if "require('./recovery')" in session or "recovery." in session:
        raise SystemExit("06600_FIX01_SESSION_RECOVERY_RUNTIME_CALLER_REMAINS")
    if re.search(r"(?m)^\s*recovery,\s*$", session):
        raise SystemExit("06600_FIX01_SESSION_DANGLING_RECOVERY_EXPORT_REMAINS")

    return replace_module(text, "session", session)


def verify_recovery_facade(text: str):
    recovery = module_text(text, "recovery")
    required = [
        "classifyPreamble: outputCompat.classifyPreamble",
        "prepareOutput: outputCompat.prepareOutput",
        "bootstrapFromHistory: bootstrapMigration.bootstrapFromHistory",
        "repairLegacyClockState: bootstrapMigration.repairLegacyClockState",
    ]
    missing = [token for token in required if token not in recovery]
    if missing:
        raise SystemExit(f"06600_FIX01_RECOVERY_FACADE_REGRESSION missing={missing}")


def verify_version(text: str):
    if f"//@version {TARGET_VERSION}" not in text:
        raise SystemExit("06600_FIX01_VERSION_HEADER_INVALID")
    if "const SIMCORE_RUNTIME_VERSION = '0.66.0';" not in text:
        raise SystemExit("06600_FIX01_RUNTIME_VERSION_INVALID")
    if "const HOST_COMPAT_VERSION = '0.66.0';" not in text:
        raise SystemExit("06600_FIX01_HOST_VERSION_INVALID")


def main():
    if not BASE_BUILDER.exists():
        raise SystemExit("06600_FIX01_BASE_BUILDER_MISSING")
    raw_hash = sha256_bytes(BASE_BUILDER.read_bytes())
    if raw_hash != BASE_BUILDER_RAW_SHA256:
        raise SystemExit(
            f"06600_FIX01_BASE_BUILDER_IDENTITY_MISMATCH expected={BASE_BUILDER_RAW_SHA256} actual={raw_hash}"
        )

    # Preserve the failed new-02 builder as immutable provenance and compose exactly one runtime repair.
    run_checked([sys.executable, str(BASE_BUILDER)], "BASE_BUILDER")

    for path in FILES:
        if not path.exists():
            raise SystemExit(f"06600_FIX01_OUTPUT_MISSING {path}")
        text = path.read_text(encoding="utf-8")
        text = patch_session_export(text)
        verify_recovery_facade(text)
        verify_version(text)
        path.write_text(text, encoding="utf-8")

    latest = FILES[0].read_bytes()
    install = FILES[1].read_bytes()
    if latest != install:
        raise SystemExit("06600_FIX01_LATEST_INSTALL_MISMATCH")

    # The exact compatibility adapter that blocked Permanent Required must now execute successfully.
    for path in FILES:
        run_checked(["node", "--check", str(path)], f"NODE_CHECK_{path.name.upper()}")
        run_checked(["node", str(LEGACY_ADAPTER), str(path)], f"LEGACY_COMPAT_{path.name.upper()}")

    digest = sha256_bytes(latest)
    print("06600_FIX01_BUILD_PASS")
    print(f"version={TARGET_VERSION}")
    print(f"bytes={len(latest)}")
    print(f"sha256={digest}")


if __name__ == "__main__":
    main()
