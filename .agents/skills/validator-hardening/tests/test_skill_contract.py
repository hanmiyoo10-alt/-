from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL = SKILL_ROOT / "SKILL.md"
EVALS = SKILL_ROOT / "evals" / "evals.json"


class ValidatorHardeningSkillContractTests(unittest.TestCase):
    def setUp(self):
        self.text = SKILL.read_text(encoding="utf-8")
        self.eval_payload = json.loads(EVALS.read_text(encoding="utf-8"))
        self.evals = self.eval_payload["cases"]

    def test_frontmatter_name_matches_directory_and_description_is_bounded(self):
        self.assertTrue(self.text.startswith("---\n"))
        frontmatter = self.text.split("---\n", 2)[1]
        name = re.search(r"^name:\s*(\S+)\s*$", frontmatter, re.MULTILINE)
        self.assertIsNotNone(name)
        self.assertEqual(name.group(1), SKILL_ROOT.name)

        desc_lines = []
        collecting = False
        for line in frontmatter.splitlines():
            if line.startswith("description:"):
                collecting = True
                first = line.split(":", 1)[1].strip()
                if first not in {">-", ">", "|", "|-"}:
                    desc_lines.append(first)
                continue
            if collecting:
                if line.startswith("  "):
                    desc_lines.append(line.strip())
                else:
                    break
        description = " ".join(desc_lines).strip()
        self.assertGreater(len(description), 0)
        self.assertLessEqual(len(description), 1024)

    def test_current_authority_and_target_owner_are_required_first(self):
        for required in (
            "docs/REPOSITORY_COMMON_RULES.md",
            "docs/REPO_PROJECT_CATALOG.md",
            "current owning project/domain guideline or contract",
            "target validator/classifier source and current tests",
            "REVIEW_BLOCKED_UNKNOWN_OWNER",
            "REVIEW_OWNER_CONFLICT",
            "OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS",
            "relative to the locked requested claim",
        ):
            self.assertIn(required, self.text)

    def test_fail_closed_evidence_semantics_are_explicit(self):
        for required in (
            "Emit or recommend a target `FAIL` only when current owner semantics and observed evidence prove a contract violation.",
            "Missing, ambiguous, unavailable, partial, malformed, or unsupported evidence remains `UNKNOWN`",
            "Never infer absence from incomplete discovery",
            "Do not fabricate defaults, provenance, current SHAs, versions, runtime state, or object identity.",
            "PROVEN_GAP",
        ):
            self.assertIn(required, self.text)

    def test_all_seven_hardening_dimensions_are_present(self):
        headings = (
            "#### A. Text, path, and ref inputs",
            "#### B. Structured data",
            "#### C. Source and AST patterns",
            "#### D. Git and object evidence",
            "#### E. Evidence semantics",
            "#### F. Resource bounds and determinism",
            "#### G. Authority and effect denial",
        )
        for heading in headings:
            self.assertIn(heading, self.text)

    def test_text_path_ref_edge_classes_are_present(self):
        for required in (
            "NUL and other control characters",
            "Unicode surrogate input",
            "normalization-sensitive forms",
            "traversal",
            "option-like refs or arguments",
            "encoded-byte limits",
        ):
            self.assertIn(required, self.text)

    def test_structured_data_edge_classes_are_present(self):
        for required in (
            "duplicate JSON keys",
            "wrong scalar/container types",
            "oversized documents",
            "deep nesting and recursion limits",
            "unknown/additional fields",
            "decode failure",
        ):
            self.assertIn(required, self.text)

    def test_ast_and_git_ambiguity_classes_are_present(self):
        for required in (
            "computed or dynamic expressions",
            "aliasing, indirection",
            "unsupported syntax",
            "exact Git object type",
            "validate expected type/mode combinations",
            "partial clone or lazy object availability",
            "replacement objects",
            "ambient Git repository, config, pathspec, trace, or environment poisoning",
            "exact tree-entry mode as a separate fact",
            "symlink mode `120000` -> `blob`",
            "gitlink mode `160000` -> `commit`",
        ):
            self.assertIn(required, self.text)

    def test_resource_bounds_and_determinism_are_preserved(self):
        for required in (
            "input-size ceilings",
            "scan/file/object-count ceilings",
            "recursion/depth ceilings",
            "subprocess timeout and output ceilings",
            "deterministic ordering and reason-code stability",
            "repeated identical immutable input",
            "generic execution-environment/dependency poisoning outside Git",
            "inherited `PATH`",
            "`PYTHONPATH`/module search path",
        ):
            self.assertIn(required, self.text)

    def test_skill_explicitly_denies_mutation_and_authority(self):
        for required in (
            "Do not auto-fix, rewrite, close, delete, merge, release, deploy, mutate production, mutate devices, or grant authority.",
            "Do not weaken or replace repository tests, Agent Skills CI, project CI, Required, branch protection, or release gates.",
            "read-only/advisory means no autofix or implicit writer",
            "no creation of a second mutable truth store",
        ):
            self.assertIn(required, self.text)

    def test_hypothesis_is_optional_feedback_only(self):
        for required in (
            "Property-based testing is optional guidance only",
            "use Hypothesis only from an already-authorized isolated development environment",
            "never make Hypothesis itself a runtime, production, or CI authority",
            "feedback amplifier",
        ):
            self.assertIn(required, self.text)
        self.assertNotIn("import hypothesis", self.text)

    def test_review_disposition_does_not_replace_target_result(self):
        for required in (
            "HARDENING_REVIEW_COMPLETE",
            "PARTIAL",
            "UNKNOWN",
            "CONFLICT",
            "A review disposition does not rewrite the target validator's own result.",
            "stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_OWNER`",
            "reason code `REVIEW_BLOCKED_UNKNOWN_CLAIM`",
        ):
            self.assertIn(required, self.text)

    def test_no_frozen_commit_sha_in_skill(self):
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", self.text))

    def test_git_backed_actual_bytes_have_identity_beyond_clean_status(self):
        for required in (
            "replacement-neutral immutable snapshot/object-read path",
            "never treat `CLEAN` alone as byte identity",
            "actual bytes plus every owner-relevant structural property relied upon by the review",
            "filter-normalized or otherwise transformed checkout bytes",
            "must not rely on `git status` cleanliness",
        ):
            self.assertIn(required, self.text)

    def test_mutable_inputs_are_revalidated_before_receipt(self):
        for required in (
            "evidence-bearing reads and execution must consume a captured immutable snapshot/copy",
            "immediately before emitting the final receipt revalidate",
            "including a Git checkout/worktree or a non-Git mutable path",
            "recorded algorithm-qualified full cryptographic digest/equivalent exact identity plus claim-relevant structure for every mutable non-Git input",
            "every contributing source, helper, test, fixture, owner-contract, and executed-input identity",
            "regardless of storage mechanism",
            "UNKNOWN / REVIEW_INPUT_CHANGED_DURING_REVIEW",
        ):
            self.assertIn(required, self.text)

    def test_review_receipt_requires_exact_source_identity(self):
        for required in (
            "exact commit object ID",
            "record worktree state as `CLEAN`, `DIRTY`, or `UNKNOWN`",
            "every dirty input that contributes to the review",
            "record an algorithm-qualified full cryptographic digest over explicitly identified bytes",
            "dirty contributing inputs cannot be bounded and identified completely",
            "contributing-input identity set must include every source",
            "regardless of CLEAN/DIRTY state",
            "reviewed source identity (exact commit/object/artifact identity)",
            "worktree state: CLEAN | DIRTY | UNKNOWN | NOT_APPLICABLE",
            "all contributing input identities actually relied upon regardless of storage mechanism",
            "dirty reviewed/executed input identities (digest or bounded diff identity) when applicable",
        ):
            self.assertIn(required, self.text)

    def test_eval_fixture_family_is_complete(self):
        self.assertIsInstance(self.eval_payload, dict)
        self.assertEqual(self.eval_payload.get("skill"), "validator-hardening")
        self.assertIsInstance(self.evals, list)
        ids = {case["id"] for case in self.evals}
        self.assertTrue(
            {
                "path-ref-adversarial",
                "json-schema-adversarial",
                "source-ast-adversarial",
                "git-object-adversarial",
                "narrow-validator-negative",
                "unknown-owner-negative",
                "owner-conflict-negative",
                "contract-conflict-negative",
            }.issubset(ids)
        )
        ast_case = next(case for case in self.evals if case["id"] == "source-ast-adversarial")
        self.assertTrue(
            any(
                "computed" in assertion.lower() or "alias" in assertion.lower()
                for assertion in ast_case["assertions"]
            )
        )
        negative = next(case for case in self.evals if case["id"] == "narrow-validator-negative")
        self.assertIn("Dimension B structured-data shape validation remains APPLICABLE", negative["expected_output"])
        self.assertIn("Raw JSON text decoding/parser concerns", negative["expected_output"])
        self.assertTrue(
            any("malformed top-level container type" in assertion for assertion in negative["assertions"])
        )
        grounded_ids = {
            "path-ref-adversarial",
            "json-schema-adversarial",
            "source-ast-adversarial",
            "git-object-adversarial",
            "narrow-validator-negative",
        }
        for case in self.evals:
            if case["id"] in grounded_ids:
                self.assertIn("Target:", case["prompt"])
                self.assertIn("Owner:", case["prompt"])
                self.assertIn("Claim:", case["prompt"])
                self.assertTrue(
                    "Guideline:" in case["prompt"] or "Guideline/contract:" in case["prompt"]
                )

    def test_read_only_eval_contract_does_not_fabricate_execution(self):
        positive_ids = {
            "path-ref-adversarial",
            "json-schema-adversarial",
            "source-ast-adversarial",
            "git-object-adversarial",
            "narrow-validator-negative",
        }
        for case in self.evals:
            if case["id"] not in positive_ids:
                continue
            self.assertIn("read-only static hardening review", case["expected_output"])
            self.assertIn("no owner tests or adversarial cases were executed", case["expected_output"])
            self.assertIn("PARTIAL", case["expected_output"])
            self.assertTrue(
                any("Does not claim owner tests" in assertion for assertion in case["assertions"])
            )

    def test_current_tests_must_be_inspected_before_reliance(self):
        for required in (
            "Inspect the contents of the current owner tests before relying on their coverage",
            "A path/name citation alone is insufficient",
            "If current test contents are unavailable",
            "preserve `PARTIAL` or `UNKNOWN`",
        ):
            self.assertIn(required, self.text)

    def test_source_ast_eval_keeps_unproven_environment_checks_out_of_scope(self):
        case = next(case for case in self.evals if case["id"] == "source-ast-adversarial")
        joined = "\n".join(case["assertions"])
        self.assertIn("OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS", joined)
        self.assertIn("unless current owner evidence shows that state is material", joined)

    def test_read_only_review_never_edits_target_checkout_for_cases(self):
        for required in (
            "propose a focused deterministic adversarial matrix without editing the repository under review",
            "mark every unexecuted case explicitly as proposed/not exercised",
            "do not claim that owner tests, commands, fuzzing, or adversarial inputs were run",
            "isolated temporary workspace/copy",
            "never edit the repository checkout under review merely to create review cases",
        ):
            self.assertIn(required, self.text)

    def test_eval_fixture_is_candidate_corpus_not_live_registration_claim(self):
        self.assertIn("### Eval fixture boundary", self.text)
        self.assertIn("candidate review corpus", self.text)
        self.assertIn("do not describe these fixtures as runnable through the public live-eval workflow", self.text)
        for case in self.evals:
            self.assertTrue(case["prompt"])
            self.assertTrue(case["expected_output"])
            self.assertTrue(case["assertions"])

    def test_executed_cases_require_runtime_identity_and_effect_containment(self):
        for required in (
            "owner-provided sandbox or equivalent proven effect containment",
            "a temporary directory alone is neither effect containment nor host-resource containment",
            "writes outside the workspace, subprocesses, network access, credentials, devices",
            "operating system/filesystem semantics when relevant",
            "interpreter/parser/runtime version",
            "Git and other material tool versions",
            "sandbox/containment identity",
            "do not claim `HARDENING_REVIEW_COMPLETE` from that execution",
            "execution surface/runtime/toolchain identity for each exercised case",
            "bounded host-resource containment",
            "outer wall-clock timeout plus every owner-relevant CPU-time, memory, process/thread-count, filesystem-growth, output, recursion/depth",
            "effect/resource containment identity for exercised cases",
            "isolated copy/workspace or proven no-write configuration",
            "an owner test proven not to load or execute the target",
            "any owner test that imports, invokes, loads, or otherwise executes the target under review",
            "requires the same proven effect containment and host-resource containment",
            "do not execute the target, including indirectly through owner tests",
        ):
            self.assertIn(required, self.text)

    def test_receipt_preserves_proposed_unexecuted_cases(self):
        self.assertIn(
            "proposed/not-exercised adversarial cases, each with concrete bounded input identity/structure, expected owner-defined outcome or uncertainty behavior, and reason it remains unexecuted",
            self.text,
        )

    def test_exercised_cases_require_exact_input_and_replay_identity(self):
        for required in (
            "record an exact owner-relevant input identity",
            "A descriptive case name alone is insufficient",
            "generation seed/configuration needed for replay",
            "reduced/minimized example identity or bounded example value/locator",
            "cases actually exercised, each binding exact owner-relevant input identity (byte+structural when bytes are part of the target contract; type+value/shape/structure when they are not), exact invocation identity, and the authorization identity/scope covering that invocation to expected owner-defined behavior, observed status/result, owner-defined reason code when applicable or NOT_APPLICABLE when the owner defines none, exit result when applicable, and exact owner-relevant result identity",
            "generated-case replay provenance when applicable",
        ):
            self.assertIn(required, self.text)

    def test_owner_and_contract_conflicts_have_distinct_provenance(self):
        for required in (
            "materially different owning projects/domains",
            "REVIEW_OWNER_CONFLICT",
            "REVIEW_CONTRACT_CONFLICT",
            "do not mislabel semantic/contract disagreement as an owner-identity conflict",
            "use `REVIEW_OWNER_CONFLICT` only for unresolved owner-identity disagreement",
        ):
            self.assertIn(required, self.text)
        owner_conflict = next(case for case in self.evals if case["id"] == "owner-conflict-negative")
        self.assertIn("REVIEW_OWNER_CONFLICT", owner_conflict["expected_output"])
        contract_conflict = next(case for case in self.evals if case["id"] == "contract-conflict-negative")
        self.assertIn("REVIEW_CONTRACT_CONFLICT", contract_conflict["expected_output"])
        self.assertIn("Do not emit REVIEW_OWNER_CONFLICT", contract_conflict["expected_output"])

    def test_executed_source_must_match_reviewed_source(self):
        for required in (
            "verify that every executed contributing input equals its corresponding reviewed identity",
            "owner tests, fixtures, wrappers, temporary harnesses",
            "explicit owner-approved transformation/relation",
            "REVIEW_EXECUTED_SOURCE_MISMATCH",
            "reviewed-to-executed identity relation for every executed contributing input",
        ):
            self.assertIn(required, self.text)

    def test_exercised_case_receipt_binds_expected_and_observed_outcome(self):
        for required in (
            "each binding exact owner-relevant input identity (byte+structural when bytes are part of the target contract; type+value/shape/structure when they are not), exact invocation identity, and the authorization identity/scope covering that invocation to expected owner-defined behavior",
            "observed status/result",
            "owner-defined reason code when applicable or NOT_APPLICABLE when the owner defines none",
            "exit result when applicable",
            "immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
        ):
            self.assertIn(required, self.text)

    def test_external_validation_requires_immutable_provenance(self):
        for required in (
            "exact run/check/job identity",
            "record the exact tested source/head SHA, the identified relevant check/step's raw outcome/conclusion and bounded result, and the enclosing run/job conclusion separately",
            "immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            "tested identity matches the reviewed source identity",
            "stale, mismatched, unattributable, or execution-unproven remote validation evidence remains `UNKNOWN`",
            "external validation evidence used, if any",
        ):
            self.assertIn(required, self.text)

    def test_dimension_applicability_is_claim_scoped(self):
        for required in (
            "relative to the locked requested claim",
            "OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS",
            "must not be exercised merely to broaden the review",
            "A narrow claim must not expand into unrelated validator behavior",
            "Every A-G applicability entry in the final receipt must carry the current owner/contract basis",
            "record that dimension as `UNKNOWN` rather than emitting an unsupported applicability label",
            "each entry binding its label to the current owner/contract basis locator",
            "the exact exercised evidence/result or qualifying owner-permitted static proof that covers that dimension, or an explicit unresolved reason",
            "cannot support HARDENING_REVIEW_COMPLETE",
        ):
            self.assertIn(required, self.text)

    def test_positive_controls_are_required_for_applicable_input_classes(self):
        for required in (
            "at least one representative owner-defined valid positive control",
            "expected successful owner-defined result",
            "exact valid boundary value as a positive control",
            "record that failure as a `PROVEN_GAP`",
            "may still reach `HARDENING_REVIEW_COMPLETE` once all applicable dimensions",
            "required owner-defined positive controls are represented in the receipt and proven",
        ):
            self.assertIn(required, self.text)

    def test_owner_test_command_receipt_records_outcomes(self):
        for required in (
            "owner tests / commands actually executed",
            "exit status or conclusion",
            "owner-defined positive execution marker or bounded collection/execution count proving the intended tests actually ran",
            "bounded passed/failed/skipped/error counts when available",
            "immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            "target-executing owner tests additionally bind the stronger target-execution effect/resource-containment identity",
        ):
            self.assertIn(required, self.text)

    def test_each_applicable_dimension_maps_to_evidence_or_unresolved_reason(self):
        for required in (
            "when APPLICABLE, the exact exercised evidence/result or qualifying owner-permitted static proof that covers that dimension, or an explicit unresolved reason",
            "if basis or required evidence mapping is missing, that dimension remains UNKNOWN",
            "every APPLICABLE dimension is mapped to sufficient exercised evidence/result or qualifying owner-permitted static proof",
        ):
            self.assertIn(required, self.text)

    def test_narrow_output_fixture_eval_keeps_shape_validation_applicable(self):
        case = next(case for case in self.evals if case["id"] == "narrow-validator-negative")
        self.assertIn("Dimension B structured-data shape validation remains APPLICABLE", case["expected_output"])
        self.assertIn("Raw JSON text decoding/parser concerns", case["expected_output"])
        joined = "\n".join(case["assertions"])
        self.assertIn("structured-data shape validation APPLICABLE", joined)
        self.assertIn("malformed top-level container type", joined)
        self.assertIn("raw JSON text decoding/parser concerns", joined)

    def test_exercised_case_records_exact_invocation_identity(self):
        for required in (
            "bind every exercised case to its exact invocation identity",
            "entrypoint/subcommand/function",
            "ordered arguments/flags",
            "stdin versus file/input-channel mapping",
            "material per-invocation configuration/settings",
            "each binding exact owner-relevant input identity (byte+structural when bytes are part of the target contract; type+value/shape/structure when they are not), exact invocation identity, and the authorization identity/scope covering that invocation",
        ):
            self.assertIn(required, self.text)

    def test_dimension_g_requires_attempt_telemetry_or_static_effect_proof(self):
        for required in (
            "containment protects external state but does not prove that prohibited effects were never attempted",
            "telemetry for every contract-prohibited effect attempt, whether the attempt is denied or succeeds",
            "every owner-contract-prohibited effect is denied before it can occur",
            "Silent containment or denied-only telemetry cannot mark dimension G exercised/clean",
            "missing all-attempt telemetry or static proof remains unresolved",
        ):
            self.assertIn(required, self.text)

    def test_exercised_cases_isolate_mutable_state_between_cases(self):
        for required in (
            "fresh process and clean isolated workspace/copy for each exercised case",
            "identify every owner-defined shared-state dependency",
            "capture its pre-case identity/state",
            "reset or reconstruct it deterministically between cases",
            "test that the reset succeeded",
            "per-case state isolation evidence",
        ):
            self.assertIn(required, self.text)

    def test_exercised_input_identity_includes_structural_metadata(self):
        for required in (
            "When bytes are part of the target's input contract, bind the exact bytes or an algorithm-qualified full cryptographic digest over explicitly identified input bytes plus every owner-relevant structural property",
            "A bare, truncated, algorithm-ambiguous, or unspecified-bytes digest is insufficient.",
            "path, filename, file mode/executable bit, symlink/gitlink/tree-entry mode, Git object type, directory/tree structure, container shape",
            "exact owner-relevant input identity",
        ):
            self.assertIn(required, self.text)

    def test_execution_requires_current_authorization_provenance(self):
        for required in (
            "verify current authorization provenance and exact execution scope",
            "who/what authorized it",
            "allowed effect/resource boundary",
            "absent, expired, ambiguous, or narrower than the intended invocation",
            "invocation-to-authorization mapping for every executed case, every evidence-bearing owner-test/command, and every executable static analyzer",
        ):
            self.assertIn(required, self.text)

    def test_proposed_positive_controls_are_preserved_in_receipt(self):
        for required in (
            "proposed/not-exercised positive controls",
            "accepted-input class",
            "expected owner-defined successful result",
            "reason it remains unexecuted",
            "required owner-defined positive controls are represented in the receipt",
        ):
            self.assertIn(required, self.text)

    def test_exercised_case_result_identity_supports_byte_and_nonbyte_contracts(self):
        for required in (
            "When result bytes are part of the target's result contract",
            "immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            "When the target returns an in-memory value/object and bytes are not part of its result contract",
            "exact owner-relevant result type plus value/shape/structure",
            "without inventing a JSON/pickle/repr encoding the target never produced",
            "exact owner-relevant result identity",
            "when bytes are not part of the result contract",
        ):
            self.assertIn(required, self.text)

    def test_owner_test_command_proves_tests_ran_and_preserves_containment(self):
        for required in (
            "owner-defined positive execution marker or bounded collection/execution count proving the intended tests actually ran",
            "command effect/resource-boundary identity",
            "isolated-copy/no-write identity",
            "target-executing owner tests additionally bind the stronger target-execution effect/resource-containment identity",
            "every evidence-bearing owner command is mapped to current invocation-scoped authorization, binds its exact ordered invocation and input/configuration mapping, proves the intended checks actually ran",
            "target-executing commands additionally preserve required target containment/state-isolation provenance",
        ):
            self.assertIn(required, self.text)

    def test_dimension_g_receipt_preserves_all_prohibited_effect_attempts(self):
        for required in (
            "all contract-prohibited effect-attempt telemetry whether denied or successful",
            "dimension G execution evidence preserves all prohibited-effect attempt telemetry",
        ):
            self.assertIn(required, self.text)

    def test_all_reviewed_inputs_bind_structural_metadata_and_revalidate_it(self):
        for required in (
            "record an identity that binds the actual bytes plus every owner-relevant structural property",
            "path/name, file mode/executable bit, symlink versus regular-file identity, Git object/tree-entry type and mode, directory/tree layout",
            "contributing-input identity set must include every source",
            "revalidate the exact identity of every relied-upon input",
            "both bytes and every owner-relevant structural property recorded for Git-backed inputs",
            "every reviewed/executed contributing input binds owner-relevant structural metadata",
        ):
            self.assertIn(required, self.text)

    def test_execution_requires_every_owner_relevant_resource_limit(self):
        for required in (
            "every owner-relevant CPU-time, memory, process/thread-count, filesystem-growth, output, recursion/depth",
            "If any owner-relevant required limit cannot be enforced",
            "treat host-resource containment as unavailable",
            "keep target-dependent execution static-only",
            "complete owner-relevant effect/resource-containment identity",
        ):
            self.assertIn(required, self.text)

    def test_remote_validation_requires_immutable_locator_or_content_digest(self):
        for required in (
            "immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            "A merely stable, mutable, rerunnable, expiring URL/page",
        ):
            self.assertIn(required, self.text)
        self.assertNotIn("immutable or stable result locator", self.text)

    def test_owner_tests_require_state_isolation_or_reset_proof(self):
        for required in (
            "per-evidence-bearing-test state-isolation proof",
            "fresh process/workspace per relevant test",
            "owner-defined shared-state capture/reset/revalidation plus order-independence evidence",
            "required isolation/reset proof",
            "target-executing commands additionally preserve required target containment/state-isolation provenance",
        ):
            self.assertIn(required, self.text)

    def test_mutable_inputs_close_aba_window(self):
        for required in (
            "captured immutable snapshot/copy of every mutable contributing input",
            "owner-approved read lock/lease/hold or equivalent mechanism",
            "keeps that identity stable for the full evidence-bearing read/execution window",
            "A final end-of-review identity check alone is insufficient",
            "A→B→A mutable-input race",
            "consumed from an immutable snapshot/copy or held stable across the evidence-bearing operation",
        ):
            self.assertIn(required, self.text)

    def test_proposed_adversarial_cases_preserve_concrete_input_and_expected_outcome(self):
        for required in (
            "proposed/not-exercised adversarial cases",
            "concrete bounded input identity/structure",
            "expected owner-defined outcome or uncertainty behavior",
            "reason it remains unexecuted",
        ):
            self.assertIn(required, self.text)

    def test_owner_test_receipt_preserves_material_environment(self):
        for required in (
            "material working-directory identity",
            "sanitized material environment/config identity",
            "PATH/PYTHONPATH/module search path",
            "HOME/tool config",
            "locale/encoding/timezone",
            "executable resolution and proxy/network settings",
            "material working-directory/environment identity",
        ):
            self.assertIn(required, self.text)

    def test_remote_validation_receipt_allows_immutable_locator_or_exact_digest(self):
        self.assertIn(
            "either an immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            self.text,
        )

    def test_conflict_evals_supply_source_locators(self):
        owner = next(case for case in self.evals if case["id"] == "owner-conflict-negative")
        contract = next(case for case in self.evals if case["id"] == "contract-conflict-negative")
        self.assertIn("input://owner-source-a", owner["prompt"])
        self.assertIn("input://owner-source-b", owner["prompt"])
        self.assertIn("input://contract-a", contract["prompt"])
        self.assertIn("input://contract-b", contract["prompt"])

    def test_unresolved_applicable_dimension_blocks_completion(self):
        for required in (
            "every APPLICABLE dimension is mapped to sufficient exercised evidence/result or qualifying owner-permitted static proof",
            "any APPLICABLE dimension that remains unresolved forces `PARTIAL` or `UNKNOWN`",
            "blocks `HARDENING_REVIEW_COMPLETE`",
        ):
            self.assertIn(required, self.text)

    def test_reason_code_is_conditional_on_owner_semantics(self):
        for required in (
            "owner-defined reason code when applicable or NOT_APPLICABLE when the owner defines none",
            "Preserve the target owner's result vocabulary and semantics",
        ):
            self.assertIn(required, self.text)

    def test_object_inputs_can_use_value_type_structure_identity_without_fake_bytes(self):
        for required in (
            "When the target consumes an in-memory value/object and bytes are not part of its contract",
            "bind the exact owner-relevant type plus value/shape/structure",
            "without inventing a JSON/pickle/repr encoding the target never observed",
            "byte+structural when bytes are part of the target contract; type+value/shape/structure when they are not",
        ):
            self.assertIn(required, self.text)

    def test_unknown_worktree_state_is_fail_closed(self):
        for required in (
            "record worktree state as `CLEAN`, `DIRTY`, or `UNKNOWN`",
            "use `NOT_APPLICABLE` only when no worktree state is relevant",
            "route the review to `PARTIAL` or `UNKNOWN`",
            "worktree state: CLEAN | DIRTY | UNKNOWN | NOT_APPLICABLE",
            "UNKNOWN is unresolved and cannot support HARDENING_REVIEW_COMPLETE",
        ):
            self.assertIn(required, self.text)

    def test_authorization_is_bound_to_each_execution(self):
        for required in (
            "preserve authorization provenance and scope per executed invocation",
            "every exercised case and every evidence-bearing owner-test/command entry must bind an authorization identity/scope",
            "explicit invocation-to-authorization mapping",
            "A review-level authorization record alone is insufficient",
            "invocation-to-authorization mapping for every executed case, every evidence-bearing owner-test/command, and every executable static analyzer",
        ):
            self.assertIn(required, self.text)

    def test_every_evidence_bearing_owner_command_has_runtime_identity(self):
        for required in (
            "owner tests / commands actually executed, each with exact test/command identity plus exact invocation",
            "every evidence-bearing owner command is mapped to current invocation-scoped authorization, binds its exact ordered invocation and input/configuration mapping, proves the intended checks actually ran, and has exact runtime/toolchain",
        ):
            self.assertIn(required, self.text)

    def test_static_analysis_preserves_equivalent_provenance(self):
        for required in (
            "evidence-bearing static analysis, if any",
            "exact analyzer/tool identity and version",
            "exact invocation/configuration",
            "exact analyzed input identity",
            "algorithm-qualified full cryptographic digest over explicitly identified analyzer-output bytes",
            "every executable evidence-bearing static analysis has equivalent analyzer/toolchain/invocation/input/immutable-result provenance",
        ):
            self.assertIn(required, self.text)

    def test_remote_validation_proves_relevant_check_executed(self):
        for required in (
            "exact relevant check/step identity for the locked claim",
            "owner-defined positive execution marker or bounded collection/execution count",
            "raw outcome/conclusion and bounded passed/failed/skipped/error result",
            "successful enclosing run/job with the relevant step skipped, soft-failed, normalized by a wrapper",
            "never substitute the enclosing run/job conclusion for the relevant check/step's actual outcome",
            "the relevant check/step's raw outcome/conclusion and bounded passed/failed/skipped/error result",
            "every external validation result proves the exact relevant check/step actually ran",
        ):
            self.assertIn(required, self.text)

    def test_result_digests_are_algorithm_qualified_and_full(self):
        for required in (
            "algorithm-qualified full cryptographic digest over explicitly identified result bytes",
            "sha256:<full-hex>",
            "record the canonical encoding/serialization used",
            "truncated digest, unqualified digest value, or digest over unspecified bytes is insufficient",
        ):
            self.assertIn(required, self.text)

    def test_input_digests_are_algorithm_qualified_and_full(self):
        for required in (
            "algorithm-qualified full cryptographic digest over explicitly identified input bytes",
            "sha256:<full-hex>",
            "A bare, truncated, algorithm-ambiguous, or unspecified-bytes digest is insufficient",
        ):
            self.assertIn(required, self.text)

    def test_static_analysis_requires_claim_relevant_coverage_proof(self):
        for required in (
            "owner-defined positive coverage/execution marker or bounded count tied to the relevant rule and analyzed input",
            "proving claim-relevant analysis actually ran",
            "positive claim-relevant coverage proof",
        ):
            self.assertIn(required, self.text)

    def test_executable_static_analyzers_use_execution_safeguards(self):
        for required in (
            "any executable analyzer must also satisfy the same current authorization, effect/resource containment, isolated-copy/no-write, environment identity, and invocation-bound provenance safeguards",
            "every executable analyzer satisfies the same authorization/effect/resource/isolated-copy safeguards as other executable review evidence",
        ):
            self.assertIn(required, self.text)

    def test_reviewed_input_digests_are_algorithm_qualified(self):
        for required in (
            "algorithm-qualified full cryptographic digest over explicitly identified bytes",
            "bare, truncated, algorithm-ambiguous, or unspecified-bytes digests are insufficient",
            "owner-defined algorithm-qualified full cryptographic artifact digest over explicitly identified artifact bytes",
            "recorded algorithm-qualified full cryptographic digest/equivalent exact identity",
        ):
            self.assertIn(required, self.text)

    def test_every_evidence_bearing_owner_command_requires_authorization(self):
        for required in (
            "before any evidence-bearing execution, including an exercised case, owner test/command, or executable static analyzer",
            "every exercised case and every evidence-bearing owner-test/command entry must bind an authorization identity/scope",
            "owner test proven not to load or execute the target may run only after verifying current invocation-scoped authorization",
            "owner tests / commands actually executed, each with exact test/command identity plus exact invocation",
            "every evidence-bearing owner command is mapped to current invocation-scoped authorization",
        ):
            self.assertIn(required, self.text)

    def test_remote_validation_preserves_reviewed_to_tested_relation(self):
        for required in (
            "record the exact reviewed-to-tested identity relation and the current owner-contract provenance",
            "missing relation provenance keeps the remote evidence `UNKNOWN`",
            "exact reviewed-to-tested identity relation plus owner-contract provenance when the tested identity differs",
            "any reviewed-to-tested identity mismatch records its exact owner-approved relation and contract provenance",
        ):
            self.assertIn(required, self.text)

    def test_static_proof_can_close_applicable_dimensions(self):
        for required in (
            "every declared applicable dimension is closed by sufficient exercised evidence or qualifying owner-permitted static proof",
            "lack sufficient exercised evidence or qualifying owner-permitted static proof",
            "exact exercised evidence/result or qualifying owner-permitted static proof that covers that dimension",
            "every APPLICABLE dimension is mapped to sufficient exercised evidence/result or qualifying owner-permitted static proof",
        ):
            self.assertIn(required, self.text)

    def test_executed_positive_controls_bind_accepted_input_class(self):
        for required in (
            "Classify each exercised positive control explicitly as `EXECUTED_POSITIVE_CONTROL`",
            "bind it to its accepted-input class",
            "executed positive controls, each classified as EXECUTED_POSITIVE_CONTROL",
            "every exercised positive control is classified as `EXECUTED_POSITIVE_CONTROL` and mapped to its accepted-input class",
        ):
            self.assertIn(required, self.text)

    def test_resource_containment_termination_is_not_validator_result(self):
        for required in (
            "record whether any configured resource limit or containment mechanism fired",
            "specific limit, termination signal/exit/wrapper reason, and output truncation/kill telemetry",
            "A containment-terminated observation is not the validator's owner-defined result",
            "keep it unresolved unless the owner contract explicitly defines that containment termination as the expected outcome",
            "per-invocation resource-limit hit/termination telemetry",
        ):
            self.assertIn(required, self.text)

    def test_proven_gap_binds_contract_clause_and_immutable_evidence(self):
        for required in (
            "bind that finding to the exact violated owner-contract clause/basis plus the immutable observation, case, and result evidence identities",
            "PROVEN_GAP findings, if any, each binding the exact violated owner-contract clause/basis",
            "every `PROVEN_GAP` binds the exact violated owner-contract clause/basis to immutable proving evidence identities",
        ):
            self.assertIn(required, self.text)

    def test_non_target_owner_commands_preserve_boundary_and_isolation_identity(self):
        for required in (
            "the effect/resource-boundary identity used for that command",
            "the isolated copy/workspace identity or proven no-write configuration used for that command",
            "command effect/resource-boundary identity, isolated-copy/no-write identity",
            "the command's required effect/resource-boundary plus isolated-copy/no-write provenance",
        ):
            self.assertIn(required, self.text)

    def test_remote_step_outcome_is_distinct_from_enclosing_job_conclusion(self):
        for required in (
            "the identified relevant check/step's raw outcome/conclusion and bounded result",
            "the enclosing run/job conclusion separately",
            "never substitute the enclosing run/job conclusion",
            "raw outcome/conclusion and bounded result separately from the enclosing run/job conclusion",
        ):
            self.assertIn(required, self.text)

    def test_time_bounded_authorization_is_bound_to_execution_time(self):
        for required in (
            "when authorization has an expiry, validity window, generation, lease epoch, or another time-bounded currentness constraint",
            "trustworthy execution timestamp or another immutable temporal/currentness relation",
            "Recording the expiry alone is insufficient",
            "proving the invocation occurred while that authorization was current",
            "every time-bounded authorization is paired with a trustworthy execution timestamp",
        ):
            self.assertIn(required, self.text)

    def test_containment_termination_telemetry_covers_commands_and_analyzers(self):
        for required in (
            "for every evidence-bearing executed invocation, record whether any configured resource limit or containment mechanism fired",
            "per-invocation resource-limit/containment hit and termination telemetry",
            "executable evidence-bearing static analysis, if any",
            "a containment-terminated analyzer observation remains unresolved",
            "per-invocation resource-limit/containment hit and termination telemetry, every executable analyzer satisfies",
        ):
            self.assertIn(required, self.text)

    def test_non_executable_static_proof_has_its_own_provenance_shape(self):
        for required in (
            "non-executable static proof, if any",
            "exact owner permission/contract basis allowing static closure",
            "exact covered claim/dimension",
            "exact reviewed input identities",
            "proof method",
            "immutable proof artifact or observation identity",
            "do not fabricate analyzer identity, invocation, execution marker, runtime, or analyzer-output bytes",
            "every qualifying non-executable static proof binds owner permission",
        ):
            self.assertIn(required, self.text)

    def test_owner_command_receipt_binds_full_invocation(self):
        for required in (
            "for every evidence-bearing owner test/command, bind the exact invocation",
            "entrypoint/subcommand, ordered argv/arguments/flags",
            "stdin/file/response-file or other input-channel mapping",
            "material per-invocation configuration/settings",
            "A command or test name alone is insufficient",
            "exact test/command identity plus exact invocation",
            "binds its exact ordered invocation and input/configuration mapping",
        ):
            self.assertIn(required, self.text)

    def test_remote_validation_binds_validation_implementation_identity(self):
        for required in (
            "immutable identities for the relevant workflow definition and material scripts/actions/toolchain",
            "explicit owner provenance proving the immutable run identity already binds those exact validation-implementation inputs",
            "every external validation result proves the exact relevant check/step actually ran",
            "binds immutable identities for the relevant workflow definition and material scripts/actions/toolchain",
        ):
            self.assertIn(required, self.text)

    def test_git_replacement_objects_fail_closed_without_neutral_proof(self):
        for required in (
            "use a replacement-neutral immutable snapshot/object-read path for every Git object read",
            "If replacement-neutral reads are unavailable, preserve `UNKNOWN`",
            "actual substituted object bytes, object type/mode, and replacement provenance",
            "never attribute substituted bytes to the unreplaced object ID",
            "If replacement-neutral revalidation cannot be proven, preserve `UNKNOWN`",
            "every Git object read contributing identity/evidence is replacement-neutral",
        ):
            self.assertIn(required, self.text)

    def test_no_runtime_helper_is_required(self):
        self.assertFalse((SKILL_ROOT / "scripts").exists())


if __name__ == "__main__":
    unittest.main()
