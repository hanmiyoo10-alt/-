from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
TOOL_DIR = HERE.parents[1]
REPO_ROOT = HERE.parents[3]

spec = importlib.util.spec_from_file_location("prepare_eval", TOOL_DIR / "prepare_eval.py")
prepare_eval = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(prepare_eval)


class PrepareEvalTests(unittest.TestCase):
    def test_real_authority_scan_fixture_normalizes(self):
        matrix = prepare_eval.build_matrix(
            REPO_ROOT,
            "plugin-authority-scan",
            "output",
            "1",
            "claude-haiku-4.5",
            "a" * 40,
        )
        self.assertEqual(matrix["skill"], "plugin-authority-scan")
        self.assertEqual(matrix["case_id"], "1")
        self.assertEqual(matrix["fixture_class"], "standard")
        self.assertEqual(len(matrix["prompt_sha256"]), 64)
        self.assertEqual(matrix["modes"], ["with_skill", "baseline_without_target_skill"])

    def test_real_impact_scope_fixture_normalizes_different_schema(self):
        matrix = prepare_eval.build_matrix(
            REPO_ROOT,
            "plugin-impact-scope",
            "output",
            "service-tier-fidelity",
            "gpt-5.4",
            "b" * 40,
        )
        self.assertEqual(matrix["case_id"], "service-tier-fidelity")
        self.assertEqual(matrix["fixture_class"], "standard")
        self.assertNotIn("candidate_scope", matrix)
        self.assertTrue(matrix["assertions"])

    def test_second_scope_candidate_resolves_legacy_default(self):
        matrix = prepare_eval.build_matrix(
            REPO_ROOT,
            "plugin-impact-scope",
            "output",
            "simcore-3m3-structured-sidecar-validation-heldout",
            "gpt-5.4",
            "b" * 40,
        )
        self.assertEqual(matrix["fixture_class"], "second_scope_candidate")
        self.assertEqual(matrix["candidate_scope"], "plugin:simcore")
        self.assertTrue(matrix["fixture_path"].endswith("second_scope_candidate_evals.json"))
        self.assertEqual(
            matrix["candidate_frozen_source_snapshot"],
            {
                "main": "e4daaa427ed902ca6f8368c45d509f7fd0f26d42",
                "release-simcore": "861100f4771967aa5b8ab8811d06f11702c0d3ff",
            },
        )

    def test_second_scope_candidate_resolves_termux_case_override(self):
        matrix = prepare_eval.build_matrix(
            REPO_ROOT,
            "plugin-impact-scope",
            "output",
            "termux-large-doc-background-autosave-heldout",
            "gpt-5.4",
            "b" * 40,
        )
        self.assertEqual(matrix["fixture_class"], "second_scope_candidate")
        self.assertEqual(matrix["candidate_scope"], "plugin:termux-large-doc-editor")
        self.assertEqual(
            matrix["candidate_frozen_source_snapshot"],
            {"main": "f01c2ef304656de9254191ec2fb9a2c046642f21"},
        )

    def test_candidate_fixture_requires_explicit_not_promoted_status(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            eval_dir = root / ".agents/skills/plugin-impact-scope/evals"
            eval_dir.mkdir(parents=True)
            (eval_dir / "second_scope_candidate_evals.json").write_text(
                json.dumps(
                    {
                        "skill_name": "plugin-impact-scope",
                        "status": "PROMOTED",
                        "candidate_scope": "plugin:simcore",
                        "frozen_source_snapshot": {"main": "a" * 40},
                        "evals": [{"id": "x", "prompt": "x"}],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(prepare_eval.EvalPreparationError):
                prepare_eval._load_second_scope_candidate(root, "plugin-impact-scope")

    def test_candidate_case_overrides_scope_and_snapshot_as_a_pair(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            eval_dir = root / ".agents/skills/plugin-impact-scope/evals"
            eval_dir.mkdir(parents=True)
            (eval_dir / "second_scope_candidate_evals.json").write_text(
                json.dumps(
                    {
                        "skill_name": "plugin-impact-scope",
                        "status": "CANDIDATE_ONLY_NOT_PROMOTED",
                        "candidate_scope": "plugin:simcore",
                        "frozen_source_snapshot": {"main": "a" * 40},
                        "evals": [
                            {"id": "legacy", "prompt": "legacy"},
                            {
                                "id": "override",
                                "prompt": "override",
                                "candidate_scope": "plugin:termux-large-doc-editor",
                                "frozen_source_snapshot": {"main": "b" * 40},
                            },
                        ],
                    }
                ),
                encoding="utf-8",
            )
            _, cases, meta = prepare_eval._load_second_scope_candidate(
                root, "plugin-impact-scope"
            )
            self.assertEqual(meta, {"fixture_class": "second_scope_candidate"})
            self.assertEqual(cases[0]["candidate_scope"], "plugin:simcore")
            self.assertEqual(cases[0]["candidate_frozen_source_snapshot"], {"main": "a" * 40})
            self.assertEqual(cases[1]["candidate_scope"], "plugin:termux-large-doc-editor")
            self.assertEqual(cases[1]["candidate_frozen_source_snapshot"], {"main": "b" * 40})

    def test_candidate_case_partial_override_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            eval_dir = root / ".agents/skills/plugin-impact-scope/evals"
            eval_dir.mkdir(parents=True)
            (eval_dir / "second_scope_candidate_evals.json").write_text(
                json.dumps(
                    {
                        "skill_name": "plugin-impact-scope",
                        "status": "CANDIDATE_ONLY_NOT_PROMOTED",
                        "candidate_scope": "plugin:simcore",
                        "frozen_source_snapshot": {"main": "a" * 40},
                        "evals": [
                            {
                                "id": "partial",
                                "prompt": "partial",
                                "candidate_scope": "plugin:termux-large-doc-editor",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(prepare_eval.EvalPreparationError) as ctx:
                prepare_eval._load_second_scope_candidate(root, "plugin-impact-scope")
            self.assertIn("must override candidate_scope and frozen_source_snapshot together", str(ctx.exception))

    def test_candidate_case_malformed_snapshot_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            eval_dir = root / ".agents/skills/plugin-impact-scope/evals"
            eval_dir.mkdir(parents=True)
            (eval_dir / "second_scope_candidate_evals.json").write_text(
                json.dumps(
                    {
                        "skill_name": "plugin-impact-scope",
                        "status": "CANDIDATE_ONLY_NOT_PROMOTED",
                        "candidate_scope": "plugin:simcore",
                        "frozen_source_snapshot": {"main": "a" * 40},
                        "evals": [
                            {
                                "id": "bad",
                                "prompt": "bad",
                                "candidate_scope": "plugin:termux-large-doc-editor",
                                "frozen_source_snapshot": {"main": "not-a-sha"},
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(prepare_eval.EvalPreparationError) as ctx:
                prepare_eval._load_second_scope_candidate(root, "plugin-impact-scope")
            self.assertIn("frozen source SHA invalid", str(ctx.exception))

    def test_authority_trigger_array_schema_normalizes(self):
        _, cases = prepare_eval.load_cases(REPO_ROOT, "plugin-authority-scan", "trigger")
        self.assertEqual(cases[0]["id"], "trigger-001")
        self.assertIs(cases[0]["expected_trigger"], True)
        self.assertTrue(any(case["expected_trigger"] is False for case in cases))

    def test_impact_trigger_object_schema_normalizes(self):
        _, cases = prepare_eval.load_cases(REPO_ROOT, "plugin-impact-scope", "trigger")
        self.assertEqual(cases[0]["id"], "positive-001")
        self.assertIs(cases[0]["expected_trigger"], True)
        self.assertTrue(any(case["id"].startswith("negative-") for case in cases))

    def test_unallowlisted_skill_fails_closed(self):
        with self.assertRaises(prepare_eval.EvalPreparationError):
            prepare_eval.build_matrix(REPO_ROOT, "simcore", "output", "1", "gpt-5.4", "c" * 40)

    def test_unallowlisted_model_fails_closed(self):
        with self.assertRaises(prepare_eval.EvalPreparationError):
            prepare_eval.build_matrix(
                REPO_ROOT,
                "plugin-authority-scan",
                "output",
                "1",
                "auto",
                "d" * 40,
            )

    def test_unknown_case_is_bounded_error(self):
        with self.assertRaises(prepare_eval.EvalPreparationError) as ctx:
            prepare_eval.build_matrix(
                REPO_ROOT,
                "plugin-impact-scope",
                "output",
                "does-not-exist",
                "claude-haiku-4.5",
                "e" * 40,
            )
        self.assertIn("available=", str(ctx.exception))

    def test_duplicate_fixture_ids_are_rejected(self):
        payload = {
            "skill": "plugin-impact-scope",
            "cases": [
                {"id": "same", "prompt": "a"},
                {"id": "same", "prompt": "b"},
            ],
        }
        with self.assertRaises(prepare_eval.EvalPreparationError):
            prepare_eval._normalize_output_fixture(payload, "plugin-impact-scope")

    def test_workspace_presence_and_absence_proofs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with_root = root / "with"
            baseline = root / "baseline"
            (with_root / ".agents/skills/plugin-impact-scope").mkdir(parents=True)
            (with_root / ".agents/skills/plugin-impact-scope/SKILL.md").write_text("x", encoding="utf-8")
            (baseline / ".eval-quarantine/plugin-impact-scope").mkdir(parents=True)
            (baseline / ".eval-quarantine/plugin-impact-scope/SKILL.md").write_text("x", encoding="utf-8")
            self.assertEqual(
                prepare_eval.prove_workspace(with_root, "plugin-impact-scope", "with_skill")["proof"],
                "PASS",
            )
            self.assertEqual(
                prepare_eval.prove_workspace(
                    baseline, "plugin-impact-scope", "baseline_without_target_skill"
                )["proof"],
                "PASS",
            )

    def test_baseline_proof_rejects_canonical_skill_leak(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".agents/skills/plugin-impact-scope").mkdir(parents=True)
            (root / ".agents/skills/plugin-impact-scope/SKILL.md").write_text("x", encoding="utf-8")
            (root / ".eval-quarantine/plugin-impact-scope").mkdir(parents=True)
            (root / ".eval-quarantine/plugin-impact-scope/SKILL.md").write_text("x", encoding="utf-8")
            with self.assertRaises(prepare_eval.EvalPreparationError):
                prepare_eval.prove_workspace(root, "plugin-impact-scope", "baseline_without_target_skill")

    def test_cli_error_is_machine_readable(self):
        rc = prepare_eval.main(
            [
                "matrix",
                "--repo-root",
                str(REPO_ROOT),
                "--skill",
                "../escape",
                "--case-id",
                "1",
                "--model",
                "gpt-5.4",
                "--repository-sha",
                "f" * 40,
            ]
        )
        self.assertEqual(rc, 2)


if __name__ == "__main__":
    unittest.main()
