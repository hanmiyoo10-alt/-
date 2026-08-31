from __future__ import annotations

import argparse
import json
from pathlib import Path

PILOT_VALIDATED_SCOPES = {"plugin:usage-dashboard"}
DEFAULT_EXTENSIONS = {
    ".js", ".cjs", ".mjs", ".ts", ".tsx", ".py", ".json", ".md",
    ".yml", ".yaml", ".sh", ".html", ".css", ".txt"
}
SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", "__pycache__"}


class DiscoveryError(Exception):
    def __init__(self, message: str, exit_code: int = 2) -> None:
        super().__init__(message)
        self.exit_code = exit_code


def _inside(root: Path, candidate: Path) -> bool:
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _iter_files(repo_root: Path, roots: list[str], max_file_bytes: int):
    seen: set[Path] = set()
    for rel in roots:
        target = (repo_root / rel).resolve()
        if not _inside(repo_root, target):
            raise DiscoveryError(f"root escapes repository: {rel}")
        if not target.exists():
            raise DiscoveryError(f"root does not exist: {rel}")
        candidates = [target] if target.is_file() else target.rglob("*")
        for path in candidates:
            if not path.is_file() or path in seen:
                continue
            rel_parts = path.relative_to(repo_root).parts
            if any(part in SKIP_DIRS for part in rel_parts):
                continue
            if path.suffix.lower() not in DEFAULT_EXTENSIONS:
                continue
            try:
                if path.stat().st_size > max_file_bytes:
                    continue
            except OSError:
                continue
            seen.add(path)
            yield path


def discover(
    repo_root: Path,
    scope: str,
    roots: list[str],
    seeds: list[str],
    max_results: int = 100,
    max_file_bytes: int = 512_000,
) -> dict:
    repo_root = repo_root.resolve()
    if scope not in PILOT_VALIDATED_SCOPES:
        raise DiscoveryError(
            "UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard."
        )
    if not roots:
        raise DiscoveryError("at least one --root is required")
    if not seeds or any(not seed.strip() for seed in seeds):
        raise DiscoveryError("at least one non-empty --seed is required")
    if max_results < 1 or max_results > 500:
        raise DiscoveryError("max_results must be between 1 and 500")
    if max_file_bytes < 1024:
        raise DiscoveryError("max_file_bytes must be at least 1024")

    normalized = [(seed, seed.casefold()) for seed in seeds]
    results: list[dict] = []
    total_matches = 0
    truncated = False

    for path in _iter_files(repo_root, roots, max_file_bytes):
        rel = path.relative_to(repo_root).as_posix()
        path_folded = rel.casefold()
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        path_seeds = [seed for seed, folded in normalized if folded in path_folded]
        for seed in path_seeds:
            total_matches += 1
            if len(results) < max_results:
                results.append(
                    {
                        "path": rel,
                        "line": None,
                        "matched_seed": seed,
                        "match_kind": "path",
                        "snippet": rel,
                        "evidence_class": "CANDIDATE_ONLY",
                        "semantic_claim": "UNPROVEN",
                    }
                )
            else:
                truncated = True

        for line_no, line in enumerate(text.splitlines(), start=1):
            folded_line = line.casefold()
            for seed, folded in normalized:
                if folded not in folded_line:
                    continue
                total_matches += 1
                if len(results) < max_results:
                    snippet = line.strip()
                    if len(snippet) > 240:
                        snippet = snippet[:237] + "..."
                    results.append(
                        {
                            "path": rel,
                            "line": line_no,
                            "matched_seed": seed,
                            "match_kind": "content",
                            "snippet": snippet,
                            "evidence_class": "CANDIDATE_ONLY",
                            "semantic_claim": "UNPROVEN",
                        }
                    )
                else:
                    truncated = True

    return {
        "scope": scope,
        "pilot_validated": True,
        "roots": roots,
        "seeds": seeds,
        "status": "CANDIDATES_FOUND" if total_matches else "NO_MATCH",
        "truth_claim_status": "MECHANICAL_CANDIDATES_ONLY",
        "candidate_results": results,
        "returned_results": len(results),
        "total_matches": total_matches,
        "truncated": truncated,
        "absence_semantics": "NO_MATCH does not prove no dynamic or semantic dependency exists",
        "mutation_performed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Bounded candidate discovery for plugin impact analysis")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--scope", required=True)
    parser.add_argument("--root", action="append", dest="roots", required=True)
    parser.add_argument("--seed", action="append", dest="seeds", required=True)
    parser.add_argument("--max-results", type=int, default=100)
    parser.add_argument("--max-file-bytes", type=int, default=512_000)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        result = discover(
            Path(args.repo_root),
            args.scope,
            args.roots,
            args.seeds,
            args.max_results,
            args.max_file_bytes,
        )
    except DiscoveryError as exc:
        payload = {"status": "UNKNOWN", "error": str(exc), "mutation_performed": False}
        print(json.dumps(payload, ensure_ascii=False) if args.json else str(exc))
        return exc.exit_code

    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
