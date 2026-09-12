from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = ROOT / ".github/workflows/agent-skill-security-benchmark.yml"
EXPECTED_PATHS = [
    ".agents/skills/**",
    "tools/agent-skill-security/**",
    ".github/workflows/agent-skill-security-benchmark.yml",
]


def _event_block(text: str, event: str) -> list[str]:
    lines = text.splitlines()
    marker = f"  {event}:"
    start = lines.index(marker) + 1
    block: list[str] = []
    for line in lines[start:]:
        indent = len(line) - len(line.lstrip()) if line else None
        if line and indent is not None and indent <= 2:
            break
        block.append(line)
    return block


def _paths(block: list[str]) -> list[str]:
    values: list[str] = []
    for line in block:
        match = re.fullmatch(r"\s{6}- ['\"]([^'\"]+)['\"]", line)
        if match:
            values.append(match.group(1))
    return values


def _events(text: str) -> list[str]:
    lines = text.splitlines()
    start = lines.index("on:") + 1
    end = lines.index("permissions:")
    events: list[str] = []
    for line in lines[start:end]:
        match = re.fullmatch(r"  ([a-z_]+):", line)
        if match:
            events.append(match.group(1))
    return events


class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = WORKFLOW.read_text(encoding="utf-8")

    def test_trigger_event_set_is_bounded(self):
        self.assertEqual(_events(self.text), ["workflow_dispatch", "pull_request", "push"])

    def test_pull_request_and_push_paths_match(self):
        pull_paths = _paths(_event_block(self.text, "pull_request"))
        push_paths = _paths(_event_block(self.text, "push"))
        self.assertEqual(pull_paths, EXPECTED_PATHS)
        self.assertEqual(push_paths, EXPECTED_PATHS)
        self.assertEqual(push_paths, pull_paths)

    def test_push_is_main_only(self):
        push = _event_block(self.text, "push")
        branches = [line.strip() for line in push if line.strip().startswith("branches:")]
        self.assertEqual(branches, ["branches: [main]"])

    def test_permissions_remain_read_only(self):
        permissions = self.text.split("permissions:\n", 1)[1].split("\njobs:", 1)[0]
        self.assertEqual(permissions.strip(), "contents: read")


if __name__ == "__main__":
    unittest.main()
