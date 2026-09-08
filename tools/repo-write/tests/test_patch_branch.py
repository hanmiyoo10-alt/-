from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATCH_SCRIPT = ROOT / "patch_branch.py"
BRIDGE_SCRIPT = ROOT / "request_bridge.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


patch_branch = load_module("patch_branch", PATCH_SCRIPT)
request_bridge = load_module("request_bridge", BRIDGE_SCRIPT)


def run(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if check and cp.returncode != 0:
        raise AssertionError(f"command failed: {args}\nstdout={cp.stdout}\nstderr={cp.stderr}")
    return cp


def git(cwd: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["git", *args], cwd, check=check)


class BridgeTests(unittest.TestCase):
    def valid_event(self) -> tuple[dict, str]:
        patch = "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n"
        digest = hashlib.sha256(patch.encode()).hexdigest()
        metadata = {
            "schemaVersion": 1,
            "branch": "agent-patch/demo",
            "expectedHead": "a" * 40,
            "workIssue": 1873,
            "patchSha256": digest,
            "message": "test: patch demo",
            "expectedPaths": ["a.txt"],
        }
        body = f"{request_bridge.START}\n{json.dumps(metadata, separators=(',', ':'))}\n{request_bridge.PATCH_SEPARATOR}\n{patch}{request_bridge.END}"
        event = {
            "issue": {"number": 1876},
            "comment": {
                "body": body,
                "author_association": "OWNER",
                "user": {"login": "owner", "type": "User"},
            },
            "repository": {"owner": {"login": "owner"}},
        }
        return event, patch

    def test_valid_owner_request_normalizes(self):
        event, patch = self.valid_event()
        request, parsed_patch = request_bridge.parse_event(event, 1876)
        self.assertEqual(parsed_patch, patch)
        self.assertEqual(request["branch"], "agent-patch/demo")
        self.assertEqual(request["expected_paths"], ["a.txt"])

    def test_wrong_issue_rejected(self):
        event, _ = self.valid_event()
        event["issue"]["number"] = 999
        with self.assertRaises(request_bridge.BridgeError) as caught:
            request_bridge.parse_event(event, 1876)
        self.assertEqual(caught.exception.reason, "WRONG_QUEUE_ISSUE")

    def test_non_owner_rejected(self):
        event, _ = self.valid_event()
        event["comment"]["user"]["login"] = "other"
        with self.assertRaises(request_bridge.BridgeError) as caught:
            request_bridge.parse_event(event, 1876)
        self.assertEqual(caught.exception.reason, "REQUEST_ACTOR_DENIED")

    def test_hash_mismatch_rejected(self):
        event, _ = self.valid_event()
        event["comment"]["body"] = event["comment"]["body"].replace('"patchSha256":"', '"patchSha256":"' + "0" * 64)
        with self.assertRaises(request_bridge.BridgeError):
            request_bridge.parse_event(event, 1876)

    def test_main_target_rejected(self):
        event, _ = self.valid_event()
        event["comment"]["body"] = event["comment"]["body"].replace('"branch":"agent-patch/demo"', '"branch":"main"')
        with self.assertRaises(request_bridge.BridgeError) as caught:
            request_bridge.parse_event(event, 1876)
        self.assertEqual(caught.exception.reason, "TARGET_BRANCH_DENIED")


class PatchWriterTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.remote = root / "remote.git"
        self.seed = root / "seed"
        self.producer = root / "producer"
        git(root, "init", "--bare", str(self.remote))
        git(root, "init", str(self.seed))
        git(self.seed, "config", "user.name", "test")
        git(self.seed, "config", "user.email", "test@example.invalid")
        (self.seed / "large.txt").write_text("alpha\n" + "stable\n" * 2000 + "omega\n", encoding="utf-8")
        git(self.seed, "add", "large.txt")
        git(self.seed, "commit", "-m", "seed")
        git(self.seed, "branch", "-M", "agent-patch/demo")
        git(self.seed, "remote", "add", "origin", str(self.remote))
        git(self.seed, "push", "-u", "origin", "agent-patch/demo")
        self.expected = git(self.seed, "rev-parse", "HEAD").stdout.strip()

        git(root, "clone", str(self.remote), str(self.producer))
        git(self.producer, "checkout", "agent-patch/demo")
        git(self.producer, "config", "user.name", "producer")
        git(self.producer, "config", "user.email", "producer@example.invalid")

    def tearDown(self):
        self.tmp.cleanup()

    def make_patch(self) -> tuple[Path, Path]:
        content = (self.producer / "large.txt").read_text(encoding="utf-8")
        (self.producer / "large.txt").write_text(content.replace("alpha\n", "alpha-edited\n", 1), encoding="utf-8")
        (self.producer / "small.txt").write_text("new file\n", encoding="utf-8")
        patch = git(self.producer, "diff", "--", "large.txt", "small.txt").stdout
        git(self.producer, "add", "-N", "small.txt")
        patch = git(self.producer, "diff", "--", "large.txt", "small.txt").stdout
        patch_file = Path(self.tmp.name) / "request.patch"
        patch_file.write_text(patch, encoding="utf-8")
        request = {
            "branch": "agent-patch/demo",
            "expected_head": self.expected,
            "message": "test: atomic patch",
            "expected_paths": ["large.txt", "small.txt"],
            "patch_sha256": hashlib.sha256(patch.encode()).hexdigest(),
        }
        request_file = Path(self.tmp.name) / "request.json"
        request_file.write_text(json.dumps(request), encoding="utf-8")
        return request_file, patch_file

    def test_multifile_patch_is_one_fast_forward_commit(self):
        request_file, patch_file = self.make_patch()
        request = patch_branch.load_request(request_file)
        result = patch_branch.apply_request(self.seed, "origin", request, patch_file)
        self.assertEqual(result["disposition"], "PATCH_APPLIED")
        self.assertEqual(result["old_head"], self.expected)
        self.assertEqual(result["changed_paths"], ["large.txt", "small.txt"])
        new_head = result["new_head"]
        parent = git(self.seed, "show", "-s", "--format=%P", new_head).stdout.strip()
        self.assertEqual(parent, self.expected)
        remote_head = git(self.seed, "ls-remote", "--heads", "origin", "refs/heads/agent-patch/demo").stdout.split()[0]
        self.assertEqual(remote_head, new_head)
        self.assertEqual(git(self.seed, "show", f"{new_head}:small.txt").stdout, "new file\n")
        self.assertTrue(git(self.seed, "show", f"{new_head}:large.txt").stdout.startswith("alpha-edited\n"))

    def test_stale_expected_head_fails_without_mutation(self):
        request_file, patch_file = self.make_patch()
        (self.producer / "other.txt").write_text("concurrent\n", encoding="utf-8")
        git(self.producer, "add", "other.txt")
        git(self.producer, "commit", "-m", "concurrent")
        git(self.producer, "push", "origin", "agent-patch/demo")
        moved = git(self.producer, "rev-parse", "HEAD").stdout.strip()

        request = patch_branch.load_request(request_file)
        with self.assertRaises(patch_branch.PatchWriteError) as caught:
            patch_branch.apply_request(self.seed, "origin", request, patch_file)
        self.assertEqual(caught.exception.reason, "EXPECTED_HEAD_MISMATCH")
        remote_head = git(self.seed, "ls-remote", "--heads", "origin", "refs/heads/agent-patch/demo").stdout.split()[0]
        self.assertEqual(remote_head, moved)

    def test_binary_marker_rejected(self):
        patch_file = Path(self.tmp.name) / "binary.patch"
        raw = b"diff --git a/a b/a\nGIT binary patch\n"
        patch_file.write_bytes(raw)
        with self.assertRaises(patch_branch.PatchWriteError) as caught:
            patch_branch.load_patch(patch_file, hashlib.sha256(raw).hexdigest())
        self.assertEqual(caught.exception.reason, "BINARY_PATCH_DENIED")

    def test_self_modification_path_rejected(self):
        with self.assertRaises(patch_branch.PatchWriteError) as caught:
            patch_branch.validate_repo_path("tools/repo-write/patch_branch.py")
        self.assertEqual(caught.exception.reason, "SELF_MODIFICATION_DENIED")


if __name__ == "__main__":
    unittest.main()
