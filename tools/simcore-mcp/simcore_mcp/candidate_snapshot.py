from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

LATEST_PATH = "plugins/simcore/latest.js"
INSTALL_PATH = "plugins/simcore/install.js"
PROFILE_PREFIX = "products/simcore/releases/validation-profiles"
PRODUCTION_ALLOWLIST = frozenset({LATEST_PATH, INSTALL_PATH})
EXACT_VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
USER_VERSION_RE = re.compile(r"(?m)^//@version\s+([^\s]+)\s*$")
RUNTIME_VERSION_RE = re.compile(
    r"(?m)^\s*const\s+SIMCORE_RUNTIME_VERSION\s*=\s*['\"]([^'\"]+)['\"]\s*;\s*$"
)
HOST_VERSION_RE = re.compile(
    r"(?m)^\s*const\s+HOST_COMPAT_VERSION\s*=\s*['\"]([^'\"]+)['\"]\s*;\s*$"
)


def _check(
    code: str,
    passed: bool,
    expected: Any,
    actual: Any,
    source: str,
) -> dict[str, Any]:
    return {
        "code": code,
        "pass": bool(passed),
        "expected": expected,
        "actual": actual,
        "source": source,
    }


def _valid_ref(value: str) -> bool:
    if not isinstance(value, str):
        return False
    if value != value.strip() or not value or len(value) > 256:
        return False
    return not any(ord(ch) < 32 or ord(ch) == 127 for ch in value)


def _one(matches: list[str]) -> str | None:
    if len(matches) != 1:
        return None
    value = matches[0].strip()
    return value or None


def _parse_identity(text: str) -> dict[str, Any]:
    userscript_matches = USER_VERSION_RE.findall(text)
    runtime_matches = RUNTIME_VERSION_RE.findall(text)
    host_matches = HOST_VERSION_RE.findall(text)

    userscript = _one(userscript_matches)
    runtime = _one(runtime_matches)
    host = _one(host_matches)

    release_matches: list[str] = []
    if userscript:
        release_re = re.compile(
            rf"(?m)^//\s*v{re.escape(userscript)}\s+(.+):\s*$"
        )
        release_matches = [item.strip() for item in release_re.findall(text)]
    release_name = _one(release_matches)

    return {
        "userscript_version": userscript,
        "runtime_version": runtime,
        "host_version": host,
        "release_name": release_name,
        "counts": {
            "userscript_version": len(userscript_matches),
            "runtime_version": len(runtime_matches),
            "host_version": len(host_matches),
            "release_name": len(release_matches),
        },
        "converged": bool(
            userscript
            and runtime
            and host
            and userscript == runtime == host
        ),
    }


def _commit_subject(commit: dict[str, Any]) -> str | None:
    payload = commit.get("commit")
    if not isinstance(payload, dict):
        return None
    message = payload.get("message")
    if not isinstance(message, str) or not message:
        return None
    return message.splitlines()[0]


def _parents(commit: dict[str, Any]) -> list[str]:
    raw = commit.get("parents")
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        sha = item.get("sha")
        if isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{40}", sha):
            out.append(sha)
    return out


def candidate_snapshot(reader: GitHubReader, ref: str) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    violations: list[str] = []
    errors: list[dict[str, str]] = []

    requested_ref = ref
    ref_valid = _valid_ref(ref)
    checks.append(_check("REF_VALID", ref_valid, "non-empty bounded Git ref", ref, "input:ref"))

    resolved_sha: str | None = None
    commit: dict[str, Any] | None = None
    subject: str | None = None
    parent_shas: list[str] = []

    if ref_valid:
        try:
            commit = reader.get_commit(ref)
            candidate_sha = commit.get("sha")
            if isinstance(candidate_sha, str) and re.fullmatch(r"[0-9a-f]{40}", candidate_sha):
                resolved_sha = candidate_sha
                subject = _commit_subject(commit)
                parent_shas = _parents(commit)
            else:
                errors.append({"source": f"commit:{ref}", "message": "resolved commit sha invalid"})
        except GitHubReadError as exc:
            errors.append({"source": exc.source, "message": exc.message})
    else:
        errors.append({"source": "input:ref", "message": "invalid ref"})

    checks.append(
        _check("REF_RESOLVED", resolved_sha is not None, "40-hex resolved commit SHA", resolved_sha, "commit:resolver")
    )
    checks.append(
        _check("CANDIDATE_COMMIT_AVAILABLE", commit is not None and resolved_sha is not None, "readable GitHub commit", "available" if commit else "unavailable", f"commit:{ref}")
    )

    main_sha: str | None = None
    release_sha: str | None = None
    try:
        main_sha = reader.get_branch_sha(reader.main_branch)
    except GitHubReadError as exc:
        errors.append({"source": exc.source, "message": exc.message})
    checks.append(
        _check("MAIN_CONTEXT_AVAILABLE", main_sha is not None, "current main SHA", main_sha, f"branch:{reader.main_branch}")
    )

    try:
        release_sha = reader.get_branch_sha(reader.release_branch)
    except GitHubReadError as exc:
        errors.append({"source": exc.source, "message": exc.message})

    file_data: dict[str, dict[str, Any]] = {
        "latest": {"path": LATEST_PATH, "available": False, "blob": None},
        "install": {"path": INSTALL_PATH, "available": False, "blob": None},
    }
    texts: dict[str, str | None] = {"latest": None, "install": None}

    if resolved_sha:
        for key, path in (("latest", LATEST_PATH), ("install", INSTALL_PATH)):
            try:
                text, blob = reader.get_file(path, resolved_sha)
                texts[key] = text
                file_data[key] = {"path": path, "available": True, "blob": blob}
            except GitHubReadError as exc:
                errors.append({"source": exc.source, "message": exc.message})

    latest_available = file_data["latest"]["available"]
    install_available = file_data["install"]["available"]
    checks.append(_check("LATEST_AVAILABLE", latest_available, True, latest_available, f"{resolved_sha}:{LATEST_PATH}"))
    checks.append(_check("INSTALL_AVAILABLE", install_available, True, install_available, f"{resolved_sha}:{INSTALL_PATH}"))

    parity = bool(
        latest_available
        and install_available
        and file_data["latest"]["blob"] == file_data["install"]["blob"]
    )
    checks.append(
        _check(
            "LATEST_INSTALL_PARITY",
            parity,
            "identical Git blob SHA",
            {
                "latest_blob": file_data["latest"]["blob"],
                "install_blob": file_data["install"]["blob"],
                "identical": parity,
            },
            "candidate:production-files",
        )
    )

    identities: dict[str, dict[str, Any] | None] = {"latest": None, "install": None}
    for key in ("latest", "install"):
        if texts[key] is not None:
            identities[key] = _parse_identity(texts[key] or "")

    def identity_checks(prefix: str, key: str, path: str) -> None:
        identity = identities[key] or {
            "userscript_version": None,
            "runtime_version": None,
            "host_version": None,
            "release_name": None,
            "counts": {},
            "converged": False,
        }
        userscript = identity["userscript_version"]
        runtime = identity["runtime_version"]
        host = identity["host_version"]
        release_name = identity["release_name"]
        checks.extend(
            [
                _check(f"{prefix}_USER_VERSION_VALID", bool(userscript and EXACT_VERSION_RE.fullmatch(userscript)), "exact X.Y.Z", userscript, f"{resolved_sha}:{path}:userscript-version"),
                _check(f"{prefix}_RUNTIME_VERSION_VALID", bool(runtime and EXACT_VERSION_RE.fullmatch(runtime)), "exact X.Y.Z", runtime, f"{resolved_sha}:{path}:runtime-version"),
                _check(f"{prefix}_HOST_VERSION_VALID", bool(host and EXACT_VERSION_RE.fullmatch(host)), "exact X.Y.Z", host, f"{resolved_sha}:{path}:host-version"),
                _check(f"{prefix}_IDENTITY_CONVERGED", bool(identity["converged"]), "userscript == runtime == Host", {"userscript": userscript, "runtime": runtime, "host": host}, f"{resolved_sha}:{path}"),
                _check(f"{prefix}_RELEASE_NAME_VALID", bool(release_name), "exactly one non-empty current-version release header", {"release_name": release_name, "count": identity.get("counts", {}).get("release_name", 0)}, f"{resolved_sha}:{path}:release-name"),
            ]
        )

    identity_checks("LATEST", "latest", LATEST_PATH)
    identity_checks("INSTALL", "install", INSTALL_PATH)

    latest_identity = identities["latest"]
    install_identity = identities["install"]
    identity_match = bool(
        latest_identity
        and install_identity
        and all(
            latest_identity.get(key) == install_identity.get(key)
            for key in ("userscript_version", "runtime_version", "host_version", "release_name")
        )
    )
    checks.append(
        _check(
            "LATEST_INSTALL_IDENTITY_MATCH",
            identity_match,
            "identical parsed identity",
            {
                "latest": latest_identity,
                "install": install_identity,
            },
            "candidate:parsed-identity",
        )
    )

    single_parent = len(parent_shas) == 1
    candidate_parent = parent_shas[0] if single_parent else None
    checks.append(
        _check("CANDIDATE_SINGLE_PARENT", single_parent, 1, len(parent_shas), f"commit:{resolved_sha}:parents")
    )
    parent_matches = bool(single_parent and release_sha and candidate_parent == release_sha)
    checks.append(
        _check(
            "CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION",
            parent_matches,
            release_sha,
            candidate_parent,
            f"commit:{resolved_sha}:parent+branch:{reader.release_branch}",
        )
    )

    changed_paths: list[str] | None = None
    paths_bounded = False
    if resolved_sha and single_parent and candidate_parent:
        try:
            comparison = reader.compare_commits(candidate_parent, resolved_sha)
            raw_files = comparison.get("files")
            if isinstance(raw_files, list):
                changed_paths = sorted(
                    item["filename"]
                    for item in raw_files
                    if isinstance(item, dict) and isinstance(item.get("filename"), str)
                )
                paths_bounded = bool(changed_paths) and set(changed_paths).issubset(PRODUCTION_ALLOWLIST)
            else:
                errors.append({"source": f"compare:{candidate_parent}...{resolved_sha}", "message": "files is not a list"})
        except GitHubReadError as exc:
            errors.append({"source": exc.source, "message": exc.message})
    checks.append(
        _check(
            "CANDIDATE_CHANGED_PATHS_BOUNDED",
            paths_bounded,
            sorted(PRODUCTION_ALLOWLIST),
            changed_paths,
            f"compare:{candidate_parent}...{resolved_sha}" if candidate_parent and resolved_sha else "candidate:first-parent-diff",
        )
    )

    candidate_version = latest_identity.get("userscript_version") if latest_identity else None
    profile_context: dict[str, Any] = {
        "main_sha": main_sha,
        "path": None,
        "available": False,
        "blob": None,
        "schemaVersion": None,
        "releaseVersion": None,
        "releaseName": None,
        "error": None,
    }
    if main_sha and isinstance(candidate_version, str) and EXACT_VERSION_RE.fullmatch(candidate_version):
        profile_path = f"{PROFILE_PREFIX}/{candidate_version}.json"
        profile_context["path"] = profile_path
        try:
            profile, profile_blob = reader.get_json_file(profile_path, main_sha)
            profile_context.update(
                {
                    "available": True,
                    "blob": profile_blob,
                    "schemaVersion": profile.get("schemaVersion"),
                    "releaseVersion": profile.get("releaseVersion"),
                    "releaseName": profile.get("releaseName"),
                }
            )
        except GitHubReadError as exc:
            profile_context["error"] = {"source": exc.source, "message": exc.message}

    profile_available = bool(profile_context["available"])
    checks.append(
        _check(
            "VALIDATION_PROFILE_CONTEXT_AVAILABLE",
            profile_available,
            "readable profile from frozen main SHA",
            {
                "main_sha": main_sha,
                "path": profile_context["path"],
                "available": profile_available,
                "blob": profile_context["blob"],
            },
            "main:validation-profile-context",
        )
    )
    profile_version_match = bool(
        profile_available
        and candidate_version
        and profile_context["releaseVersion"] == candidate_version
    )
    checks.append(
        _check(
            "VALIDATION_PROFILE_VERSION_CONTEXT_MATCH",
            profile_version_match,
            candidate_version,
            profile_context["releaseVersion"],
            f"{main_sha}:{profile_context['path']}:releaseVersion",
        )
    )

    check_map = {item["code"]: item["pass"] for item in checks}

    for item in checks:
        if not item["pass"]:
            violations.append(item["code"])

    fatal_false_codes = {
        "REF_VALID",
        "REF_RESOLVED",
        "CANDIDATE_COMMIT_AVAILABLE",
        "LATEST_AVAILABLE",
        "INSTALL_AVAILABLE",
        "LATEST_USER_VERSION_VALID",
        "LATEST_RUNTIME_VERSION_VALID",
        "LATEST_HOST_VERSION_VALID",
        "LATEST_RELEASE_NAME_VALID",
        "INSTALL_USER_VERSION_VALID",
        "INSTALL_RUNTIME_VERSION_VALID",
        "INSTALL_HOST_VERSION_VALID",
        "INSTALL_RELEASE_NAME_VALID",
        "MAIN_CONTEXT_AVAILABLE",
    }
    fatal_check_failure = any(not check_map.get(code, False) for code in fatal_false_codes)

    for code in sorted(fatal_false_codes):
        if not check_map.get(code, False) and code not in {"REF_VALID", "REF_RESOLVED", "CANDIDATE_COMMIT_AVAILABLE", "LATEST_AVAILABLE", "INSTALL_AVAILABLE", "MAIN_CONTEXT_AVAILABLE"}:
            errors.append({"source": f"check:{code}", "message": "required candidate snapshot identity parse failed"})

    shape_reason_codes = [
        code
        for code in (
            "CANDIDATE_SINGLE_PARENT",
            "CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION",
            "LATEST_AVAILABLE",
            "INSTALL_AVAILABLE",
            "LATEST_INSTALL_PARITY",
            "CANDIDATE_CHANGED_PATHS_BOUNDED",
            "LATEST_IDENTITY_CONVERGED",
            "LATEST_RELEASE_NAME_VALID",
            "INSTALL_IDENTITY_CONVERGED",
            "INSTALL_RELEASE_NAME_VALID",
            "LATEST_INSTALL_IDENTITY_MATCH",
        )
        if not check_map.get(code, False)
    ]
    canonical_pass = not shape_reason_codes

    return {
        "ok": bool(resolved_sha and not fatal_check_failure and not errors),
        "repository": reader.repository,
        "requested_ref": requested_ref,
        "resolved": {
            "sha": resolved_sha,
            "immutable": bool(resolved_sha),
        },
        "candidate": {
            "sha": resolved_sha,
            "subject": subject,
            "parents": parent_shas,
            "parent_count": len(parent_shas),
        },
        "files": file_data,
        "identity": identities,
        "diff": {
            "base_parent": candidate_parent,
            "changed_paths": changed_paths,
            "allowlist": sorted(PRODUCTION_ALLOWLIST),
        },
        "production_context": {
            "main_sha": main_sha,
            "release_branch": reader.release_branch,
            "release_head": release_sha,
            "candidate_parent": candidate_parent,
            "parent_matches_release_head": parent_matches,
        },
        "canonical_candidate_shape": {
            "pass": canonical_pass,
            "reasons": shape_reason_codes,
        },
        "validation_profile_context": profile_context,
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }


def build_candidate_snapshot(reader: GitHubReader, ref: str) -> dict[str, Any]:
    return candidate_snapshot(reader, ref)
