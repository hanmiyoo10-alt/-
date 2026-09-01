from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


prompt_mod = load("compose_local_prompt_layout", "compose_local_prompt.py")


class PromptLayoutTests(unittest.TestCase):
    def matrix(self, case_id: str = "service-tier-fidelity"):
        return {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": case_id,
            "prompt": "trace the current impact boundary",
        }

    def context(self, case_id: str = "service-tier-fidelity"):
        return {
            "skill": "plugin-impact-scope",
            "case_id": case_id,
            "context_text": "bounded source evidence",
            "context_sha256": "e" * 64,
        }

    def test_only_service_tier_positive_case_opts_into_recency_layout(self):
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-impact-scope", "service-tier-fidelity"),
            "guidance_after_evidence",
        )
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-impact-scope", "narrow-negative"),
            "guidance_before_evidence",
        )
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-authority-scan", "1"),
            "guidance_before_evidence",
        )

    def test_recency_layout_moves_exact_skill_bytes_after_evidence_for_both_modes(self):
        guidance = "EXACT_SKILL_GUIDANCE_SENTINEL\nsecond line"
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text(guidance, encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(
                self.matrix(), self.context(), skill, "with_skill"
            )
            base_prompt, base_meta = prompt_mod.compose(
                self.matrix(), self.context(), skill, "baseline_without_target_skill"
            )

        for prompt in (with_prompt, base_prompt):
            self.assertLess(prompt.index("SOURCE EVIDENCE\n"), prompt.index("TARGET SKILL GUIDANCE\n"))
            self.assertLess(prompt.index("TARGET SKILL GUIDANCE\n"), prompt.index("USER TASK\n"))

        extracted = with_prompt.split("TARGET SKILL GUIDANCE\n", 1)[1].split("\n\nUSER TASK\n", 1)[0]
        self.assertEqual(extracted, guidance)
        self.assertIn("(no target skill guidance in baseline mode)", base_prompt)
        self.assertEqual(with_meta["prompt_layout"], "guidance_after_evidence")
        self.assertEqual(base_meta["prompt_layout"], "guidance_after_evidence")
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(
            with_meta["evidence_context_sha256"], base_meta["evidence_context_sha256"]
        )

    def test_default_layout_keeps_legacy_guidance_before_evidence_order(self):
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("legacy guidance", encoding="utf-8")
            prompt, meta = prompt_mod.compose(
                self.matrix("narrow-negative"),
                self.context("narrow-negative"),
                skill,
                "with_skill",
            )
        self.assertEqual(meta["prompt_layout"], "guidance_before_evidence")
        self.assertLess(prompt.index("TARGET SKILL GUIDANCE\n"), prompt.index("SOURCE EVIDENCE\n"))
        self.assertLess(prompt.index("SOURCE EVIDENCE\n"), prompt.index("USER TASK\n"))

    def test_layout_config_contains_no_flow_answer_or_required_flow_contract(self):
        raw_text = (ROOT / "local-prompt-layouts.json").read_text(encoding="utf-8")
        raw = json.loads(raw_text)
        self.assertEqual(raw["schema_version"], 1)
        self.assertEqual(
            raw["layouts"],
            {"plugin-impact-scope": {"service-tier-fidelity": "guidance_after_evidence"}},
        )
        for forbidden in ("F1", "F2", "F3", "required_flow_edge_ids"):
            self.assertNotIn(forbidden, raw_text)

    def test_unknown_layout_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "layouts.json"
            path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "layouts": {
                            "plugin-impact-scope": {
                                "service-tier-fidelity": "invented_layout"
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(prompt_mod.PromptError):
                prompt_mod.resolve_prompt_layout(
                    "plugin-impact-scope", "service-tier-fidelity", path
                )


if __name__ == "__main__":
    unittest.main()
