import importlib.util
import json
import os
import pathlib
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
CLI = ROOT / "preserve.py"


def write_json(path: pathlib.Path, value) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def spec(entries):
    return {"schema": "repo-preservation-spec.v1", "entries": entries}


def load_module():
    module_spec = importlib.util.spec_from_file_location("preserve_under_test", CLI)
    module = importlib.util.module_from_spec(module_spec)
    assert module_spec.loader is not None
    module_spec.loader.exec_module(module)
    return module


class PreserveContractTests(unittest.TestCase):
    def run_capture(self, root, spec_path, output):
        return subprocess.run(
            [sys.executable, str(CLI), "capture", "--root", str(root), "--spec", str(spec_path), "--output", str(output)],
            text=True,
            capture_output=True,
            check=False,
        )

    def run_compare(self, before, after):
        return subprocess.run(
            [sys.executable, str(CLI), "compare", "--before", str(before), "--after", str(after)],
            text=True,
            capture_output=True,
            check=False,
        )

    def capture_fixture(self, root, entries, output, name="spec.json"):
        spec_path = root.parent / name
        write_json(spec_path, spec(entries))
        result = self.run_capture(root, spec_path, output)
        self.assertEqual(result.returncode, 0, result.stderr)
        return output.read_bytes()

    def test_capture_is_deterministic_and_content_free(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            (root / "private.txt").write_text("token-ghp_SECRET_PAYLOAD", encoding="utf-8")
            (root / "tree").mkdir()
            (root / "tree" / "item.bin").write_bytes(b"abc")
            entries = [
                {"label": "z-file", "kind": "file_sha256", "path": "private.txt"},
                {"label": "a-tree", "kind": "tree_sha256", "path": "tree"},
                {"label": "m-missing", "kind": "exists_type", "path": "absent"},
            ]
            first = self.capture_fixture(root, entries, base / "one.json")
            second = self.capture_fixture(root, list(reversed(entries)), base / "two.json", "spec2.json")
            self.assertEqual(first, second)
            text = first.decode("utf-8")
            self.assertNotIn("SECRET_PAYLOAD", text)
            self.assertNotIn(str(root), text)
            self.assertNotIn("private.txt", text)
            self.assertNotIn("item.bin", text)
            self.assertEqual([item["label"] for item in json.loads(text)["entries"]], ["a-tree", "m-missing", "z-file"])

    def test_file_content_change_is_changed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            target = root / "file"
            target.write_text("before", encoding="utf-8")
            entries = [{"label": "file", "kind": "file_sha256", "path": "file"}]
            self.capture_fixture(root, entries, base / "before.json")
            target.write_text("after", encoding="utf-8")
            self.capture_fixture(root, entries, base / "after.json", "spec2.json")
            result = self.run_compare(base / "before.json", base / "after.json")
            self.assertEqual(result.returncode, 1, result.stderr)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["result"], "CHANGED")
            self.assertEqual(payload["entries"], [{"label": "file", "status": "changed"}])

    def test_executable_bit_change_is_changed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            target = root / "tool"
            target.write_text("echo ok\n", encoding="utf-8")
            target.chmod(0o644)
            entries = [{"label": "tool", "kind": "file_sha256", "path": "tool"}]
            self.capture_fixture(root, entries, base / "before.json")
            target.chmod(0o755)
            self.capture_fixture(root, entries, base / "after.json", "spec2.json")
            result = self.run_compare(base / "before.json", base / "after.json")
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)["entries"][0]["status"], "changed")

    def test_empty_directory_rename_changes_tree_digest(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            tree = root / "tree"
            (tree / "empty-a").mkdir(parents=True)
            entries = [{"label": "tree", "kind": "tree_sha256", "path": "tree"}]
            self.capture_fixture(root, entries, base / "before.json")
            (tree / "empty-a").rename(tree / "empty-b")
            self.capture_fixture(root, entries, base / "after.json", "spec2.json")
            result = self.run_compare(base / "before.json", base / "after.json")
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)["result"], "CHANGED")

    def test_tree_add_remove_and_content_change_are_changed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            tree = root / "tree"
            tree.mkdir(parents=True)
            target = tree / "a"
            target.write_text("one", encoding="utf-8")
            entries = [{"label": "tree", "kind": "tree_sha256", "path": "tree"}]
            self.capture_fixture(root, entries, base / "one.json")
            target.write_text("two", encoding="utf-8")
            self.capture_fixture(root, entries, base / "two.json", "spec2.json")
            self.assertEqual(self.run_compare(base / "one.json", base / "two.json").returncode, 1)
            (tree / "b").write_text("new", encoding="utf-8")
            self.capture_fixture(root, entries, base / "three.json", "spec3.json")
            self.assertEqual(self.run_compare(base / "two.json", base / "three.json").returncode, 1)
            (tree / "b").unlink()
            self.capture_fixture(root, entries, base / "four.json", "spec4.json")
            self.assertEqual(self.run_compare(base / "three.json", base / "four.json").returncode, 1)

    def test_exists_type_transition_is_changed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            entries = [{"label": "shape", "kind": "exists_type", "path": "thing"}]
            self.capture_fixture(root, entries, base / "missing.json")
            (root / "thing").write_text("x", encoding="utf-8")
            self.capture_fixture(root, entries, base / "file.json", "spec2.json")
            self.assertEqual(self.run_compare(base / "missing.json", base / "file.json").returncode, 1)
            (root / "thing").unlink()
            (root / "thing").mkdir()
            self.capture_fixture(root, entries, base / "dir.json", "spec3.json")
            self.assertEqual(self.run_compare(base / "file.json", base / "dir.json").returncode, 1)

    def test_added_and_missing_labels_are_bounded(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            (root / "a").write_text("a", encoding="utf-8")
            (root / "b").write_text("b", encoding="utf-8")
            one = [{"label": "a", "kind": "file_sha256", "path": "a"}]
            two = one + [{"label": "b", "kind": "file_sha256", "path": "b"}]
            self.capture_fixture(root, one, base / "one.json")
            self.capture_fixture(root, two, base / "two.json", "spec2.json")
            forward = json.loads(self.run_compare(base / "one.json", base / "two.json").stdout)
            reverse = json.loads(self.run_compare(base / "two.json", base / "one.json").stdout)
            self.assertIn({"label": "b", "status": "added"}, forward["entries"])
            self.assertIn({"label": "b", "status": "missing"}, reverse["entries"])

    def test_duplicate_label_and_unsupported_kind_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            cases = [
                spec([{"label": "x", "kind": "exists_type", "path": "a"}, {"label": "x", "kind": "exists_type", "path": "b"}]),
                spec([{"label": "x", "kind": "command", "path": "a"}]),
            ]
            for index, payload in enumerate(cases):
                with self.subTest(index=index):
                    spec_path = base / f"bad-{index}.json"
                    write_json(spec_path, payload)
                    result = self.run_capture(root, spec_path, base / f"out-{index}.json")
                    self.assertEqual(result.returncode, 2)
                    self.assertIn("result=BLOCKED", result.stderr)

    def test_absolute_traversal_and_non_normalized_paths_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            for index, bad_path in enumerate(("/etc/passwd", "../escape", "a/../b", "a//b", "C:/Windows/System32")):
                with self.subTest(path=bad_path):
                    spec_path = base / f"path-{index}.json"
                    write_json(spec_path, spec([{"label": "x", "kind": "exists_type", "path": bad_path}]))
                    result = self.run_capture(root, spec_path, base / f"out-{index}.json")
                    self.assertEqual(result.returncode, 2)
                    self.assertNotIn(bad_path, result.stderr)
                    self.assertNotIn(bad_path, result.stdout)

    def test_symlink_final_and_component_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            (root / "real").mkdir()
            (root / "real" / "file").write_text("x", encoding="utf-8")
            os.symlink(root / "real" / "file", root / "link-file")
            os.symlink(root / "real", root / "link-dir")
            cases = [("link-file", "file_sha256"), ("link-dir/file", "file_sha256")]
            for index, (bad_path, kind) in enumerate(cases):
                with self.subTest(path=bad_path):
                    spec_path = base / f"sym-{index}.json"
                    write_json(spec_path, spec([{"label": "x", "kind": kind, "path": bad_path}]))
                    result = self.run_capture(root, spec_path, base / f"out-{index}.json")
                    self.assertEqual(result.returncode, 2)
                    self.assertIn("SYMLINK_BLOCKED", result.stderr)

    @unittest.skipUnless(hasattr(os, "mkfifo"), "FIFO requires POSIX")
    def test_fifo_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            os.mkfifo(root / "pipe")
            spec_path = base / "spec.json"
            write_json(spec_path, spec([{"label": "pipe", "kind": "exists_type", "path": "pipe"}]))
            result = self.run_capture(root, spec_path, base / "out.json")
            self.assertEqual(result.returncode, 2)
            self.assertIn("UNSUPPORTED_FILE_TYPE", result.stderr)

    def test_malformed_spec_and_secret_text_never_echo(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            secret = "ghp_SUPER_PRIVATE_TOKEN_VALUE"
            spec_path = base / "spec.json"
            spec_path.write_text('{"schema":"bad","note":"' + secret + '"}', encoding="utf-8")
            result = self.run_capture(root, spec_path, base / "out.json")
            self.assertEqual(result.returncode, 2)
            self.assertNotIn(secret, result.stdout + result.stderr)

    def test_oversize_spec_and_snapshot_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            spec_path = base / "huge-spec.json"
            spec_path.write_bytes(b"x" * (64 * 1024 + 1))
            result = self.run_capture(root, spec_path, base / "out.json")
            self.assertEqual(result.returncode, 2)
            self.assertIn("SPEC_READ_FAILED", result.stderr)
            huge_snapshot = base / "huge-snapshot.json"
            huge_snapshot.write_bytes(b"x" * (256 * 1024 + 1))
            compare = self.run_compare(huge_snapshot, huge_snapshot)
            self.assertEqual(compare.returncode, 2)
            self.assertEqual(json.loads(compare.stdout)["result"], "BLOCKED")

    def test_fixed_file_count_and_byte_ceilings_are_enforced(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            tree = root / "tree"
            tree.mkdir(parents=True)
            (tree / "a").write_bytes(b"aa")
            (tree / "b").write_bytes(b"bb")
            spec_path = base / "spec.json"
            write_json(spec_path, spec([{"label": "tree", "kind": "tree_sha256", "path": "tree"}]))
            module.MAX_FILES = 1
            with self.assertRaises(module.Blocked) as ctx:
                module.capture(root, spec_path, base / "count.json")
            self.assertIn(ctx.exception.code, {"FILE_COUNT_LIMIT", "TREE_NODE_LIMIT"})
            module.MAX_FILES = 4096
            module.MAX_TOTAL_BYTES = 3
            with self.assertRaises(module.Blocked) as ctx:
                module.capture(root, spec_path, base / "bytes.json")
            self.assertEqual(ctx.exception.code, "BYTE_LIMIT")

    def test_same_compare_returns_zero(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            (root / "file").write_text("same", encoding="utf-8")
            entries = [{"label": "file", "kind": "file_sha256", "path": "file"}]
            self.capture_fixture(root, entries, base / "snapshot.json")
            result = self.run_compare(base / "snapshot.json", base / "snapshot.json")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["result"], "SAME")

    def test_malformed_json_and_snapshot_schema_are_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            bad_spec = base / "bad-spec.json"
            bad_spec.write_text("{not-json", encoding="utf-8")
            capture = self.run_capture(root, bad_spec, base / "out.json")
            self.assertEqual(capture.returncode, 2)
            self.assertIn("INVALID_SPEC_JSON", capture.stderr)
            bad_snapshot = base / "bad-snapshot.json"
            write_json(bad_snapshot, {"schema": "repo-preservation-snapshot.v1", "entries": [{"label": "x", "kind": "exists_type", "state": "file", "path": "secret/path"}]})
            compare = self.run_compare(bad_snapshot, bad_snapshot)
            self.assertEqual(compare.returncode, 2)
            payload = json.loads(compare.stdout)
            self.assertEqual(payload["result"], "BLOCKED")
            self.assertNotIn("secret/path", compare.stdout + compare.stderr)

    def test_production_has_no_exec_network_or_package_surface(self):
        text = CLI.read_text(encoding="utf-8")
        forbidden = (
            "subprocess",
            "os.system",
            "os.popen",
            "eval(",
            "exec(",
            "urllib",
            "requests",
            "socket",
            "apt-get",
            "pkg install",
            "pip install",
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, text)

    def test_output_symlink_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            root = base / "root"
            root.mkdir()
            (root / "file").write_text("x", encoding="utf-8")
            spec_path = base / "spec.json"
            write_json(spec_path, spec([{"label": "x", "kind": "file_sha256", "path": "file"}]))
            real = base / "real.json"
            real.write_text("keep", encoding="utf-8")
            link = base / "linked.json"
            os.symlink(real, link)
            result = self.run_capture(root, spec_path, link)
            self.assertEqual(result.returncode, 2)
            self.assertIn("OUTPUT_INVALID", result.stderr)
            self.assertEqual(real.read_text(encoding="utf-8"), "keep")

    def test_failed_atomic_replace_leaves_no_temp_residue(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as td:
            base = pathlib.Path(td)
            output = base / "snapshot.json"
            with mock.patch.object(module.os, "replace", side_effect=OSError("synthetic")):
                with self.assertRaises(module.Blocked) as ctx:
                    module.safe_write(output, b"{}\n")
            self.assertEqual(ctx.exception.code, "OUTPUT_WRITE_FAILED")
            self.assertEqual(list(base.glob(".preserve.*")), [])
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
