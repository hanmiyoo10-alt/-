from __future__ import annotations

import json
import re
import sys
from collections import Counter
from typing import Any

SCHEMA_VERSION = 1

SOURCE_CLASSES = {
    "DURABLE_SOURCE",
    "DERIVED_OR_SUPPORTING",
    "HISTORICAL_OR_SUPERSEDED",
    "EMPTY_OR_LOCATOR_ONLY",
    "UNKNOWN",
}
RESULTS = {"PASS", "WARN", "UNKNOWN", "DRIFT"}
PRECEDENCE = {"PASS": 0, "WARN": 1, "UNKNOWN": 2, "DRIFT": 3}

MAX_FILES = 5000
MAX_KNOWN_SOURCES = 512
MAX_DISCUSSIONS = 128
MAX_FINDINGS = 64
MAX_PATH_CHARS = 500
MAX_BODY_CHARS = 512 * 1024

SOURCE_NAME_PATTERNS = (
    re.compile(r"IDEA_LIST", re.I),
    re.compile(r"IDEA_.*(?:INVENTORY|LEDGER|CATALOG|MENU)", re.I),
    re.compile(r"ROADMAP", re.I),
    re.compile(r"BACKLOG", re.I),
    re.compile(r"CANDIDATE.*SHORTLIST", re.I),
    re.compile(r"(?:^|/)CANDIDATES\.(?:MD|JSON)$", re.I),
    re.compile(r"PLUGIN_SHARED_PRIMITIVE_CANDIDATES", re.I),
)

DEFAULT_PROJECTION_MARKERS = ("SOURCE_LINKED", "PROJECTION")
EXCLUDED_PATH_MARKERS = (
    "/tests/",
    "/test/",
    ".github/workflows/",
)
ALLOWED_SOURCE_EXTENSIONS = (".md", ".json")


def _bounded(value: object, limit: int = 240) -> str:
    text = " ".join(str(value or "").replace("\x00", "").split())
    if len(text) > limit:
        return text[: limit - 1] + "…"
    return text


def _finding(
    code: str,
    disposition: str,
    *,
    source_ref: str | None = None,
    discussion_number: int | None = None,
    owner_category: str | None = None,
    evidence: str | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "code": code,
        "disposition": disposition,
    }
    if source_ref:
        item["sourceRef"] = _bounded(source_ref, MAX_PATH_CHARS)
    if discussion_number is not None:
        item["discussionNumber"] = discussion_number
    if owner_category:
        item["ownerCategory"] = _bounded(owner_category, 120)
    if evidence:
        item["evidence"] = _bounded(evidence)
    return item


def _safe_repository_ref(repository_ref: object) -> str | None:
    if not isinstance(repository_ref, str):
        return None
    text = repository_ref.strip()
    if not text or len(text) > 128 or any(ord(char) < 32 or ord(char) == 127 for char in text):
        return None
    return text


def _result_base(repository_ref: object) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "mode": "IDEA_HUB_DRIFT_AUDIT",
        "result": "UNKNOWN",
        "repositoryRef": _safe_repository_ref(repository_ref),
        "candidateCount": 0,
        "reviewedSourceCount": 0,
        "discussionCount": 0,
        "sourceClassCounts": {name: 0 for name in sorted(SOURCE_CLASSES)},
        "findingCounts": {name: 0 for name in sorted(RESULTS)},
        "findings": [],
    }


def _normalize_path(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip().replace("\\", "/")
    if not text or len(text) > MAX_PATH_CHARS or text.startswith("/"):
        return None
    parts = text.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return None
    return text


def _is_candidate_path(path: str) -> bool:
    lower = "/" + path.lower()
    if any(marker.lower() in lower for marker in EXCLUDED_PATH_MARKERS):
        return False
    if not path.lower().endswith(ALLOWED_SOURCE_EXTENSIONS):
        return False
    name = path.rsplit("/", 1)[-1]
    return any(pattern.search(name) for pattern in SOURCE_NAME_PATTERNS)


def discover_candidate_paths(files: list[object], known_paths: set[str]) -> tuple[list[str], list[dict[str, Any]]]:
    discovered: set[str] = set()
    findings: list[dict[str, Any]] = []
    if len(files) > MAX_FILES:
        return [], [_finding("FILE_INVENTORY_BOUND_EXCEEDED", "UNKNOWN", evidence=f"files > {MAX_FILES}")]

    for raw in files:
        path = _normalize_path(raw)
        if path is None:
            findings.append(_finding("FILE_PATH_INVALID", "UNKNOWN", evidence=_bounded(raw)))
            continue
        if path in known_paths or _is_candidate_path(path):
            discovered.add(path)
    return sorted(discovered), findings


def _normalized_file_set(files: list[object]) -> set[str]:
    normalized: set[str] = set()
    for item in files:
        path = _normalize_path(item)
        if path is not None:
            normalized.add(path)
    return normalized


def _normalize_discussions(
    raw: object,
) -> tuple[dict[int, dict[str, str]], set[int], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    invalid_numbers: set[int] = set()
    if not isinstance(raw, list):
        return {}, invalid_numbers, [
            _finding("DISCUSSIONS_INVALID", "UNKNOWN", evidence="discussions must be a list")
        ]
    if len(raw) > MAX_DISCUSSIONS:
        return {}, invalid_numbers, [
            _finding("DISCUSSION_BOUND_EXCEEDED", "UNKNOWN", evidence=f"discussions > {MAX_DISCUSSIONS}")
        ]

    out: dict[int, dict[str, str]] = {}
    for item in raw:
        if not isinstance(item, dict):
            findings.append(_finding("DISCUSSION_INVALID", "UNKNOWN", evidence="discussion must be an object"))
            continue
        number = item.get("number")
        body = item.get("body")
        category = item.get("category", "")
        title = item.get("title", "")
        if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
            findings.append(_finding("DISCUSSION_NUMBER_INVALID", "UNKNOWN", evidence=_bounded(number)))
            continue
        if number in out or number in invalid_numbers:
            out.pop(number, None)
            invalid_numbers.add(number)
            findings.append(_finding("DISCUSSION_DUPLICATE", "UNKNOWN", discussion_number=number))
            continue
        if not isinstance(body, str) or len(body) > MAX_BODY_CHARS:
            invalid_numbers.add(number)
            findings.append(_finding("DISCUSSION_BODY_INVALID", "UNKNOWN", discussion_number=number))
            continue
        if not isinstance(category, str) or not isinstance(title, str):
            invalid_numbers.add(number)
            findings.append(_finding("DISCUSSION_METADATA_INVALID", "UNKNOWN", discussion_number=number))
            continue
        out[number] = {"body": body, "category": category, "title": title}
    return out, invalid_numbers, findings


def _projection_markers(source: dict[str, Any]) -> tuple[list[str], bool]:
    raw = source.get("projectionMarkers")
    if raw is None:
        return list(DEFAULT_PROJECTION_MARKERS), True
    if not isinstance(raw, list):
        return list(DEFAULT_PROJECTION_MARKERS), False
    markers = [item for item in raw if isinstance(item, str) and item]
    return (markers, True) if markers and len(markers) == len(raw) else (list(DEFAULT_PROJECTION_MARKERS), False)


def _required_markers(source: dict[str, Any], path: str) -> tuple[list[str], bool]:
    raw = source.get("requiredMarkers")
    if raw is None:
        return [path], True
    if not isinstance(raw, list):
        return [path], False
    markers = [item for item in raw if isinstance(item, str) and item]
    return (markers, True) if markers and len(markers) == len(raw) else ([path], False)


def _discussion_link_present(body: str, number: int) -> bool:
    return re.search(rf"/discussions/{number}(?=$|[/?#)\s])", body) is not None

def _check_navigation(
    navigation: object,
    discussions: dict[int, dict[str, str]],
    invalid_discussion_numbers: set[int],
) -> list[dict[str, Any]]:
    if navigation is None:
        return []
    if not isinstance(navigation, dict):
        return [_finding("NAVIGATION_INVALID", "UNKNOWN", evidence="navigation must be an object")]

    root_number = navigation.get("rootDiscussionNumber")
    owners = navigation.get("owningDiscussionNumbers")
    if isinstance(root_number, bool) or not isinstance(root_number, int) or root_number <= 0:
        return [_finding("NAVIGATION_ROOT_INVALID", "UNKNOWN")]
    if not isinstance(owners, list) or len(owners) > MAX_DISCUSSIONS:
        return [_finding("NAVIGATION_OWNERS_INVALID", "UNKNOWN")]

    normalized_owners: list[int] = []
    for number in owners:
        if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
            return [_finding("NAVIGATION_OWNERS_INVALID", "UNKNOWN")]
        if number in normalized_owners:
            return [_finding("NAVIGATION_OWNER_DUPLICATE", "UNKNOWN", discussion_number=number)]
        normalized_owners.append(number)

    root = discussions.get(root_number)
    if root is None:
        disposition = "UNKNOWN" if root_number in invalid_discussion_numbers else "DRIFT"
        code = "NAVIGATION_ROOT_UNKNOWN" if disposition == "UNKNOWN" else "NAVIGATION_ROOT_MISSING"
        return [_finding(code, disposition, discussion_number=root_number)]

    findings: list[dict[str, Any]] = []
    for number in normalized_owners:
        discussion = discussions.get(number)
        if discussion is None:
            disposition = "UNKNOWN" if number in invalid_discussion_numbers else "DRIFT"
            code = "NAVIGATION_OWNER_UNKNOWN" if disposition == "UNKNOWN" else "NAVIGATION_OWNER_MISSING"
            findings.append(_finding(code, disposition, discussion_number=number))
            continue
        if not _discussion_link_present(root["body"], number):
            findings.append(_finding("NAVIGATION_OWNER_LINK_MISSING", "DRIFT", discussion_number=number))
        for marker in DEFAULT_PROJECTION_MARKERS:
            if marker.upper() not in discussion["body"].upper():
                findings.append(
                    _finding(
                        "PROJECTION_BOUNDARY_MISSING",
                        "DRIFT",
                        discussion_number=number,
                        owner_category=discussion["category"],
                        evidence=f"missing marker: {marker}",
                    )
                )
    return findings


def classify_idea_hub_drift(payload: object) -> dict[str, Any]:
    if not isinstance(payload, dict):
        result = _result_base(None)
        result["findings"] = [_finding("INPUT_INVALID", "UNKNOWN", evidence="input must be a JSON object")]
        result["findingCounts"]["UNKNOWN"] = 1
        return result

    repository_ref = _safe_repository_ref(payload.get("repositoryRef"))
    if repository_ref is None:
        result = _result_base(None)
        result["findings"] = [_finding("REPOSITORY_REF_INVALID", "UNKNOWN")]
        result["findingCounts"]["UNKNOWN"] = 1
        return result

    result = _result_base(repository_ref)
    files = payload.get("files")
    known_sources = payload.get("knownSources")
    if not isinstance(files, list):
        result["findings"] = [_finding("FILE_INVENTORY_INVALID", "UNKNOWN")]
        result["findingCounts"]["UNKNOWN"] = 1
        return result
    if len(files) > MAX_FILES:
        result["findings"] = [
            _finding("FILE_INVENTORY_BOUND_EXCEEDED", "UNKNOWN", evidence=f"files > {MAX_FILES}")
        ]
        result["findingCounts"]["UNKNOWN"] = 1
        return result
    if not isinstance(known_sources, list) or len(known_sources) > MAX_KNOWN_SOURCES:
        result["findings"] = [_finding("KNOWN_SOURCES_INVALID", "UNKNOWN")]
        result["findingCounts"]["UNKNOWN"] = 1
        return result

    normalized_known: dict[str, dict[str, Any]] = {}
    findings: list[dict[str, Any]] = []
    class_counts = Counter({name: 0 for name in SOURCE_CLASSES})

    for source in known_sources:
        if not isinstance(source, dict):
            findings.append(_finding("KNOWN_SOURCE_INVALID", "UNKNOWN"))
            continue
        path = _normalize_path(source.get("path"))
        classification = source.get("classification")
        if path is None or classification not in SOURCE_CLASSES:
            findings.append(
                _finding(
                    "KNOWN_SOURCE_INVALID",
                    "UNKNOWN",
                    source_ref=path or _bounded(source.get("path")),
                    evidence=f"classification={_bounded(classification)}",
                )
            )
            continue
        if path in normalized_known:
            findings.append(_finding("KNOWN_SOURCE_DUPLICATE", "UNKNOWN", source_ref=path))
            continue
        normalized_known[path] = source
        class_counts[classification] += 1

    discovered, discovery_findings = discover_candidate_paths(files, set(normalized_known))
    findings.extend(discovery_findings)
    result["candidateCount"] = len(discovered)
    result["reviewedSourceCount"] = len(normalized_known)
    result["sourceClassCounts"] = {name: class_counts.get(name, 0) for name in sorted(SOURCE_CLASSES)}

    discussions, invalid_discussion_numbers, discussion_findings = _normalize_discussions(
        payload.get("discussions")
    )
    findings.extend(discussion_findings)
    result["discussionCount"] = len(discussions)
    file_set = _normalized_file_set(files)

    for path, source in sorted(normalized_known.items()):
        classification = source["classification"]
        if path not in file_set:
            findings.append(_finding("KNOWN_SOURCE_NOT_IN_FILE_INVENTORY", "UNKNOWN", source_ref=path))
            continue

        if classification == "UNKNOWN":
            findings.append(_finding("SOURCE_CLASSIFICATION_UNKNOWN", "UNKNOWN", source_ref=path))
            continue
        if classification != "DURABLE_SOURCE":
            continue

        number = source.get("discussionNumber")
        category = source.get("ownerCategory")
        if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
            findings.append(_finding("DURABLE_SOURCE_OWNER_UNRESOLVED", "UNKNOWN", source_ref=path))
            continue

        discussion = discussions.get(number)
        if discussion is None:
            disposition = "UNKNOWN" if number in invalid_discussion_numbers else "DRIFT"
            code = (
                "DURABLE_SOURCE_DISCUSSION_UNKNOWN"
                if disposition == "UNKNOWN"
                else "DURABLE_SOURCE_DISCUSSION_MISSING"
            )
            findings.append(
                _finding(
                    code,
                    disposition,
                    source_ref=path,
                    discussion_number=number,
                    owner_category=category if isinstance(category, str) else None,
                )
            )
            continue

        if isinstance(category, str) and category and discussion["category"] != category:
            findings.append(
                _finding(
                    "DURABLE_SOURCE_CATEGORY_MISMATCH",
                    "DRIFT",
                    source_ref=path,
                    discussion_number=number,
                    owner_category=category,
                    evidence=f"observed={discussion['category']}",
                )
            )

        required_markers, required_markers_valid = _required_markers(source, path)
        if not required_markers_valid:
            findings.append(
                _finding(
                    "REQUIRED_MARKERS_INVALID",
                    "UNKNOWN",
                    source_ref=path,
                    discussion_number=number,
                )
            )
        for marker in required_markers:
            if marker not in discussion["body"]:
                findings.append(
                    _finding(
                        "DURABLE_SOURCE_BACKLINK_MISSING",
                        "DRIFT",
                        source_ref=path,
                        discussion_number=number,
                        owner_category=category if isinstance(category, str) else None,
                        evidence=f"missing marker: {marker}",
                    )
                )
                break

        projection_markers, projection_markers_valid = _projection_markers(source)
        if not projection_markers_valid:
            findings.append(
                _finding(
                    "PROJECTION_MARKERS_INVALID",
                    "UNKNOWN",
                    source_ref=path,
                    discussion_number=number,
                )
            )
        for marker in projection_markers:
            if marker.upper() not in discussion["body"].upper():
                findings.append(
                    _finding(
                        "PROJECTION_BOUNDARY_MISSING",
                        "DRIFT",
                        source_ref=path,
                        discussion_number=number,
                        owner_category=category if isinstance(category, str) else None,
                        evidence=f"missing marker: {marker}",
                    )
                )
                break

        if source.get("reviewRequired") is True:
            findings.append(
                _finding(
                    "DURABLE_SOURCE_REVIEW_REQUESTED",
                    "WARN",
                    source_ref=path,
                    discussion_number=number,
                    owner_category=category if isinstance(category, str) else None,
                )
            )

    for path in discovered:
        if path not in normalized_known:
            findings.append(_finding("UNCLASSIFIED_SOURCE_CANDIDATE", "UNKNOWN", source_ref=path))

    findings.extend(
        _check_navigation(payload.get("navigation"), discussions, invalid_discussion_numbers)
    )

    findings.sort(
        key=lambda item: (
            -PRECEDENCE.get(item["disposition"], 2),
            item.get("sourceRef", ""),
            item.get("discussionNumber", 0),
            item["code"],
        )
    )
    if len(findings) > MAX_FINDINGS:
        findings = findings[:MAX_FINDINGS]
        findings.append(_finding("FINDING_BOUND_EXCEEDED", "UNKNOWN", evidence=f"findings > {MAX_FINDINGS}"))

    counts = Counter(item["disposition"] for item in findings)
    result["findingCounts"] = {name: counts.get(name, 0) for name in sorted(RESULTS)}
    result["findings"] = findings

    if counts["DRIFT"]:
        result["result"] = "DRIFT"
    elif counts["UNKNOWN"]:
        result["result"] = "UNKNOWN"
    elif counts["WARN"]:
        result["result"] = "WARN"
    else:
        result["result"] = "PASS"
    return result


def _cli_result(raw: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {
            **_result_base(None),
            "findings": [_finding("INPUT_JSON_INVALID", "UNKNOWN")],
            "findingCounts": {"DRIFT": 0, "PASS": 0, "UNKNOWN": 1, "WARN": 0},
        }
    return classify_idea_hub_drift(payload)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) > 1:
        result = {
            **_result_base(None),
            "findings": [_finding("INPUT_ARGS_INVALID", "UNKNOWN")],
            "findingCounts": {"DRIFT": 0, "PASS": 0, "UNKNOWN": 1, "WARN": 0},
        }
    else:
        try:
            if args:
                with open(args[0], "r", encoding="utf-8") as handle:
                    raw = handle.read()
            else:
                raw = sys.stdin.read()
        except (OSError, UnicodeError):
            result = {
                **_result_base(None),
                "findings": [_finding("INPUT_READ_FAILED", "UNKNOWN")],
                "findingCounts": {"DRIFT": 0, "PASS": 0, "UNKNOWN": 1, "WARN": 0},
            }
        else:
            result = _cli_result(raw)

    sys.stdout.write(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n")
    return {"PASS": 0, "WARN": 0, "UNKNOWN": 2, "DRIFT": 3}.get(result["result"], 2)


if __name__ == "__main__":
    raise SystemExit(main())
