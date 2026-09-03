import copy
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from evidence import EvidenceError, build_evidence_package
from registry import load_domain_registry
from router import RoutingError, route_task

TARGET_SHA = "f01c2ef304656de9254191ec2fb9a2c046642f21"
OTHER_SHA = "a" * 40


class O4F0TermuxDomainAdapterTests(unittest.TestCase):
    def setUp(self):
        self.registry = load_domain_registry()
        self.termux = next(
            item for item in self.registry["domains"]
            if item["scope"] == "plugin:termux-large-doc-editor"
        )

    def plan(self, *, task_kind="impact_analysis", registry=None):
        return route_task(
            {
                "schema_version": 1,
                "task_id": "o4f0-termux-domain-adapter",
                "scope": "plugin:termux-large-doc-editor",
                "task_kind": task_kind,
                "intent": "Build frozen retrospective Termux evidence.",
                "mutation_requested": False,
                "device_truth_requested": False,
            },
            domain_registry_data=self.registry if registry is None else registry,
        )

    def observations(self):
        return [
            {
                "kind": "declared_by",
                "value": "docs/REPO_PROJECT_CATALOG.md",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
            {
                "kind": "evidence",
                "value": "plugins/termux/large-doc-editor/README.md",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
        ]

    def snapshot(self, observations=None):
        return resolve_authority(
            "plugin:termux-large-doc-editor",
            TARGET_SHA,
            self.observations() if observations is None else observations,
            domain_registry_data=self.registry,
        )

    def source_blocks(self):
        return [
            {
                "path": "docs/REPO_PROJECT_CATALOG.md",
                "source_sha": TARGET_SHA,
                "start_line": 9,
                "content": "| plugin:termux-large-doc-editor | Termux Large Doc Editor | prototype |",
            },
            {
                "path": "docs/TERMUX_DEVELOPMENT_GUIDELINES.md",
                "source_sha": TARGET_SHA,
                "start_line": 9,
                "content": "Production release branch: `UNKNOWN — not established yet`",
            },
            {
                "path": "plugins/termux/large-doc-editor/README.md",
                "source_sha": TARGET_SHA,
                "start_line": 1,
                "content": "# Large Doc Editor\nEvidence-gathering prototype with explicit atomic file save.",
            },
            {
                "path": "plugins/termux/large-doc-editor/web/app.js",
                "source_sha": TARGET_SHA,
                "start_line": 100,
                "content": "async function flushChunk() {}\nasync function saveDocument() {}",
            },
        ]

    def test_termux_domain_metadata_is_exact_and_has_no_release_authority(self):
        self.assertEqual(self.termux["domain_id"], "termux-large-doc-editor")
        self.assertEqual(self.termux["name"], "Termux Large Doc Editor")
        self.assertEqual(self.termux["lifecycle"], "prototype")
        self.assertEqual(self.termux["primary_path"], "plugins/termux/large-doc-editor/**")
        self.assertEqual(self.termux["guidelines_path"], "docs/TERMUX_DEVELOPMENT_GUIDELINES.md")
        self.assertEqual(
            {(item["kind"], item["value"]) for item in self.termux["authority_refs"]},
            {
                ("declared_by", "docs/REPO_PROJECT_CATALOG.md"),
                ("evidence", "plugins/termux/large-doc-editor/README.md"),
            },
        )
        self.assertFalse(
            {item["kind"] for item in self.termux["authority_refs"]}
            & {"release_branch", "manifest", "artifact", "release_spec_dir"}
        )
        self.assertEqual(
            self.termux["registration_semantics"],
            "domain_metadata_only_no_skill_promotion",
        )

    def test_termux_impact_route_and_authority_snapshot_resolve_without_release_claim(self):
        plan = self.plan()
        self.assertEqual(plan["scope"], "plugin:termux-large-doc-editor")
        self.assertEqual(plan["execution_class"], "standard")
        snapshot = self.snapshot()
        self.assertEqual(snapshot["overall_status"], "RESOLVED")
        self.assertEqual(snapshot["blockers"], [])
        self.assertEqual(
            [(item["kind"], item["status"]) for item in snapshot["authorities"]],
            [("declared_by", "OBSERVED"), ("evidence", "OBSERVED")],
        )

    def test_release_lookup_fails_closed_without_inventing_termux_release_authority(self):
        with self.assertRaisesRegex(RoutingError, "release_lookup requires registered release_branch"):
            self.plan(task_kind="release_lookup")

    def test_canonical_builder_emits_exact_termux_authority_classes(self):
        package = build_evidence_package(
            self.plan(),
            self.snapshot(),
            self.source_blocks(),
            domain_registry_data=self.registry,
        )
        classes = {item["path"]: item["authority_class"] for item in package["sources"]}
        self.assertEqual(classes["docs/REPO_PROJECT_CATALOG.md"], "declared_by")
        self.assertEqual(classes["docs/TERMUX_DEVELOPMENT_GUIDELINES.md"], "guidelines")
        self.assertEqual(classes["plugins/termux/large-doc-editor/README.md"], "evidence")
        self.assertEqual(classes["plugins/termux/large-doc-editor/web/app.js"], "domain_primary")
        self.assertEqual(package["scope"], "plugin:termux-large-doc-editor")
        self.assertEqual(package["target_repository_sha"], TARGET_SHA)

    def test_exact_declared_authority_precedes_primary_root_fallback(self):
        package = build_evidence_package(
            self.plan(),
            self.snapshot(),
            [self.source_blocks()[2]],
            domain_registry_data=self.registry,
        )
        self.assertEqual(package["sources"][0]["authority_class"], "evidence")

    def test_unresolved_explicit_termux_evidence_authority_fails_closed(self):
        snapshot = self.snapshot([self.observations()[0]])
        with self.assertRaisesRegex(EvidenceError, "authority is not OBSERVED"):
            build_evidence_package(
                self.plan(),
                snapshot,
                [self.source_blocks()[2]],
                domain_registry_data=self.registry,
            )

    def test_explicit_authority_sha_mismatch_and_out_of_domain_path_fail_closed(self):
        bad = copy.deepcopy(self.source_blocks()[0])
        bad["source_sha"] = OTHER_SHA
        with self.assertRaisesRegex(EvidenceError, "source_sha mismatch"):
            build_evidence_package(
                self.plan(), self.snapshot(), [bad], domain_registry_data=self.registry
            )
        with self.assertRaisesRegex(EvidenceError, "outside registered domain evidence boundaries"):
            build_evidence_package(
                self.plan(),
                self.snapshot(),
                [{
                    "path": "plugins/devpass/latest.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 1,
                    "content": "x",
                }],
                domain_registry_data=self.registry,
            )

    def test_generic_current_state_authority_class_is_supported_when_declared(self):
        synthetic = copy.deepcopy(self.registry)
        termux = next(
            item for item in synthetic["domains"]
            if item["scope"] == "plugin:termux-large-doc-editor"
        )
        termux["authority_refs"].append(
            {"kind": "current_state", "value": "plugins/termux/large-doc-editor/STATE.md"}
        )
        observations = self.observations() + [{
            "kind": "current_state",
            "value": "plugins/termux/large-doc-editor/STATE.md",
            "status": "OBSERVED",
            "source_sha": TARGET_SHA,
        }]
        snapshot = resolve_authority(
            "plugin:termux-large-doc-editor",
            TARGET_SHA,
            observations,
            domain_registry_data=synthetic,
        )
        package = build_evidence_package(
            self.plan(registry=synthetic),
            snapshot,
            [{
                "path": "plugins/termux/large-doc-editor/STATE.md",
                "source_sha": TARGET_SHA,
                "start_line": 1,
                "content": "prototype state",
            }],
            domain_registry_data=synthetic,
        )
        self.assertEqual(package["sources"][0]["authority_class"], "current_state")


if __name__ == "__main__":
    unittest.main()
