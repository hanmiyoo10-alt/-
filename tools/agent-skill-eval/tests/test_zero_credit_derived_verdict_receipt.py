from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


contract_mod = load("local_response_contract_receipt_v5", "local_response_contract.py")
receipt_mod = load("validate_local_receipt_v5", "validate_local_receipt.py")


class DerivedVerdictReceiptTests(unittest.TestCase):
    def contract(self):
        return contract_mod.load_contract(
            ROOT / "local-response-contracts.json",
            "plugin-impact-scope",
            "service-tier-fidelity",
        )

    def context(self):
        blocks = [
            {"path": "docs/REPO_PROJECT_CATALOG.md", "text": "scope plugin:usage-dashboard authority releaseBranch=release-usage-dashboard"},
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

    def partial_payload(self):
        return {
            "scope": "plugin:usage-dashboard",
            "authority": "DIRECT:E1",
            "flow_edges": [
                {"from": "capture", "to": "ledger", "basis": "DIRECT:E4"},
                {"from": "ledger", "to": "diagnostics", "basis": "DIRECT:E7"},
            ],
            "request_identity": "DIRECT:E5",
            "no_extra_io": "DIRECT:E6",
            "tests": ["DIRECT:E8"],
            "generated_release": "UNKNOWN",
            "narrowest_boundary": "DIRECT:E2",
            "blocked_claims": ["generated/release ownership unresolved"],
        }

    def conflict_payload(self):
        return {
            "scope": "plugin:usage-dashboard",
            "authority": "CONFLICT:E1",
            "flow_edges": [
                {"from": "ledger", "to": "diagnostics", "basis": "CONFLICT:E7"},
            ],
            "request_identity": "UNKNOWN",
            "no_extra_io": "UNKNOWN",
            "tests": ["CONFLICT:E5", "CONFLICT:E6"],
            "generated_release": "UNKNOWN",
            "narrowest_boundary": "CONFLICT:E2",
            "blocked_claims": ["baseline conflict"],
        }

    def write_mode(self, eval_root: Path, mode: str, payload: dict, contract_hash: str) -> Path:
        mode_dir = eval_root / mode
        mode_dir.mkdir(parents=True, exist_ok=True)
        response = mode_dir / "response.txt"
        response.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (mode_dir / "structured-validation.json").write_text(
            json.dumps(
                {
                    "status": "VALID",
                    "response_contract_sha256": contract_hash,
                    "error": None,
                },
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        return response

    def make_receipt(self, eval_root: Path, mode: str, payload: dict, prompt_hash: str, guidance_hash):
        contract = self.contract()
        contract_hash = contract_mod.contract_sha256(contract)
        context = self.context()
        (eval_root / "response-contract.json").write_text(
            json.dumps(contract, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (eval_root / "context.json").write_text(
            json.dumps(context, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        response_path = self.write_mode(eval_root, mode, payload, contract_hash)
        matrix = {
            "eval_kind": "output",
            "repository_sha": "a" * 40,
            "skill": "plugin-impact-scope",
            "skill_sha256": "b" * 64,
            "fixture_sha256": "c" * 64,
            "case_id": "service-tier-fidelity",
            "prompt_sha256": "d" * 64,
        }
        prompt_meta = {
            "mode": mode,
            "skill": "plugin-impact-scope",
            "case_id": "service-tier-fidelity",
            "user_task_sha256": "d" * 64,
            "evidence_context_sha256": "e" * 64,
            "response_contract_sha256": contract_hash,
            "full_prompt_sha256": prompt_hash,
            "skill_guidance_sha256": guidance_hash,
        }
        receipt = receipt_mod.make_receipt(
            matrix,
            context,
            prompt_meta,
            response_path,
            0,
            mode,
            "Qwen/Qwen2.5-3B-Instruct-GGUF",
            "af75b7aaf5bb163ce4c5dab4e6b84d844e96265d",
            "qwen2.5-3b-instruct-q4_k_m.gguf",
            "6" * 64,
            "b10516",
            "f" * 40,
            "llama-b10516-bin-ubuntu-x64.tar.gz",
            "7" * 64,
            "version",
            {"temperature": 0, "seed": 42, "n_predict": 768, "ctx_size": 16384},
            "123",
            "1",
        )
        return receipt, response_path

    def test_receipt_revalidates_and_persists_derived_verdict(self):
        with tempfile.TemporaryDirectory() as td:
            receipt, response_path = self.make_receipt(
                Path(td),
                "with_skill",
                self.partial_payload(),
                "1" * 64,
                "2" * 64,
            )
            self.assertEqual(receipt["derived_impact_verdict"], "PARTIAL")
            validation = json.loads((response_path.parent / "structured-validation.json").read_text(encoding="utf-8"))
            self.assertEqual(validation["derived_impact_verdict"], "PARTIAL")
            self.assertEqual(validation["validated_response_sha256"], receipt["response_sha256"])

    def test_r11_style_conflict_baseline_can_form_pair_without_qualitative_winner(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            with_receipt, _ = self.make_receipt(
                root,
                "with_skill",
                self.partial_payload(),
                "1" * 64,
                "2" * 64,
            )
            base_receipt, _ = self.make_receipt(
                root,
                "baseline_without_target_skill",
                self.conflict_payload(),
                "3" * 64,
                None,
            )
            self.assertEqual(with_receipt["derived_impact_verdict"], "PARTIAL")
            self.assertEqual(base_receipt["derived_impact_verdict"], "CONFLICT")
            pair = receipt_mod.validate_pair(with_receipt, base_receipt)
            self.assertEqual(pair["status"], "PAIR_VALID")
            self.assertEqual(
                pair["mode_derived_impact_verdicts"],
                {
                    "with_skill": "PARTIAL",
                    "baseline_without_target_skill": "CONFLICT",
                },
            )
            self.assertIsNone(pair["qualitative_verdict"])
            self.assertEqual(pair["trigger_observability"], "UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION")


if __name__ == "__main__":
    unittest.main()
