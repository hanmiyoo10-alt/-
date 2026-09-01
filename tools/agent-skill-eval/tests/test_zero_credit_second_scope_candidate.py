from __future__ import annotations

import importlib.util
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


prompt_mod = load("compose_local_prompt_second_scope", "compose_local_prompt.py")


class SecondScopeCandidatePromptTests(unittest.TestCase):
    def context(self, case_id: str):
        return {
            "skill": "plugin-impact-scope",
            "case_id": case_id,
            "context_text": "bounded source evidence",
            "context_sha256": "e" * 64,
        }

    def candidate_matrix(self):
        return {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": "simcore-3m3-structured-sidecar-validation-heldout",
            "prompt": "impact scope only",
            "fixture_class": "second_scope_candidate",
            "candidate_scope": "plugin:simcore",
            "candidate_frozen_source_snapshot": {
                "main": "e4daaa427ed902ca6f8368c45d509f7fd0f26d42",
                "release-simcore": "861100f4771967aa5b8ab8811d06f11702c0d3ff",
            },
        }

    def test_candidate_frame_is_shared_and_scope_gate_only(self):
        matrix = self.candidate_matrix()
        context = self.context(matrix["case_id"])
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("target guidance with an ordinary pilot scope gate", encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(matrix, context, skill, "with_skill")
            base_prompt, base_meta = prompt_mod.compose(
                matrix, context, skill, "baseline_without_target_skill"
            )
        frame = "ISOLATED SECOND-SCOPE CANDIDATE EVAL ONLY."
        for prompt in (with_prompt, base_prompt):
            self.assertIn(frame, prompt)
            self.assertIn("plugin:simcore", prompt)
            self.assertIn("bypass only that scope gate", prompt)
            self.assertIn("not normal invocation authority", prompt)
            self.assertNotIn("SourceProjectionEnvelope", prompt)
            self.assertNotIn("structured sidecar", prompt.lower())
        self.assertEqual(with_meta["fixture_class"], "second_scope_candidate")
        self.assertEqual(base_meta["fixture_class"], "second_scope_candidate")
        self.assertEqual(with_meta["candidate_scope"], "plugin:simcore")
        self.assertEqual(base_meta["candidate_scope"], "plugin:simcore")

    def test_standard_prompt_has_no_candidate_override(self):
        matrix = {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": "narrow-negative",
            "prompt": "narrow task",
        }
        context = self.context("narrow-negative")
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("target guidance", encoding="utf-8")
            prompt, meta = prompt_mod.compose(matrix, context, skill, "with_skill")
        self.assertNotIn("ISOLATED SECOND-SCOPE CANDIDATE EVAL ONLY.", prompt)
        self.assertEqual(meta["fixture_class"], "standard")
        self.assertIsNone(meta["candidate_scope"])

    def test_candidate_frame_requires_frozen_snapshot(self):
        matrix = self.candidate_matrix()
        matrix.pop("candidate_frozen_source_snapshot")
        context = self.context(matrix["case_id"])
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("target guidance", encoding="utf-8")
            with self.assertRaises(prompt_mod.PromptError):
                prompt_mod.compose(matrix, context, skill, "with_skill")


if __name__ == "__main__":
    unittest.main()
