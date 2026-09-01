from __future__ import annotations

import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
REPO_ROOT = HERE.parents[3]
LIVE = REPO_ROOT / ".github/workflows/agent-skill-live-eval.yml"
CI = REPO_ROOT / ".github/workflows/agent-skills-ci.yml"


class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.live = LIVE.read_text(encoding="utf-8")
        cls.ci = CI.read_text(encoding="utf-8")

    def test_live_workflow_is_dispatch_only(self):
        self.assertIn("workflow_dispatch:", self.live)
        for forbidden in ("pull_request:", "push:", "schedule:", "issue_comment:", "workflow_run:"):
            self.assertNotIn(forbidden, self.live)

    def test_least_privilege_permissions_are_explicit(self):
        self.assertIn("contents: read", self.live)
        self.assertIn("copilot-requests: write", self.live)
        for forbidden in ("contents: write", "issues: write", "pull-requests: write", "actions: write"):
            self.assertNotIn(forbidden, self.live)

    def test_credit_ack_gate_precedes_install_and_invocation(self):
        ack = "I_UNDERSTAND_COPILOT_AI_CREDITS_MAY_BE_USED"
        self.assertIn(ack, self.live)
        gate = self.live.index("Credit acknowledgement gate")
        install = self.live.index("Install pinned Copilot CLI package")
        invoke = self.live.index("Run paired Copilot eval")
        self.assertLess(gate, install)
        self.assertLess(gate, invoke)

    def test_no_pat_or_repository_secret_dependency(self):
        for forbidden in ("secrets.", "PERSONAL_ACCESS_TOKEN", "COPILOT_GITHUB_TOKEN"):
            self.assertNotIn(forbidden, self.live)
        self.assertIn("GITHUB_TOKEN: ${{ github.token }}", self.live)

    def test_copilot_auto_update_is_disabled_and_runtime_is_recorded(self):
        self.assertIn("COPILOT_AUTO_UPDATE: 'false'", self.live)
        self.assertIn("--no-auto-update", self.live)
        self.assertIn("copilot --version", self.live)

    def test_model_tools_are_read_only_and_bounded(self):
        self.assertIn("--available-tools='view,glob,grep,skill'", self.live)
        for forbidden in (
            "--yolo",
            "--allow-all",
            "--allow-tool=write",
            "--allow-tool='write",
            "--allow-tool=shell",
            "--allow-tool='shell",
            "web_fetch",
            "task,",
        ):
            self.assertNotIn(forbidden, self.live)
        self.assertIn("--allow-tool=read", self.live)
        self.assertIn("--disable-builtin-mcps", self.live)

    def test_workspace_mcp_hooks_extensions_and_remote_are_disabled(self):
        self.assertIn("GITHUB_COPILOT_PROMPT_MODE_EXTENSIONS: 'false'", self.live)
        self.assertIn("GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS: 'false'", self.live)
        self.assertIn("GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP: 'false'", self.live)
        self.assertIn("--no-remote", self.live)
        self.assertIn("--no-remote-export", self.live)

    def test_live_workflow_has_explicit_skill_and_model_allowlists(self):
        self.assertIn("plugin-authority-scan", self.live)
        self.assertIn("plugin-impact-scope", self.live)
        self.assertIn("claude-haiku-4.5", self.live)
        self.assertIn("claude-sonnet-4.6", self.live)
        self.assertIn("gpt-5.4", self.live)

    def test_ordinary_agent_skills_ci_only_tests_harness(self):
        self.assertIn("tools/agent-skill-eval/**", self.ci)
        self.assertIn(".github/workflows/agent-skill-live-eval.yml", self.ci)
        self.assertIn("python -m unittest discover -s tools/agent-skill-eval/tests", self.ci)
        self.assertNotIn("copilot -p", self.ci)
        self.assertNotIn("copilot-requests: write", self.ci)


if __name__ == "__main__":
    unittest.main()
