from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))
REPO_ROOT = PACKAGE.parents[1]

from benchmarks.resolve_o4e_request import MATRIX_ID, O4ERequestError, resolve_push
from benchmarks.run_o4e_scout_cell import REQUEST_TIMEOUT_SECONDS, main as cell_main
from benchmarks.run_o4e_scout_schema_validation import (
    EXPECTED_EVIDENCE_SHA256,
    EXPECTED_FIXTURE_SHA256,
    EXPECTED_PROMPT_SHA256,
    aggregate_outputs,
    build_matrix_manifest,
)
from benchmarks.run_scout_cell import (
    O4C_MODEL_PROFILE_IDS,
    benchmark_model_profile,
    build_result,
    load_case_and_evidence,
)
from benchmarks.score_role_output import score_role_output
from canonical import canonical_sha256
from roles.scout import build_scout_prompt, prompt_sha256, scout_response_schema
from roles.scout_evidence_schema import scout_response_schema_for_evidence


class O4EScoutSchemaValidationTests(unittest.TestCase):
    def _git(self, root: Path, *args: str) -> str:
        proc = subprocess.run(
            ["git", "-C", str(root), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return proc.stdout.strip()

    def _repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path, str]:
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        self._git(root, "init")
        self._git(root, "config", "user.email", "o4e@example.invalid")
        self._git(root, "config", "user.name", "O4E Test")
        (root / "base.txt").write_text("base\n", encoding="utf-8")
        self._git(root, "add", "base.txt")
        self._git(root, "commit", "-m", "base")
        return temp, root, self._git(root, "rev-parse", "HEAD")

    def _request_commit(self, root: Path, target_sha: str, *, extra: bool = False) -> str:
        request_dir = root / ".agent-skill-o4e-requests"
        request_dir.mkdir(parents=True, exist_ok=True)
        (request_dir / "request.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "matrix_id": MATRIX_ID,
                    "target_repository_sha": target_sha,
                },
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", ".agent-skill-o4e-requests/request.json")
        if extra:
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            self._git(root, "add", "extra.txt")
        self._git(root, "commit", "-m", "request")
        return self._git(root, "rev-parse", "HEAD")

    def test_request_resolver_accepts_exact_single_file_parent_bound_commit(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        resolved = resolve_push(
            root,
            "refs/heads/agent-skill-o4e-request/test-1",
            request_sha,
        )
        self.assertEqual(resolved["target_repository_sha"], parent)
        self.assertEqual(resolved["request_commit_sha"], request_sha)
        self.assertEqual(resolved["matrix_id"], MATRIX_ID)
        self.assertEqual(resolved["request_path"], ".agent-skill-o4e-requests/request.json")

    def test_request_resolver_fails_closed_for_wrong_branch_extra_path_and_target_mismatch(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        with self.assertRaises(O4ERequestError):
            resolve_push(root, "refs/heads/main", request_sha)

        temp2, root2, parent2 = self._repo()
        self.addCleanup(temp2.cleanup)
        request_sha2 = self._request_commit(root2, parent2, extra=True)
        with self.assertRaises(O4ERequestError):
            resolve_push(root2, "refs/heads/agent-skill-o4e-request/test-2", request_sha2)

        temp3, root3, parent3 = self._repo()
        self.addCleanup(temp3.cleanup)
        request_sha3 = self._request_commit(root3, "0" * 40)
        with self.assertRaises(O4ERequestError):
            resolve_push(root3, "refs/heads/agent-skill-o4e-request/test-3", request_sha3)
        self.assertNotEqual(parent3, "0" * 40)

    def test_request_resolver_rejects_modified_existing_request(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        first = self._request_commit(root, parent)
        path = root / ".agent-skill-o4e-requests" / "request.json"
        path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "matrix_id": MATRIX_ID,
                    "target_repository_sha": first,
                },
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", str(path.relative_to(root)))
        self._git(root, "commit", "-m", "modify request")
        second = self._git(root, "rev-parse", "HEAD")
        with self.assertRaises(O4ERequestError):
            resolve_push(root, "refs/heads/agent-skill-o4e-request/test-4", second)

    def test_manifest_binds_hardened_schema_and_frozen_o4c_inputs(self):
        manifest = build_matrix_manifest("a" * 40)
        case, evidence = load_case_and_evidence()
        prompt = build_scout_prompt(evidence)
        self.assertEqual(manifest["matrix_id"], MATRIX_ID)
        self.assertEqual(manifest["fixture_sha256"], EXPECTED_FIXTURE_SHA256).       self.assertEqual(manifest["evidence_sha256"], EXPECTED_EVIDENCE_SHA256)
        self.assertEqual(manifest["prompt_sha256"], EXPECTED_PROMPT_SHA256)
        self.assertEqual(prompt_sha256(prompt), EXPECTED_PROMPT_SHA256)
        self.assertEqual(case["fixture_sha256"], EXPECTED_FIXTURE_SHA256)
        self.assertEqual(
            manifest["response_schema_sha256"],
            canonical_sha256(scout_response_schema_for_evidence(evidence)),
       )
        self.assertNotEqual(manifest["response_schema_sha256"], canonical_sha256(scout_response_schema()))
        self.assertEqual(manifest["request_timeout_seconds"], 1800)
        self.assertEqual(int(REQUEST_TIMEOUT_SECONDS), 1800)
        self.assertEqual(manifest["model_profile_ids"], list(O4C_MODEL_PROFILE_IDS))
        self.assertEqual(manifest["local_model_call_ceiling"], 2)
        self.assertEqual(manifest["hosted_ai_call_ceiling"], 0)
        self.assertFalse({"winner", "rank", "assignment", "recommended_model"}.intersection(manifest))

    def _write_cell(self, root: Path, profile_id: str, content: str) -> None:
        case, evidence = load_case_and_evidence()
        prompt = build_scout_prompt(evidence)
        result, artifact, receipt = build_result(
            case=case,
            evidence=evidence,
            profile=benchmark_model_profile(profile_id),
            runtime_version="llama.cpp test",
            runtime_binary_sha256="b" * 64,
            prompt=prompt,
            content=content,
            finish_reason="stop",
            envelope={"usage": {"prompt_tokens": 10, "completion_tokens": 5}},
            wall_clock_ms=1,
        )
        del artifact, receipt
        score = score_role_output(case, result)
        cell = root / profile_id
        cell.mkdir(parents=True, exist_ok=True)
        (cell / "result.json").write_text(json.dumps(result, sort_keys=True) + "\n", encoding="utf-8")
        (cell / "score.json").write_text(json.dumps(score, sort_keys=True) + "\n", encoding="utf-8")
        (cell / "cellµµ•Ñ…‘…Ñ„¹©Í½¸ˆ¤¹ÝÉ¥Ñ•}Ñ•áÐ (€€€€€€€€€€€©Í½¸¹‘ÕµÁÌ (€€€€€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€€€€€‰Í¡•µ…}Ù•ÉÍ¥½¸ˆè€Ä°(€€€€€€€€€€€€€€€€€€€€‰µ½‘•±}ÁÉ½™¥±•}¥ˆèÁÉ½™¥±•}¥°(€€€€€€€€€€€€€€€€€€€€‰É•ÍÁ½¹Í•}Í¡•µ…}Í¡„ÈÔØˆè…¹½¹¥…±}Í¡„ÈÔØ¡Í½ÕÑ}É•ÍÁ½¹Í•}Í¡•µ…}™½É}•Ù¥‘•¹”¡•Ù¥‘•¹”¤¤°(€€€€€€€€€€€€€€€€€€€€‰É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}Í•½¹‘Ìˆè€ÄàÀÀ°(€€€€€€€€€€€€€€€€€€€€‰…¹½¹¥…±}Ñ•Éµ¥¹…±}É½ÜˆèQÉÕ”°(€€€€€€€€€€€€€€€€€€€€‰•á•ÕÑ¥½¹}ÍÑ…ÑÕÌˆèÉ•ÍÕ±Ñl‰•á•ÕÑ¥½¹}ÍÑ…ÑÕÌ‰t°(€€€€€€€€€€€€€€€€€€€€‰µ½‘•±}…±±}½Õ¹Ðˆè€Ä°(€€€€€€€€€€€€€€€€€€€€‰¡½ÍÑ•‘}…¥}…±±}½Õ¹Ðˆè€À°(€€€€€€€€€€€€€€€ô°(€€€€€€€€€€€€€€€Í½ÉÑ}­•åÌõQÉÕ”°(€€€€€€€€€€€€¤€¬€‰q¸ˆ°(€€€€€€€€€€€•¹½‘¥¹œô‰ÕÑ˜´àˆ°(€€€€€€€€¤((€€€‘•˜Ñ•ÍÑ}…É•…Ñ•}…•ÁÑÍ}ÑÝ½}Ñ•Éµ¥¹…±}É½ÝÍ}…¹‘}É•Á½ÉÑÍ}½¹±å}¡…É‘•¹¥¹}Ù•É‘¥Ð¡Í•±˜¤è(€€€€€€€Ý¥Ñ Ñ•µÁ™¥±”¹Q•µÁ½É…Éå¥É•Ñ½Éä ¤…ÌÑ•µÀè(€€€€€€€€€€€É½½Ð€ôA…Ñ ¡Ñ•µÀ¤(€€€€€€€€€€€µ…ÑÉ¥à€ô‰Õ¥±‘}µ…ÑÉ¥á}µ…¹¥™•ÍÐ ‰„ˆ€¨€ÐÀ¤(€€€€€€€€€€€µ…ÑÉ¥á}Á…Ñ €ôÉ½½Ð€¼€‰µ…ÑÉ¥à¹©Í½¸ˆ(€€€€€€€€€€€µ…ÑÉ¥á}Á…Ñ ¹ÝÉ¥Ñ•}Ñ•áÐ¡©Í½¸¹‘ÕµÁÌ¡µ…ÑÉ¥à°Í½ÉÑ}­•åÌõQÉÕ”¤€¬€‰q¸ˆ°•¹½‘¥¹œô‰ÕÑ˜´àˆ¤(€€€€€€€€€€€Ù…±¥€ô€ì‰Èˆémì‰¬ˆè‰Ìˆ°‰Øˆè‰É•±•Ù…¹Ñ}Í½ÕÉ”ˆ°‰Èˆél‰LÅ0ÈÄ‰uõuôœ(€€€€€€€€€€€™½ÈÁÉ½™¥±•}¥¥¸<Ñ}5=1}AI=%1}%Lè(€€€€€€€€€€€€€€€Í•±˜¹}ÝÉ¥Ñ•}•±°¡É½½Ð€¼€‰•±±Ìˆ°ÁÉ½™¥±•}¥°Ù…±¥¤(€€€€€€€€€€€ÍÕµµ…Éä€ô…É•…Ñ•}½ÕÑÁÕÑÌ¡É½½Ð€¼€‰•±±Ìˆ°µ…ÑÉ¥á}Á…Ñ ¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑÅÕ…°¡ÍÕµµ…Éål‰¡…É‘•¹¥¹}Ù•É‘¥Ð‰t°€‰!I9%9}Y1%Qˆ¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑÅÕ…°¡ÍÕµµ…Éål‰±½…±}µ½‘•±}…±±}½Õ¹Ð‰t°€È¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑ…±Í”¡ì‰Ý¥¹¹•Èˆ°€‰É…¹¬ˆ°€‰…ÍÍ¥¹µ•¹Ðˆ°€‰É•½µµ•¹‘•‘}µ½‘•°‰ô¹¥¹Ñ•ÉÍ•Ñ¥½¸¡ÍÕµµ…Éä¤¤((€€€€€€€€€€€¥¹Ù…±¥€ô€ì‰Èˆémì‰¬ˆè‰Ìˆ°‰Øˆè‰Í•µ…¹Ñ¥ŒÁÉ½Í”ˆ°‰Èˆél‰LÅ0ÈÄ‰uõuôœ(€€€€€€€€€€€Í•±˜¹}ÝÉ¥Ñ•}•±°¡É½½Ð€¼€‰•±±Ìˆ°<Ñ}5=1}AI=%1}%MlÅt°¥¹Ù…±¥¤(€€€€€€€€€€€ÍÕµµ…Éä€ô…É•…Ñ•}½ÕÑÁÕÑÌ¡É½½Ð€¼€‰•±±Ìˆ°µ…ÑÉ¥á}Á…Ñ ¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑÅÕ…°¡ÍÕµµ…Éål‰¡…É‘•¹¥¹}Ù•É‘¥Ð‰t°€‰!I9%9}9=Q}Y1%Qˆ¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑÅÕ…°¡±•¸¡ÍÕµµ…Éål‰É½ÝÌ‰t¤°€È¤((€€€‘•˜Ñ•ÍÑ}•±±}µ…¥¹}É•ÑÕÉ¹Í}ÍÕ•ÍÍ}™½É}…¹½¹¥…±}¥¹Ù…±¥‘}Ñ•Éµ¥¹…±}•Ù¥‘•¹”¡Í•±˜¤è(€€€€€€€™…­•}É•ÍÕ±Ð€ôì(€€€€€€€€€€€€‰•á•ÕÑ¥½¹}ÍÑ…ÑÕÌˆè€‰%9Y1%ˆ°(€€€€€€€€€€€€‰µ½‘•°ˆèì‰ÁÉ½™¥±•}¥ˆè<Ñ}5=1}AI=%1}%MlÁuô°(€€€€€€€€€€€€‰É•ÍÕ±Ñ}Í¡„ÈÔØˆè€ˆÄˆ€¨€ØÐ°(€€€€€€€ô(€€€€€€€™…­•}Í½É”€ôì‰Í½É•}Í¡„ÈÔØˆè€ˆÈˆ€¨€ØÑô(€€€€€€€™…­•}µ•Ñ…‘…Ñ„€ôì‰É•ÍÁ½¹Í•}Í¡•µ…}Í¡„ÈÔØˆè€ˆÌˆ€¨€ØÑô(€€€€€€€Ý¥Ñ Ñ•µÁ™¥±”¹Q•µÁ½É…Éå¥É•Ñ½Éä ¤…ÌÑ•µÀ°Á…Ñ  (€€€€€€€€€€€€‰‰•¹¡µ…É­Ì¹ÉÕ¹}¼Ñ•}Í½ÕÑ}•±°¹•á•ÕÑ•}•±°ˆ°(€€€€€€€€€€€É•ÑÕÉ¹}Ù…±Õ”ô (€€€€€€€€€€€€€€€™…­•}É•ÍÕ±Ð°(€€€€€€€€€€€€€€€™…­•}Í½É”°(€€€€€€€€€€€€€€€€‰ÁÉ½µÁÐˆ°(€€€€€€€€€€€€€€€€‰É•ÍÁ½¹Í”ˆ°(€€€€€€€€€€€€€€€íô°(€€€€€€€€€€€€€€€9½¹”°(€€€€€€€€€€€€€€€íô°(€€€€€€€€€€€€€€€™…­•}µ•Ñ…‘…Ñ„°(€€€€€€€€€€€€¤°(€€€€€€€€¤è(€€€€€€€€€€€ÉŒ€ô•±±}µ…¥¸¡l(€€€€€€€€€€€€€€€€ˆ´µµ½‘•°µÁÉ½™¥±”ˆ°<Ñ}5=1}AI=%1}%MlÁt°(€€€€€€€€€€€€€€€€ˆ´µÁ½ÉÐˆ°€ˆÌäÄÌäˆ°(€€€€€€€€€€€€€€€€ˆ´µÉÕ¹Ñ¥µ”µÙ•ÉÍ¥½¸ˆ°€‰Ñ•ÍÐˆ°(€€€€€€€€€€€€€€€€ˆ´µÉÕ¹Ñ¥µ”µ‰¥¹…ÉäµÍ¡„ÈÔØˆ°€‰ˆˆ€¨€ØÐ°(€€€€€€€€€€€€€€€€ˆ´µ½ÕÑÁÕÐµ‘¥Èˆ°Ñ•µÀ°(€€€€€€€€€€€t¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑÅÕ…°¡ÉŒ°€À¤(€€€€€€€€€€€Í•±˜¹…ÍÍ•ÉÑQÉÕ” ¡A…Ñ ¡Ñ•µÀ¤€¼€‰É•ÍÕ±Ð¹©Í½¸ˆ¤¹•á¥ÍÑÌ ¤¤((€€€‘•˜Ñ•ÍÑ}Ý½É­™±½Ý}¥Í}É•ÅÕ•ÍÑ}½¹±å}é•É½}É•‘¥Ñ}…¹‘}½É‘¥¹…Éå}¥}½Ù•ÉÍ}¥Ð¡Í•±˜¤è(€€€€€€€Ý½É­™±½Ý}Á…Ñ €ôIA=}I==P€¼€ˆ¹¥Ñ¡Õˆˆ€¼€‰Ý½É­™±½ÝÌˆ€¼€‰…•¹ÐµÍ­¥±°µ½É¡•ÍÑÉ…Ñ½Èµ¼Ñ”µÍ½ÕÐµÍ¡•µ„µÙ…±¥‘…Ñ¥½¸¹åµ°ˆ(€€€€€€€Ý½É­™±½Ü€ôÝ½É­™±½Ý}Á…Ñ ¹É•…‘}Ñ•áÐ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ%¸ ‰…•¹ÐµÍ­¥±°µ¼Ñ”µÉ•ÅÕ•ÍÐ¼¨¨ˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ%¸ ˆ¹…•¹ÐµÍ­¥±°µ¼Ñ”µÉ•ÅÕ•ÍÑÌ¼¨¹©Í½¸ˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ%¸ ‰Á•Éµ¥ÍÍ¥½¹Ìéq¸€½¹Ñ•¹ÑÌèÉ•…ˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ9½Ñ%¸ ‰Ý½É­™±½Ý}‘¥ÍÁ…Ñ ˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ9½Ñ%¸ ‰½Á¥±½ÐµÉ•ÅÕ•ÍÑÌˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ%¸ ‰ÉÕ¹}¼Ñ•}Í½ÕÑ}•±°ˆ°Ý½É­™±½Ü¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ%¸ ‰!I9%9}Y1%Qˆ°Ý½É­™±½Ü¤((€€€€€€€¤€ô€¡IA=}I==P€¼€ˆ¹¥Ñ¡Õˆˆ€¼€‰Ý½É­™±½ÝÌˆ€¼€‰…•¹ÐµÍ­¥±±Ìµ¤¹åµ°ˆ¤¹É•…‘}Ñ•áÐ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤(€€€€€€€Á…Ñ €ô€ˆ¹¥Ñ¡Õˆ½Ý½É­™±½ÝÌ½…•¹ÐµÍ­¥±°µ½É¡•ÍÑÉ…Ñ½Èµ¼Ñ”µÍ½ÕÐµÍ¡•µ„µÙ…±¥‘…Ñ¥½¸¹åµ°ˆ(€€€€€€€Í•±˜¹…ÍÍ•ÉÑÉ•…Ñ•ÉÅÕ…°¡¤¹½Õ¹Ð¡Á…Ñ ¤°€È¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ9½Ñ%¸ ‰¡Õ¥¹™…”¹¼ˆ°¤¤(€€€€€€€Í•±˜¹…ÍÍ•ÉÑ9½Ñ%¸ ‰±±…µ„µÍ•ÉÙ•Èˆ°¤¤(()¥˜}}¹…µ•}|€ôô€‰}}µ…¥¹}|ˆè(€€€Õ¹¥ÑÑ•ÍÐ¹µ…¥¸ ¤(