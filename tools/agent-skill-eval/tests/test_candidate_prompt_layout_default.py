from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, TOOL_ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


prompt_mod = load("compose_local_prompt_candidate_default", "compose_local_prompt.py")


class CandidatePromptLayoutDefaultTests(unittest.TestCase):
    def candidate_matrix(self, case_id: str = "candidate-layout-test"):
        return {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": case_id,
            "prompt": "trace only the current source-backed impact boundary",
            "fixture_class": "second_scope_candidate",
            "candidate_scope": "plugin:termux-large-doc-editor",
            "candidate_frozen_source_snapshot": {"main": "a" * 40},
        }

    def context(self, case_id: str = "candidate-layout-test"):
        return {
            "skill": "plugin-impact-scope",
            "case_id": case_id,
            "context_text": "bounded source evidence from an immutable candidate snapshot",
            "context_sha256": "e" * 64,
        }

    def test_candidate_fixture_defaults_guidance_after_evidence(self):
        self.assertEqual(
            prompt_mod.resolve_prompt_layout(
                "plugin-impact-scope",
                "unconfigured-candidate-case",
                fixture_class="second_scope_candidate",
            ),
            "guidance_after_evidence",
        )

    def test_standard_layout_contract_is_unchanged(self):
        self.assertEqual(
            prompt_mod.resolve_prompt_layout(
                "plugin-impact-scope",
                "service-tier-fidelity",
                fixture_class="standard",
            ),
            "guidance_after_evidence_claim_compatibility_before_task",
        )
        self.assertEqual(
            prompt_mod.resolve_prompt_layout(
                "plugin-impact-scope",
                "narrow-negative",
                fixture_class="standard",
            ),
            "guidance_before_evidence",
        )

    def test_explicit_case_layout_overrides_candidate_default(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "layouts.json"
            path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "layouts": {
                            "plugin-impact-scope": {
                                "candidate-layout-test": "guidance_before_evidence"
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )
            self.assertEqual(
                prompt_mod.resolve_prompt_layout(
                    "plugin-impact-scope",
                    "candidate-layout-test",
                    path,
                    fixture_class="second_scope_candidate",
                ),
                "guidance_before_evidence",
            )

    def test_candidate_compose_uses_same_evidence_guidance_task_order_for_both_modes(self):
        skill = REPO_ROOT / ".agents/skills/plugin-impact-scope/SKILL.md"
        matrix = self.candidate_matrix()
        context = self.context()
        with_prompt, with_meta = prompt_mod.compose(
            matrix,
            context,
            skill,
            "with_skill",
        )
        base_prompt, base_meta = prompt_mod.compose(
            matrix,
            context,
            skill,
            "baseline_without_target_skill",
        )

        for prompt in (with_prompt, base_prompt):
            self.assertLess(prompt.index("SOURCE EVIDENCE\n"), prompt.index("TARGET SKILL GUIDANCE\n"))
            self.assertLess(prompt.index("TARGET SKILL GUIDANCE\n"), prompt.index("USER TASK\n"))

        self.assertEqual(with_meta["prompt_layout"], "guidance_after_evidence")
        self.assertEqual(base_meta["prompt_layout"], "guidance_after_evidence")
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(
            with_meta["evidence_context_sha256"],
            base_meta["evidence_context_sha256"],
        )
        self.assertEqual(
            with_meta["guidance_projection_id"],
            "second_scope_candidate_scope_gate_v1",
        )
        self.assertIsNone(base_meta["guidance_projection_id"])
        self.assertNotIn(
            "UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.",
            with_prompt,
        )

    def test_unknown_fixture_class_fails_closed(self):
        with self.assertRaises(prompt_mod.PromptError):
            prompt_mod.resolve_prompt_layout(
                "plugin-impact-scope",
                "x",
                fixture_class="invented_fixture",
            )


if __name__ == "__main__":
    unittest.main()
