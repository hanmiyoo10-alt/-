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


contract_mod = load("local_response_contract_prompt_layout", "local_response_contract.py")
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

    def structured_context(self):
        blocks = [
            {
                "path": "docs/REPO_PROJECT_CATALOG.md",
                "text": "scope plugin:usage-dashboard authority releaseBranch=release-usage-dashboard",
            },
            {
                "path": "plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs",
                "text": "serviceTierSelectionSource captureSelectionSource requestKey",
            },
            {
                "path": "plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs",
                "text": "normalize recent rows serviceTierSelectionSource request metadata",
            },
            {
                "path": "plugins/usage-dashboard/src/14-request-ledger.part.js",
                "text": "serviceTierSelectionSource:preferKnownServiceTierSelectionSource requestLedgerKey",
            },
            {
                "path": "plugins/usage-dashboard/src/40-diagnostics.part.js",
                "text": "Service tier selection source: request plan-default unknown",
            },
            {
                "path": "plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs",
                "text": (
                    "P50 selection source must never enter request identity\n"
                    "P50 selection-source path must not add nativeFetch\n"
                    "P50 Service Tier Selection-Source Fidelity"
                ),
            },
        ]
        return {
            "skill": "plugin-impact-scope",
            "case_id": "service-tier-fidelity",
            "blocks": blocks,
            "context_text": "\n".join(block["text"] for block in blocks),
            "context_sha256": "e" * 64,
        }

    def contract(self):
        return contract_mod.load_contract(
            ROOT / "local-response-contracts.json",
            "plugin-impact-scope",
            "service-tier-fidelity",
        )

    def test_only_service_tier_positive_case_opts_into_claim_slot_recency_layout(self):
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-impact-scope", "service-tier-fidelity"),
            "guidance_after_evidence_claim_compatibility_before_task",
        )
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-impact-scope", "narrow-negative"),
            "guidance_before_evidence",
        )
        self.assertEqual(
            prompt_mod.resolve_prompt_layout("plugin-authority-scan", "1"),
            "guidance_before_evidence",
        )

    def test_claim_slot_layout_keeps_exact_skill_bytes_after_evidence_for_both_modes(self):
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
            self.assertLess(
                prompt.index("SOURCE EVIDENCE\n"),
                prompt.index("TARGET SKILL GUIDANCE\n"),
            )
            self.assertLess(
                prompt.index("TARGET SKILL GUIDANCE\n"),
                prompt.index("USER TASK\n"),
            )

        extracted = with_prompt.split("TARGET SKILL GUIDANCE\n", 1)[1].split(
            "\n\nUSER TASK\n", 1
        )[0]
        self.assertEqual(extracted, guidance)
        self.assertIn("(no target skill guidance in baseline mode)", base_prompt)
        self.assertEqual(
            with_meta["prompt_layout"],
            "guidance_after_evidence_claim_compatibility_before_task",
        )
        self.assertEqual(
            base_meta["prompt_layout"],
            "guidance_after_evidence_claim_compatibility_before_task",
        )
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(
            with_meta["evidence_context_sha256"],
            base_meta["evidence_context_sha256"],
        )

    def test_structured_claim_compatibility_moves_exactly_once_after_guidance(self):
        contract = self.contract()
        self.assertIsNotNone(contract)
        guidance = "EXACT_SKILL_GUIDANCE_SENTINEL\nsecond line"
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text(guidance, encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(
                self.matrix(),
                self.structured_context(),
                skill,
                "with_skill",
                contract,
            )
            base_prompt, base_meta = prompt_mod.compose(
                self.matrix(),
                self.structured_context(),
                skill,
                "baseline_without_target_skill",
                contract,
            )

        expected_compatibility = (
            "CLAIM EVIDENCE STATUS COMPATIBILITY\n"
            + contract_mod.claim_evidence_legend(contract)
            + "\n"
        )
        for prompt in (with_prompt, base_prompt):
            self.assertEqual(
                prompt.count("CLAIM EVIDENCE STATUS COMPATIBILITY\n"),
                1,
            )
            self.assertIn(expected_compatibility, prompt)
            self.assertLess(
                prompt.index("SOURCE EVIDENCE\n"),
                prompt.index("TARGET SKILL GUIDANCE\n"),
            )
            self.assertLess(
                prompt.index("TARGET SKILL GUIDANCE\n"),
                prompt.index("CLAIM EVIDENCE STATUS COMPATIBILITY\n"),
            )
            self.assertLess(
                prompt.index("CLAIM EVIDENCE STATUS COMPATIBILITY\n"),
                prompt.index("USER TASK\n"),
            )

        extracted = with_prompt.split("TARGET SKILL GUIDANCE\n", 1)[1].split(
            "\n\nCLAIM EVIDENCE STATUS COMPATIBILITY\n", 1
        )[0]
        self.assertEqual(extracted, guidance)
        self.assertEqual(
            with_meta["response_contract_sha256"],
            base_meta["response_contract_sha256"],
        )
        self.assertEqual(with_meta["user_task_sha256"], base_meta["user_task_sha256"])
        self.assertEqual(
            with_meta["evidence_context_sha256"],
            base_meta["evidence_context_sha256"],
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
        self.assertLess(
            prompt.index("TARGET SKILL GUIDANCE\n"),
            prompt.index("SOURCE EVIDENCE\n"),
        )
        self.assertLess(
            prompt.index("SOURCE EVIDENCE\n"),
            prompt.index("USER TASK\n"),
        )

    def test_layout_config_contains_no_evidence_or_flow_answer_ids(self):
        raw_text = (ROOT / "local-prompt-layouts.json").read_text(encoding="utf-8")
        raw = json.loads(raw_text)
        self.assertEqual(raw["schema_version"], 1)
        self.assertEqual(
            raw["layouts"],
            {
                "plugin-impact-scope": {
                    "service-tier-fidelity": (
                        "guidance_after_evidence_claim_compatibility_before_task"
                    )
                }
            },
        )
        forbidden = [
            *(f"E{i}" for i in range(1, 9)),
            "F1",
            "F2",
            "F3",
            "required_flow_edge_ids",
            "claim_evidence_status_allowlist",
        ]
        for value in forbidden:
            self.assertNotIn(value, raw_text)

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
                    "plugin-impact-scope",
                    "service-tier-fidelity",
                    path,
                )


if __name__ == "__main__":
    unittest.main()
