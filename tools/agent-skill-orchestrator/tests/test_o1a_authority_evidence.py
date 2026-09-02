import copy
import hashlib
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import (
    AuthorityError,
    authority_snapshot_sha256,
    resolve_authority,
    validate_authority_snapshot,
)
from evidence import (
    EvidenceError,
    build_evidence_package,
    evidence_package_sha256,
    evidence_source_refs,
    validate_evidence_package,
)
from registry import load_domain_registry, registry_sha256
from router import route_task
from schema_validation import validate_contract

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40
OTHER_SHA = "c" * 40


class O1AAuthorityEvidenceTests(unittest.TestCase):
    def plan(self, task_kind: str = "impact_analysis"):
        return route_task(
            {
                "schema_version": 1,
                "task_id": "o1a-authority-evidence",
                "scope": "plugin:usage-dashboard",
                "task_kind": task_kind,
                "intent": "Build deterministic repository evidence.",
                "mutation_requested": False,
                "device_truth_requested": False,
            }
        )

    def observations(self):
        return [
            {
                "kind": "release_branch",
                "value": "release-usage-dashboard",
                "status": "OBSERVED",
                "source_sha": RELEASE_SHA,
            },
            {
                "kind": "manifest",
                "value": "plugins/usage-dashboard/runtime/product-manifest.json",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
            {
                "kind": "artifact",
                "value": "plugins/usage-dashboard/latest.js",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
            {
                "kind": "release_spec_dir",
                "value": ".github/usage-dashboard/releases",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
        ]

    def snapshot(self, observations=None, target_sha=TARGET_SHA):
        return resolve_authority(
            "plugin:usage-dashboard",
            target_sha,
            self.observations() if observations is None else observations,
        )

    def source_blocks(self):
        return [
            {
                "path": "plugins/usage-dashboard/src/runtime.js",
                "source_sha": TARGET_SHA,
                "start_line": 20,
                "content": "export const runtime = true;\nexport const stable = true;",
            },
            {
                "path": "docs/USAGE_DASHBOARD_GUIDELINES.md",
                "source_sha": TARGET_SHA,
                "start_line": 3,
                "content": "# Guidelines\nPreserve unknown values.",
            },
            {
                "path": "plugins/usage-dashboard/latest.js",
                "source_sha": TARGET_SHA,
                "start_line": 1,
                "content": "// promoted artifact",
            },
            {
                "path": "plugins/usage-dashboard/runtime/product-manifest.json",
                "source_sha": TARGET_SHA,
                "start_line": 1,
                "content": '{"version":"fixture"}',
            },
            {
                "path": ".github/usage-dashboard/releases/fixture.json",
                "source_sha": TARGET_SHA,
                "start_line": 8,
                "content": '{"release":"fixture"}',
            },
        ]

    def test_authority_snapshot_resolves_exact_registered_refs(self):
        domains = load_domain_registry()
        snapshot = self.snapshot()
        self.assertEqual(snapshot["scope"], "plugin:usage-dashboard")
        self.assertEqual(snapshot["target_repository_sha"], TARGET_SHA)
        self.assertEqual(snapshot["domain_registry_sha256"], registry_sha256(domains))
        self.assertEqual(snapshot["authority_profile"], "usage-dashboard-current")
        self.assertEqual(snapshot["overall_status"], "RESOLVED")
        self.assertEqual(snapshot["blockers"], [])
        self.assertEqual(
            [(item["kind"], item["status"]) for item in snapshot["authorities"]],
            [
                ("artifact", "OBSERVED"),
                ("manifest", "OBSERVED"),
                ("release_branch", "OBSERVED"),
                ("release_spec_dir", "OBSERVED"),
            ],
        )
        validate_authority_snapshot(snapshot)
        validate_contract(snapshot, "authority-snapshot.schema.json", known_source_refs=())

    def test_absent_observation_becomes_unknown_and_missing_is_preserved(self):
        snapshot = self.snapshot(
            [
                {
                    "kind": "release_branch",
                    "value": "release-usage-dashboard",
                    "status": "MISSING",
                },
                {
                    "kind": "manifest",
                    "value": "plugins/usage-dashboard/runtime/product-manifest.json",
                    "status": "OBSERVED",
                    "source_sha": TARGET_SHA,
                },
            ]
        )
        by_key = {(item["kind"], item["value"]): item for item in snapshot["authorities"]}
        self.assertEqual(
            by_key[("release_branch", "release-usage-dashboard")]["status"], "MISSING"
        )
        self.assertEqual(
            by_key[("artifact", "plugins/usage-dashboard/latest.js")]["status"], "UNKNOWN"
        )
        self.assertEqual(snapshot["overall_status"], "PARTIAL")
        self.assertTrue(any(item["kind"] == "missing_evidence" for item in snapshot["blockers"]))
        self.assertTrue(any(item["kind"] == "unknown" for item in snapshot["blockers"]))
        self.assertTrue(all(item["origin_role"] == "deterministic" for item in snapshot["blockers"]))

    def test_no_observations_is_unknown_not_defaulted(self):
        snapshot = self.snapshot([])
        self.assertEqual(snapshot["overall_status"], "UNKNOWN")
        self.assertTrue(all(item["status"] == "UNKNOWN" for item in snapshot["authorities"]))
        self.assertEqual(len(snapshot["blockers"]), 4)

    def test_undeclared_and_duplicate_observations_fail_closed(self):
        with self.assertRaisesRegex(AuthorityError, "undeclared authority observation"):
            self.snapshot(
                [
                    {
                        "kind": "artifact",
                        "value": "plugins/usage-dashboard/not-declared.js",
                        "status": "OBSERVED",
                        "source_sha": TARGET_SHA,
                    }
                ]
            )
        duplicate = [self.observations()[0], copy.deepcopy(self.observations()[0])]
        with self.assertRaisesRegex(AuthorityError, "duplicate authority observation"):
            self.snapshot(duplicate)

    def test_observation_status_sha_rules_fail_closed(self):
        with self.assertRaisesRegex(AuthorityError, "requires source_sha"):
            self.snapshot(
                [
                    {
                        "kind": "release_branch",
                        "value": "release-usage-dashboard",
                        "status": "OBSERVED",
                    }
                ]
            )
        with self.assertRaisesRegex(AuthorityError, "must not carry source_sha"):
            self.snapshot(
                [
                    {
                        "kind": "release_branch",
                        "value": "release-usage-dashboard",
                        "status": "MISSING",
                        "source_sha": RELEASE_SHA,
                    }
                ]
            )

    def test_tampered_authority_snapshot_semantics_fail_closed(self):
        snapshot = self.snapshot([])
        snapshot["authorities"][0]["status"] = "OBSERVED"
        with self.assertRaisesRegex(AuthorityError, "requires source_sha"):
            validate_authority_snapshot(snapshot)

    def test_authority_digest_is_deterministic_and_status_sensitive(self):
        first = self.snapshot()
        second = self.snapshot(list(reversed(self.observations())))
        self.assertEqual(authority_snapshot_sha256(first), authority_snapshot_sha256(second))
        partial = self.snapshot(self.observations()[:-1])
        self.assertNotEqual(authority_snapshot_sha256(first), authority_snapshot_sha256(partial))

    def test_usage_dashboard_source_paths_get_exact_authority_classes(self):
        package = build_evidence_package(self.plan(), self.snapshot(), self.source_blocks())
        classes = {item["path"]: item["authority_class"] for item in package["sources"]}
        self.assertEqual(
            classes["plugins/usage-dashboard/src/runtime.js"], "domain_primary"
        )
        self.assertEqual(classes["docs/USAGE_DASHBOARD_GUIDELINES.md"], "guidelines")
        self.assertEqual(classes["plugins/usage-dashboard/latest.js"], "artifact")
        self.assertEqual(
            classes["plugins/usage-dashboard/runtime/product-manifest.json"], "manifest"
        )
        self.assertEqual(
            classes[".github/usage-dashboard/releases/fixture.json"], "release_spec_dir"
        )

    def test_source_ids_and_order_are_input_order_independent(self):
        blocks = self.source_blocks()
        first = build_evidence_package(self.plan(), self.snapshot(), blocks)
        second = build_evidence_package(self.plan(), self.snapshot(), list(reversed(blocks)))
        self.assertEqual(first, second)
        self.assertEqual(evidence_package_sha256(first), evidence_package_sha256(second))
        self.assertEqual(
            [item["source_id"] for item in first["sources"]],
            ["S1", "S2", "S3", "S4", "S5"],
        )
        self.assertEqual(
            [item["path"] for item in first["sources"]],
            sorted(item["path"] for item in blocks),
        )

    def test_existing_source_ref_contract_is_used_exactly(self):
        package = build_evidence_package(self.plan(), self.snapshot(), self.source_blocks())
        refs = evidence_source_refs(package)
        self.assertEqual(len(refs), len(package["sources"]))
        for item in package["sources"]:
            validate_contract(item["source_ref"], "source-ref.schema.json")
            self.assertEqual(item["source_ref"]["source_sha"], item["source_sha"])
            self.assertEqual(
                item["source_ref"]["block_digest"],
                hashlib.sha256(item["content"].encode("utf-8")).hexdigest(),
            )
            self.assertEqual(
                item["source_ref"]["ref"], f"{item['source_id']}@L{item['start_line']}"
            )

    def test_evidence_package_binds_plan_authority_registry_and_target_sha(self):
        plan = self.plan()
        snapshot = self.snapshot()
        package = build_evidence_package(plan, snapshot, self.source_blocks())
        self.assertEqual(package["scope"], plan["scope"])
        self.assertEqual(package["target_repository_sha"], TARGET_SHA)
        self.assertEqual(package["domain_registry_sha256"], registry_sha256(load_domain_registry()))
        self.assertEqual(package["blockers"], snapshot["blockers"])
        validate_evidence_package(package)
        validate_contract(
            package,
            "evidence-package.schema.json",
            known_source_refs=evidence_source_refs(package),
        )

    def test_path_traversal_noncanonical_absolute_and_out_of_domain_fail_closed(self):
        bad_paths = [
            "../plugins/usage-dashboard/x.js",
            "/plugins/usage-dashboard/x.js",
            "plugins\\usage-dashboard\\x.js",
            "plugins/usage-dashboard/../devpass/x.js",
            "plugins/usage-dashboard//x.js",
            "plugins/devpass/latest.js",
        ]
        for path in bad_paths:
            with self.subTest(path=path):
                with self.assertRaises(EvidenceError):
                    build_evidence_package(
                        self.plan(),
                        self.snapshot(),
                        [
                            {
                                "path": path,
                                "source_sha": TARGET_SHA,
                                "start_line": 1,
                                "content": "x",
                            }
                        ],
                    )

    def test_unresolved_explicit_authority_cannot_be_used_as_evidence(self):
        observations = [
            item for item in self.observations() if item["kind"] != "artifact"
        ]
        snapshot = self.snapshot(observations)
        with self.assertRaisesRegex(EvidenceError, "authority is not OBSERVED"):
            build_evidence_package(
                self.plan(),
                snapshot,
                [
                    {
                        "path": "plugins/usage-dashboard/latest.js",
                        "source_sha": TARGET_SHA,
                        "start_line": 1,
                        "content": "// artifact",
                    }
                ],
            )

    def test_source_sha_mismatch_fails_closed(self):
        with self.assertRaisesRegex(EvidenceError, "source_sha mismatch"):
            build_evidence_package(
                self.plan(),
                self.snapshot(),
                [
                    {
                        "path": "plugins/usage-dashboard/src/runtime.js",
                        "source_sha": OTHER_SHA,
                        "start_line": 1,
                        "content": "x",
                    }
                ],
            )

    def test_release_spec_source_must_match_observed_release_spec_authority_sha(self):
        observations = copy.deepcopy(self.observations())
        for item in observations:
            if item["kind"] == "release_spec_dir":
                item["source_sha"] = RELEASE_SHA
        snapshot = self.snapshot(observations)
        with self.assertRaisesRegex(EvidenceError, "source_sha mismatch"):
            build_evidence_package(
                self.plan(),
                snapshot,
                [
                    {
                        "path": ".github/usage-dashboard/releases/fixture.json",
                        "source_sha": TARGET_SHA,
                        "start_line": 1,
                        "content": "{}",
                    }
                ],
            )

    def test_overlapping_blocks_fail_closed(self):
        blocks = [
            {
                "path": "plugins/usage-dashboard/src/runtime.js",
                "source_sha": TARGET_SHA,
                "start_line": 10,
                "content": "a\nb\nc",
            },
            {
                "path": "plugins/usage-dashboard/src/runtime.js",
                "source_sha": TARGET_SHA,
                "start_line": 12,
                "content": "overlap",
            },
        ]
        with self.assertRaisesRegex(EvidenceError, "overlapping evidence blocks"):
            build_evidence_package(self.plan(), self.snapshot(), blocks)

    def test_content_path_and_source_sha_changes_are_digest_sensitive(self):
        base = build_evidence_package(
            self.plan(),
            self.snapshot(),
            [
                {
                    "path": "plugins/usage-dashboard/src/runtime.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 1,
                    "content": "alpha",
                }
            ],
        )
        changed_content = build_evidence_package(
            self.plan(),
            self.snapshot(),
            [
                {
                    "path": "plugins/usage-dashboard/src/runtime.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 1,
                    "content": "beta",
                }
            ],
        )
        changed_path = build_evidence_package(
            self.plan(),
            self.snapshot(),
            [
                {
                    "path": "plugins/usage-dashboard/src/other.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 1,
                    "content": "alpha",
                }
            ],
        )
        changed_target_snapshot = self.snapshot(
            [
                {
                    **item,
                    **({"source_sha": OTHER_SHA} if item["kind"] in {"manifest", "artifact", "release_spec_dir"} else {}),
                }
                for item in self.observations()
            ],
            target_sha=OTHER_SHA,
        )
        changed_sha = build_evidence_package(
            self.plan(),
            changed_target_snapshot,
            [
                {
                    "path": "plugins/usage-dashboard/src/runtime.js",
                    "source_sha": OTHER_SHA,
                    "start_line": 1,
                    "content": "alpha",
                }
            ],
        )
        digests = {
            evidence_package_sha256(base),
            evidence_package_sha256(changed_content),
            evidence_package_sha256(changed_path),
            evidence_package_sha256(changed_sha),
        }
        self.assertEqual(len(digests), 4)

    def test_invalid_start_line_and_evidence_size_fail_closed(self):
        with self.assertRaisesRegex(EvidenceError, "start_line must be >= 1"):
            build_evidence_package(
                self.plan(),
                self.snapshot(),
                [
                    {
                        "path": "plugins/usage-dashboard/src/runtime.js",
                        "source_sha": TARGET_SHA,
                        "start_line": 0,
                        "content": "x",
                    }
                ],
            )
        with self.assertRaises(EvidenceError):
            build_evidence_package(
                self.plan(),
                self.snapshot(),
                [
                    {
                        "path": f"plugins/usage-dashboard/src/f{index}.js",
                        "source_sha": TARGET_SHA,
                        "start_line": 1,
                        "content": "x" * 20000,
                    }
                    for index in range(7)
                ],
            )


if __name__ == "__main__":
    unittest.main()
