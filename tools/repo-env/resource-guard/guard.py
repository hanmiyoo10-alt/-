#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from dataclasses import dataclass

SCHEMA = "repo-resource-guard.v1"
MAX_FLOOR = (1 << 63) - 1
MAX_OBSERVED = (1 << 63) - 1
MEMINFO_LIMIT = 64 * 1024
CGROUP_LIMIT = 16 * 1024
MOUNTINFO_LIMIT = 256 * 1024
METRIC_ORDER = (
    "free_disk_bytes",
    "available_memory_bytes",
    "free_inodes",
)


class ContractError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


class QuietParser(argparse.ArgumentParser):
    def error(self, message):
        raise ContractError("invalid_arguments")


@dataclass(frozen=True)
class Observation:
    value: int | None
    reason: str


def read_small_text(path: str, limit: int) -> str:
    with open(path, "rb") as handle:
        data = handle.read(limit + 1)
    if len(data) > limit:
        raise ValueError("oversize")
    return data.decode("ascii", errors="strict")


def bounded_int(value: int) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    if value < 0 or value > MAX_OBSERVED:
        return None
    return value


def probe_filesystem(target_root: str) -> tuple[Observation, Observation]:
    try:
        info = os.statvfs(target_root)
    except (OSError, ValueError):
        unknown = Observation(None, "filesystem_observation_unavailable")
        return unknown, unknown

    free_bytes = bounded_int(info.f_bavail * info.f_frsize)
    if free_bytes is None:
        disk = Observation(None, "filesystem_observation_unavailable")
    else:
        disk = Observation(free_bytes, "ok")

    if info.f_files <= 0 or info.f_favail < 0:
        inodes = Observation(None, "inode_accounting_unsupported")
    else:
        free_inodes = bounded_int(info.f_favail)
        if free_inodes is None:
            inodes = Observation(None, "inode_accounting_unsupported")
        else:
            inodes = Observation(free_inodes, "ok")
    return disk, inodes


def parse_mem_available(text: str) -> int | None:
    matches = []
    for line in text.splitlines():
        if line.startswith("MemAvailable:"):
            parts = line.split()
            if len(parts) != 3 or parts[0] != "MemAvailable:" or parts[2] != "kB":
                return None
            if not re.fullmatch(r"[0-9]+", parts[1]):
                return None
            matches.append(int(parts[1]) * 1024)
    if len(matches) != 1:
        return None
    return bounded_int(matches[0])


def decode_mount_field(value: str) -> str:
    escapes = {"040": " ", "011": "\t", "012": "\n", "134": "\\"}
    return re.sub(r"\\(040|011|012|134)", lambda match: escapes[match.group(1)], value)


def parse_cgroup_path(text: str) -> str | None:
    matches = []
    for line in text.splitlines():
        if line.startswith("0::"):
            value = line[3:]
            if not value.startswith("/"):
                return None
            matches.append(value)
    if len(matches) != 1:
        return None
    return os.path.normpath(matches[0])


def parse_cgroup2_mount(text: str, cgroup_path: str) -> tuple[str, str] | None:
    candidates = []
    malformed_cgroup2 = False
    for line in text.splitlines():
        if " - cgroup2 " not in line:
            continue
        left, _right = line.split(" - ", 1)
        fields = left.split()
        if len(fields) < 5:
            malformed_cgroup2 = True
            continue
        root = decode_mount_field(fields[3])
        mount_point = decode_mount_field(fields[4])
        if not root.startswith("/") or not mount_point.startswith("/"):
            malformed_cgroup2 = True
            continue
        root_norm = os.path.normpath(root)
        if root_norm == "/" or cgroup_path == root_norm or cgroup_path.startswith(root_norm.rstrip("/") + "/"):
            candidates.append((root_norm, os.path.normpath(mount_point)))
    if not candidates:
        return None
    candidates.sort(key=lambda pair: len(pair[0]), reverse=True)
    best_len = len(candidates[0][0])
    best = [pair for pair in candidates if len(pair[0]) == best_len]
    if len(best) != 1 or malformed_cgroup2:
        return None
    return best[0]


def parse_cgroup_number(text: str, allow_max: bool) -> int | str | None:
    value = text.strip()
    if allow_max and value == "max":
        return "max"
    if not re.fullmatch(r"[0-9]+", value):
        return None
    parsed = int(value)
    if parsed > MAX_OBSERVED:
        return None
    return parsed


def visible_cgroup_allowance() -> Observation:
    try:
        cgroup_text = read_small_text("/proc/self/cgroup", CGROUP_LIMIT)
        v2_lines = [line for line in cgroup_text.splitlines() if line.startswith("0::")]
        if not v2_lines:
            return Observation(None, "no_cgroup_v2")
        if len(v2_lines) != 1:
            return Observation(None, "cgroup_observation_unavailable")
        cgroup_path = parse_cgroup_path(cgroup_text)
        if cgroup_path is None:
            return Observation(None, "cgroup_observation_unavailable")
        mount_text = read_small_text("/proc/self/mountinfo", MOUNTINFO_LIMIT)
        mount = parse_cgroup2_mount(mount_text, cgroup_path)
        if mount is None:
            return Observation(None, "cgroup_observation_unavailable")
    except (OSError, UnicodeError, ValueError):
        return Observation(None, "cgroup_observation_unavailable")
    root, mount_point = mount
    if root == "/":
        relative = cgroup_path.lstrip("/")
    elif cgroup_path == root:
        relative = ""
    else:
        relative = cgroup_path[len(root):].lstrip("/")
    current_path = os.path.normpath(os.path.join(mount_point, relative))
    try:
        if os.path.commonpath((mount_point, current_path)) != mount_point:
            return Observation(None, "cgroup_observation_unavailable")
    except ValueError:
        return Observation(None, "cgroup_observation_unavailable")

    finite_allowances = []
    while True:
        try:
            max_text = read_small_text(os.path.join(current_path, "memory.max"), 128)
            current_text = read_small_text(os.path.join(current_path, "memory.current"), 128)
        except (OSError, UnicodeError, ValueError):
            return Observation(None, "cgroup_observation_unavailable")
        maximum = parse_cgroup_number(max_text, allow_max=True)
        current = parse_cgroup_number(current_text, allow_max=False)
        if maximum is None or current is None or current == "max":
            return Observation(None, "cgroup_observation_unavailable")
        if maximum != "max":
            finite_allowances.append(max(0, maximum - current))
        if current_path == mount_point:
            break
        parent = os.path.dirname(current_path)
        if parent == current_path:
            return Observation(None, "cgroup_observation_unavailable")
        current_path = parent
    if not finite_allowances:
        return Observation(None, "no_finite_cgroup_limit")
    allowance = min(finite_allowances)
    bounded = bounded_int(allowance)
    if bounded is None:
        return Observation(None, "cgroup_observation_unavailable")
    return Observation(bounded, "ok")


def probe_memory() -> Observation:
    try:
        mem_text = read_small_text("/proc/meminfo", MEMINFO_LIMIT)
    except (OSError, UnicodeError, ValueError):
        return Observation(None, "memory_observation_unavailable")
    mem_available = parse_mem_available(mem_text)
    if mem_available is None:
        return Observation(None, "memory_observation_unavailable")

    allowance = visible_cgroup_allowance()
    if allowance.value is None:
        if allowance.reason in {"no_cgroup_v2", "no_finite_cgroup_limit"}:
            return Observation(mem_available, "ok")
        return allowance
    return Observation(min(mem_available, allowance.value), "ok")


def metric_result(metric: str, minimum: int, observation: Observation) -> dict:
    if observation.value is None:
        return {
            "metric": metric,
            "minimum": minimum,
            "observed": None,
            "status": "unknown",
            "reason": observation.reason,
        }
    if observation.value < minimum:
        return {
            "metric": metric,
            "minimum": minimum,
            "observed": observation.value,
            "status": "below_floor",
            "reason": "below_floor",
        }
    return {
        "metric": metric,
        "minimum": minimum,
        "observed": observation.value,
        "status": "pass",
        "reason": "ok",
    }


def contract_report(reason: str) -> dict:
    return {
        "schema": SCHEMA,
        "status": "BLOCKED",
        "reason": reason,
        "metrics": [],
    }


def evaluate(target_root: str, floors: dict[str, int | None]) -> tuple[dict, int]:
    requested = {name: value for name, value in floors.items() if value is not None}
    if not requested:
        raise ContractError("missing_floor")
    for value in requested.values():
        if isinstance(value, bool) or value <= 0 or value > MAX_FLOOR:
            raise ContractError("invalid_floor")
    if not os.path.isdir(target_root):
        raise ContractError("invalid_target")
    disk_obs = Observation(None, "not_requested")
    inode_obs = Observation(None, "not_requested")
    if floors["free_disk_bytes"] is not None or floors["free_inodes"] is not None:
        disk_obs, inode_obs = probe_filesystem(target_root)
    memory_obs = probe_memory() if floors["available_memory_bytes"] is not None else None
    observations = {
        "free_disk_bytes": disk_obs,
        "available_memory_bytes": memory_obs,
        "free_inodes": inode_obs,
    }
    metrics = []
    for metric in METRIC_ORDER:
        minimum = floors[metric]
        if minimum is None:
            continue
        observation = observations[metric]
        assert observation is not None
        metrics.append(metric_result(metric, minimum, observation))

    statuses = {item["status"] for item in metrics}
    if "below_floor" in statuses:
        status, reason, exit_code = "BLOCKED", "below_floor", 1
    elif "unknown" in statuses:
        status, reason, exit_code = "UNKNOWN", "metric_unknown", 2
    else:
        status, reason, exit_code = "PASS", "ok", 0
    return {
        "schema": SCHEMA,
        "status": status,
        "reason": reason,
        "metrics": metrics,
    }, exit_code


def build_parser() -> argparse.ArgumentParser:
    parser = QuietParser(prog="guard.py", add_help=False)
    subparsers = parser.add_subparsers(dest="command", required=True)
    check = subparsers.add_parser("check", add_help=False)
    check.add_argument("--target-root", required=True)
    check.add_argument("--min-free-disk-bytes", type=int)
    check.add_argument("--min-available-memory-bytes", type=int)
    check.add_argument("--min-free-inodes", type=int)
    return parser


def emit(report: dict) -> None:
    sys.stdout.write(json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n")


def main(argv=None) -> int:
    try:
        args = build_parser().parse_args(argv)
        floors = {
            "free_disk_bytes": args.min_free_disk_bytes,
            "available_memory_bytes": args.min_available_memory_bytes,
            "free_inodes": args.min_free_inodes,
        }
        report, exit_code = evaluate(args.target_root, floors)
        emit(report)
        return exit_code
    except ContractError as exc:
        emit(contract_report(exc.code))
        return 2
    except Exception:
        emit(contract_report("internal_error"))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
