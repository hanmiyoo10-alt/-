from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[4]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.colab.bootstrap import assert_sanitized_payload
from benchmarks.colab.gpu.request import (
    ColabGpuRequestError,
    make_request,
    validate_request,
)
from benchmarks.colab.gpu.runtime_smoke import (
    BUILD_PROFILE_ID,
    LLAMA_RELEASE,
    LLAMA_SOURCE_DIGEST,
    ColabGpuRuntimeError,
    _assert_source_identity,
    execution_profile_sha256,
    load_execution_profile,
    run_gpu_runtime_smoke,
    validate_bundle,
)

NO_GPU = {
    "gpu_present": False,
    "gpu_count": "0",
    "accelerator_name": "UNKNOWN",
    "total_vram_mib": "UNKNOWN",
    "driver_version": "UNKNOWN",
    "cuda_driver_version": "UNKNOWN",
    "cuda_toolkit_version": "UNKNOWN",
}
GPU = {
    "gpu_present": True,
    "gpu_count": "1",
    "accelerator_name": "Synthetic GPU",
    "total_vram_mib": "16384",
    "driver_version": "999.1",
    "cuda_driver_version": "99.1",
    "cuda_toolkit_version": "99.0",
}
FAKE_RUNTIME = {
    "server_binary_sha256": "1" * 64,
    "cuda_backend_artifact": "libggml-cuda.so",
    "cuda_backend_sha256": "2" * 64,
    "smoke_state": "RUNNABLE",
    "smoke_excerpt": "llama.cpp synthetic runtime",
}


class ColabGpuAdmissionContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self._git("init")
        self._git("config", "user.name", "colab-gpu-test")
        self._git("config", "user.email", "colab-gpu-test@example.invalid")
        (self.repo / "sentinel.txt").write_text("gpu-admission\n", encoding="utf-8")
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

    def _request(self, request_id: str = "cagb2-test") -> dict:
        return make_request(request_id, self.sha, 5)

    def test_request_is_fixed_and_rejects_scope_expansion(self) -> None:
        first = self._request()
        second = self._request()
        self.assertEqual(first, second)
        self.assertEqual(first["resource_class"], "GPU_REQUIRED")
        self.assertEqual(first["max_model_calls"], 0)
        for key, value in (
            ("command", "bash -lc whoami"),
            ("build_flags", ["-DOTHER=ON"]),
        ):
            bad = dict(first)
            bad[key] = value
            with self.assertRaises(ColabGpuRequestError):
                validate_request(bad)
        bad_resource = dict(first)
        bad_resource["resource_class"] = "CPU_ALLOWED"
        with self.assertRaises(ColabGpuRequestError):
            validate_request(bad_resource)
        bad_calls = dict(first)
        bad_calls["max_model_calls"] = 1
        with self.assertRaises(ColabGpuRequestError):
            validate_request(bad_calls)

    def test_repository_mismatch_and_dirty_checkout_fail_before_gpu_probe(self) -> None:
        probe_calls = []
        bad_request = make_request("cagb2-mismatch", "0" * 40, 5)
        with self.assertRaisesRegex(ColabGpuRuntimeError, "BLOCKED_REPO_SHA_MISMATCH"):
            run_gpu_runtime_smoke(
                bad_request,
                self.repo,
                self.drive,
                observe_gpu_fn=lambda: probe_calls.append(True) or NO_GPU,
            )
        self.assertEqual(probe_calls, [])
        (self.repo / "sentinel.txt").write_text("dirty\n", encoding="utf-8")
        with self.assertRaisesRegex(ColabGpuRuntimeError, "BLOCKED_DIRTY_REPOSITORY"):
            run_gpu_runtime_smoke(
                self._request("cagb2-dirty"),
                self.repo,
                self.drive,
                observe_gpu_fn=lambda: probe_calls.append(True) or NO_GPU,
            )
        self.assertEqual(probe_calls, [])

    def test_no_gpu_is_blocked_without_cpu_fallback_or_runtime_build(self) -> None:
        build_calls = []

        def forbidden_build(_scratch: Path, _deadline: float) -> dict:
            build_calls.append(True)
            raise AssertionError("runtime build must not run without a GPU")

        receipt = run_gpu_runtime_smoke(
            self._request("cagb2-no-gpu"),
            self.repo,
            self.drive,
            observe_gpu_fn=lambda: deepcopy(NO_GPU),
            build_runtime_fn=forbidden_build,
        )
        self.assertEqual(build_calls, [])
        self.assertEqual(receipt["gpu_admission_state"], "GPU_ABSENT")
        self.assertEqual(receipt["completion_state"], "BLOCKED_CAPABILITY")
        self.assertEqual(receipt["blocker"], "BLOCKED_NO_ACCELERATOR")
        self.assertEqual(receipt["runtime"]["smoke_state"], "NOT_RUN")
        self.assertEqual(receipt["model_call_count"], 0)
        self.assertEqual(receipt["hosted_ai_call_count"], 0)
        bundle = self.drive / receipt["drive_handoff_relative_path"]
        self.assertEqual(validate_bundle(bundle)["status"], "VALID")

    def test_gpu_path_records_fixed_runtime_identity_without_inference(self) -> None:
        build_calls = []

        def fake_build(_scratch: Path, _deadline: float) -> dict:
            build_calls.append(True)
            return deepcopy(FAKE_RUNTIME)

        receipt = run_gpu_runtime_smoke(
            self._request("cagb2-gpu"),
            self.repo,
            self.drive,
            observe_gpu_fn=lambda: deepcopy(GPU),
            build_runtime_fn=fake_build,
        )
        self.assertEqual(build_calls, [True])
        self.assertEqual(receipt["gpu_admission_state"], "GPU_PRESENT")
        self.assertEqual(receipt["completion_state"], "COMPLETED")
        self.assertEqual(receipt["blocker"], "NONE")
        self.assertEqual(receipt["llama_source"]["release"], LLAMA_RELEASE)
        self.assertEqual(receipt["llama_source"]["source_digest"], LLAMA_SOURCE_DIGEST)
        self.assertEqual(receipt["build_profile_id"], BUILD_PROFILE_ID)
        self.assertEqual(receipt["runtime"], FAKE_RUNTIME)
        self.assertEqual(receipt["model_call_count"], 0)
        self.assertEqual(receipt["hosted_ai_call_count"], 0)

    def test_source_mismatch_fails_closed(self) -> None:
        _assert_source_identity(LLAMA_SOURCE_DIGEST)
        with self.assertRaisesRegex(ColabGpuRuntimeError, "BLOCKED_RUNTIME_IDENTITY_MISMATCH"):
            _assert_source_identity("0" * 40)

    def test_build_profile_identity_is_stable_and_cuda_only(self) -> None:
        first = load_execution_profile()
        second = load_execution_profile()
        self.assertEqual(first, second)
        self.assertEqual(first["source"]["release"], LLAMA_RELEASE)
        self.assertEqual(first["source"]["source_digest"], LLAMA_SOURCE_DIGEST)
        self.assertEqual(first["configure_args"][0], "-DGGML_CUDA=ON")
        self.assertEqual(first["profile_id"], BUILD_PROFILE_ID)
        self.assertEqual(execution_profile_sha256(), execution_profile_sha256())

    def test_sensitive_payload_and_bundle_tamper_are_rejected(self) -> None:
        with self.assertRaises(ValueError):
            assert_sanitized_payload({"access_token": "secret"})
        receipt = run_gpu_runtime_smoke(
            self._request("cagb2-tamper"),
            self.repo,
            self.drive,
            observe_gpu_fn=lambda: deepcopy(NO_GPU),
        )
        bundle = self.drive / receipt["drive_handoff_relative_path"]
        result_path = bundle / "result.json"
        result = json.loads(result_path.read_text(encoding="utf-8"))
        result["status"] = "GPU_RUNTIME_READY"
        result_path.write_text(json.dumps(result, sort_keys=True) + "\n", encoding="utf-8")
        with self.assertRaises(ColabGpuRuntimeError):
            validate_bundle(bundle)

    def test_notebook_is_thin_and_has_no_secret_or_model_lane(self) -> None:
        notebook_path = Path(__file__).resolve().parents[1] / "colab-agent-gpu-admission.ipynb"
        notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
        self.assertEqual(notebook["nbformat"], 4)
        code_cells = [cell for cell in notebook["cells"] if cell.get("cell_type") == "code"]
        code = "\n".join("".join(cell.get("source", [])) for cell in code_cells)
        self.assertLessEqual(len(code_cells), 3)
        self.assertIn("run_gpu_runtime_smoke", code)
        self.assertIn("drive.mount", code)
        self.assertIn("git', 'clone", code)
        self.assertNotIn("access_token", code)
        self.assertNotIn("github_pat_", code)
        self.assertNotIn("model_path", code)
        self.assertNotIn("pip install", code)


if __name__ == "__main__":
    unittest.main()
