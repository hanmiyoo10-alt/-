from __future__ import annotations

import inspect
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks import run_scout_cell_timeout_recovery as recovery
from runtime.local_server import post_chat_completion


WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4c-scout-timeout-recovery.yml"
CI_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml"


class O4CScoutTimeoutRecoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_recovery_adapter_is_ministral_only_and_uses_1800_second_timeout(self) -> None:
        self.assertEqual(recovery.RECOVERY_PROFILE_ID, "ministral-3-3b-instruct-2512-q4_k_m")
        self.assertEqual(recovery.RECOVERY_ATTEMPT_NUMBER, 2)
        self.assertEqual(recovery.REQUEST_TIMEOUT_SECONDS, 1800.0)

        with (
            patch.object(recovery, "load_case_and_evidence", return_value=({}, {})),
            patch.object(recovery, "benchmark_model_profile", return_value={"profile_id": recovery.RECOVERY_PROFILE_ID}),
            patch.object(recovery, "build_scout_prompt", return_value="frozen prompt"),
            patch.object(recovery, "scout_generation", return_value={"generation": "frozen"}),
            patch.object(recovery, "scout_response_schema", return_value={"schema": "frozen"}),
            patch.object(recovery, "post_chat_completion", return_value=("{}", "stop", {})) as post,
            patch.object(recovery, "build_result", return_value=({"execution_status": "INVALID"}, None, {})),
            patch.object(recovery, "score_role_output", return_value={"score_sha256": "0" * 64}),
        ):
            result, score, prompt, content, envelope, artifact, receipt = recovery.execute_recovery_cell(
                port=39139,
                runtime_version="runtime",
                runtime_binary_sha256="1" * 64,
            )

        post.assert_called_once_with(
            39139,
            "frozen prompt",
            {"generation": "frozen"},
            {"schema": "frozen"},
            timeout_seconds=1800.0,
        )
        self.assertEqual(result["execution_status"], "INVALID")
        self.assertEqual(score["score_sha256"], "0" * 64)
        self.assertEqual(prompt, "frozen prompt")
        self.assertEqual(content, "{}")
        self.assertEqual(envelope, {})
        self.assertIsNone(artifact)
        self.assertEqual(receipt, {})

    def test_production_local_server_default_timeout_remains_600_seconds(self) -> None:
        timeout_default = inspect.signature(post_chat_completion).parameters["timeout_seconds"].default
        self.assertEqual(timeout_default, 600.0)

    def test_workflow_is_manual_one_shot_secret_free_and_binds_timeout_evidence(self) -> None:
        self.assertIn("workflow_dispatch:", self.workflow)
        self.assertNotIn("pull_request:", self.workflow)
        self.assertNotIn("\n  push:", self.workflow)
        self.assertIn("permissions:\n  actions: read\n  contents: read", self.workflow)
        self.assertIn("EXPECTED_WORKFLOW_RUN_NUMBER: '1'", self.workflow)
        self.assertIn("test \"$GITHUB_RUN_NUMBER\" = \"$EXPECTED_WORKFLOW_RUN_NUMBER\"", self.workflow)
        self.assertIn("test \"$GITHUB_RUN_ATTEMPT\" = '1'", self.workflow)
        self.assertIn("SOURCE_TIMEOUT_RUN_ID: '33646050315'", self.workflow)
        self.assertIn("SOURCE_TIMEOUT_ARTIFACT_ID: '9853588539'", self.workflow)
        self.assertIn(
            "SOURCE_TIMEOUT_ZIP_SHA256: 39a2c1a867bc0a0381856c49b77c5289fae728ca52032d31b33f6d31576495d4",
            self.workflow,
        )
        self.assertIn(
            "SOURCE_TIMEOUT_RUNNER_ERROR_SHA256: 9e849307f362d00916876a7e2deafada87b668adabad2523c18de070bb2b309e",
            self.workflow,
        )
        self.assertIn(
            "SOURCE_TIMEOUT_SERVER_LOG_SHA256: f5d356e28d640bec2b71984d299bb354789a5c67f019be1111d7b88bec6efb54",
            self.workflow,
        )
        self.assertIn("REQUEST_TIMEOUT_SECONDS: '1800'", self.workflow)
        self.assertIn("history/ministral-attempt-1", self.workflow)
        self.assertNotIn("secrets.", self.workflow)
        self.assertNotIn("api.openai.com", self.workflow)
        self.assertNotIn("copilot", self.workflow.lower())
        self.assertIn("HF_TOKEN HUGGING_FACE_HUB_TOKEN HUGGINGFACEHUB_API_TOKEN", self.workflow)

    def test_workflow_never_executes_qwen_and_preserves_cumulative_attempt_accounting(self) -> None:
        self.assertIn("O4C_QWEN_RECOVERY_REEXECUTION_COUNT:0", self.workflow)
        self.assertIn("O4C_MINISTRAL_ATTEMPT_1_LOCAL_MODEL_REQUEST_COUNT:1", self.workflow)
        self.assertIn("O4C_TIMEOUT_RECOVERY_MINISTRAL_ATTEMPT_2_LOCAL_MODEL_REQUEST_COUNT:1", self.workflow)
        self.assertIn("O4C_TIMEOUT_RECOVERY_MINISTRAL_CUMULATIVE_ATTEMPT_COUNT:2", self.workflow)
        self.assertIn("O4C_TIMEOUT_RECOVERY_CUMULATIVE_LOCAL_MODEL_REQUEST_COUNT:3", self.workflow)
        self.assertIn("O4C_TIMEOUT_RECOVERY_CUMULATIVE_HOSTED_AI_CALL_COUNT:0", self.workflow)
        self.assertIn("run_scout_cell_timeout_recovery.py", self.workflow)
        self.assertNotIn("from benchmarks.run_scout_cell import main as run_cell", self.workflow)

    def test_workflow_proves_frozen_core_equivalence_and_uses_existing_aggregator(self) -> None:
        for path in (
            "tools/agent-skill-orchestrator/benchmarks/run_scout_cell.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4c_scout_matrix.py",
            "tools/agent-skill-orchestrator/benchmarks/score_role_output.py",
            "tools/agent-skill-orchestrator/roles/scout.py",
            "tools/agent-skill-orchestrator/runtime/generation.py",
            "tools/agent-skill-orchestrator/runtime/local_server.py",
            "tools/agent-skill-orchestrator/runtime/llama_cpp.py",
        ):
            self.assertIn(path, self.workflow)
        self.assertIn(
            "python tools/agent-skill-orchestrator/benchmarks/run_o4c_scout_matrix.py aggregate",
            self.workflow,
        )
        self.assertIn("benchmark_row_local_model_call_count", self.workflow)
        self.assertIn("cumulative_local_model_request_count", self.workflow)
        self.assertIn("recovery_summary_sha256", self.workflow)
        self.assertIn("forbidden = {'winner', 'recommended_model', 'assignment', 'rank', 'ranking', 'tie_break'}", self.workflow)

    def test_agent_skills_ci_mechanically_covers_timeout_recovery_without_executing_it(self) -> None:
        ci = CI_PATH.read_text(encoding="utf-8")
        workflow_path = ".github/workflows/agent-skill-orchestrator-o4c-scout-timeout-recovery.yml"
        self.assertEqual(ci.count(workflow_path), 2)
        self.assertNotIn("workflow_call", self.workflow)


if __name__ == "__main__":
    unittest.main()
