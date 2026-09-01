#!/usr/bin/env python3
"""Build a bounded, source-backed repository evidence bundle for local Agent Skill evals."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
MAX_BLOCKS = 16
MAX_TOTAL_BYTES = 48_000
REF_RE = re.compile(r"^[A-Za-z0-9_./-]+$")
PATH_RE = re.compile(r"^[A-Za-z0-9_.@/+ -]+$")


class ContextError(ValueError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _git(repo_root: Path, *args: str) -> bytes:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError as exc:
        raise ContextError(f"cannot execute git: {exc}") from exc
    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "replace").strip()
        raise ContextError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout


def _validate_ref_path(ref: str, path: str) -> None:
    if not ref or not REF_RE.fullmatch(ref) or ".." in ref:
        raise ContextError(f"invalid ref: {ref!r}")
    if not path or not PATH_RE.fullmatch(path) or path.startswith("/") or ".." in Path(path).parts:
        raise ContextError(f"invalid path: {path!r}")


def _resolve_commit(repo_root: Path, ref: str) -> str:
    value = _git(repo_root, "rev-parse", f"{ref}^{{commit}}").decode("ascii", "strict").strip()
    if not re.fullmatch(r"[0-9a-f]{40,64}", value):
        raise ContextError(f"resolved commit malformed for {ref}: {value!r}")
    return value


def _read_ref_path(repo_root: Path, ref: str, path: str) -> bytes:
    _validate_ref_path(ref, path)
    return _git(repo_root, "show", f"{ref}:{path}")


def _extract_full(raw: bytes, spec: dict[str, Any]) -> str:
    limit = int(spec.get("max_bytes", 0))
    if limit <= 0 or limit > MAX_TOTAL_BYTES:
        raise ContextError("full extraction requires bounded max_bytes")
    if len(raw) > limit:
        raise ContextError(f"full source exceeds max_bytes: {len(raw)} > {limit}")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ContextError("source is not UTF-8 text") from exc


def _extract_needles(raw: bytes, spec: dict[str, Any]) -> str:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ContextError("source is not UTF-8 text") from exc
    needles = spec.get("needles")
    radius = int(spec.get("radius", 0))
    max_bytes = int(spec.get("max_bytes", 0))
    if not isinstance(needles, list) or not needles or any(not isinstance(x, str) or not x for x in needles):
        raise ContextError("needle_windows requires non-empty string needles")
    if radius < 0 or radius > 40:
        raise ContextError("needle window radius out of bounds")
    if max_bytes <= 0 or max_bytes > MAX_TOTAL_BYTES:
        raise ContextError("needle_windows requires bounded max_bytes")
    lines = text.splitlines()
    selected: set[int] = set()
    for needle in needles:
        matches = [idx for idx, line in enumerate(lines) if needle in line]
        if not matches:
            raise ContextError(f"required needle not found: {needle!r}")
        for idx in matches:
            start = max(0, idx - radius)
            end = min(len(lines), idx + radius + 1)
            selected.update(range(start, end))
    rendered = "\n".join(f"{idx + 1}: {lines[idx]}" for idx in sorted(selected)) + "\n"
    if len(rendered.encode("utf-8")) > max_bytes:
        raise ContextError("extracted needle windows exceed max_bytes")
    return rendered


def build_context(repo_root: Path, profile_path: Path, skill: str, case_id: str) -> dict[str, Any]:
    try:
        profile_doc = json.loads(profile_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ContextError(f"cannot read context profile: {exc}") from exc
    if not isinstance(profile_doc, dict) or profile_doc.get("schema_version") != SCHEMA_VERSION:
        raise ContextError("unsupported context profile schema")
    profiles = profile_doc.get("profiles")
    if not isinstance(profiles, dict):
        raise ContextError("context profiles object missing")
    skill_profiles = profiles.get(skill)
    if not isinstance(skill_profiles, dict):
        raise ContextError(f"no context profile for skill: {skill}")
    specs = skill_profiles.get(str(case_id))
    if not isinstance(specs, list):
        raise ContextError(f"no context profile for {skill}:{case_id}")
    if len(specs) > MAX_BLOCKS:
        raise ContextError("context profile exceeds block limit")

    blocks: list[dict[str, Any]] = []
    total = 0
    for index, spec in enumerate(specs, start=1):
        if not isinstance(spec, dict):
            raise ContextError(f"context block {index} must be an object")
        ref = spec.get("ref")
        path = spec.get("path")
        mode = spec.get("mode")
        if not isinstance(ref, str) or not isinstance(path, str):
            raise ContextError(f"context block {index} missing ref/path")
        _validate_ref_path(ref, path)
        raw = _read_ref_path(repo_root, ref, path)
        resolved = _resolve_commit(repo_root, ref)
        if mode == "full":
            extracted = _extract_full(raw, spec)
        elif mode == "needle_windows":
            extracted = _extract_needles(raw, spec)
        else:
            raise ContextError(f"unsupported extraction mode: {mode!r}")
        extracted_bytes = extracted.encode("utf-8")
        total += len(extracted_bytes)
        if total > MAX_TOTAL_BYTES:
            raise ContextError("context bundle exceeds total byte limit")
        blocks.append(
            {
                "index": index,
                "ref": ref,
                "resolved_commit_sha": resolved,
                "path": path,
                "source_sha256": sha256_bytes(raw),
                "extraction": {k: spec[k] for k in sorted(spec) if k not in {"ref", "path"}},
                "extracted_sha256": sha256_bytes(extracted_bytes),
                "text": extracted,
            }
        )

    context_text_parts = []
    for block in blocks:
        context_text_parts.append(
            f"--- SOURCE {block['index']} {block['ref']}:{block['path']} @ {block['resolved_commit_sha']} ---\n"
            f"{block['text']}"
        )
    context_text = "\n".join(context_text_parts)
    context_bytes = context_text.encode("utf-8")
    return {
        "schema_version": SCHEMA_VERSION,
        "skill": skill,
        "case_id": str(case_id),
        "profile_path": str(profile_path),
        "profile_sha256": sha256_bytes(profile_path.read_bytes()),
        "blocks": blocks,
        "context_text": context_text,
        "context_sha256": sha256_bytes(context_bytes),
        "context_bytes": len(context_bytes),
    }


def _write(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path is None:
        sys.stdout.write(text)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--profile", required=True)
    parser.add_argument("--skill", required=True)
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        payload = build_context(
            Path(args.repo_root).resolve(),
            Path(args.profile).resolve(),
            args.skill,
            args.case_id,
        )
        _write(Path(args.output) if args.output else None, payload)
    except ContextError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
