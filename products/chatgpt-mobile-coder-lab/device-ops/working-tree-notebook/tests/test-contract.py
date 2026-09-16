from __future__ import annotations

import hashlib
import importlib.machinery
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "mcl-notebook-read"
PROOF_SCRIPT = SCRIPT.parent / "mcl-notebook-live-proof"
REPO_ROOT = SCRIPT.parents[4]


def _exec_module_without_bytecode(loader, module) -> None:
    previous = sys.dont_write_bytecode
    try:
        sys.dont_write_bytecode = True
        loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous


LOADER = importlib.machinery.SourceFileLoader("mcl_notebook_read", str(SCRIPT))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
assert SPEC is not None
MODULE = importlib.util.module_from_spec(SPEC)
_exec_module_without_bytecode(LOADER, MODULE)

PROOF_LOADER = importlib.machinery.SourceFileLoader("mcl_notebook_live_proof", str(PROOF_SCRIPT))
PROOF_SPEC = importlib.util.spec_from_loader(PROOF_LOADER.name, PROOF_LOADER)
assert PROOF_SPEC is not None
PROOF_MODULE = importlib.util.module_from_spec(PROOF_SPEC)
_exec_module_without_bytecode(PROOF_LOADER, PROOF_MODULE)


def make_notebook(source: str, *, rich: bool = False) -> bytes:
    cells: list[dict[str, object]] = [
        {"cell_type": "markdown", "metadata": {}, "source": source}
    ]
    if rich:
        cells.append(
            {
                "cell_type": "code",
                "metadata": {},
                "execution_count": 1,
                "source": "print('x')",
                "outputs": [
                    {
                        "output_type": "execute_result",
                        "execution_count": 1,
                        "data": {
                            "text/plain": "42",
                            "text/html": "<b>42</b>",
                            "image/png": "AAAA",
                        },
                        "metadata": {},
                    }
                ],
            }
        )
    return json.dumps(
        {"nbformat": 4, "nbformat_minor": 5, "metadata": {}, "cells": cells}
    ).encode("utf-8")


class WorkingTreeNotebookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name) / "repo"
        self.repo.mkdir()
        self._git("init", "-q")
        self._git("config", "user.name", "Notebook Test")
        self._git("config", "user.email", "notebook@example.invalid")
        (self.repo / "tracked.ipynb").write_bytes(make_notebook("committed"))
        self._git("add", "tracked.ipynb")
        self._git("commit", "-qm", "fixture")
        self.head = self._git("rev-parse", "HEAD").stdout.strip()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _git(self, *args: str) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            ["git", "-C", str(self.repo), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {result.stderr}")
        return result

    def _run(
        self,
        path: str,
        *,
        root: str | None = None,
        include_outputs: bool = False,
    ) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
        command = [
            sys.executable,
            str(SCRIPT),
            "--repo-root",
            root if root is not None else str(self.repo),
            "--path",
            path,
        ]
        if include_outputs:
            command.append("--include-outputs")
        result = subprocess.run(
            command,
            cwd="/",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertTrue(result.stdout.strip(), result.stderr)
        return result, json.loads(result.stdout)

    def test_direct_invocation_uses_portable_shell_entrypoint(self) -> None:
        self.assertEqual(SCRIPT.read_text().splitlines()[0], "#!/bin/sh")
        self.assertTrue(os.access(SCRIPT, os.X_OK))
        shim_dir = Path(self.tmp.name) / "path-bin"
        shim_dir.mkdir()
        (shim_dir / "python3").symlink_to(sys.executable)
        env = os.environ.copy()
        env["PATH"] = str(shim_dir) + os.pathsep + env.get("PATH", "")
        env.pop("PYTHONDONTWRITEBYTECODE", None)
        env.pop("PYTHONPYCACHEPREFIX", None)
        result = subprocess.run(
            [str(SCRIPT), "--repo-root", str(self.repo), "--path", "tracked.ipynb"],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        value = json.loads(result.stdout)
        self.assertTrue(value["ok"])
        self.assertEqual(value["cells"][0]["source"], "committed")

    def test_direct_invocation_fails_boundedly_without_python3(self) -> None:
        empty_path = Path(self.tmp.name) / "empty-path"
        empty_path.mkdir()
        env = os.environ.copy()
        env["PATH"] = str(empty_path)
        result = subprocess.run(
            [str(SCRIPT), "--repo-root", str(self.repo), "--path", "tracked.ipynb"],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 127)
        self.assertEqual(result.stdout, "")
        self.assertIn("python3", result.stderr)

    def test_harness_bootstrap_is_cache_clean_and_restores_bytecode_setting(self) -> None:
        harness = Path(__file__).resolve()

        def cache_fingerprint() -> dict[str, str]:
            return {
                str(path.relative_to(SCRIPT.parent)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(SCRIPT.parent.rglob("*.pyc"))
            }

        before = cache_fingerprint()
        probe = (
            "import runpy,sys\n"
            "sys.dont_write_bytecode=False\n"
            f"runpy.run_path({str(harness)!r}, run_name='mcl_harness_probe')\n"
            "print(sys.dont_write_bytecode)\n"
        )
        env = os.environ.copy()
        env.pop("PYTHONDONTWRITEBYTECODE", None)
        env.pop("PYTHONPYCACHEPREFIX", None)
        result = subprocess.run(
            [sys.executable, "-c", probe],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "False")
        self.assertEqual(cache_fingerprint(), before)

    def test_harness_loader_restores_bytecode_setting_on_failure(self) -> None:
        loader = mock.Mock()
        loader.exec_module.side_effect = RuntimeError("blocked loader")
        previous = sys.dont_write_bytecode
        try:
            sys.dont_write_bytecode = False
            with self.assertRaisesRegex(RuntimeError, "blocked loader"):
                _exec_module_without_bytecode(loader, object())
            self.assertFalse(sys.dont_write_bytecode)
        finally:
            sys.dont_write_bytecode = previous

    def test_untracked_saved_edits_are_fresh_and_not_identified_by_head(self) -> None:
        target = self.repo / "draft.ipynb"
        first = make_notebook("first")
        target.write_bytes(first)
        run1, value1 = self._run("draft.ipynb")
        self.assertEqual(run1.returncode, 0)
        self.assertTrue(value1["ok"])
        self.assertEqual(value1["source_kind"], "working_tree")
        self.assertEqual(value1["path_state"], "untracked")
        self.assertEqual(value1["git_head_sha"], self.head)
        self.assertEqual(value1["content_sha256"], hashlib.sha256(first).hexdigest())
        self.assertEqual(value1["cells"][0]["source"], "first")
        second = make_notebook("second")
        target.write_bytes(second)
        run2, value2 = self._run("draft.ipynb")
        self.assertEqual(run2.returncode, 0)
        self.assertEqual(value2["git_head_sha"], self.head)
        self.assertEqual(value2["cells"][0]["source"], "second")
        self.assertNotEqual(value1["content_sha256"], value2["content_sha256"])

    def test_tracked_modified_and_tracked_clean_are_distinct(self) -> None:
        clean_run, clean = self._run("tracked.ipynb")
        self.assertEqual(clean_run.returncode, 0)
        self.assertEqual(clean["path_state"], "tracked-clean")
        (self.repo / "tracked.ipynb").write_bytes(make_notebook("modified"))
        changed_run, changed = self._run("tracked.ipynb")
        self.assertEqual(changed_run.returncode, 0)
        self.assertEqual(changed["path_state"], "tracked-modified")
        self.assertEqual(changed["git_head_sha"], self.head)
        self.assertEqual(changed["cells"][0]["source"], "modified")

    def test_rejects_relative_and_non_top_level_roots(self) -> None:
        relative_run, relative = self._run("tracked.ipynb", root="relative")
        self.assertEqual(relative_run.returncode, 2)
        self.assertIn("absolute", relative["error"])
        subdir = self.repo / "subdir"
        subdir.mkdir()
        nested_run, nested = self._run("tracked.ipynb", root=str(subdir))
        self.assertEqual(nested_run.returncode, 2)
        self.assertIn("top-level", nested["error"])

    def test_rejects_non_git_root_traversal_and_non_notebook(self) -> None:
        plain = Path(self.tmp.name) / "plain"
        plain.mkdir()
        non_git_run, non_git = self._run("tracked.ipynb", root=str(plain))
        self.assertEqual(non_git_run.returncode, 2)
        self.assertIn("Git worktree", non_git["error"])
        traversal_run, traversal = self._run("../tracked.ipynb")
        self.assertEqual(traversal_run.returncode, 2)
        self.assertIn("traversal", traversal["error"])
        other = self.repo / "data.json"
        other.write_text("{}")
        suffix_run, suffix = self._run("data.json")
        self.assertEqual(suffix_run.returncode, 2)
        self.assertIn(".ipynb", suffix["error"])

    def test_rejects_symlink_and_oversize(self) -> None:
        outside = Path(self.tmp.name) / "outside.ipynb"
        outside.write_bytes(make_notebook("outside"))
        (self.repo / "link.ipynb").symlink_to(outside)
        link_run, link = self._run("link.ipynb")
        self.assertEqual(link_run.returncode, 2)
        self.assertIn("symlink", link["error"])
        big = self.repo / "big.ipynb"
        big.write_bytes(b"x" * (MODULE.MAX_NOTEBOOK_BYTES + 1))
        big_run, big_value = self._run("big.ipynb")
        self.assertEqual(big_run.returncode, 2)
        self.assertIn("byte bound", big_value["error"])

    def test_malformed_notebook_fails_closed_with_saved_hash(self) -> None:
        bad = b"{not-json"
        (self.repo / "bad.ipynb").write_bytes(bad)
        run, value = self._run("bad.ipynb")
        self.assertEqual(run.returncode, 2)
        self.assertFalse(value["ok"])
        self.assertIn("JSON decode failed", value["error"])
        self.assertEqual(value["content_sha256"], hashlib.sha256(bad).hexdigest())
        self.assertEqual(value["path_state"], "untracked")

    def test_rich_saved_outputs_remain_bounded_and_text_only(self) -> None:
        (self.repo / "rich.ipynb").write_bytes(make_notebook("rich", rich=True))
        run, value = self._run("rich.ipynb", include_outputs=True)
        self.assertEqual(run.returncode, 0)
        outputs = value["cells"][1]["outputs"]
        self.assertEqual(outputs[0]["text_data"]["text/plain"]["text"], "42")
        self.assertEqual(outputs[0]["omitted_mime_types"], ["image/png", "text/html"])
        rendered = json.dumps(value)
        self.assertNotIn("<b>42</b>", rendered)
        self.assertNotIn("AAAA", rendered)

    def test_ordinary_invocation_does_not_write_source_bytecode(self) -> None:
        layout = Path(self.tmp.name) / "reader-layout"
        reader = layout / SCRIPT.relative_to(REPO_ROOT)
        reader.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, reader)
        source_pkg = REPO_ROOT / "tools" / "repo-ci-mcp" / "repo_ci_mcp"
        copied_pkg = layout / "tools" / "repo-ci-mcp" / "repo_ci_mcp"
        copied_pkg.mkdir(parents=True)
        for source in source_pkg.glob("*.py"):
            shutil.copy2(source, copied_pkg / source.name)
        env = os.environ.copy()
        env.pop("PYTHONDONTWRITEBYTECODE", None)
        env.pop("PYTHONPYCACHEPREFIX", None)
        result = subprocess.run(
            [sys.executable, str(reader), "--repo-root", str(self.repo), "--path", "tracked.ipynb"],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(list((layout / "tools" / "repo-ci-mcp").rglob("*.pyc")))
        self.assertFalse(list((layout / "tools" / "repo-ci-mcp").rglob("__pycache__")))

    def test_import_failure_restores_bytecode_setting(self) -> None:
        layout = Path(self.tmp.name) / "failed-import-layout"
        reader = layout / SCRIPT.relative_to(REPO_ROOT)
        reader.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, reader)
        copied_pkg = layout / "tools" / "repo-ci-mcp" / "repo_ci_mcp"
        copied_pkg.mkdir(parents=True)
        (copied_pkg / "__init__.py").write_text("raise ImportError('blocked import')\n")
        probe = (
            "import runpy,sys\n"
            "sys.dont_write_bytecode=False\n"
            f"try: runpy.run_path({str(reader)!r}, run_name='mcl_probe')\n"
            "except ImportError: pass\n"
            "else: raise SystemExit('expected ImportError')\n"
            "print(sys.dont_write_bytecode)\n"
        )
        result = subprocess.run(
            [sys.executable, "-c", probe], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "False")

    def test_snapshot_race_fails_closed(self) -> None:
        target = self.repo / "race.ipynb"
        target.write_bytes(make_notebook("race"))
        original = MODULE._signature
        calls = 0

        def varying_signature(stat_result: os.stat_result):
            nonlocal calls
            calls += 1
            value = original(stat_result)
            if calls == 4:
                return (*value[:-1], value[-1] + 1)
            return value

        with mock.patch.object(MODULE, "_signature", side_effect=varying_signature):
            with self.assertRaisesRegex(MODULE.LocalNotebookError, "changed during"):
                MODULE._read_snapshot(target)


class NotebookLiveProofTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.control = root / "control"
        self.worktree_root = root / "worktrees"
        self.control.mkdir()
        self.worktree_root.mkdir()
        self._git("init", "-q")
        self._git("config", "user.name", "Proof Test")
        self._git("config", "user.email", "proof@example.invalid")
        reader = self.control / SCRIPT.relative_to(REPO_ROOT)
        reader.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, reader)
        source_pkg = REPO_ROOT / "tools" / "repo-ci-mcp" / "repo_ci_mcp"
        copied_pkg = self.control / "tools" / "repo-ci-mcp" / "repo_ci_mcp"
        copied_pkg.mkdir(parents=True)
        for source in source_pkg.glob("*.py"):
            shutil.copy2(source, copied_pkg / source.name)
        self._git("add", ".")
        self._git("commit", "-qm", "proof fixture")
        self.base = self._git("rev-parse", "HEAD").stdout.strip()
        self.profile_patch = mock.patch.dict(PROOF_MODULE.PROFILES, {
            "S": {"control_repo": self.control, "landing": self.control,
                  "worktree_root": self.worktree_root, "branch_prefix": "server/"}
        }, clear=True)
        self.profile_patch.start()

    def tearDown(self) -> None:
        self.profile_patch.stop()
        self.tmp.cleanup()

    def _git(self, *args: str) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            ["git", "-C", str(self.control), *args],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {result.stderr}")
        return result

    def _target(self, name: str = "proof") -> Path:
        return self.worktree_root / name

    def _run(self, *, branch: str = "server/proof", target: Path | None = None,
             base: str | None = None) -> dict[str, object]:
        return PROOF_MODULE.run_proof(
            "S", base or self.base, branch, str(target or self._target())
        )

    def test_live_proof_success_cleans_owned_workspace(self) -> None:
        target = self._target()
        value = self._run(target=target)
        self.assertEqual(value["status"], "PASS", value)
        self.assertNotEqual(value["first_content_sha256"], value["second_content_sha256"])
        self.assertEqual(value["cache_artifact_delta"], "NONE")
        self.assertEqual(value["cleanup"], "COMPLETE")
        self.assertTrue(value["branch_absent_after"])
        self.assertTrue(value["worktree_absent_after"])
        self.assertTrue(value["control_preserved"])
        self.assertTrue(value["landing_preserved"])
        self.assertFalse(target.exists())
        probe = subprocess.run(["git", "-C", str(self.control), "show-ref", "--verify", "--quiet", "refs/heads/server/proof"], check=False)
        self.assertEqual(probe.returncode, 1)

    def test_target_exists_refuses_without_mutation(self) -> None:
        target = self._target()
        target.mkdir()
        value = self._run(target=target)
        self.assertEqual(value["status"], "BLOCKED")
        self.assertIn("WORKTREE_TARGET_EXISTS", value["reason_codes"])
        self.assertTrue(target.exists())
        probe = subprocess.run(
            ["git", "-C", str(self.control), "show-ref", "--verify", "--quiet", "refs/heads/server/proof"],
            check=False,
        )
        self.assertEqual(probe.returncode, 1)

    def test_missing_base_and_wrong_namespace_fail_closed(self) -> None:
        missing = self._run(base="0" * 40, target=self._target("missing"))
        self.assertEqual(missing["status"], "BLOCKED")
        self.assertIn("BASE_COMMIT_UNAVAILABLE", missing["reason_codes"])
        wrong = self._run(branch="mainphone/wrong", target=self._target("wrong"))
        self.assertEqual(wrong["status"], "BLOCKED")
        self.assertIn("BRANCH_NAMESPACE_INVALID", wrong["reason_codes"])

    def test_dirty_landing_is_preserved_and_refused(self) -> None:
        dirty = self.control / "preexisting.txt"
        dirty.write_text("keep")
        value = self._run(target=self._target("dirty"))
        self.assertEqual(value["status"], "BLOCKED")
        self.assertIn("LANDING_NOT_CLEAN", value["reason_codes"])
        self.assertEqual(dirty.read_text(), "keep")

    def test_created_head_mismatch_refuses_and_cleans(self) -> None:
        target = self._target("wrong-head")
        original = PROOF_MODULE._head
        first_target_read = True

        def mismatched_head(root: Path) -> str:
            nonlocal first_target_read
            if Path(root) == target and first_target_read:
                first_target_read = False
                return "f" * 40
            return original(root)

        with mock.patch.object(PROOF_MODULE, "_head", side_effect=mismatched_head):
            value = self._run(branch="server/wrong-head", target=target)
        self.assertEqual(value["status"], "FAIL")
        self.assertIn("CREATED_WORKTREE_IDENTITY_MISMATCH", value["reason_codes"])
        self.assertEqual(value["cleanup"], "COMPLETE")
        self.assertFalse(target.exists())

    def test_reader_failure_attempts_owned_cleanup(self) -> None:
        target = self._target("reader-fail")
        failure = PROOF_MODULE.ProofError("TEST_READER_FAILURE")
        with mock.patch.object(PROOF_MODULE, "_run_reader", side_effect=failure):
            value = self._run(branch="server/reader-fail", target=target)
        self.assertEqual(value["status"], "FAIL")
        self.assertIn("TEST_READER_FAILURE", value["reason_codes"])
        self.assertEqual(value["cleanup"], "COMPLETE")
        self.assertFalse(target.exists())

    def test_foreign_file_blocks_destructive_cleanup(self) -> None:
        target = self._target("foreign")

        def fail_with_foreign(worktree: Path) -> dict[str, object]:
            (worktree / "foreign.txt").write_text("preserve me")
            raise PROOF_MODULE.ProofError("TEST_READER_FAILURE")

        with mock.patch.object(PROOF_MODULE, "_run_reader", side_effect=fail_with_foreign):
            value = self._run(branch="server/foreign", target=target)
        self.assertEqual(value["status"], "FAIL")
        self.assertEqual(value["cleanup"], "BLOCKED")
        self.assertIn("CLEANUP_WORKTREE_DIRTY", value["reason_codes"])
        self.assertTrue((target / "foreign.txt").is_file())

    def test_cache_artifact_delta_blocks_cleanup(self) -> None:
        target = self._target("cache-delta")
        original = PROOF_MODULE._run_reader

        def reader_with_cache(worktree: Path) -> dict[str, object]:
            value = original(worktree)
            cache = worktree / "tools/repo-ci-mcp/repo_ci_mcp/__pycache__"
            cache.mkdir(parents=True, exist_ok=True)
            (cache / "foreign.pyc").write_bytes(b"cache")
            return value

        with mock.patch.object(PROOF_MODULE, "_run_reader", side_effect=reader_with_cache):
            value = self._run(branch="server/cache-delta", target=target)
        self.assertEqual(value["status"], "FAIL")
        self.assertIn("READER_ARTIFACT_DELTA", value["reason_codes"])
        self.assertIn("CLEANUP_FOREIGN_ARTIFACT_DELTA", value["reason_codes"])
        self.assertEqual(value["cleanup"], "BLOCKED")

    def test_proof_entrypoint_uses_portable_shell_trampoline(self) -> None:
        self.assertEqual(PROOF_SCRIPT.read_text().splitlines()[0], "#!/bin/sh")
        self.assertTrue(os.access(PROOF_SCRIPT, os.X_OK))
        shim_dir = Path(self.tmp.name) / "proof-path-bin"
        shim_dir.mkdir()
        (shim_dir / "python3").symlink_to(sys.executable)
        env = os.environ.copy()
        env["PATH"] = str(shim_dir) + os.pathsep + env.get("PATH", "")
        result = subprocess.run(
            [str(PROOF_SCRIPT), "--executor", "S", "--base-sha", "0" * 40,
             "--branch", "server/bounded", "--worktree", str(self._target("bounded"))],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 2, result.stderr)
        value = json.loads(result.stdout)
        self.assertNotEqual(value["status"], "PASS")
        rendered = json.dumps(value)
        self.assertNotIn(str(self.tmp.name), rendered)

    def test_proof_entrypoint_fails_boundedly_without_python3(self) -> None:
        empty_path = Path(self.tmp.name) / "proof-empty-path"
        empty_path.mkdir()
        env = os.environ.copy()
        env["PATH"] = str(empty_path)
        result = subprocess.run(
            [str(PROOF_SCRIPT), "--executor", "S", "--base-sha", "0" * 40,
             "--branch", "server/no-python", "--worktree", str(self._target("no-python"))],
            cwd="/", env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 127)
        self.assertEqual(result.stdout, "")
        self.assertIn("python3", result.stderr)


if __name__ == "__main__":
    unittest.main()
