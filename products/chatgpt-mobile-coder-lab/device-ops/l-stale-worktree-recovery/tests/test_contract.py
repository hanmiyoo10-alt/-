import importlib.machinery
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "mcl-l-stale-worktree-recovery"


def load_module():
    loader = importlib.machinery.SourceFileLoader("l_stale_recovery", str(SCRIPT))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


m = load_module()


def run(*args):
    return subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


class Fixture:
    def __init__(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp(prefix="l-stale-wt-"))
        self.control = self.tmp / "control"
        self.root = self.tmp / "worktrees"
        self.target = self.root / "stale"
        self.branch = "laptop/stale-test"
        self.root.mkdir(parents=True)
        self.control.mkdir()
        run("git", "-C", str(self.control), "init", "-q")
        run("git", "-C", str(self.control), "config", "user.name", "test")
        run("git", "-C", str(self.control), "config", "user.email", "test@example.invalid")
        run("git", "-C", str(self.control), "remote", "add", "origin", "https://github.com/hanmiyoo10-alt/-.git")
        run("git", "-C", str(self.control), "commit", "--allow-empty", "-qm", "base")
        self.head = run("git", "-C", str(self.control), "rev-parse", "HEAD").stdout.strip()
        run("git", "-C", str(self.control), "worktree", "add", "-qb", self.branch, str(self.target), self.head)
        shutil.rmtree(self.target)
        self.profile = {
            "control": str(self.control),
            "root": str(self.root),
            "branch_prefix": "laptop/",
            "allowed_origins": {"https://github.com/hanmiyoo10-alt/-.git"},
        }

    def close(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ledger(self, active=None):
        leases = []
        if active:
            leases.append({
                "leaseId": "a" * 64,
                "packetRef": "#1",
                "workspace": active,
            })
        state = {
            "schemaVersion": 1,
            "scope": "chatgpt-mobile-coder-lab",
            "mode": "MCL_TASK_LEASE_LEDGER",
            "status": "ACTIVE",
            "generation": 1,
            "controllerPath": "x",
            "controllerCommit": "0" * 40,
            "packetRef": "#2350",
            "activeLeases": leases,
            "lastRelease": None,
        }
        return "# Mobile Coder Lab task lease ledger v1\n\nStatus: `ACTIVE`\n\n" + m.LEDGER_MARKER + "\n```json\n" + json.dumps(state, separators=(",", ":")) + "\n```\n"


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.f = Fixture()

    def tearDown(self):
        self.f.close()

    def inspect(self, ledger=None, **kw):
        return m.inspect_target(
            kw.get("target", "stale"),
            kw.get("branch", self.f.branch),
            kw.get("head", self.f.head),
            self.f.ledger() if ledger is None else ledger,
            profile=self.f.profile,
        )

    def test_exact_stale_registration_is_eligible(self):
        r = self.inspect()
        self.assertTrue(r["eligible"], r)
        self.assertEqual(r["registration"], "stale")
        self.assertEqual(r["lease"], "clear")
        self.assertEqual(r["holder"], "absent")

    def test_apply_removes_only_registration_and_preserves_branch(self):
        result = m.apply_target(
            "stale", self.f.branch, self.f.head, self.f.ledger(),
            explicit_apply=True, profile=self.f.profile,
        )
        self.assertEqual(result["status"], "REMOVED", result)
        listed = run("git", "-C", str(self.f.control), "worktree", "list", "--porcelain").stdout
        self.assertNotIn(str(self.f.target), listed)
        self.assertEqual(
            run("git", "-C", str(self.f.control), "rev-parse", f"refs/heads/{self.f.branch}").stdout.strip(),
            self.f.head,
        )

    def test_target_present_blocks(self):
        self.f.target.mkdir()
        r = self.inspect()
        self.assertFalse(r["eligible"])
        self.assertIn("TARGET_PRESENT", r["reasons"])

    def test_registration_missing_blocks(self):
        run("git", "-C", str(self.f.control), "worktree", "remove", str(self.f.target))
        r = self.inspect()
        self.assertFalse(r["eligible"])
        self.assertIn("REGISTRATION_COUNT_INVALID", r["reasons"])

    def test_expected_branch_mismatch_blocks(self):
        r = self.inspect(branch="laptop/other")
        self.assertFalse(r["eligible"])
        self.assertIn("REGISTERED_BRANCH_MISMATCH", r["reasons"])

    def test_expected_head_mismatch_blocks(self):
        r = self.inspect(head="1" * 40)
        self.assertFalse(r["eligible"])
        self.assertIn("REGISTERED_HEAD_MISMATCH", r["reasons"])

    def test_active_lease_for_worktree_blocks(self):
        ledger = self.f.ledger({
            "kind": "repository",
            "branch": self.f.branch,
            "worktree": str(self.f.target),
        })
        r = self.inspect(ledger=ledger)
        self.assertFalse(r["eligible"])
        self.assertIn("ACTIVE_LEASE_TARGET_RESERVED", r["reasons"])

    def test_holder_present_blocks(self):
        admins = m._matching_admin_dirs(str(self.f.control), str(self.f.target))
        self.assertEqual(len(admins), 1)
        (admins[0] / m.HOLDER_FILE).write_text("{}")
        r = self.inspect()
        self.assertFalse(r["eligible"])
        self.assertIn("WORKSPACE_HOLDER_PRESENT", r["reasons"])

    def test_locked_admin_blocks(self):
        admins = m._matching_admin_dirs(str(self.f.control), str(self.f.target))
        (admins[0] / "locked").write_text("test")
        r = self.inspect()
        self.assertFalse(r["eligible"])
        self.assertTrue({"ADMIN_LOCKED", "REGISTRATION_LOCKED"} & set(r["reasons"]))

    def test_malformed_ledger_blocks(self):
        r = self.inspect(ledger="not-a-ledger")
        self.assertFalse(r["eligible"])
        self.assertIn("LEDGER_MARKER_INVALID", r["reasons"])

    def test_ambiguous_admin_mapping_blocks(self):
        common = pathlib.Path(m._common_git_dir(str(self.f.control)))
        fake = common / "worktrees" / "fake"
        fake.mkdir()
        (fake / "gitdir").write_text(str(self.f.target / ".git") + "\n")
        (fake / "HEAD").write_text(f"ref: refs/heads/{self.f.branch}\n")
        r = self.inspect()
        self.assertFalse(r["eligible"])
        self.assertIn("ADMIN_IDENTITY_AMBIGUOUS", r["reasons"])

    def test_recheck_drift_blocks_without_removing_registration(self):
        def drift():
            (self.f.control / "unexpected").write_text("x")
        result = m.apply_target(
            "stale", self.f.branch, self.f.head, self.f.ledger(),
            explicit_apply=True, profile=self.f.profile, before_recheck=drift,
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("RECHECK_BLOCKED", result["reasonCodes"])
        listed = run("git", "-C", str(self.f.control), "worktree", "list", "--porcelain").stdout
        self.assertIn(str(self.f.target), listed)

    def test_apply_requires_explicit_flag(self):
        result = m.apply_target(
            "stale", self.f.branch, self.f.head, self.f.ledger(),
            explicit_apply=False, profile=self.f.profile,
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("EXPLICIT_APPLY_REQUIRED", result["reasonCodes"])


class StaticContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SCRIPT.read_text(encoding="utf-8")

    def test_single_target_remove_has_no_force_or_prune(self):
        self.assertIn('"worktree", "remove", target', self.source)
        self.assertNotIn('"worktree", "prune"', self.source)
        self.assertNotIn('"--force"', self.source)
        self.assertNotIn("shutil.rmtree", self.source)
        self.assertNotIn('"branch", "-D"', self.source)
        self.assertNotIn('"push", "--delete"', self.source)


if __name__ == "__main__":
    unittest.main()
