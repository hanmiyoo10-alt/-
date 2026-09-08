from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
SKILL = SKILL_ROOT / "SKILL.md"
EVALS = SKILL_ROOT / "evals" / "evals.json"
COMMON_RULES = REPO_ROOT / "docs" / "REPOSITORY_COMMON_RULES.md"
PROJECT_GUIDELINES = (
    REPO_ROOT / "docs" / "USAGE_DASHBOARD_GUIDELINES.md",
    REPO_ROOT / "docs" / "SIMCORE_GUIDELINES.md",
    REPO_ROOT / "docs" / "DEVPASS_GUIDELINES.md",
    REPO_ROOT / "docs" / "TERMUX_DEVELOPMENT_GUIDELINES.md",
    REPO_ROOT / "docs" / "VOYAGE_TOKEN_CHECK_GUIDELINES.md",
    REPO_ROOT / "docs" / "POCKETRISU_HELPER_MOD_GUIDELINES.md",
)
GUIDELINE_TEMPLATE = REPO_ROOT / ".github" / "plugin-control-plane" / "canonical-main" / "guidelines-template.md"


class SkillContractTests(unittest.TestCase):
    def test_frontmatter_name_matches_directory_and_description_is_bounded(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertTrue(text.startswith("---\n"))
        frontmatter = text.split("---\n", 2)[1]
        name_match = re.search(r"^name:\s*(\S+)\s*$", frontmatter, re.MULTILINE)
        self.assertIsNotNone(name_match)
        self.assertEqual(name_match.group(1), SKILL_ROOT.name)

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

    def test_routing_contract_has_exact_five_execution_routes(self):
        text = SKILL.read_text(encoding="utf-8")
        for route in ("EXISTING_COMMAND", "HARNESS", "INLINE_SMALL", "MATERIALIZE", "EXCEPTION"):
            self.assertIn(f"`{route}`", text)
        self.assertIn("Visible fan-out is a companion metric. It does not add a sixth execution route.", text)
        self.assertIn("### `REJECT`", text)
        self.assertIn("### `SPLIT`", text)

    def test_split_precedes_route_selection_and_blocks_cross_case_override(self):
        text = SKILL.read_text(encoding="utf-8")
        gate_index = text.index("## Pre-routing disposition gate")
        routing_index = text.index("## Routing order")
        self.assertLess(gate_index, routing_index)
        for required in (
            "If one request bundles two or more independent semantic goals, emit `Disposition: SPLIT`.",
            "After `SPLIT`, stop route selection for the combined request.",
            "They must not override a prior `SPLIT` or `REJECT` disposition.",
            "Route each resulting bounded work unit independently after the split.",
        ):
            self.assertIn(required, text)

    def test_task_observable_disposition_precedes_repository_unknown(self):
        text = SKILL.read_text(encoding="utf-8")
        gate = text[text.index("## Pre-routing disposition gate"):text.index("## Visible fan-out companion contract")]
        priority_index = gate.index("Classify request-observable structure before repository-source grounding:")
        split_rule_index = gate.index("If the USER TASK explicitly bundles two or more clearly independent semantic goals")
        self.assertLess(priority_index, split_rule_index)
        for required in (
            "Facts explicitly stated by the USER TASK about the requested execution shape are input facts, not mutable repository facts.",
            "even when repository SOURCE EVIDENCE is empty.",
            "Do not replace a determinate request-observable `REJECT` or `SPLIT` with generic `UNKNOWN`",
            "Preserve `UNKNOWN` when the disposition actually depends on missing mutable repository facts or when independence is ambiguous rather than explicit.",
        ):
            self.assertIn(required, gate)

    def test_output_contract_makes_terminal_disposition_last(self):
        text = SKILL.read_text(encoding="utf-8")
        output_index = text.index("## Output shape")
        completion_index = text.index("## Completion criterion")
        self.assertGreater(output_index, completion_index)

        output = text[output_index:]
        route_index = output.index("### Execution-route branch")
        disposition_index = output.index("### Disposition branch")
        self.assertLess(route_index, disposition_index)
        for required in (
            "Select exactly one output branch after classification. The branches are mutually exclusive.",
            "The disposition branch is terminal, not a preface to execution-route selection.",
            "Emit exactly these two semantic lines and nothing else for the combined request:",
            "Disposition: REJECT | SPLIT",
            "After the `Reason:` line, stop generating the answer for the combined request.",
            "Do not add a third line, additional routing prose, sub-route list, or per-goal route selection.",
            "Do not emit `Execution route:`, `Command surface:`, `Validation preserved:`, `Visible fan-out:`, or `Evidence preserved:` after a disposition.",
            "`REJECT` and `SPLIT` are dispositions only. They are never valid values of `Execution route:`.",
            "Use this branch only when neither `REJECT` nor `SPLIT` applies.",
            "The execution-route value must be exactly one of the five registered routes below:",
            "Never emit both `Disposition:` and `Execution route:` for the same unsplit request.",
        ):
            self.assertIn(required, output)
        self.assertIn(
            "Execution route: EXISTING_COMMAND | HARNESS | INLINE_SMALL | MATERIALIZE | EXCEPTION",
            output[route_index:disposition_index],
        )

    def test_disposition_template_is_exactly_two_lines_and_file_terminal(self):
        text = SKILL.read_text(encoding="utf-8")
        disposition = text[text.index("### Disposition branch"):]
        template = disposition.split("```text\n", 1)[1].split("\n```", 1)[0].splitlines()
        self.assertEqual(template, ["Disposition: REJECT | SPLIT", "Reason: <one sentence>"])
        self.assertIn("stop generating the answer", disposition)
        self.assertIn("Do not add a third line", disposition)
        self.assertNotIn("### Execution-route branch", disposition)
        self.assertTrue(
            text.rstrip().endswith(
                "After the `Reason:` line, stop generating the answer for the combined request. "
                "Do not add a third line, additional routing prose, sub-route list, or per-goal route selection."
            )
        )

    def test_execution_route_domain_excludes_dispositions(self):
        text = SKILL.read_text(encoding="utf-8")
        output = text[text.index("## Output shape"):]
        route = re.search(r"^Execution route: ([A-Z_ |]+)$", output, re.MULTILINE)
        self.assertIsNotNone(route)
        values = {value.strip() for value in route.group(1).split("|")}
        self.assertEqual(values, {"EXISTING_COMMAND", "HARNESS", "INLINE_SMALL", "MATERIALIZE", "EXCEPTION"})
        self.assertTrue(values.isdisjoint({"REJECT", "SPLIT"}))

    def test_guardrails_are_present_and_advisory(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "approximately 20 logical execution/program lines or fewer",
            "approximately 2 KiB of source/program text or less",
            "at most one generated source/test/program file",
            "The v1 numbers are routing defaults, not security boundaries",
            "Crossing a compactness guardrail means choose a better surface. It never means skip validation.",
        ):
            self.assertIn(required, text)

    def test_multi_heredoc_and_mini_build_system_route_to_materialize(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("three modules is still `MATERIALIZE`", text)
        self.assertIn("Default anti-pattern:", text)
        self.assertIn("→ heredoc file A", text)
        self.assertIn("→ heredoc file B", text)
        self.assertIn("→ heredoc file C", text)
        self.assertIn("mini build system", text)

    def test_safety_and_validation_outrank_compactness(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "Correctness, safety, authority, evidence fidelity, and required validation outrank compactness.",
            "Never shorten an execution payload by deleting meaningful tests",
            "Never place secrets, credentials, tokens",
            "Do not bypass Git, CI, main-write, release, security, production",
            "Do not claim this repository can hide or suppress ChatGPT tool-activity UI.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_prefers_evidence_equivalent_composition(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "repository_owned_visible_fanout",
            "A **semantic work unit** is one bounded goal",
            "prefer the lower-fan-out surface",
            "one existing composition/harness call",
            "Internal bounded reads behind an existing composition remain auditable.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_preserves_required_separation(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "required pre-write and post-write currentness or authority barriers",
            "settling or failure verification that requires a later fresh read",
            "targeted drill-down after a bounded summary proves insufficient",
            "consolidation would hide `UNKNOWN`, `CONFLICT`, failure provenance, or source identity",
            "Visible fan-out has no universal numeric ceiling",
            "Required semantic separation outranks a lower activity count.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_does_not_claim_host_ui_control(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("repository-side proxy", text)
        self.assertIn("not a claim about exact ChatGPT host-card rendering", text)
        self.assertIn("no claim is made that repository-side fan-out equals exact host UI card count", text)

    def test_read_payload_companion_contract_is_distinct_and_bounded(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "## Read/result payload companion contract",
            "Read/result payload height is a companion compactness axis distinct from execution-program size and call fan-out.",
            "repository_owned_visible_read_payload",
            "locate narrowly",
            "read the smallest authoritative excerpt/projection that can answer the question",
            "expand only when completeness actually requires it",
        ):
            self.assertIn(required, text)
        self.assertIn("It does not add a sixth execution route.", text)

    def test_read_payload_selection_prefers_discovery_range_projection_and_reuse(self):
        text = SKILL.read_text(encoding="utf-8")
        section = text[
            text.index("## Read/result payload companion contract"):
            text.index("## Connector-response selection companion contract")
        ]
        for required in (
            "Unknown location:",
            "repository search, index, symbol lookup, or bounded snippet discovery",
            "Known file + local question:",
            "bounded line/range read or equivalent targeted excerpt",
            "Existing bounded projection:",
            "established CI/status/summary projections for first-pass questions",
            "Reuse captured evidence:",
            "do not re-fetch or re-echo a full source",
        ):
            self.assertIn(required, section)

    def test_read_payload_preserves_full_read_exceptions_and_required_context(self):
        text = SKILL.read_text(encoding="utf-8")
        section = text[
            text.index("## Read/result payload companion contract"):
            text.index("## Connector-response selection companion contract")
        ]
        for required in (
            "whole-file/full-body reads remain valid",
            "global completeness",
            "document structure",
            "ordering",
            "cross-section consistency",
            "authoritative source locator or owning identity",
            "required currentness/freshness barrier",
            "`UNKNOWN`, `CONFLICT`, partial, or failure state",
            "security, permission, or trust context",
        ):
            self.assertIn(required, section)
        self.assertIn(
            "cannot guarantee how ChatGPT or another host renders tool cards or their height",
            section,
        )

    def test_read_payload_eval_fixtures_cover_compact_and_completeness_paths(self):
        payload = json.loads(EVALS.read_text(encoding="utf-8"))
        cases = {case["id"]: case for case in payload["read_payload_evals"]}
        self.assertEqual(
            set(cases),
            {
                "known-large-source-local-question",
                "unknown-location-discovery-first",
                "bounded-status-projection-first",
                "whole-document-completeness",
            },
        )
        self.assertEqual(
            cases["known-large-source-local-question"]["expected_selection"],
            "TARGETED_RANGE",
        )
        self.assertEqual(
            cases["unknown-location-discovery-first"]["expected_selection"],
            "SEARCH_SNIPPET",
        )
        self.assertEqual(
            cases["bounded-status-projection-first"]["expected_selection"],
            "BOUNDED_PROJECTION",
        )
        self.assertEqual(
            cases["whole-document-completeness"]["expected_selection"],
            "FULL_SOURCE_ALLOWED",
        )
        self.assertTrue(
            cases["whole-document-completeness"]["facts"]["completeness_required"]
        )
        self.assertFalse(
            cases["known-large-source-local-question"]["facts"]["completeness_required"]
        )

    def test_connector_response_companion_contract_is_distinct_and_bounded(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "## Connector-response selection companion contract",
            "Connector-response selection is a companion compactness axis distinct from execution-program size, call fan-out, and source-range/read selection.",
            "repository_owned_connector_response_surface",
            "narrowest evidence-equivalent result surface before a potentially large connector response is materialized",
            "It does not add a sixth execution route.",
        ):
            self.assertIn(required, text)

    def test_connector_response_selection_prefers_action_filter_target_and_reuse(self):
        text = SKILL.read_text(encoding="utf-8")
        section = text[
            text.index("## Connector-response selection companion contract"):
            text.index("## Routing order")
        ]
        for required in (
            "Existing bounded repository projection/harness:",
            "Action-specific connector tool:",
            "Filtered/query-scoped endpoint:",
            "Targeted source read:",
            "Broad fetch fallback:",
            "Reuse captured evidence:",
            "exact SHA/ref, check/job name, status context, file path, issue/PR number",
            "do not repeat the same broad response inside one unchanged currentness window",
        ):
            self.assertIn(required, section)

    def test_connector_response_preserves_broad_fetch_authority_exceptions(self):
        text = SKILL.read_text(encoding="utf-8")
        section = text[
            text.index("## Connector-response selection companion contract"):
            text.index("## Routing order")
        ]
        for required in (
            "broad generic fetch/full JSON remains valid when completeness is part of the question",
            "no available narrower connector surface preserves the required authority/evidence",
            "exact repository/ref/SHA or owning source identity required by the claim",
            "a required currentness/freshness barrier or post-mutation verification",
            "`UNKNOWN`, `CONFLICT`, partial, cancelled, skipped, or failure state",
            "security, permission, branch-protection, or trust context",
            "Direct canonical authority reads that lack an evidence-equivalent compact connector surface remain allowed.",
            "does not modify the ChatGPT/GitHub connector response schema",
        ):
            self.assertIn(required, section)

    def test_connector_response_eval_fixtures_cover_selection_taxonomy(self):
        payload = json.loads(EVALS.read_text(encoding="utf-8"))
        cases = {case["id"]: case for case in payload["connector_response_evals"]}
        self.assertEqual(
            set(cases),
            {
                "action-specific-pr-metadata",
                "filtered-exact-check-run",
                "connector-to-targeted-source-read",
                "reuse-captured-authority-evidence",
                "direct-authority-no-compact-equivalent",
            },
        )
        expected = {
            "action-specific-pr-metadata": "ACTION_SPECIFIC",
            "filtered-exact-check-run": "FILTERED_ENDPOINT",
            "connector-to-targeted-source-read": "TARGETED_READ",
            "reuse-captured-authority-evidence": "REUSE_CAPTURED",
            "direct-authority-no-compact-equivalent": "BROAD_FETCH_ALLOWED",
        }
        self.assertEqual(
            {case_id: cases[case_id]["expected_selection"] for case_id in cases},
            expected,
        )
        self.assertTrue(
            cases["reuse-captured-authority-evidence"]["facts"]["captured_evidence_sufficient"]
        )
        self.assertFalse(
            cases["reuse-captured-authority-evidence"]["facts"]["currentness_barrier_changed"]
        )
        self.assertFalse(
            cases["direct-authority-no-compact-equivalent"]["facts"]["compact_equivalent_available"]
        )
        self.assertTrue(
            cases["direct-authority-no-compact-equivalent"]["facts"]["currentness_barrier_changed"]
        )

    def test_repository_wide_scope_and_project_inheritance_are_explicit(self):
        skill_text = SKILL.read_text(encoding="utf-8")
        common_text = COMMON_RULES.read_text(encoding="utf-8")
        for required in (
            "applies across repository/project scopes",
            "Canonical-main packet wiring is one enforcement adapter",
            "Project-specific contracts may specialize this repository `DEFAULT`",
        ):
            self.assertIn(required, skill_text)
        for required in (
            "For automated repository/project work across this repository",
            "four companion compactness axes",
            "Canonical-main packet wiring may make this default explicit at packet boundaries",
        ):
            self.assertIn(required, common_text)

        for guideline in (*PROJECT_GUIDELINES, GUIDELINE_TEMPLATE):
            text = guideline.read_text(encoding="utf-8")
            self.assertIn("## Repository common-rules inheritance", text, guideline.as_posix())
            self.assertIn("docs/REPOSITORY_COMMON_RULES.md", text, guideline.as_posix())

    def test_skill_creates_no_execution_authority(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("development policy, not a source of mutable product, runtime, release, or production truth", text)
        self.assertIn("Do not invent a new writer, executor, privileged hook", text)
        self.assertIn("This routing note is advisory development policy. It does not become source authority.", text)


if __name__ == "__main__":
    unittest.main()