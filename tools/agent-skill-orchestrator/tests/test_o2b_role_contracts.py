import json
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from evidence import build_evidence_package, evidence_package_sha256
from roles.critic import (
    CriticContractError,
    build_critic_prompt,
    critic_input_projection,
    critic_response_schema,
    validate_critic_wire,
)
from roles.mapper import (
    MapperContractError,
    build_mapper_prompt,
    mapper_input_projection,
    mapper_response_schema,
    validate_mapper_wire,
)
from roles.synthesizer import (
    SynthesizerContractError,
    build_synthesizer_prompt,
    synthesizer_input_projection,
    synthesizer_response_schema,
    validate_synthesizer_wire,
)
from router import route_task

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40
HEX64 = "1" * 64


class O2BRoleContractTests(unittest.TestCase):
    def evidence(self):
        plan = route_task({
            "schema_version": 1,
            "task_id": "o2b-contracts",
            "scope": "plugin:usage-dashboard",
            "task_kind": "impact_analysis",
            "intent": "Exercise O2-B role contracts.",
            "mutation_requested": False,
            "device_truth_requested": False,
        })
        snapshot = resolve_authority("plugin:usage-dashboard", TARGET_SHA, [
            {"kind": "release_branch", "value": "release-usage-dashboard", "status": "OBSERVED", "source_sha": RELEASE_SHA},
            {"kind": "manifest", "value": "plugins/usage-dashboard/runtime/product-manifest.json", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "artifact", "value": "plugins/usage-dashboard/latest.js", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "release_spec_dir", "value": ".github/usage-dashboard/releases", "status": "OBSERVED", "source_sha": TARGET_SHA},
        ])
        return build_evidence_package(plan, snapshot, [
            {"path": "plugins/usage-dashboard/src/runtime.js", "source_sha": TARGET_SHA, "start_line": 10, "content": "export const runtime = true;"},
            {"path": "plugins/usage-dashboard/runtime/product-manifest.json", "source_sha": TARGET_SHA, "start_line": 1, "content": '{"name":"usage-dashboard"}'},
        ])

    def artifact(self, role, records):
        evidence = self.evidence()
        return {
            "schema_version": 1,
            "role": role,
            "model_profile_id": f"{role}-test-profile",
            "model_digest": "2" * 64,
            "target_repository_sha": TARGET_SHA,
            "evidence_sha256": evidence_package_sha256(evidence),
            "prompt_sha256": HEX64,
            "structured_response_sha256": "3" * 64,
            "upstream_artifact_sha256": [],
            "records": records,
        }

    def scout_artifact(self):
        return self.artifact("scout", {
            "claims": [{
                "id": "claim-scout-001", "kind": "authority", "status": "DIRECT",
                "value": "manifest", "refs": ["S1@L1"], "role": "scout",
            }],
            "flow_edges": [], "boundaries": [], "blockers": [], "conflicts": [],
        })

    def mapper_artifact(self):
        return self.artifact("mapper", {
            "claims": [{
                "id": "claim-mapper-001", "kind": "semantic_owner", "status": "SUPPORTED_LIKELY",
                "value": "runtime", "refs": ["S2@L10"], "role": "mapper",
            }],
            "flow_edges": [{
                "from": "runtime", "to": "dashboard", "status": "SUPPORTED_LIKELY",
                "refs": ["S1@L1", "S2@L10"], "role": "mapper",
            }],
            "boundaries": [], "blockers": [], "conflicts": [],
        })

    def critic_artifact(self):
        return self.artifact("critic", {
            "claims": [{
                "id": "claim-critic-001", "kind": "preservation", "status": "UNKNOWN",
                "value": "request identity unresolved", "refs": [], "role": "critic",
            }],
            "flow_edges": [],
            "boundaries": [{
                "kind": "request_identity", "subject": "request identity unresolved",
                "status": "UNKNOWN", "refs": [], "role": "critic",
            }],
            "blockers": [{
                "kind": "unknown", "subject": "request identity unresolved",
                "origin_role": "critic", "refs": [],
            }],
            "conflicts": [{
                "id": "conflict-o2b-001", "subject": "semantic owner",
                "left_claim_id": "claim-mapper-001", "right_claim_id": "claim-critic-001",
                "resolution": "UNRESOLVED",
            }],
        })

    def test_mapper_valid_grounded_wire_and_empty_result(self):
        evidence = self.evidence()
        valid = '{"o":[{"v":"runtime","r":["S2@L10"]}],"e":[{"f":"runtime","t":"dashboard","r":["S1@L1","S2@L10"]}]}'
        parsed = validate_mapper_wire(valid, evidence)
        self.assertEqual(parsed["o"][0]["v"], "runtime")
        self.assertEqual(parsed["e"][0]["f"], "runtime")
        self.assertEqual(validate_mapper_wire('{"o":[],"e":[]}', evidence), {"o": [], "e": []})

    def test_mapper_status_verdict_unknown_refs_empty_refs_duplicates_and_self_edge_fail_closed(self):
        evidence = self.evidence()
        invalid = [
            '{"o":[],"e":[],"verdict":"SUPPORTED"}',
            '{"o":[{"v":"runtime","s":"DIRECT","r":["S2@L10"]}],"e":[]}',
            '{"o":[{"v":"runtime","r":["S9@L9"]}],"e":[]}',
            '{"o":[{"v":"runtime","r":[]}],"e":[]}',
            '{"o":[{"v":"runtime","r":["S2@L10"]},{"v":"runtime","r":["S1@L1"]}],"e":[]}',
            '{"o":[],"e":[{"f":"runtime","t":"runtime","r":["S2@L10"]}]}',
        ]
        for content in invalid:
            with self.subTest(content=content), self.assertRaises(MapperContractError):
                validate_mapper_wire(content, evidence)

    def test_mapper_projection_and_prompt_use_typed_scout_records_not_raw_response(self):
        evidence = self.evidence()
        projection = mapper_input_projection(evidence, self.scout_artifact())
        self.assertEqual(projection["role"], "scout")
        self.assertEqual(set(projection), {"artifact_sha256", "role", "claims", "blockers", "conflicts"})
        prompt = build_mapper_prompt(evidence, self.scout_artifact())
        self.assertIn("claim-scout-001", prompt)
        self.assertNotIn("response.txt", prompt)
        self.assertNotIn("structured_response_sha256", prompt)
        self.assertNotIn('"s":"', prompt)

    def test_mapper_schema_is_closed_and_has_no_status_or_verdict(self):
        schema = mapper_response_schema()
        self.assertFalse(schema["additionalProperties"])
        owner = schema["properties"]["o"]["items"]
        edge = schema["properties"]["e"]["items"]
        self.assertEqual(set(owner["properties"]), {"v", "r"})
        self.assertEqual(set(edge["properties"]), {"f", "t", "r"})

    def test_critic_valid_boundary_challenge_and_unresolved(self):
        evidence = self.evidence()
        content = json.dumps({
            "b": [{"k": "request_identity", "v": "identity boundary", "r": ["S2@L10"]}],
            "q": [{"i": "claim-mapper-001", "k": "missing_evidence", "v": "owner evidence incomplete", "r": ["S1@L1"]}],
            "u": [{"k": "unknown", "v": "release impact unresolved", "r": []}],
        }, separators=(",", ":"))
        parsed = validate_critic_wire(content, evidence, self.mapper_artifact())
        self.assertEqual(parsed["q"][0]["i"], "claim-mapper-001")
        self.assertEqual(parsed["u"][0]["r"], [])

    def test_critic_invalid_kinds_unknown_claim_refs_and_resolution_fields_fail_closed(self):
        evidence = self.evidence()
        mapper = self.mapper_artifact()
        invalid = [
            '{"b":[{"k":"made_up","v":"x","r":["S1@L1"]}],"q":[],"u":[]}',
            '{"b":[],"q":[{"i":"claim-mapper-999","k":"unknown","v":"x","r":[]}],"u":[]}',
            '{"b":[],"q":[],"u":[{"k":"budget","v":"x","r":[]}]}',
            '{"b":[{"k":"test","v":"x","r":["S9@L9"]}],"q":[],"u":[]}',
            '{"b":[],"q":[],"u":[],"resolution":"RESOLVED"}',
            '{"b":[],"q":[],"u":[],"verdict":"SUPPORTED"}',
        ]
        for content in invalid:
            with self.subTest(content=content), self.assertRaises(CriticContractError):
                validate_critic_wire(content, evidence, mapper)

    def test_critic_projection_preserves_upstream_uncertainty_surfaces_and_no_raw_response(self):
        evidence = self.evidence()
        mapper = self.mapper_artifact()
        projection = critic_input_projection(evidence, mapper)
        self.assertEqual(projection["role"], "mapper")
        self.assertIn("flow_edges", projection)
        prompt = build_critic_prompt(evidence, mapper)
        self.assertIn("claim-mapper-001", prompt)
        self.assertNotIn("response-envelope", prompt)
        self.assertNotIn("structured_response_sha256", prompt)

    def test_critic_schema_is_closed_and_has_no_status_or_verdict(self):
        schema = critic_response_schema()
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(set(schema["properties"]), {"b", "q", "u"})
        for key in ("b", "q", "u"):
            self.assertNotIn("status", schema["properties"][key]["items"]["properties"])

    def test_synthesizer_projection_is_order_independent_and_mandatory_records_are_preserved(self):
        evidence = self.evidence()
        mapper = self.mapper_artifact()
        critic = self.critic_artifact()
        first = synthesizer_input_projection(evidence, [mapper, critic])
        second = synthesizer_input_projection(evidence, [critic, mapper])
        self.assertEqual(first, second)
        self.assertEqual([item["id"] for item in first["records"]], ["C1", "E1", "C2", "B1", "K1", "X1"])
        self.assertEqual(first["mandatory_ids"], ["C2", "B1", "K1", "X1"])
        selected = validate_synthesizer_wire('{"s":["C1","E1"]}', evidence, [mapper, critic])
        self.assertEqual(selected, {"s": ["C1", "E1", "C2", "B1", "K1", "X1"]})

    def test_synthesizer_unknown_duplicate_and_new_record_fields_fail_closed(self):
        evidence = self.evidence()
        upstream = [self.mapper_artifact(), self.critic_artifact()]
        invalid = [
            '{"s":["C99"]}',
            '{"s":["C1","C1"]}',
            '{"s":[],"claim":{"value":"invented"}}',
            '{"s":[],"verdict":"SUPPORTED"}',
        ]
        for content in invalid:
            with self.subTest(content=content), self.assertRaises(SynthesizerContractError):
                validate_synthesizer_wire(content, evidence, upstream)

    def test_synthesizer_prompt_contains_typed_index_only_and_schema_is_closed(self):
        evidence = self.evidence()
        prompt = build_synthesizer_prompt(evidence, [self.mapper_artifact(), self.critic_artifact()])
        self.assertIn("VALIDATED_TYPED_UPSTREAM_INDEX", prompt)
        self.assertIn('"mandatory_ids"', prompt)
        self.assertNotIn("response.txt", prompt)
        self.assertNotIn("response-envelope", prompt)
        schema = synthesizer_response_schema()
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(set(schema["properties"]), {"s"})

    def test_upstream_target_and_evidence_mismatch_fail_closed(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        scout["target_repository_sha"] = "f" * 40
        with self.assertRaises(MapperContractError):
            mapper_input_projection(evidence, scout)
        mapper = self.mapper_artifact()
        mapper["evidence_sha256"] = "f" * 64
        with self.assertRaises(CriticContractError):
            critic_input_projection(evidence, mapper)


if __name__ == "__main__":
    unittest.main()
