import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from budget import _budget_profile
from canonical import canonical_sha256
from runtime.budget_profile import (
    DEFAULT_RUNTIME_BUDGET_PROFILE_ID,
    RuntimeBudgetProfileError,
    load_runtime_budget_registry,
    runtime_budget_profile,
    runtime_budget_profile_sha256,
    validate_runtime_budget_registry_data,
)
from runtime.generation import GENERATION, LLAMA_RUNTIME, SCOUT_MODEL_PROFILE_ID, TRANSPORT


class O3ARuntimeBudgetProfileTests(unittest.TestCase):
    def registry(self):
        return load_runtime_budget_registry()

    def test_standard_cpu_v1_loads_and_digest_is_reproducible(self):
        profile = runtime_budget_profile()
        self.assertEqual(profile["profile_id"], DEFAULT_RUNTIME_BUDGET_PROFILE_ID)
        first = runtime_budget_profile_sha256()
        second = runtime_budget_profile_sha256()
        self.assertEqual(first, second)
        self.assertEqual(first, canonical_sha256(profile))
        self.assertEqual(len(first), 64)

    def test_profile_exactly_binds_frozen_o2_runtime_generation_and_call_limits(self):
        profile = runtime_budget_profile()
        self.assertEqual(profile["model_profile_id"], SCOUT_MODEL_PROFILE_ID)
        self.assertEqual(profile["transport"], TRANSPORT)
        self.assertEqual(profile["runtime_release"], LLAMA_RUNTIME["release"])
        for key in ("temperature", "seed", "n_predict", "threads", "gpu_layers"):
            self.assertEqual(profile[key], GENERATION[key])
        self.assertEqual(profile["max_total_role_calls"], 4)
        self.assertEqual(profile["max_hosted_ai_calls"], 0)
        self.assertEqual(profile["max_concurrent_model_workers"], 2)

    def test_loaded_profile_is_a_defensive_copy(self):
        first = runtime_budget_profile()
        first["max_total_role_calls"] = 99
        second = runtime_budget_profile()
        self.assertEqual(second["max_total_role_calls"], 4)

    def test_duplicate_profile_id_is_rejected(self):
        registry = self.registry()
        registry["profiles"].append(deepcopy(registry["profiles"][0]))
        with self.assertRaises(RuntimeBudgetProfileError):
            validate_runtime_budget_registry_data(registry)

    def test_unversioned_profile_id_is_rejected(self):
        registry = self.registry()
        registry["profiles"][0]["profile_id"] = "standard-cpu"
        with self.assertRaises(RuntimeBudgetProfileError):
            validate_runtime_budget_registry_data(registry)

    def test_unknown_profile_id_is_rejected(self):
        with self.assertRaisesRegex(RuntimeBudgetProfileError, "unknown runtime budget profile id"):
            runtime_budget_profile("missing-profile-v1")

    def test_extra_field_is_rejected(self):
        registry = self.registry()
        registry["profiles"][0]["extra"] = "forbidden"
        with self.assertRaises(RuntimeBudgetProfileError):
            validate_runtime_budget_registry_data(registry)

    def test_nonzero_hosted_ai_allowance_is_rejected(self):
        registry = self.registry()
        registry["profiles"][0]["max_hosted_ai_calls"] = 1
        with self.assertRaisesRegex(RuntimeBudgetProfileError, "hosted-AI allowance"):
            validate_runtime_budget_registry_data(registry)

    def test_concurrency_above_two_is_rejected(self):
        registry = self.registry()
        registry["profiles"][0]["max_concurrent_model_workers"] = 3
        with self.assertRaisesRegex(RuntimeBudgetProfileError, "concurrency"):
            validate_runtime_budget_registry_data(registry)

    def test_default_profile_requires_exact_two_worker_ceiling(self):
        registry = self.registry()
        registry["profiles"][0]["max_concurrent_model_workers"] = 1
        with self.assertRaisesRegex(RuntimeBudgetProfileError, "two-worker"):
            validate_runtime_budget_registry_data(registry)

    def test_model_runtime_and_generation_drift_are_rejected(self):
        mutations = [
            ("model_profile_id", "other-model-v1"),
            ("transport", "other-transport"),
            ("runtime_release", "b99999"),
            ("temperature", 1),
            ("seed", 43),
            ("n_predict", 769),
            ("threads", 5),
            ("gpu_layers", 1),
            ("max_total_role_calls", 5),
        ]
        for key, value in mutations:
            with self.subTest(key=key):
                registry = self.registry()
                registry["profiles"][0][key] = value
                with self.assertRaises(RuntimeBudgetProfileError):
                    validate_runtime_budget_registry_data(registry)

    def test_existing_o1_standard_budget_profile_is_unchanged(self):
        self.assertEqual(_budget_profile("standard", None), ("standard-cpu", 4))


if __name__ == "__main__":
    unittest.main()
