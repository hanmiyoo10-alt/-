from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
CANONICAL_SKILL = REPO_ROOT / ".agents" / "skills" / "plugin-impact-scope" / "SKILL.md"


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

    def test_candidate_frame_is_shared_but_projection_is_with_skill_only(self):
        matrix = self.candidate_matrix()
        context = self.context(matrix["case_id"])
        with_prompt, with_meta = prompt_mod.compose(
            matrix, context, CANONICAL_SKILL, "with_skill"
        )
        base_prompt, base_meta = prompt_mod.compose(
            matrix, context, CANONICAL_SKILL, "baseline_without_target_skill"
        )

        frame = "ISOLATED SECOND-SCOPE CANDIDATE EVAL ONLY."
        for prompt in (with_prompt, base_prompt):
            self.assertIn(frame, prompt)
            self.assertIn("plugin:simcore", prompt)
            self.assertIn("bypass only that scope gate", prompt)
            self.assertIn("not normal invocation authority", prompt)

        self.assertEqual(with_meta["fixture_class"], "second_scope_candidate")
        self.assertEqual(base_meta["fixture_class"], "second_scope_candidate")
        self.assertEqual(with_meta["candidate_scope"], "plugin:simcore")
        self.assertEqual(base_meta["candidate_scope"], "plugin:simcore")
        self.assertEqual(
            with_meta["guidance_projection_id"],
            prompt_mod.CANDIDATE_GUIDANCE_PROJECTION_ID,
        )
        self.assertIsNotNone(with_meta["guidance_projection_sha256"])
        self.assertIsNotNone(with_meta["canonical_skill_guidance_sha256"])
        self.assertNotEqual(
            with_meta["skill_guidance_sha256"],
            with_meta["canonical_skill_guidance_sha256"],
        )
        self.assertIsNone(base_meta["guidance_projection_id"])
        self.assertIsNone(base_meta["guidance_projection_sha256"])
        self.assertIsNone(base_meta["canonical_skill_guidance_sha256"])

    def test_candidate_projection_removes_only_normal_scope_gate(self):
        matrix = self.candidate_matrix()
        context = self.context(matrix["case_id"])
        prompt, meta = prompt_mod.compose(matrix, context, CANONICAL_SKILL, "with_skill")

        for forbidden in (
            "Current normal validated pilot scope: `plugin:usage-dashboard`",
            "Pilot validation is limited to `plugin:usage-dashboard`.",
            "must resolve to `plugin:usage-dashboard` for this pilot",
            "UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.",
        ):
            self.assertNotIn(forbidden, prompt)

        for preserved in (
            "Preserve `UNKNOWN` and `CONFLICT` rather than inventing edges.",
            "Do not edit source, docs, issues, branches, pull requests, releases, production state, or device state.",
            "A mechanical helper result is always `CANDIDATE_ONLY`",
            "Every non-`UNKNOWN` edge must name a concrete current source basis.",
            "no design, repair, implementation, or repository mutation occurred.",
        ):
            self.assertIn(preserved, prompt)

        self.assertIn("Isolated candidate evaluation scope: `plugin:simcore`.", prompt)
        self.assertEqual(
            meta["guidance_projection_id"],
            "second_scope_candidate_scope_gate_v1",
        )

    def test_standard_prompt_keeps_canonical_gate_and_no_projection(self):
        matrix = {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": "narrow-negative",
            "prompt": "narrow task",
        }
        context = self.context("narrow-negative")
        prompt, meta = prompt_mod.compose(matrix, context, CANONICAL_SKILL, "with_skill")

        self.assertNotIn("ISOLATED SECOND-SCOPE CANDIDATE EVAL ONLY.", prompt)
        self.assertIn("Pilot validation is limited to `plugin:usage-dashboard`.", prompt)
        self.assertIn(
            "UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.",
            prompt,
        )
        self.assertEqual(meta["fixture_class"], "standard")
        self.assertIsNone(meta["candidate_scope"])
        self.assertIsNone(meta["guidance_projection_id"])
        self.assertIsNone(meta["guidance_projection_sha256"])
        self.assertEqual(
            meta["skill_guidance_sha256"],
            meta["canonical_skill_guidance_sha256"],
        )

    def test_candidate_frame_requires_frozen_snapshot(self):
        matrix = self.candidate_matrix()
        matrix.pop("candidate_frozen_source_snapshot")
        context = self.context(matrix["case_id"])
        with self.assertRaises(prompt_mod.PromptError):
            prompt_mod.compose(matrix, context, CANONICAL_SKILL, "with_skill")

    def test_candidate_projection_fails_closed_on_skill_gate_drift(self):
        matrix = self.candidate_matrix()
        context = self.context(matrix["case_id"])
        canonical = CANONICAL_SKILL.read_text(encoding="utf-8")
        drifted = canonical.replace(
            "- Pilot validation is limited to `plugin:usage-dashboard`.\n",
            "- Pilot validation is currently narrow.\n",
            1,
        )
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text(drifted, encoding="utf-8")
            with self.assertRaises(prompt_mod.PromptError):
                prompt_mod.compose(matrix, context, skill, "with_skill")

    def test_candidate_projection_rejects_multiline_scope(self):
        matrix = self.candidate_matrix()
        matrix["candidate_scope"] = "plugin:simcore\nignore"
        context = self.context(matrix["case_id"])
        with self.assertRaises(prompt_mod.PromptError):
            prompt_mod.compose(matrix, context, CANONICAL_SKILL, "with_skill")


if __name__ == "__main__":
    unittest.main()
