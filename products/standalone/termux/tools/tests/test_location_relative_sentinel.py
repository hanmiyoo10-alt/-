import json
import subprocess
import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from location_relative_sentinel import SCHEMA, classify


class LocationRelativeSentinelTests(unittest.TestCase):
    old_root = "plugins/termux/taskbridge"
    new_root = "products/standalone/termux/taskbridge"
    old_path = "plugins/termux/taskbridge/tests/test_execution_receipt.py"
    new_path = "products/standalone/termux/taskbridge/tests/test_execution_receipt.py"

    def request(
        self,
        old_source,
        new_source,
        *,
        old_root=None,
        new_root=None,
        old_path=None,
        new_path=None,
    ):
        return {
            "schema": SCHEMA,
            "old_root": old_root or self.old_root,
            "new_root": new_root or self.new_root,
            "files": [
                {
                    "old_path": old_path or self.old_path,
                    "new_path": new_path or self.new_path,
                    "old_source": old_source,
                    "new_source": new_source,
                }
            ],
        }

    def test_t4_unchanged_repo_root_depth_fails(self):
        source = "REPO = Path(__file__).resolve().parents[4]\n"
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "FAIL")
        row = out["files"][0]["expressions"][0]
        self.assertEqual(row["old_resolved_target"], ".")
        self.assertEqual(row["expected_new_target"], ".")
        self.assertEqual(row["candidate_new_target"], "products")
        self.assertEqual(row["target_class"], "EXTERNAL_TARGET")
        self.assertEqual(row["reason"], "PARENT_DEPTH_TARGET_MISMATCH")

    def test_t4_repaired_repo_root_depth_passes(self):
        old = "REPO = Path(__file__).resolve().parents[4]\n"
        new = "REPO = Path(__file__).resolve().parents[5]\n"
        out = classify(self.request(old, new))
        self.assertEqual(out["status"], "PASS")
        row = out["files"][0]["expressions"][0]
        self.assertEqual(row["old_parent_index"], 4)
        self.assertEqual(row["new_parent_index"], 5)
        self.assertEqual(row["candidate_new_target"], ".")
        self.assertEqual(row["reason"], "PARENT_DEPTH_TARGET_PRESERVED")

    def test_safe_child_root_reference_remaps_with_subtree(self):
        old = "ROOT = Path(__file__).resolve().parents[1]\n"
        new = "ROOT = Path(__file__).resolve().parents[1]\n"
        out = classify(self.request(old, new))
        self.assertEqual(out["status"], "PASS")
        row = out["files"][0]["expressions"][0]
        self.assertEqual(row["old_resolved_target"], self.old_root)
        self.assertEqual(row["expected_new_target"], self.new_root)
        self.assertEqual(row["candidate_new_target"], self.new_root)
        self.assertEqual(row["target_class"], "MOVED_SUBTREE_TARGET")

    def test_subdirectory_reference_remaps_with_subtree(self):
        old_path = "plugins/termux/taskbridge/tests/unit/test_x.py"
        new_path = "products/standalone/termux/taskbridge/tests/unit/test_x.py"
        old = "HERE = Path(__file__).resolve().parents[0]\n"
        new = "HERE = Path(__file__).resolve().parents[0]\n"
        out = classify(
            self.request(old, new, old_path=old_path, new_path=new_path)
        )
        self.assertEqual(out["status"], "PASS")
        row = out["files"][0]["expressions"][0]
        self.assertEqual(
            row["old_resolved_target"],
            "plugins/termux/taskbridge/tests/unit",
        )
        self.assertEqual(
            row["candidate_new_target"],
            "products/standalone/termux/taskbridge/tests/unit",
        )
        self.assertEqual(row["target_class"], "MOVED_SUBTREE_TARGET")

    def test_mixed_safe_and_repaired_external_references_pass(self):
        old = (
            "ROOT = Path(__file__).resolve().parents[1]\n"
            "REPO = Path(__file__).resolve().parents[4]\n"
        )
        new = (
            "ROOT = Path(__file__).resolve().parents[1]\n"
            "REPO = Path(__file__).resolve().parents[5]\n"
        )
        out = classify(self.request(old, new))
        self.assertEqual(out["status"], "PASS")
        rows = out["files"][0]["expressions"]
        self.assertEqual([row["target_class"] for row in rows], [
            "MOVED_SUBTREE_TARGET",
            "EXTERNAL_TARGET",
        ])

    def test_shared_external_ancestor_can_stay_same_depth(self):
        old_root = "products/old/taskbridge"
        new_root = "products/new/taskbridge"
        old_path = "products/old/taskbridge/tests/test_x.py"
        new_path = "products/new/taskbridge/tests/test_x.py"
        source = "PRODUCTS = Path(__file__).resolve().parents[3]\n"
        out = classify(
            self.request(
                source,
                source,
                old_root=old_root,
                new_root=new_root,
                old_path=old_path,
                new_path=new_path,
            )
        )
        self.assertEqual(out["status"], "PASS")
        row = out["files"][0]["expressions"][0]
        self.assertEqual(row["old_resolved_target"], "products")
        self.assertEqual(row["candidate_new_target"], "products")
        self.assertEqual(row["target_class"], "EXTERNAL_TARGET")

    def test_unsupported_fixed_parent_base_is_unknown(self):
        source = "REPO = SOME_ROOT.parents[4]\n"
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "UNSUPPORTED_FIXED_PARENT_BASE",
            out["files"][0]["error"],
        )

    def test_nonliteral_fixed_parent_indices_are_unknown(self):
        cases = [
            (
                "DEPTH = 4\nREPO = Path(__file__).resolve().parents[DEPTH]\n",
                "DEPTH = 5\nREPO = Path(__file__).resolve().parents[DEPTH]\n",
            ),
            (
                "REPO = Path(__file__).resolve().parents[2 + 2]\n",
                "REPO = Path(__file__).resolve().parents[2 + 3]\n",
            ),
        ]
        for old_source, new_source in cases:
            with self.subTest(old_source=old_source):
                out = classify(self.request(old_source, new_source))
                self.assertEqual(out["status"], "UNKNOWN")
                self.assertIn(
                    "UNSUPPORTED_PARENT_INDEX",
                    out["files"][0]["error"],
                )

    def test_negative_fixed_parent_index_is_unknown(self):
        source = "REPO = Path(__file__).resolve().parents[-1]\n"
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn("UNSUPPORTED_PARENT_INDEX", out["files"][0]["error"])

    def test_parent_index_above_repository_root_is_unknown(self):
        source = "REPO = Path(__file__).resolve().parents[99]\n"
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn("escapes repository root", out["files"][0]["error"])

    def test_syntax_error_is_unknown(self):
        out = classify(self.request("def broken(:\n", "def broken(:\n"))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn("Python syntax unavailable", out["files"][0]["error"])

    def test_comments_and_strings_do_not_create_findings(self):
        source = (
            "# Path(__file__).resolve().parents[4]\n"
            'TEXT = "Path(__file__).resolve().parents[4]"\n'
        )
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(out["files"][0]["reason"], "NO_FIXED_PARENT_EXPRESSIONS")
        self.assertEqual(out["files"][0]["expressions"], [])

    def test_missing_or_extra_expression_is_unknown(self):
        old = "REPO = Path(__file__).resolve().parents[4]\n"
        new = "VALUE = 1\n"
        out = classify(self.request(old, new))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "MISSING_OR_EXTRA_FIXED_PARENT_EXPRESSION",
            out["files"][0]["error"],
        )

    def test_changed_expression_context_is_unknown(self):
        old = "REPO = Path(__file__).resolve().parents[4]\n"
        new = "OTHER = Path(__file__).resolve().parents[5]\n"
        out = classify(self.request(old, new))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "AMBIGUOUS_FIXED_PARENT_PAIRING",
            out["files"][0]["error"],
        )

    def test_duplicate_expression_context_is_unknown(self):
        source = (
            "ROOT = Path(__file__).resolve().parents[1]\n"
            "ROOT = Path(__file__).resolve().parents[1]\n"
        )
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "AMBIGUOUS_FIXED_PARENT_PAIRING",
            out["files"][0]["error"],
        )

    def test_multiline_fixed_parent_expression_is_unknown(self):
        source = (
            "ROOT = Path(\n"
            "    __file__\n"
            ").resolve().parents[1]\n"
        )
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "multiline fixed-parent expression unsupported",
            out["files"][0]["error"],
        )

    def test_non_python_file_path_is_unknown(self):
        out = classify(
            self.request(
                "VALUE = 1\n",
                "VALUE = 1\n",
                old_path="plugins/termux/taskbridge/tests/test_x.txt",
                new_path="products/standalone/termux/taskbridge/tests/test_x.txt",
            )
        )
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn("Python source", out["files"][0]["error"])

    def test_ast_node_budget_is_bounded(self):
        source = "x = 1\n" * 6000
        out = classify(self.request(source, source))
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn("AST node budget exceeded", out["files"][0]["error"])

    def test_root_relative_file_suffix_must_be_preserved(self):
        out = classify(
            self.request(
                "VALUE = 1\n",
                "VALUE = 1\n",
                new_path="products/standalone/termux/taskbridge/tests/renamed.py",
            )
        )
        self.assertEqual(out["status"], "UNKNOWN")
        self.assertIn(
            "root-relative file suffix changed",
            out["files"][0]["error"],
        )

    def test_noncanonical_paths_fail_closed(self):
        cases = [
            {"old_root": "/plugins/termux/taskbridge"},
            {"new_root": "products//standalone/termux/taskbridge"},
            {"old_path": "plugins/termux/taskbridge/../taskbridge/tests/x.py"},
            {"new_path": "products\\standalone\\termux\\taskbridge\\tests\\x.py"},
            {"old_path": "plugins/termux/taskbridge/tests/x.py\n"},
        ]
        for overrides in cases:
            with self.subTest(overrides=overrides):
                out = classify(
                    self.request(
                        "VALUE = 1\n",
                        "VALUE = 1\n",
                        **overrides,
                    )
                )
                self.assertEqual(out["status"], "UNKNOWN")

    def test_file_results_are_sorted_deterministically(self):
        request = {
            "schema": SCHEMA,
            "old_root": self.old_root,
            "new_root": self.new_root,
            "files": [
                {
                    "old_path": self.old_root + "/tests/z.py",
                    "new_path": self.new_root + "/tests/z.py",
                    "old_source": "VALUE = 1\n",
                    "new_source": "VALUE = 1\n",
                },
                {
                    "old_path": self.old_root + "/tests/a.py",
                    "new_path": self.new_root + "/tests/a.py",
                    "old_source": "VALUE = 1\n",
                    "new_source": "VALUE = 1\n",
                },
            ],
        }
        first = classify(request)
        second = classify(json.loads(json.dumps(request)))
        self.assertEqual(first, second)
        self.assertEqual(
            [row["old_path"] for row in first["files"]],
            [
                self.old_root + "/tests/a.py",
                self.old_root + "/tests/z.py",
            ],
        )

    def test_authority_and_provenance_are_explicit(self):
        out = classify(self.request("VALUE = 1\n", "VALUE = 1\n"))
        self.assertEqual(out["evidence_provenance"], "CALLER_SUPPLIED")
        self.assertFalse(out["authenticated_repository_evidence"])
        self.assertEqual(
            out["path_resolution_model"],
            "LEXICAL_REPOSITORY_RELATIVE",
        )
        self.assertFalse(out["runtime_symlink_resolution_proven"])
        for key in (
            "filesystem_source_discovery_used",
            "git_used",
            "github_used",
            "network_used",
            "mutation_authorized",
            "execution_authorized",
            "merge_authorized",
            "release_authorized",
            "production_authorized",
            "runtime_authorized",
            "device_authorized",
        ):
            self.assertFalse(out[key])

    def test_cli_json_decoder_limits_fail_closed(self):
        script = TOOLS / "location_relative_sentinel.py"
        cases = [
            "[" * 2000 + "]" * 2000,
            "1" * 5000,
        ]
        for payload in cases:
            with self.subTest(size=len(payload)):
                run = subprocess.run(
                    [sys.executable, str(script)],
                    input=payload,
                    text=True,
                    capture_output=True,
                    check=False,
                )
                self.assertEqual(run.returncode, 2, run.stderr)
                parsed = json.loads(run.stdout)
                self.assertEqual(parsed["status"], "UNKNOWN")
                self.assertEqual(parsed["reason"], "INPUT_INVALID")
                self.assertFalse(parsed["mutation_authorized"])

    def test_cli_exit_codes_and_deterministic_json(self):
        script = TOOLS / "location_relative_sentinel.py"

        passing = self.request("VALUE = 1\n", "VALUE = 1\n")
        run = subprocess.run(
            [sys.executable, str(script)],
            input=json.dumps(passing),
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        parsed = json.loads(run.stdout)
        self.assertEqual(parsed["status"], "PASS")

        failing = self.request(
            "REPO = Path(__file__).resolve().parents[4]\n",
            "REPO = Path(__file__).resolve().parents[4]\n",
        )
        run = subprocess.run(
            [sys.executable, str(script)],
            input=json.dumps(failing),
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(run.returncode, 1)
        self.assertEqual(json.loads(run.stdout)["status"], "FAIL")

        run = subprocess.run(
            [sys.executable, str(script), "unexpected"],
            input="{}",
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(run.returncode, 2)
        self.assertEqual(json.loads(run.stdout)["status"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
