from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAN_SCRIPT = SKILL_ROOT / "scripts" / "scan_authority.py"
PLAN_SCRIPT = SKILL_ROOT / "scripts" / "validate_authority_plan.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


scan_authority = load_module("scan_authority_generalization", SCAN_SCRIPT)
validate_authority_plan = load_module("validate_authority_plan", PLAN_SCRIPT)


REGISTRY = {
    "schemaVersion": 1,
    "plugins": {
        "usage-dashboard": {
            "displayName": "Local Usage Dashboard",
            "lifecycle": "production",
            "issueValues": ["usage-dashboard"],
            "paths": ["plugins/usage-dashboard/**"],
            "authority": {
                "releaseBranch": "release-usage-dashboard",
                "manifest": "plugins/usage-dashboard/runtime/product-manifest.json",
                "artifact": "plugins/usage-dashboard/latest.js",
            },
        },
        "split-topology": {
            "displayName": "Split Topology Plugin",
            "lifecycle": "production",
            "issueValues": ["split-topology"],
            "paths": ["plugins/split-topology/**"],
            "authority": {
                "releaseBranch": "release-split-topology",
                "manifest": "product-manifest.json",
                "artifact": "plugins/split-topology/latest.js",
            },
        },
    },
    "products": {},
}

CATALOG = """# Repository Project Catalog

| Scope | Name | Lifecycle | Primary path | Authority | Guidelines |
| --- | --- | --- | --- | --- | --- |
| plugin:usage-dashboard | Local Usage Dashboard | production | plugins/usage-dashboard/** | releaseBranch=release-usage-dashboard; manifest=plugins/usage-dashboard/runtime/product-manifest.json; artifact=plugins/usage-dashboard/latest.js | docs/USAGE_DASHBOARD_GUIDELINES.md |
| plugin:split-topology | Split Topology Plugin | production | plugins/split-topology/** | releaseBranch=release-split-topology; manifest=product-manifest.json; artifact=plugins/split-topology/latest.js | docs/SPLIT_TOPOLOGY_GUIDELINES.md |
"""


class FixtureRepo:
    def __init__(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.write(".github/plugin-control-plane/registry.json", json.dumps(REGISTRY))
        self.write("docs/REPO_PROJECT_CATALOG.md", CATALOG)
        self.write("docs/REPOSITORY_COMMON_RULES.md", "# common\n")
        self.write("docs/USAGE_DASHBOARD_GUIDELINES.md", "# usage\n")
        self.write(
            "docs/SPLIT_TOPOLOGY_GUIDELINES.md",
            "# split\nmain manifest owns release identity; release branch artifact owns production bytes\n",
        )
        self.write("product-manifest.json", "{}\n")
        self.write("plugins/split-topology/latest.js", "// main checkout copy only\n")

    def write(self, rel: str, content: str) -> None:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def snapshot(self) -> dict[str, bytes]:
        return {
            str(path.relative_to(self.root)): path.read_bytes()
            for path in self.root.rglob("*")
            if path.is_file()
        }

    def close(self) -> None:
        self.temp.cleanup()


class IndependentLocatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FixtureRepo()

    def tearDown(self) -> None:
        self.repo.close()

    def test_split_topology_discovery_keeps_locators_independent(self):
        before = self.repo.snapshot()
        result = scan_authority.scan(self.repo.root, "plugin:split-topology")
        after = self.repo.snapshot()

        self.assertEqual(before, after)
        self.assertFalse(result["pilot_validated"])
        self.assertEqual(result["truth_claim_status"], "LOCATOR_ONLY")
        self.assertEqual(
            result["locator_semantics"],
            "INDEPENDENT_UNTIL_BOUND_BY_OWNING_CONTRACT",
        )
        self.assertEqual(result["declared_authority"]["releaseBranch"], "release-split-topology")
        self.assertEqual(result["declared_authority"]["manifest"], "product-manifest.json")
        self.assertNotIn("release-split-topology:product-manifest.json", json.dumps(result))

    def test_local_checkout_existence_does_not_claim_ref_ownership(self):
        result = scan_authority.scan(self.repo.root, "plugin:split-topology")
        manifest_check = result["local_locator_checks"]["manifest"]
        self.assertTrue(manifest_check["exists_on_current_checkout"])
        self.assertIn("not proof of ref ownership", manifest_check["note"])


class AuthorityPlanValidatorTests(unittest.TestCase):
    def test_valid_split_plan_accepts_separate_reads(self):
        plan = {
            "scope": "plugin:split-topology",
            "question_class": "release_identity",
            "contract_reads": [
                {
                    "ref": "main",
                    "path": "docs/SPLIT_TOPOLOGY_GUIDELINES.md",
                    "purpose": "project precedence owner",
                }
            ],
            "evidence_reads": [
                {
                    "ref": "main",
                    "path": "product-manifest.json",
                    "claim": "release identity",
                    "basis": "owning guideline says main manifest owns release identity",
                },
                {
                    "ref": "release-split-topology",
                    "path": "plugins/split-topology/latest.js",
                    "claim": "production bytes",
                    "basis": "owning guideline says release artifact owns production bytes",
                },
            ],
            "unresolved": [],
            "status": "PLAN_READY",
        }
        result = validate_authority_plan.validate_plan(plan)
        self.assertTrue(result["valid"])
        self.assertEqual(result["truth_claim_status"], "STRUCTURE_ONLY")
        self.assertFalse(result["mutation_performed"])

    def test_missing_provenance_is_rejected(self):
        plan = {
            "scope": "plugin:split-topology",
            "contract_reads": [],
            "evidence_reads": [
                {
                    "ref": "release-split-topology",
                    "path": "product-manifest.json",
                    "claim": "release identity",
                    "basis": "",
                }
            ],
            "unresolved": [],
            "status": "PLAN_READY",
        }
        result = validate_authority_plan.validate_plan(plan)
        self.assertFalse(result["valid"])
        self.assertTrue(any("basis" in error for error in result["errors"]))

    def test_plan_ready_with_unresolved_is_rejected(self):
        plan = {
            "scope": "plugin:split-topology",
            "contract_reads": [],
            "evidence_reads": [],
            "unresolved": ["owning ref for manifest unresolved"],
            "status": "PLAN_READY",
        }
        result = validate_authority_plan.validate_plan(plan)
        self.assertFalse(result["valid"])
        self.assertIn("PLAN_READY requires unresolved to be empty", result["errors"])

    def test_unknown_may_preserve_unresolved_without_guessing(self):
        plan = {
            "scope": "plugin:split-topology",
            "contract_reads": [],
            "evidence_reads": [],
            "unresolved": ["owning ref for manifest unresolved"],
            "status": "UNKNOWN",
        }
        result = validate_authority_plan.validate_plan(plan)
        self.assertTrue(result["valid"])

    def test_mutation_shape_is_rejected(self):
        plan = {
            "scope": "plugin:split-topology",
            "contract_reads": [],
            "evidence_reads": [],
            "unresolved": [],
            "status": "PLAN_READY",
            "deploy": {"branch": "release-split-topology"},
        }
        result = validate_authority_plan.validate_plan(plan)
        self.assertFalse(result["valid"])
        self.assertTrue(any("read-only" in error for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
