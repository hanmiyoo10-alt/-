import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from runtime.resolve_scout_pilot_request import MODE, PilotRequestError, load_request
from runtime.run_scout_pilot import build_pilot_control_inputs

REPO_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-scout-pilot.yml"
AGENT_CI = REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml"
TARGET = "a" * 40
RELEASE = "b" * 40


class O2AScoutPilotWorkflowTests(unittest.TestCase):
    def test_request_contract_is_exact_and_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "request.json"
            valid = {
                "schema_version": 1,
                "mode": MODE,
                "target_repository_sha": TARGET,
                "release_repository_sha": RELEASE,
            }
            path.write_text(json.dumps(valid), encoding="utf-8")
            self.assertEqual(load_request(path), valid)
            valid["extra"] = True
            path.write_text(json.dumps(valid), encoding="utf-8")
            with self.assertRaises(PilotRequestError):
                load_request(path)

    def test_bounded_control_inputs_are_scout_only_and_two_source_blocks(self):
        with mock.patch(
            "runtime.run_scout_pilot._git",
            side_effect=[TARGET, RELEASE],
        ):
            control = build_pilot_control_inputs(REPO_ROOT, TARGET, RELEASE)
        self.assertEqual(control["execution_plan"]["execution_class"], "fast")
        self.assertEqual(
            control["execution_plan"]["role_stages"],
            [{"stage_id": "scout", "role_id": "scout", "depends_on": []}],
        )
        self.assertEqual(control["authority_snapshot"]["overall_status"], "RESOLVED")
        self.assertEqual(control["authority_snapshot"]["blockers"], [])
        sources = control["evidence_package"]["sources"]
        self.assertEqual(len(sources), 2)
        self.assertEqual(
            {item["path"] for item in sources},
            {
                "docs/USAGE_DASHBOARD_GUIDELINES.md",
                "plugins/usage-dashboard/runtime/product-manifest.json",
            },
        )
        self.assertLessEqual(max(item["end_line"] for item in sources), 12)

    def test_workflow_is_narrow_read_only_zero_hosted_ai_and_checksum_pinned(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("name: Agent Skill Orchestrator Scout Pilot", text)
        self.assertIn("agent-skill-orchestrator-scout-pilot-request/**", text)
        self.assertIn(".agent-skill-orchestrator-scout-pilot-requests/*.json", text)
        self.assertNotIn("workflow_dispatch", text)
        self.assertIn("permissions:\n  contents: read", text)
        self.assertIn("runs-on: ubuntu-24.04", text)
        self.assertNotIn("${{ secrets.", text)
        self.assertNotIn("copilot", text.lower())
        self.assertNotIn("openai", text.lower())
        self.assertIn("af75b7aaf5bb163ce4c5dab4e6b84d844e96265d", text)
        self.assertIn("626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d", text)
        self.assertIn("LLAMA_RELEASE: b10516", text)
        self.assertIn("f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35", text)
        self.assertGreaterEqual(text.count("sha256sum -c"), 2)
        self.assertIn("test \"$parent_sha\" = \"$target_sha\"", text)
        self.assertIn("release-usage-dashboard:refs/remotes/origin/release-usage-dashboard", text)
        self.assertIn("if: always()", text)
        self.assertIn("SCOUT_PILOT_GATE:PASS", text)

    def test_normal_agent_skills_ci_watches_workflow_but_does_not_run_model(self):
        ci = AGENT_CI.read_text(encoding="utf-8")
        self.assertIn(".github/workflows/agent-skill-orchestrator-scout-pilot.yml", ci)
        self.assertNotIn("qwen2.5-3b-instruct-q4_k_m.gguf", ci)
        self.assertNotIn("llama-server", ci)
        self.assertNotIn("huggingface.co", ci)


if __name__ == "__main__":
    unittest.main()
