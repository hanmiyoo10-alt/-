from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[3]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.colab.bootstrap import (
    ColabBootstrapError,
    SENTINEL_PATHS,
    assert_sanitized_payload,
    run_bootstrap,
    validate_bundle,
)
from benchmarks.colab import request as request_module
from benchmarks.colab.request import (
    ColabBootstrapRequestError,
    make_request,
    make_runtime_request_id,
    resolve_checked_out_main_sha,
    validate_request,
)


class ColabBootstrapContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self._git("init")
        self._git("config", "user.name", "colab-test")
        self._git("config", "user.email", "colab-test@example.invalid")
        for index, relative in enumerate(SENTINEL_PATHS):
            target = self.repo / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f"sentinel-{index}\\n", encoding="utf-8")
        self._git("add", ".")
        self._git("commit", "-m", "fixture")
        self.sha = self._git("rev-parse", "HEAD").strip()
        self.drive = self.root / "drive"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _git(self, *args: str) -> str:
        proc = subprocess.run(
            ["git", "-C", str(self.repo), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return proc.stdout

    def test_request_is_deterministic_and_rejects_scope_expansion(self) -> None:
        first = make_request("cagb1-test", self.sha)
        second = make_request("cagb1-test", self.sha)
        self.assertEqual(first, second)
        self.assertEqual(first["max_model_calls"], 0)
        bad = dict(first)
        bad["operation_kind"] = "ARBITRARY_SHELL"
        with self.assertRaises(ColabBootstrapRequestError):
            validate_request(bad)

    def test_request_rejects_invalid_sha_and_path_like_id(self) -> None:
        with self.assertRaises(ColabBootstrapRequestError):
            make_request("cagb1-test", "abc")
        with self.assertRaises(ColabBootstrapRequestError):
            make_request("../escape", self.sha)

    def test_exact_sha_cpu_round_trip(self) -> None:
        request = make_request("cagb1-roundtrip", self.sha)
        receipt = run_bootstrap(request, self.repo, self.drive)
        self.assertEqual(receipt["repository_sha"], self.sha)
        self.assertEqual(receipt["model_call_count"], 0)
        self.assertEqual(receipt["hosted_ai_call_count"], 0)
        bundle = self.drive / receipt["drive_handoff_relative_path"]
        validation = validate_bundle(bundle)
        self.assertEqual(validation["status"], "VALID")
        self.assertEqual(validation["receipt_sha256"], receipt["receipt_sha256"])
        self.assertEqual(sorted(path.name for path in bundle.iterdir()), [
            "bundle-manifest.json", "receipt.json", "request.json", "result.json"
        ])

    def test_repository_sha_mismatch_fails_closed_without_bundle(self) -> None:
        request = make_request("cagb1-mismatch", "0" * 40)
        with self.assertRaisesRegex(ColabBootstrapError, "BLOCKED_REPO_SHA_MISMATCH"):
            run_bootstrap(request, self.repo, self.drive)
        self.assertFalse((self.drive / "nyang-colab").exists())

    def test_dirty_repository_fails_closed(self) -> None:
        target = self.repo / SENTINEL_PATHS[0]
        target.write_text("dirty\\n", encoding="utf-8")
        request = make_request("cagb1-dirty", self.sha)
        with self.assertRaisesRegex(ColabBootstrapError, "BLOCKED_DIRTY_REPOSITORY"):
            run_bootstrap(request, self.repo, self.drive)

    def test_existing_target_refuses_overwrite(self) -> None:
        request = make_request("cagb1-existing", self.sha)
        run_bootstrap(request, self.repo, self.drive)
        with self.assertRaisesRegex(ColabBootstrapError, "already exists"):
            run_bootstrap(request, self.repo, self.drive)

    def test_sensitive_payload_is_rejected(self) -> None:
        with self.assertRaisesRegex(ColabBootstrapError, "forbidden sensitive key"):
            assert_sanitized_payload({"access_token": "secret"})
        with self.assertRaisesRegex(ColabBootstrapError, "email-like value"):
            assert_sanitized_payload({"owner": "person@example.com"})


    def test_notebook_is_thin_and_contains_no_embedded_secret_fields(self) -> None:
        notebook_path = Path(__file__).resolve().parents[1] / "colab-agent-bootstrap.ipynb"
        notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
        self.assertEqual(notebook["nbformat"], 4)
        code = "\n".join(
            "".join(cell.get("source", []))
            for cell in notebook["cells"]
            if cell.get("cell_type") == "code"
        )
        self.assertIn("run_bootstrap", code)
        self.assertIn("drive.mount", code)
        self.assertIn("resolve_checked_out_main_sha", code)
        self.assertIn("make_runtime_request_id", code)
        self.assertIn("--branch", code)
        self.assertIn('"main"', code)
        self.assertNotIn('REPOSITORY_SHA = ""', code)
        self.assertNotIn('REQUEST_ID = ""', code)
        self.assertNotIn("access_token", code)
        self.assertNotIn("github_pat_", code)
        self.assertLessEqual(sum(cell.get("cell_type") == "code" for cell in notebook["cells"]), 2)

    def test_bundle_tamper_is_detected(self) -> None:
        request = make_request("cagb1-tamper", self.sha)
        receipt = run_bootstrap(request, self.repo, self.drive)
        bundle = self.drive / receipt["drive_handoff_relative_path"]
        result_path = bundle / "result.json"
        payload = json.loads(result_path.read_text(encoding="utf-8"))
        payload["status"] = "ALTERED"
        result_path.write_text(json.dumps(payload, sort_keys=True) + "\n", encoding="utf-8")
        with self.assertRaises(ColabBootstrapError):
            validate_bundle(bundle)


if __name__ == "__main__":
    unittest.main()
