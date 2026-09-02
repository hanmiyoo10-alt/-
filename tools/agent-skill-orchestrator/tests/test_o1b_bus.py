import copy
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from bus import BusError, build_typed_bus, typed_bus_sha256, validate_synthetic_role_fixture, validate_typed_bus
from evidence import build_evidence_package, evidence_package_sha256, evidence_source_refs
from router import route_task

TARGET_SHA = "a" * 40


class O1B1TypedBusTests(unittest.TestCase):
    def plan(self):
        return route_task(
            {
                "schema_version": 1,
                "task_id": "o1b1-typed-bus",
                "scope": "plugin:usage-dashboard",
                "task_kind": "impact_analysis",
                "intent": "Exercise the synthetic typed evidence bus.",
                "mutation_requested": False,
                "device_truth_requested": False,
            }
        )

    def evidence(self):
        plan = self.plan()
        snapshot = resolve_authority("plugin:usage-dashboard", TARGET_SHA, [])
        return build_evidence_package(
            plan,
            snapshot,
            [
                {
                    "path": "plugins/usage-dashboard/src/runtime.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 10,
                    "content": "export const runtime = true;",
                }
            ],
        )

    def claim(
        self,
        claim_id,
        value,
        *,
        role="mapper",
        status="SUPPORTED_LIKELY",
        refs=None,
        kind="preservation",
    ):
        return {
            "id": claim_id,
            "kind": kind,
            "status": status,
            "value": value,
            "refs": ["S1@L10"] if refs is None else refs,
            "role": role,
        }

    def fixture(self, stage_id, role, claims=None, subjects=None, *, evidence=None):
        evidence = self.evidence() if evidence is None else evidence
        claims = [] if claims is None else claims
        if subjects is None:
            subjects = [
                {"claim_id": item["id"], "subject_key": f"subject/{item['id']}"}
                for item in claims
            ]
        return {
            "schema_version": 1,
            "stage_id": stage_id,
            "role": role,
            "evidence_sha256": evidence_package_sha256(evidence),
            "records": {
                "claims": claims,
                "claim_subjects": subjects,
                "flow_edges": [],
                "boundaries": [],
                "blockers": [],
            },
        }

    def test_invalid_source_ref_fails_closed(self):
        plan = self.plan()
        evidence = self.evidence()
        fixture = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-bad-ref", "x", refs=["S9@L1"])],
            [{"claim_id": "claim-bad-ref", "subject_key": "preservation/request"}],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "unknown source ref"):
            build_typed_bus(plan, evidence, [fixture])

    def test_stage_role_and_record_role_mismatch_fail_closed(self):
        plan = self.plan()
        evidence = self.evidence()
        wrong_stage_role = self.fixture(
            "mapper",
            "critic",
            [self.claim("claim-stage-role", "x", role="critic")],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "does not match plan stage"):
            build_typed_bus(plan, evidence, [wrong_stage_role])

        wrong_record_role = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-record-role", "x", role="critic")],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "does not match fixture role"):
            build_typed_bus(plan, evidence, [wrong_record_role])

    def test_duplicate_claim_ids_fail_closed_across_fixtures(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-duplicate", "mapped")],
            [{"claim_id": "claim-duplicate", "subject_key": "owner/runtime"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-duplicate", "critic", role="critic")],
            [{"claim_id": "claim-duplicate", "subject_key": "owner/runtime"}],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "duplicate claim id across fixtures"):
            build_typed_bus(plan, evidence, [mapper, critic])

    def test_missing_orphan_and_duplicate_subject_mapping_fail_closed(self):
        plan = self.plan()
        evidence = self.evidence()
        claim = self.claim("claim-subject", "x")

        missing = self.fixture("mapper", "mapper", [claim], [], evidence=evidence)
        with self.assertRaisesRegex(BusError, "missing claim subject mapping"):
            build_typed_bus(plan, evidence, [missing])

        orphan = self.fixture(
            "mapper",
            "mapper",
            [claim],
            [
                {"claim_id": "claim-subject", "subject_key": "owner/runtime"},
                {"claim_id": "claim-orphan", "subject_key": "owner/orphan"},
            ],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "orphan claim subject mapping"):
            build_typed_bus(plan, evidence, [orphan])

        duplicate = self.fixture(
            "mapper",
            "mapper",
            [claim],
            [
                {"claim_id": "claim-subject", "subject_key": "owner/runtime"},
                {"claim_id": "claim-subject", "subject_key": "owner/runtime"},
            ],
            evidence=evidence,
        )
        with self.assertRaisesRegex(BusError, "duplicate claim subject mapping"):
            build_typed_bus(plan, evidence, [duplicate])

    def test_fixture_handoff_order_is_bus_and_digest_independent(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-map", "producer")],
            [{"claim_id": "claim-map", "subject_key": "flow/producer"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-critic", "consumer", role="critic")],
            [{"claim_id": "claim-critic", "subject_key": "flow/consumer"}],
            evidence=evidence,
        )
        first = build_typed_bus(plan, evidence, [mapper, critic])
        second = build_typed_bus(plan, evidence, [critic, mapper])
        refs = evidence_source_refs(evidence)
        self.assertEqual(first, second)
        self.assertEqual(
            typed_bus_sha256(first, known_source_refs=refs),
            typed_bus_sha256(second, known_source_refs=refs),
        )

    def test_unknown_and_conflict_claim_statuses_survive_unchanged(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-unknown", "unknown-preserved", status="UNKNOWN")],
            [{"claim_id": "claim-unknown", "subject_key": "preservation/unknown"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [
                self.claim(
                    "claim-upstream-conflict",
                    "conflict-preserved",
                    role="critic",
                    status="CONFLICT",
                )
            ],
            [
                {
                    "claim_id": "claim-upstream-conflict",
                    "subject_key": "preservation/upstream-conflict",
                }
            ],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [mapper, critic])
        by_id = {item["id"]: item for item in bus["claims"]}
        self.assertEqual(by_id["claim-unknown"]["status"], "UNKNOWN")
        self.assertEqual(by_id["claim-upstream-conflict"]["status"], "CONFLICT")
        self.assertEqual(bus["conflicts"], [])

    def test_pairwise_value_disagreement_creates_canonical_unresolved_conflict_and_blocker(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-left", "owner-a")],
            [{"claim_id": "claim-left", "subject_key": "semantic-owner/runtime"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-right", "owner-b", role="critic")],
            [{"claim_id": "claim-right", "subject_key": "semantic-owner/runtime"}],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [critic, mapper])
        self.assertEqual(len(bus["conflicts"]), 1)
        conflict = bus["conflicts"][0]
        self.assertEqual(conflict["subject"], "semantic-owner/runtime")
        self.assertEqual(conflict["left_claim_id"], "claim-left")
        self.assertEqual(conflict["right_claim_id"], "claim-right")
        self.assertEqual(conflict["resolution"], "UNRESOLVED")
        deterministic = [
            item for item in bus["blockers"] if item["origin_role"] == "deterministic"
        ]
        self.assertEqual(len(deterministic), 1)
        self.assertEqual(deterministic[0]["kind"], "conflict")
        self.assertEqual(deterministic[0]["refs"], ["S1@L10"])

    def test_two_vs_one_disagreement_never_majority_resolves(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [
                self.claim("claim-agree-a", "same"),
                self.claim("claim-agree-b", "same", status="DIRECT"),
            ],
            [
                {"claim_id": "claim-agree-a", "subject_key": "release/state"},
                {"claim_id": "claim-agree-b", "subject_key": "release/state"},
            ],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-dissent", "different", role="critic")],
            [{"claim_id": "claim-dissent", "subject_key": "release/state"}],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [mapper, critic])
        pairs = {
            (item["left_claim_id"], item["right_claim_id"], item["resolution"])
            for item in bus["conflicts"]
        }
        self.assertEqual(
            pairs,
            {
                ("claim-agree-a", "claim-dissent", "UNRESOLVED"),
                ("claim-agree-b", "claim-dissent", "UNRESOLVED"),
            },
        )
        self.assertTrue(all(item["resolution"] == "UNRESOLVED" for item in bus["conflicts"]))
        self.assertEqual(
            len([item for item in bus["blockers"] if item["origin_role"] == "deterministic"]),
            1,
        )

    def test_same_value_claims_remain_distinct_without_value_conflict(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-same-a", "same", status="SUPPORTED_LIKELY")],
            [{"claim_id": "claim-same-a", "subject_key": "preservation/request"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-same-b", "same", role="critic", status="DIRECT", refs=[])],
            [{"claim_id": "claim-same-b", "subject_key": "preservation/request"}],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [mapper, critic])
        self.assertEqual([item["id"] for item in bus["claims"]], ["claim-same-a", "claim-same-b"])
        self.assertEqual(bus["conflicts"], [])
        self.assertEqual(
            [item for item in bus["blockers"] if item["origin_role"] == "deterministic"],
            [],
        )

    def test_unknown_claim_does_not_vote_in_value_conflict(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-known", "known")],
            [{"claim_id": "claim-known", "subject_key": "test/status"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-unknown-other", "different", role="critic", status="UNKNOWN")],
            [{"claim_id": "claim-unknown-other", "subject_key": "test/status"}],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [mapper, critic])
        self.assertEqual(bus["conflicts"], [])
        self.assertEqual({item["status"] for item in bus["claims"]}, {"SUPPORTED_LIKELY", "UNKNOWN"})

    def test_closed_synthetic_fixture_rejects_raw_prose_and_role_authored_verdict(self):
        plan = self.plan()
        evidence = self.evidence()
        base = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-closed", "x")],
            evidence=evidence,
        )
        for field, value in (("raw_prose", "free-form handoff"), ("final_verdict", "SUPPORTED")):
            with self.subTest(field=field):
                tampered = copy.deepcopy(base)
                tampered[field] = value
                with self.assertRaisesRegex(BusError, "unexpected property"):
                    validate_synthetic_role_fixture(
                        tampered,
                        execution_plan=plan,
                        evidence_package=evidence,
                    )

    def test_tampered_conflict_resolution_or_deterministic_blocker_fails_bus_readback(self):
        plan = self.plan()
        evidence = self.evidence()
        mapper = self.fixture(
            "mapper",
            "mapper",
            [self.claim("claim-tamper-a", "a")],
            [{"claim_id": "claim-tamper-a", "subject_key": "owner/tamper"}],
            evidence=evidence,
        )
        critic = self.fixture(
            "critic",
            "critic",
            [self.claim("claim-tamper-b", "b", role="critic")],
            [{"claim_id": "claim-tamper-b", "subject_key": "owner/tamper"}],
            evidence=evidence,
        )
        bus = build_typed_bus(plan, evidence, [mapper, critic])
        refs = evidence_source_refs(evidence)

        changed_resolution = copy.deepcopy(bus)
        changed_resolution["conflicts"][0]["resolution"] = "RESOLVED"
        with self.assertRaisesRegex(BusError, "conflicts must equal deterministic"):
            validate_typed_bus(changed_resolution, known_source_refs=refs)

        changed_blocker = copy.deepcopy(bus)
        changed_blocker["blockers"][0]["subject"] = "invented deterministic blocker"
        with self.assertRaisesRegex(BusError, "deterministic blockers must equal"):
            validate_typed_bus(changed_blocker, known_source_refs=refs)


if __name__ == "__main__":
    unittest.main()
