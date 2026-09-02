import copy
import json
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from canonical import canonical_json_bytes, canonical_sha256
from registry import load_domain_registry, load_role_registry, registry_sha256
from router import RoutingError, execution_plan_sha256, route_task
from schema_validation import ContractValidationError, validate_contract


class O1ADeterministicRouterTests(unittest.TestCase):
    def request(self, task_kind: str, **overrides):
        data = {
            "schema_version": 1,
            "task_id": "o1a-case",
            "scope": "plugin:usage-dashboard",
            "task_kind": task_kind,
            "intent": "Inspect the registered repository facts for this typed task.",
            "mutation_requested": False,
            "device_truth_requested": False,
        }
        data.update(overrides)
        return data

    def test_release_lookup_is_deterministic_only(self):
        plan = route_task(self.request("release_lookup"))
        self.assertEqual(plan["execution_class"], "deterministic_only")
        self.assertEqual(
            plan["deterministic_actions"],
            ["resolve_domain_registration", "resolve_release_authority"],
        )
        self.assertEqual(plan["role_stages"], [])
        self.assertEqual(plan["model_selection"], "deferred_to_later_phase")
        self.assertFalse(plan["mutation_allowed"])
        self.assertFalse(plan["device_truth_allowed"])
        self.assertEqual(plan["verdict_authority"], "none_in_o1a")
        validate_contract(plan, "execution-plan.schema.json")

    def test_source_locator_is_fast_scout_only(self):
        plan = route_task(self.request("source_locator"))
        self.assertEqual(plan["execution_class"], "fast")
        self.assertEqual(plan["deterministic_actions"], ["resolve_domain_registration"])
        self.assertEqual(
            plan["role_stages"],
            [{"stage_id": "scout", "role_id": "scout", "depends_on": []}],
        )

    def test_impact_analysis_has_parallel_mapper_critic_fanout(self):
        plan = route_task(self.request("impact_analysis"))
        self.assertEqual(plan["execution_class"], "standard")
        self.assertEqual(plan["deterministic_actions"], ["resolve_domain_registration"])
        self.assertEqual(
            plan["role_stages"],
            [
                {"stage_id": "scout", "role_id": "scout", "depends_on": []},
                {"stage_id": "mapper", "role_id": "mapper", "depends_on": ["scout"]},
                {"stage_id": "critic", "role_id": "critic", "depends_on": ["scout"]},
                {
                    "stage_id": "synthesizer",
                    "role_id": "synthesizer",
                    "depends_on": ["mapper", "critic"],
                },
            ],
        )

    def test_same_typed_request_is_byte_deterministic(self):
        request = self.request("impact_analysis")
        first = route_task(request)
        second = route_task(copy.deepcopy(request))
        self.assertEqual(canonical_json_bytes(first), canonical_json_bytes(second))
        self.assertEqual(execution_plan_sha256(first), execution_plan_sha256(second))

    def test_free_form_intent_is_not_a_routing_control_surface(self):
        first = route_task(self.request("impact_analysis", intent="First wording."))
        second = route_task(
            self.request(
                "impact_analysis",
                intent="Completely different prose that must not alter route topology.",
            )
        )
        first_without_provenance = copy.deepcopy(first)
        second_without_provenance = copy.deepcopy(second)
        first_without_provenance.pop("request_sha256")
        second_without_provenance.pop("request_sha256")
        self.assertEqual(first_without_provenance, second_without_provenance)
        self.assertNotEqual(first["request_sha256"], second["request_sha256"])

    def test_request_and_registry_digests_are_bound_into_plan(self):
        request = self.request("source_locator")
        domains = load_domain_registry()
        roles = load_role_registry()
        plan = route_task(
            request,
            domain_registry_data=domains,
            role_registry_data=roles,
        )
        self.assertEqual(plan["request_sha256"], canonical_sha256(request))
        self.assertEqual(plan["domain_registry_sha256"], registry_sha256(domains))
        self.assertEqual(plan["role_registry_sha256"], registry_sha256(roles))

    def test_mutation_and_device_truth_requests_fail_closed(self):
        with self.assertRaisesRegex(RoutingError, "mutation_requested=true"):
            route_task(self.request("source_locator", mutation_requested=True))
        with self.assertRaisesRegex(RoutingError, "device_truth_requested=true"):
            route_task(self.request("source_locator", device_truth_requested=True))

    def test_unknown_scope_fails_closed(self):
        with self.assertRaisesRegex(RoutingError, "unregistered scope"):
            route_task(self.request("source_locator", scope="plugin:not-registered"))

    def test_unknown_task_kind_fails_closed_at_contract(self):
        with self.assertRaisesRegex(RoutingError, "invalid task request"):
            route_task(self.request("not_a_route"))

    def test_extra_request_control_field_fails_closed(self):
        with self.assertRaisesRegex(RoutingError, "invalid task request"):
            route_task(self.request("source_locator", model_profile_id="qwen2.5-3b-instruct-q4_k_m"))

    def test_release_lookup_requires_registered_release_branch_authority(self):
        domains = copy.deepcopy(load_domain_registry())
        domain = domains["domains"][0]
        domain["authority_refs"] = [
            item for item in domain["authority_refs"] if item["kind"] != "release_branch"
        ]
        with self.assertRaisesRegex(RoutingError, "requires registered release_branch authority"):
            route_task(self.request("release_lookup"), domain_registry_data=domains)

    def test_unsafe_role_metadata_is_revalidated_and_rejected(self):
        roles = copy.deepcopy(load_role_registry())
        roles["roles"][0]["can_mutate"] = True
        with self.assertRaisesRegex(RoutingError, "invalid orchestrator registry"):
            route_task(self.request("source_locator"), role_registry_data=roles)

    def test_plan_contract_rejects_model_assignment_injection(self):
        plan = route_task(self.request("impact_analysis"))
        plan["model_profile_id"] = "qwen2.5-3b-instruct-q4_k_m"
        with self.assertRaisesRegex(ContractValidationError, "unexpected property"):
            validate_contract(plan, "execution-plan.schema.json")

    def test_plan_contains_no_model_identity_or_assignment(self):
        plan = route_task(self.request("impact_analysis"))
        serialized = json.dumps(plan, sort_keys=True)
        self.assertNotIn("qwen2.5-1.5b", serialized)
        self.assertNotIn("qwen2.5-3b", serialized)
        self.assertNotIn("model_profile", serialized)
        self.assertEqual(plan["model_selection"], "deferred_to_later_phase")


if __name__ == "__main__":
    unittest.main()
