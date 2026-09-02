import copy
import json
import runpy
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from registry import (
    eligible_model_profiles,
    load_domain_registry,
    load_model_registry,
    load_role_registry,
    registry_sha256,
    validate_domain_registry_data,
    validate_model_registry_data,
    validate_role_registry_data,
)
from schema_validation import ContractValidationError


class ModelRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = load_model_registry()

    def test_zero_credit_allowlist_is_bounded_subset_of_capability_registry(self):
        source = runpy.run_path(str(REPO_ROOT / "tools/agent-skill-eval/resolve_zero_credit_request.py"))
        zero_credit = set(source["ALLOWED_MODEL_PROFILES"])
        registered = {item["profile_id"] for item in self.registry["profiles"]}
        self.assertEqual(
            zero_credit,
            {"qwen2.5-1.5b-instruct-q4_k_m", "qwen2.5-3b-instruct-q4_k_m"},
        )
        self.assertLessEqual(zero_credit, registered)
        self.assertNotIn("ministral-3-3b-instruct-2512-q4_k_m", zero_credit)

    def test_registered_model_identity_matches_its_frozen_proof_surface(self):
        zero_credit_workflow = (REPO_ROOT / ".github/workflows/agent-skill-zero-credit-eval.yml").read_text(encoding="utf-8")
        smoke_workflow = (REPO_ROOT / ".github/workflows/agent-skill-orchestrator-model-family-smoke.yml").read_text(encoding="utf-8")
        candidate = json.loads(
            (PACKAGE / "models/candidates/ministral-3-3b-instruct-2512-q4_k_m.json").read_text(encoding="utf-8")
        )
        for profile in self.registry["profiles"]:
            if profile["profile_id"].startswith("qwen2.5-"):
                for token in (
                    profile["profile_id"],
                    profile["local_model_id"],
                    profile["repository"],
                    profile["revision"],
                    profile["file"],
                    profile["sha256"],
                ):
                    self.assertIn(token, zero_credit_workflow)
                continue

            self.assertEqual(profile["profile_id"], "ministral-3-3b-instruct-2512-q4_k_m")
            for key in ("profile_id", "local_model_id", "repository", "revision", "file", "sha256"):
                self.assertEqual(profile[key], candidate[key])
            self.assertEqual(profile["license"], candidate["license"])
            self.assertEqual(profile["access"]["class"], candidate["access"]["target_class"])
            self.assertIn("agent-skill-orchestrator-model-family-smoke.yml", profile["access"]["source"])
            self.assertIn("model_family_smoke.py resolve", smoke_workflow)
            self.assertIn("candidate-resolved.json", smoke_workflow)

        self.assertIn('curl -L --fail --retry 3 --retry-all-errors', zero_credit_workflow)
        self.assertIn('https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/${MODEL_FILE}?download=true', zero_credit_workflow)

    def test_current_profiles_are_mechanically_eligible(self):
        self.assertEqual(
            set(eligible_model_profiles(self.registry)),
            {
                "qwen2.5-1.5b-instruct-q4_k_m",
                "qwen2.5-3b-instruct-q4_k_m",
                "ministral-3-3b-instruct-2512-q4_k_m",
            },
        )

    def test_missing_license_or_access_fails_closed(self):
        for field in ("license", "access"):
            data = copy.deepcopy(self.registry)
            del data["profiles"][0][field]
            with self.assertRaises(ContractValidationError):
                validate_model_registry_data(data)

    def test_duplicate_model_profile_id_fails_closed(self):
        data = copy.deepcopy(self.registry)
        duplicate = copy.deepcopy(data["profiles"][0])
        duplicate["local_model_id"] = "duplicate-local-id"
        data["profiles"].append(duplicate)
        with self.assertRaisesRegex(ContractValidationError, "duplicate model profile id"):
            validate_model_registry_data(data)

    def test_registry_digest_is_key_order_independent(self):
        reordered = {"profiles": self.registry["profiles"], "schema_version": self.registry["schema_version"]}
        self.assertEqual(registry_sha256(self.registry), registry_sha256(reordered))


class DomainRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = load_domain_registry()

    def test_usage_dashboard_projects_durable_catalog_authority(self):
        self.assertEqual(len(self.registry["domains"]), 1)
        domain = self.registry["domains"][0]
        self.assertEqual(domain["scope"], "plugin:usage-dashboard")
        self.assertEqual(domain["name"], "Local Usage Dashboard")
        self.assertEqual(domain["lifecycle"], "production")
        self.assertEqual(domain["primary_path"], "plugins/usage-dashboard/**")
        self.assertEqual(domain["guidelines_path"], "docs/USAGE_DASHBOARD_GUIDELINES.md")
        refs = {item["kind"]: item["value"] for item in domain["authority_refs"]}
        self.assertEqual(
            refs,
            {
                "release_branch": "release-usage-dashboard",
                "manifest": "plugins/usage-dashboard/runtime/product-manifest.json",
                "artifact": "plugins/usage-dashboard/latest.js",
                "release_spec_dir": ".github/usage-dashboard/releases",
            },
        )
        catalog = (REPO_ROOT / "docs/REPO_PROJECT_CATALOG.md").read_text(encoding="utf-8")
        row = next(line for line in catalog.splitlines() if line.startswith("| plugin:usage-dashboard |"))
        for token in (
            "Local Usage Dashboard",
            "production",
            "plugins/usage-dashboard/**",
            "releaseBranch=release-usage-dashboard",
            "manifest=plugins/usage-dashboard/runtime/product-manifest.json",
            "artifact=plugins/usage-dashboard/latest.js",
            "releaseSpecDir=.github/usage-dashboard/releases",
            "docs/USAGE_DASHBOARD_GUIDELINES.md",
        ):
            self.assertIn(token, row)

    def test_domain_registration_explicitly_does_not_promote_skill_scope(self):
        self.assertEqual(
            self.registry["domains"][0]["registration_semantics"],
            "domain_metadata_only_no_skill_promotion",
        )

    def test_missing_authority_metadata_fails_closed(self):
        data = copy.deepcopy(self.registry)
        del data["domains"][0]["authority_refs"]
        with self.assertRaises(ContractValidationError):
            validate_domain_registry_data(data)

    def test_duplicate_domain_scope_fails_closed(self):
        data = copy.deepcopy(self.registry)
        duplicate = copy.deepcopy(data["domains"][0])
        duplicate["domain_id"] = "usage-dashboard-copy"
        data["domains"].append(duplicate)
        with self.assertRaisesRegex(ContractValidationError, "duplicate domain scope"):
            validate_domain_registry_data(data)


class RoleRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = load_role_registry()

    def test_exact_initial_role_set_has_no_authority_or_mutation(self):
        self.assertEqual(
            {item["role_id"] for item in self.registry["roles"]},
            {"scout", "mapper", "critic", "synthesizer"},
        )
        for role in self.registry["roles"]:
            self.assertFalse(role["can_self_verdict"])
            self.assertFalse(role["can_mutate"])
            self.assertFalse(role["accepts_raw_upstream_prose"])
            self.assertNotIn("model_profile_id", role)

    def test_role_cannot_self_promote_or_gain_model_assignment(self):
        data = copy.deepcopy(self.registry)
        data["roles"][0]["can_self_verdict"] = True
        with self.assertRaises(ContractValidationError):
            validate_role_registry_data(data)
        data = copy.deepcopy(self.registry)
        data["roles"][0]["model_profile_id"] = "qwen2.5-3b-instruct-q4_k_m"
        with self.assertRaisesRegex(ContractValidationError, "unexpected property"):
            validate_role_registry_data(data)

    def test_duplicate_role_id_fails_closed(self):
        data = copy.deepcopy(self.registry)
        data["roles"].append(copy.deepcopy(data["roles"][0]))
        with self.assertRaisesRegex(ContractValidationError, "duplicate role id"):
            validate_role_registry_data(data)


if __name__ == "__main__":
    unittest.main()
