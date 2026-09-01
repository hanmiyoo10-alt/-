from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ZeroCreditPromptNeutralityTests(unittest.TestCase):
    def contract_case(self):
        raw = json.loads((ROOT / "local-response-contracts.json").read_text(encoding="utf-8"))
        return raw["contracts"]["plugin-impact-scope"]["service-tier-fidelity"]

    def test_shared_prompt_has_bounds_without_minimization_pressure(self):
        case = self.contract_case()
        instruction = case["prompt_instruction"]

        self.assertNotIn("fewest entries needed", instruction)
        self.assertNotIn("Use the fewest", instruction)
        self.assertIn(
            "Bounds: at most 3 distinct registered flow edges and 2 tests.",
            instruction,
        )
        self.assertIn("blocked_claims is a compatibility-only field and must be an empty array", instruction)
        for forbidden in ("flow:F1", "flow:F2", "flow:F3", "derived_blocked_claims"):
            self.assertNotIn(forbidden, instruction)

    def test_grounded_flow_contract_only_hardens_blocker_ownership(self):
        case = self.contract_case()

        self.assertEqual(case["id"], "impact-scope-grounded-flow-v8")
        self.assertEqual(case["required_flow_edge_ids"], ["F1", "F2", "F3"])
        self.assertEqual(set(case["flow_edge_registry"]), {"F1", "F2", "F3"})
        self.assertIn("select only registered F# edge IDs", case["prompt_instruction"])
        self.assertIn("never invent from/to endpoints", case["prompt_instruction"])


if __name__ == "__main__":
    unittest.main()
