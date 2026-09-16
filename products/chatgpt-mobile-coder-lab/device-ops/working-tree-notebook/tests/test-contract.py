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
REPO_ROOT = SCRIPT.parents[4]
LOADER = importlib.machinery.SourceFileLoader("mcl_notebook_read", str(SCRIPT))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
assert SPEC is not None
MODULE = importlib.util.module_from_spec(SPEC)
LOADER.exec_module(MODULE)


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


if __name__ == "__main__":
    unittest.main()
