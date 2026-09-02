import json
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from evidence import build_evidence_package
from router import route_task
from runtime.resolve_sequential_pilot_request import (
    FROZEN_EVIDENCE_REPOSITORY_SHA,
    FROZEN_RELEASE_REPOSITORY_SHA,
    MODE,
    SequentialPilotRequestError,
    load_request,
)
from runtime.run_sequential_pilot import (
    DIRECT_DEPENDENCIES,
    EXPECTED_ROLE_STAGES,
    ROLE_ORDER,
    build_run_summary,
    blocked_dependency_summary,
    dependencies_completed,
    run_sequential_calls,
    validate_execution_plan,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-sequential-pilot.yml"
SCOUT_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-scout-pilot.yml"
AGENT_CI = REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml"
TARGET = "a" * 40
RELEASE = "b" * 40
RUNTIME_VERSION = "llama.cpp o2d synthetic runtime"


class O2DSequentialPilotTests(unittest.TestCase):
    def evidence(self):
        plan = route_task(
            {
                "schema_version": 1,
                "task_id": "o2d-sequential-synthetic",
                "scope": "plugin:usage-dashboard",
                "task_kind": "impact_analysis",
                "intent": "Exercise O2-D sequential scheduler without a model server.",
                "mutation_requested": False,
                "device_truth_requested": False,
            }
        )
        snapshot = resolve_authority(
            "plugin:usage-dashboard",
            TARGET,
            [
                {"kind": "release_branch", "value": "release-usage-dashboard", "status": "OBSERVED", "source_sha": RELEASE},
                {"kind": "manifest", "value": "plugins/usage-dashboard/runtime/product-manifest.json", "status": "OBSERVED", "source_sha": TARGET},
                {"kind": "artifact", "value": "plugins/usage-dashboard/latest.js", "status": "OBSERVED", "source_sha": TARGET},
                {"kind": "release_spec_dir", "value": ".github/usage-dashboard/releases", "status": "OBSERVED", "source_sha": TARGET},
            ],
        )
        package = build_evidence_package(
            plan,
            snapshot,
            [
                {"path": "plugins/usage-dashboard/src/runtime.js", "source_sha": TARGET, "start_line": 10, "content": "export const runtime = true;"},
                {"path": "plugins/usage-dashboard/runtime/product-manifest.json", "source_sha": TARGET, "start_line": 1, "content": '{"name":"usage-dashboard"}'},
            ],
        )
        return plan, package

    def test_request_contract_separates_harness_and_frozen_evidence(self):
        valid = {
            "schema_version": 1,
            "mode": MODE,
            "harness_repository_sha": "c" * 40,
            "evidence_repository_sha": FROZEN_EVIDENCE_REPOSITORY_SHA,
            "release_repository_sha": FROZEN_RELEASE_REPOSITORY_SHA,
        }
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "request.json"
            path.write_text(json.dumps(valid), encoding="utf-8")
            self.assertEqual(load_request(path), valid)
            for key in ("harness_repository_sha", "evidence_repository_sha", "release_repository_sha"):
                bad = dict(valid)
                bad[key] = "f" * 40
                path.write_text(json.dumps(bad), encoding="utf-8")
                if key == "harness_repository_sha":
                    self.assertEqual(load_request(path), bad)
                else:
                    with self.assertRaises(SequentialPilotRequestError):
                        load_request(path)
            extra = dict(valid, extra=True)
            path.write_text(json.dumps(extra), encoding="utf-8")
            with self.assertRaises(SequentialPilotRequestError):
                load_request(path)

    def test_router_direct_topology_matches_frozen_o2d_topology(self):
        plan, _ = self.evidence()
        validate_execution_plan(plan)
        self.assertEqual(plan["role_stages"], EXPECTED_ROLE_STAGES)
        self.assertEqual(
            DIRECT_DEPENDENCIES,
            {
                "scout": (),
                "mapper": ("scout",),
                "critic": ("mapper",),
                "synthesizer": ("mapper", "critic"),
            },
        )

    def test_dependency_gate_blocks_downstream_without_calling(self):
        states = {"scout": {"execution_status": "COMPLETED"}}
        self.assertTrue(dependencies_completed("mapper", states))
        states["mapper"] = {"execution_status": "EXECUTION_INCOMPLETE"}
        self.assertFalse(dependencies_completed("critic", states))
        self.assertFalse(dependencies_completed("synthesizer", states))
        blocked = blocked_dependency_summary("critic")
        self.assertEqual(blocked["execution_status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(blocked["model_call_count"], 0)
        self.assertEqual(blocked["hosted_ai_call_count"], 0)
        self.assertEqual(blocked["role_artifact_sha256"], "NONE")

    def _successful_fake_invoke(self):
        responses = {
            "scout": (
                '{\n  "r": ['
                '{"k":"a","v":"manifest","r":["S1@L1"]},'
                '{"k":"s","v":"relevant_source","r":["S2@L10"]}'
                ']\n}',
                "stop",
            ),
            "mapper": (
                '{\n "o":[{"v":"runtime","r":["S2@L10"]}],'
                '\n "e":[{"f":"runtime","t":"dashboard","r":["S1@L1","S2@L10"]}]\n}',
                "stop",
            ),
            "critic": (
                json.dumps(
                    {
                        "b": [{"k": "request_identity", "v": "request identity remains stable", "r": ["S2@L10"]}],
                        "q": [{"i": "claim-mapper-001", "k": "missing_evidence", "v": "consumer proof remains bounded", "r": ["S1@L1"]}],
                        "u": [{"k": "unknown", "v": "release impact unresolved", "r": []}],
                    },
                    indent=1,
                ),
                "stop",
            ),
            "synthesizer": ('{\n "s":[]\n}', "stop"),
        }
        calls = []

        def invoke(port, prompt, schema):
            role = prompt.splitlines()[0].split(":", 1)[1].strip()
            calls.append(role)
            content, finish = responses[role]
            return content, finish, {"synthetic_role": role}

        return invoke, calls, responses

    def test_synthetic_four_role_sequence_is_exact_and_raw_prose_is_not_handed_down(self):
        plan, evidence = self.evidence()
        invoke, calls, responses = self._successful_fake_invoke()
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            summaries, count = run_sequential_calls(
                port=1,
                output_dir=root,
                evidence_package=evidence,
                runtime_version=RUNTIME_VERSION,
                invoke=invoke,
            )
            self.assertEqual(tuple(calls), ROLE_ORDER)
            self.assertEqual(count, 4)
            self.assertTrue(all(summaries[role]["execution_status"] == "COMPLETED" for role in ROLE_ORDER))
            mapper_prompt = (root / "roles/mapper/prompt.txt").read_text(encoding="utf-8")
            critic_prompt = (root / "roles/critic/prompt.txt").read_text(encoding="utf-8")
            synth_prompt = (root / "roles/synthesizer/prompt.txt").read_text(encoding="utf-8")
            self.assertNotIn(responses["scout"][0], mapper_prompt)
            self.assertNotIn(responses["mapper"][0], critic_prompt)
            self.assertNotIn(responses["critic"][0], synth_prompt)
            summary = build_run_summary(
                harness_repository_sha="c" * 40,
                evidence_repository_sha=TARGET,
                release_repository_sha=RELEASE,
                execution_plan=plan,
                evidence_package=evidence,
                role_summaries=summaries,
                model_calls=count,
            )
            self.assertEqual(summary["overall_execution_status"], "COMPLETED")
            self.assertEqual(summary["total_model_call_count"], 4)
            self.assertEqual(summary["total_hosted_ai_call_count"], 0)
            self.assertNotEqual(summary["final_synthesizer_role_artifact_sha256"], "NONE")
            self.assertEqual(summaries["mapper"]["upstream_artifact_sha256"], [summaries["scout"]["role_artifact_sha256"]])
            self.assertEqual(summaries["critic"]["upstream_artifact_sha256"], [summaries["mapper"]["role_artifact_sha256"]])
            self.assertEqual(
                summaries["synthesizer"]["upstream_artifact_sha256"],
                [
                    summaries["scout"]["role_artifact_sha256"],
                    summaries["mapper"]["role_artifact_sha256"],
                    summaries["critic"]["role_artifact_sha256"],
                ],
            )

    def test_mapper_incomplete_stops_critic_and_synthesizer(self):
        _, evidence = self.evidence()
        invoke, calls, responses = self._successful_fake_invoke()

        def incomplete_mapper(port, prompt, schema):
            role = prompt.splitlines()[0].split(":", 1)[1].strip()
            calls.append(role)
            content, finish = responses[role]
            if role == "mapper":
                finish = "length"
            return content, finish, {"synthetic_role": role}

        calls.clear()
        with tempfile.TemporaryDirectory() as td:
            summaries, count = run_sequential_calls(
                port=1,
                output_dir=Path(td),
                evidence_package=evidence,
                runtime_version=RUNTIME_VERSION,
                invoke=incomplete_mapper,
            )
        self.assertEqual(calls, ["scout", "mapper"])
        self.assertEqual(count, 2)
        self.assertEqual(summaries["mapper"]["execution_status"], "EXECUTION_INCOMPLETE")
        self.assertEqual(summaries["critic"]["execution_status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(summaries["synthesizer"]["execution_status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(summaries["critic"]["model_call_count"], 0)
        self.assertEqual(summaries["synthesizer"]["model_call_count"], 0)

    def test_workflow_is_read_only_pinned_and_separates_harness_from_evidence_worktree(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("name: Agent Skill Orchestrator Sequential Pilot", text)
        self.assertIn("agent-skill-orchestrator-sequential-pilot-request/**", text)
        self.assertIn(".agent-skill-orchestrator-sequential-pilot-requests/*.json", text)
        self.assertIn("permissions:\n  contents: read", text)
        self.assertNotIn("workflow_dispatch", text)
        self.assertNotIn("${{ secrets.", text)
        self.assertNotIn("copilot", text.lower())
        self.assertNotIn("openai", text.lower())
        self.assertIn("LLAMA_RELEASE: b10516", text)
        self.assertIn("f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35", text)
        self.assertIn("626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d", text)
        self.assertIn('test "$parent_sha" = "$harness_sha"', text)
        self.assertIn("git worktree add --detach", text)
        self.assertIn('"$EVIDENCE_REPOSITORY_SHA"', text)
        self.assertIn("release-usage-dashboard:refs/remotes/origin/release-usage-dashboard", text)
        self.assertIn("include-hidden-files: true", text)
        self.assertIn("O2D_SEQUENTIAL_GATE:PASS", text)

    def test_existing_scout_workflow_stays_separate_and_agent_ci_only_watches_new_workflow(self):
        scout = SCOUT_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("name: Agent Skill Orchestrator Scout Pilot", scout)
        self.assertIn("SCOUT_PILOT_GATE:PASS", scout)
        ci = AGENT_CI.read_text(encoding="utf-8")
        self.assertIn(".github/workflows/agent-skill-orchestrator-scout-pilot.yml", ci)
        self.assertIn(".github/workflows/agent-skill-orchestrator-sequential-pilot.yml", ci)
        self.assertNotIn("qwen2.5-3b-instruct-q4_k_m.gguf", ci)
        self.assertNotIn("llama-server", ci)
        self.assertNotIn("huggingface.co", ci)


if __name__ == "__main__":
    unittest.main()
