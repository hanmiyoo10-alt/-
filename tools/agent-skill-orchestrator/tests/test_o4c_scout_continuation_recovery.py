from __future__ import annotations

import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4c-scout-continuation.yml"
CI_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml"


class O4CScoutContinuationRecoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_continuation_is_manual_one_shot_and_secret_free(self) -> None:
        self.assertIn("workflow_dispatch:", self.workflow)
        self.assertNotIn("pull_request:", self.workflow)
        self.assertNotIn("\n  push:", self.workflow)
        self.assertIn("permissions:\n  actions: read\n  contents: read", self.workflow)
        self.assertIn("EXPECTED_WORKFLOW_RUN_NUMBER: '1'", self.workflow)
        self.assertIn('test "$GITHUB_RUN_NUMBER" = "$EXPECTED_WORKFLOW_RUN_NUMBER"', self.workflow)
        self.assertIn('test "$GITHUB_RUN_ATTEMPT" = \'1\'', self.workflow)
        self.assertNotIn("secrets.", self.workflow)
        self.assertNotIn("api.openai.com", self.workflow)
        self.assertNotIn("copilot", self.workflow.lower())
        self.assertIn("HF_TOKEN HUGGING_FACE_HUB_TOKEN HUGGINGFACEHUB_API_TOKEN", self.workflow)

    def test_continuation_binds_exact_original_target_and_source_artifact(self) -> None:
        self.assertIn(
            "TARGET_SHA: 79a034d0fd589d13e536f7d54291773287d7b06e",
            self.workflow,
        )
        self.assertIn("SOURCE_RUN_ID: '33643580938'", self.workflow)
        self.assertIn("SOURCE_ARTIFACT_ID: '9852191711'", self.workflow)
        self.assertIn(
            "SOURCE_ARTIFACT_ZIP_SHA256: ecc57672bd1b092956a7b181cc1f9887231f3ec9a8b346aea659a8e284b0d9e0",
            self.workflow,
        )
        self.assertIn(
            "QWEN_RESULT_SHA256: eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08",
            self.workflow,
        )
        self.assertIn(
            "QWEN_SCORE_SHA256: 7741d4f44ca59079c56590f6aa0e0ff039688862928f998b2f8a6e1efc1966ad",
            self.workflow,
        )
        self.assertIn("actions/artifacts/${SOURCE_ARTIFACT_ID}/zip", self.workflow)
        self.assertIn("SOURCE_ARTIFACT_ZIP_SHA256", self.workflow)
        self.assertIn("score_role_output(case, result) != score", self.workflow)

    def test_continuation_executes_only_missing_ministral_cell(self) -> None:
        self.assertIn(
            "CONTINUATION_PROFILE_ID: ministral-3-3b-instruct-2512-q4_k_m",
            self.workflow,
        )
        self.assertNotIn("for profile_id in", self.workflow)
        self.assertIn('profile_id="$CONTINUATION_PROFILE_ID"', self.workflow)
        self.assertIn("O4C_HISTORICAL_QWEN_LOCAL_MODEL_CALL_COUNT:1", self.workflow)
        self.assertIn("O4C_CONTINUATION_NEW_LOCAL_MODEL_CALL_COUNT:1", self.workflow)
        self.assertIn("O4C_CONTINUATION_TOTAL_LOCAL_MODEL_CALL_COUNT:2", self.workflow)
        self.assertIn("O4C_CONTINUATION_TOTAL_HOSTED_AI_CALL_COUNT:0", self.workflow)
        self.assertIn('if [[ "$rc" -ne 0 && "$rc" -ne 3 ]]', self.workflow)

    def test_continuation_uses_original_aggregator_without_winner_semantics(self) -> None:
        self.assertIn(
            "python tools/agent-skill-orchestrator/benchmarks/run_o4c_scout_matrix.py aggregate",
            self.workflow,
        )
        self.assertIn("rows[qwen_id]['execution_status'] != 'INVALID'", self.workflow)
        self.assertIn("historical_qwen_local_model_call_count", self.workflow)
        self.assertIn("continuation_ministral_local_model_call_count", self.workflow)
        self.assertIn("total_local_model_call_count", self.workflow)
        self.assertIn("forbidden = {'winner', 'recommended_model', 'assignment', 'rank', 'ranking', 'tie_break'}", self.workflow)

    def test_agent_skills_ci_mechanically_covers_continuation_without_executing_it(self) -> None:
        ci = CI_PATH.read_text(encoding="utf-8")
        continuation_path = ".github/workflows/agent-skill-orchestrator-o4c-scout-continuation.yml"
        self.assertEqual(ci.count(continuation_path), 2)
        self.assertNotIn("workflow_call", self.workflow)


if __name__ == "__main__":
    unittest.main()
