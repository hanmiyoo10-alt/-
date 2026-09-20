#!/usr/bin/env python3
import importlib.machinery
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "mcl-worktree-inventory"
OWNER = ROOT / "mcl-worktree-cleanup"

loader = importlib.machinery.SourceFileLoader("mcl_worktree_inventory", str(SCRIPT))
spec = importlib.util.spec_from_loader(loader.name, loader)
inv = importlib.util.module_from_spec(spec)
loader.exec_module(inv)

S_PROFILE = {
    "control": "/fixed/control",
    "worktree_root": "/fixed/root",
    "branch_prefix": "server/",
    "protected_landing": None,
}
PROFILES = {"S": S_PROFILE}

def entry(target, branch="server/test", head="a" * 40):
    return {"target": target, "branch": branch, "head": head}

def enum(items, excluded=0):
    def _fn(executor, profiles):
        return profiles[executor], list(items), excluded
    return _fn
class InventoryContract(unittest.TestCase):
    def test_reuses_cleanup_profiles(self):
        owner_loader = importlib.machinery.SourceFileLoader("mcl_cleanup_owner", str(OWNER))
        owner_spec = importlib.util.spec_from_loader(owner_loader.name, owner_loader)
        owner = importlib.util.module_from_spec(owner_spec)
        owner_loader.exec_module(owner)
        self.assertEqual(inv.PROFILES, owner.PROFILES)

    def test_clean_supported_target_is_cleanable_but_never_apply_candidate(self):
        result = inv.inventory(
            "S", profiles=PROFILES, enumerate_fn=enum([entry("one")]),
            inspect_fn=lambda *args: {"status": "ELIGIBLE", "reasonCodes": []},
        )
        self.assertEqual(result["status"], "COMPLETE")
        row = result["rows"][0]
        self.assertEqual(row["technicalStatus"], "cleanable")
        self.assertEqual(row["retentionStatus"], "external_required")
        self.assertFalse(row["applyCandidate"])
        self.assertEqual(row["details"], "withheld")

    def test_owner_blockers_are_preserved(self):
        reasons = [
            "WORKTREE_TRACKED_DIRTY", "WORKTREE_STAGED", "WORKTREE_UNTRACKED",
            "WORKTREE_IGNORED", "WORKSPACE_HOLDER_PRESENT", "LOCAL_BRANCH_REF_CONFLICT",
        ]
        for reason in reasons:
            with self.subTest(reason=reason):
                result = inv.inventory(
                    "S", profiles=PROFILES, enumerate_fn=enum([entry("one")]),
                    inspect_fn=lambda *args, reason=reason: {
                        "status": "BLOCKED", "reasonCodes": [reason]
                    },
                )
                row = result["rows"][0]
                self.assertEqual(row["technicalStatus"], "blocked")
                self.assertEqual(row["reasonCodes"], [reason])
                self.assertFalse(row["applyCandidate"])

    def test_detached_blocks_without_owner_call(self):
        def forbidden(*args):
            self.fail("detached target must not invoke effect owner")
        result = inv.inventory(
            "S", profiles=PROFILES,
            enumerate_fn=enum([entry("detached", branch=None)]),
            inspect_fn=forbidden,
        )
        row = result["rows"][0]
        self.assertEqual(row["technicalStatus"], "blocked")
        self.assertEqual(row["observedBranch"], "detached")
        self.assertEqual(row["reasonCodes"], ["TARGET_DETACHED"])

    def test_wrong_branch_family_blocks_without_owner_call(self):
        def forbidden(*args):
            self.fail("unsupported branch family must not invoke effect owner")
        result = inv.inventory(
            "S", profiles=PROFILES,
            enumerate_fn=enum([entry("other", branch="repo/other")]),
            inspect_fn=forbidden,
        )
        row = result["rows"][0]
        self.assertEqual(row["technicalStatus"], "blocked")
        self.assertEqual(row["reasonCodes"], ["TARGET_BRANCH_FAMILY_CONFLICT"])

    def test_invalid_head_is_unknown(self):
        result = inv.inventory(
            "S", profiles=PROFILES,
            enumerate_fn=enum([entry("bad-head", head="not-a-sha")]),
            inspect_fn=lambda *args: self.fail("invalid head must not invoke owner"),
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertFalse(result["scanComplete"])
        row = result["rows"][0]
        self.assertEqual(row["technicalStatus"], "unknown")
        self.assertEqual(row["reasonCodes"], ["TARGET_HEAD_INVALID"])
        self.assertIsNone(row["observedHead"])

    def test_owner_unknown_makes_partial(self):
        result = inv.inventory(
            "S", profiles=PROFILES, enumerate_fn=enum([entry("slow")]),
            inspect_fn=lambda *args: {
                "status": "UNKNOWN", "reasonCodes": ["TARGET_INSPECTION_TIMEOUT"]
            },
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertFalse(result["scanComplete"])
        self.assertEqual(result["rows"][0]["technicalStatus"], "unknown")

    def test_truncation_is_explicit(self):
        items = [entry(f"w{i}") for i in range(3)]
        result = inv.inventory(
            "S", profiles=PROFILES, enumerate_fn=enum(items),
            inspect_fn=lambda *args: {"status": "ELIGIBLE", "reasonCodes": []},
            max_rows=2,
        )
        self.assertEqual(result["status"], "PARTIAL")
        self.assertTrue(result["truncated"])
        self.assertFalse(result["scanComplete"])
        self.assertEqual(result["totalRows"], 3)
        self.assertEqual(result["emittedRows"], 2)

    def test_known_blocked_rows_can_still_be_complete_scan(self):
        result = inv.inventory(
            "S", profiles=PROFILES,
            enumerate_fn=enum([entry("detached", branch=None)]),
            inspect_fn=lambda *args: self.fail("should not call"),
        )
        self.assertEqual(result["status"], "COMPLETE")
        self.assertTrue(result["scanComplete"])
        self.assertFalse(result["truncated"])

    def test_enumeration_failure_blocks_whole_receipt(self):
        def fail(executor, profiles):
            raise RuntimeError("WORKTREE_ENUMERATION_TIMEOUT")
        result = inv.inventory("S", profiles=PROFILES, enumerate_fn=fail)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["scanComplete"])
        self.assertEqual(result["rows"], [])
        self.assertEqual(result["reasonCodes"], ["WORKTREE_ENUMERATION_TIMEOUT"])

    def test_timeout_from_owner_is_bounded_unknown(self):
        old_run = inv._run
        try:
            def timeout(args, seconds):
                raise subprocess.TimeoutExpired(args, seconds)
            inv._run = timeout
            result = inv._inspect_with_owner("S", "one", "server/test", "a" * 40)
        finally:
            inv._run = old_run
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reasonCodes"], ["TARGET_INSPECTION_TIMEOUT"])

    def test_owner_invocation_is_inspect_only(self):
        calls = []
        old_run = inv._run
        try:
            def fake(args, seconds):
                calls.append(list(args))
                body = {"status": "ELIGIBLE", "reasonCodes": []}
                return subprocess.CompletedProcess(args, 0, json.dumps(body), "")
            inv._run = fake
            result = inv._inspect_with_owner("S", "one", "server/test", "a" * 40)
        finally:
            inv._run = old_run
        self.assertEqual(result["status"], "ELIGIBLE")
        self.assertEqual(calls[0][2], "inspect")
        self.assertNotIn("apply", calls[0])

    def test_receipt_does_not_expose_profile_paths(self):
        result = inv.inventory(
            "S", profiles=PROFILES, enumerate_fn=enum([entry("one")], excluded=2),
            inspect_fn=lambda *args: {"status": "ELIGIBLE", "reasonCodes": []},
        )
        text = json.dumps(result, sort_keys=True)
        self.assertNotIn("/fixed/control", text)
        self.assertNotIn("/fixed/root", text)
        self.assertEqual(result["excludedCount"], 2)

    def test_cli_is_narrow(self):
        code, text = inv.run_cli(["status", "--executor", "X"])
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(text)["reasonCodes"], ["EXECUTOR_INVALID"])
        code, text = inv.run_cli(["apply", "--executor", "S"])
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(text)["reasonCodes"], ["ARGUMENT_INVALID"])

    def test_static_effect_surface_is_read_only(self):
        source = SCRIPT.read_text()
        forbidden = [
            '"worktree", "remove"', "git clean", "reset --hard", "pr close",
            "ls-remote", "requests.", "urllib.request", "mtime", "time.time(",
        ]
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, source)
        self.assertIn('"inspect"', source)
        self.assertIn("applyCandidate", source)
        self.assertIn("ITEM_TIMEOUT_SECONDS", source)

    def test_parse_worktree_porcelain(self):
        parsed = inv._parse_worktree_list(
            "worktree /a\nHEAD " + "a" * 40 + "\nbranch refs/heads/server/a\n\n"
            "worktree /b\nHEAD " + "b" * 40 + "\ndetached\n"
        )
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["branch"], "refs/heads/server/a")
        self.assertTrue(parsed[1]["detached"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
