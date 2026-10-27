from __future__ import annotations

import json
from pathlib import Path
import tomllib
import unittest

from l_workspace_prepare_mcp.service import (
    AdmissionError,
    WorkspacePrepareService,
    _packet_state,
    _select_manifest,
)

MID = "a" * 64
MAIN = "1" * 40


def manifest(mid: str = MID) -> str:
    value = {"manifestId": mid}
    return (
        "<!-- mcl-task-manifest:v1 -->\n```json\n"
        + json.dumps(value)
        + "\n```\n<!-- /mcl-task-manifest:v1 -->"
    )


class FakeGithub:
    def __init__(self, *, body=None, comments=None):
        self.body = body or (
            "**State: BLOCKED**\n"
            "- Current stage: `IMPLEMENTATION_PR`\n"
            "- Next stage: `IMPLEMENTATION_PR`\n"
        )
        self._comments = comments if comments is not None else [{"body": manifest()}]

    def main_sha(self):
        return MAIN

    def issue(self, number):
        if number == 2352:
            return {"number": 2352, "state": "open", "body": "ledger"}
        return {"number": number, "state": "open", "body": self.body}

    def comments(self, number):
        return self._comments


class FakeOwner:
    def __init__(self):
        self.calls = []

    def prepare(self, **kwargs):
        self.calls.append(kwargs)
        return {
            "schemaVersion": 1,
            "kind": "MCL_L_PREPARE_WORKSPACE",
            "status": "PASS",
            "packetNumber": kwargs["packet_number"],
            "manifestId": kwargs["manifest_id"],
            "workspaceState": "PREPARED",
            "baseSha": kwargs["main_sha"],
            "headSha": kwargs["main_sha"],
            "reasonCodes": [],
            "authority": {
                "repositoryMutationAuthorized": False,
                "deviceMutationAuthorized": False,
                "mergeAuthorized": False,
                "releaseAuthorized": False,
                "productionAuthorized": False,
            },
        }


class ServiceTests(unittest.TestCase):
    def test_bounded_inputs_only(self):
        service = WorkspacePrepareService(github=FakeGithub(), owner=FakeOwner())
        for packet, mid, reason in [
            (True, MID, "PACKET_NUMBER_INVALID"),
            (0, MID, "PACKET_NUMBER_INVALID"),
            (3810, "x", "MANIFEST_ID_INVALID"),
        ]:
            result = service.prepare_workspace(packet, mid)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertIn(reason, result["reasonCodes"])

    def test_nonterminal_blocked_packet_at_implementation_is_admitted(self):
        owner = FakeOwner()
        result = WorkspacePrepareService(
            github=FakeGithub(), owner=owner
        ).prepare_workspace(3808, MID)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["workspaceState"], "PREPARED")
        self.assertEqual(len(owner.calls), 1)

    def test_wrong_stage_and_terminal_state_fail_closed(self):
        cases = [
            ("**State: IN_PROGRESS**\n- Current stage: `AUTHORITY_SCOPE`", "BLOCKED", "PACKET_STAGE_NOT_IMPLEMENTATION_PR"),
            ("**State: DONE**\n- Current stage: `IMPLEMENTATION_PR`", "BLOCKED", "PACKET_LIFECYCLE_TERMINAL"),
            ("**State: CANCELLED**\n- Current stage: `IMPLEMENTATION_PR`", "BLOCKED", "PACKET_LIFECYCLE_TERMINAL"),
            ("**State: SUPERSEDED**\n- Current stage: `IMPLEMENTATION_PR`", "BLOCKED", "PACKET_LIFECYCLE_TERMINAL"),
            ("**State: SOMETHING_NEW**\n- Current stage: `IMPLEMENTATION_PR`", "UNKNOWN", "PACKET_LIFECYCLE_UNKNOWN"),
        ]
        for body, status, reason in cases:
            with self.subTest(reason=reason):
                result = WorkspacePrepareService(
                    github=FakeGithub(body=body), owner=FakeOwner()
                ).prepare_workspace(3808, MID)
                self.assertEqual(result["status"], status)
                self.assertIn(reason, result["reasonCodes"])

    def test_manifest_identity_must_be_unique(self):
        result = WorkspacePrepareService(
            github=FakeGithub(comments=[{"body": manifest()}, {"body": manifest()}]),
            owner=FakeOwner(),
        ).prepare_workspace(3808, MID)
        self.assertEqual(result["status"], "CONFLICT")
        self.assertIn("MANIFEST_ID_AMBIGUOUS", result["reasonCodes"])

    def test_manifest_near_match_does_not_satisfy(self):
        result = WorkspacePrepareService(
            github=FakeGithub(comments=[{"body": manifest("b" * 64)}]),
            owner=FakeOwner(),
        ).prepare_workspace(3808, MID)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("MANIFEST_NOT_FOUND", result["reasonCodes"])

    def test_incidental_manifest_id_reference_is_ignored(self):
        owner = FakeOwner()
        comments = [
            {"body": f"completion receipt references manifestId {MID}"},
            {"body": manifest()},
        ]
        result = WorkspacePrepareService(
            github=FakeGithub(comments=comments), owner=owner
        ).prepare_workspace(3808, MID)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(len(owner.calls), 1)

    def test_owner_bridge_is_declared_as_package_data(self):
        config = tomllib.loads(
            (Path(__file__).resolve().parents[1] / "pyproject.toml").read_text()
        )
        package_data = config["tool"]["setuptools"]["package-data"]
        self.assertIn("owner_bridge.cjs", package_data["l_workspace_prepare_mcp"])

    def test_packet_state_conflict_is_fail_closed(self):
        with self.assertRaises(AdmissionError):
            _packet_state("**State: BLOCKED**\n## State\n`DONE`")

    def test_manifest_parser_rejects_extraneous_text(self):
        with self.assertRaises(AdmissionError):
            _select_manifest([{"body": "x\n" + manifest()}], MID)


if __name__ == "__main__":
    unittest.main()
