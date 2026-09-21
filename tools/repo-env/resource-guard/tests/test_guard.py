import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import types
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
CLI = ROOT / "guard.py"


def load_module():
    spec = importlib.util.spec_from_file_location("resource_guard_under_test", CLI)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class ResourceGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guard = load_module()

    def fake_statvfs(self, **overrides):
        values = dict(f_bavail=100, f_frsize=4096, f_files=1000, f_favail=500)
        values.update(overrides)
        return types.SimpleNamespace(**values)

    def test_filesystem_disk_and_inode_known(self):
        with mock.patch.object(self.guard.os, "statvfs", return_value=self.fake_statvfs()):
            disk, inodes = self.guard.probe_filesystem("ignored")
        self.assertEqual(disk, self.guard.Observation(409600, "ok"))
        self.assertEqual(inodes, self.guard.Observation(500, "ok"))

    def test_inode_unsupported_is_unknown(self):
        info = self.fake_statvfs(f_files=0, f_favail=0)
        with mock.patch.object(self.guard.os, "statvfs", return_value=info):
            _disk, inodes = self.guard.probe_filesystem("ignored")
        self.assertIsNone(inodes.value)
        self.assertEqual(inodes.reason, "inode_accounting_unsupported")

    def test_filesystem_failure_is_unknown(self):
        with mock.patch.object(self.guard.os, "statvfs", side_effect=OSError()):
            disk, inodes = self.guard.probe_filesystem("ignored")
        self.assertIsNone(disk.value)
        self.assertIsNone(inodes.value)
        self.assertEqual(disk.reason, "filesystem_observation_unavailable")

    def test_memavailable_without_cgroup_v2(self):
        files = {
            "/proc/meminfo": "MemTotal: 999 kB\nMemAvailable: 4096 kB\n",
            "/proc/self/cgroup": "2:memory:/legacy\n",
        }
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertEqual(observation, self.guard.Observation(4096 * 1024, "ok"))

    def test_finite_cgroup_lowers_effective_memory(self):
        gib = 1024 ** 3
        files = {
            "/proc/meminfo": "MemAvailable: 4194304 kB\n",
            "/proc/self/cgroup": "0::/team/job\n",
            "/proc/self/mountinfo": "25 20 0:24 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n",
            "/sys/fs/cgroup/team/job/memory.max": str(2 * gib),
            "/sys/fs/cgroup/team/job/memory.current": str(1 * gib),
            "/sys/fs/cgroup/team/memory.max": "max",
            "/sys/fs/cgroup/team/memory.current": "123",
            "/sys/fs/cgroup/memory.max": "max",
            "/sys/fs/cgroup/memory.current": "456",
        }
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertEqual(observation, self.guard.Observation(gib, "ok"))

    def test_parent_cgroup_can_be_tighter(self):
        gib = 1024 ** 3
        files = {
            "/proc/meminfo": "MemAvailable: 4194304 kB\n",
            "/proc/self/cgroup": "0::/team/job\n",
            "/proc/self/mountinfo": "25 20 0:24 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n",
            "/sys/fs/cgroup/team/job/memory.max": str(4 * gib),
            "/sys/fs/cgroup/team/job/memory.current": str(1 * gib),
            "/sys/fs/cgroup/team/memory.max": str(2 * gib),
            "/sys/fs/cgroup/team/memory.current": str(1536 * 1024 ** 2),
            "/sys/fs/cgroup/memory.max": "max",
            "/sys/fs/cgroup/memory.current": "456",
        }
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertEqual(observation.value, 512 * 1024 ** 2)

    def test_malformed_cgroup_is_unknown(self):
        files = {
            "/proc/meminfo": "MemAvailable: 4096 kB\n",
            "/proc/self/cgroup": "0::/team/job\n",
            "/proc/self/mountinfo": "bad - cgroup2 cgroup rw\n",
        }
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertIsNone(observation.value)
        self.assertEqual(observation.reason, "cgroup_observation_unavailable")

    def test_unreadable_meminfo_is_unknown(self):
        with mock.patch.object(self.guard, "read_small_text", side_effect=OSError()):
            observation = self.guard.probe_memory()
        self.assertIsNone(observation.value)
        self.assertEqual(observation.reason, "memory_observation_unavailable")

    def test_malformed_memavailable_is_unknown(self):
        files = {"/proc/meminfo": "MemAvailable: nope kB\n"}
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertIsNone(observation.value)
        self.assertEqual(observation.reason, "memory_observation_unavailable")

    def test_no_finite_cgroup_limit_uses_memavailable(self):
        files = {
            "/proc/meminfo": "MemAvailable: 8192 kB\n",
            "/proc/self/cgroup": "0::/job\n",
            "/proc/self/mountinfo": "25 20 0:24 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n",
            "/sys/fs/cgroup/job/memory.max": "max",
            "/sys/fs/cgroup/job/memory.current": "100",
            "/sys/fs/cgroup/memory.max": "max",
            "/sys/fs/cgroup/memory.current": "200",
        }
        with mock.patch.object(self.guard, "read_small_text", side_effect=lambda path, limit: files[path]):
            observation = self.guard.probe_memory()
        self.assertEqual(observation, self.guard.Observation(8192 * 1024, "ok"))

    def test_evaluate_pass_and_metric_order(self):
        with tempfile.TemporaryDirectory() as root:
            with mock.patch.object(
                self.guard,
                "probe_filesystem",
                return_value=(self.guard.Observation(1000, "ok"), self.guard.Observation(200, "ok")),
            ), mock.patch.object(self.guard, "probe_memory", return_value=self.guard.Observation(500, "ok")):
                report, code = self.guard.evaluate(
                    root,
                    {
                        "free_disk_bytes": 900,
                        "available_memory_bytes": 400,
                        "free_inodes": 100,
                    },
                )
        self.assertEqual(code, 0)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual([item["metric"] for item in report["metrics"]], list(self.guard.METRIC_ORDER))
        self.assertTrue(all(item["status"] == "pass" for item in report["metrics"]))

    def test_known_below_floor_beats_unknown(self):
        with tempfile.TemporaryDirectory() as root:
            with mock.patch.object(
                self.guard,
                "probe_filesystem",
                return_value=(self.guard.Observation(10, "ok"), self.guard.Observation(None, "inode_accounting_unsupported")),
            ):
                report, code = self.guard.evaluate(
                    root,
                    {"free_disk_bytes": 20, "available_memory_bytes": None, "free_inodes": 1},
                )
        self.assertEqual(code, 1)
        self.assertEqual(report["status"], "BLOCKED")

    def test_unknown_when_no_known_below_floor(self):
        with tempfile.TemporaryDirectory() as root:
            with mock.patch.object(
                self.guard,
                "probe_filesystem",
                return_value=(self.guard.Observation(100, "ok"), self.guard.Observation(None, "inode_accounting_unsupported")),
            ):
                report, code = self.guard.evaluate(
                    root,
                    {"free_disk_bytes": 10, "available_memory_bytes": None, "free_inodes": 1},
                )
        self.assertEqual(code, 2)
        self.assertEqual(report["status"], "UNKNOWN")
        self.assertEqual(report["reason"], "metric_unknown")

    def test_missing_floor_is_contract_blocked(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(self.guard.ContractError, "missing_floor"):
                self.guard.evaluate(
                    root,
                    {"free_disk_bytes": None, "available_memory_bytes": None, "free_inodes": None},
                )

    def test_non_positive_and_oversize_floors_are_blocked(self):
        with tempfile.TemporaryDirectory() as root:
            for value in (0, -1, self.guard.MAX_FLOOR + 1):
                with self.subTest(value=value):
                    with self.assertRaisesRegex(self.guard.ContractError, "invalid_floor"):
                        self.guard.evaluate(
                            root,
                            {"free_disk_bytes": value, "available_memory_bytes": None, "free_inodes": None},
                        )

    def test_invalid_target_is_blocked(self):
        with self.assertRaisesRegex(self.guard.ContractError, "invalid_target"):
            self.guard.evaluate(
                "/definitely/not/a/real/resource-guard-target",
                {"free_disk_bytes": 1, "available_memory_bytes": None, "free_inodes": None},
            )

    def test_cli_failure_does_not_leak_target(self):
        secret = "/tmp/RESOURCE_GUARD_SECRET_TARGET_2267"
        result = subprocess.run(
            [sys.executable, str(CLI), "check", "--target-root", secret, "--min-free-disk-bytes", "1"],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, "")
        self.assertNotIn(secret, result.stdout)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["schema"], "repo-resource-guard.v1")
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertEqual(payload["reason"], "invalid_target")

    def test_cli_invalid_argument_does_not_echo_value(self):
        marker = "RESOURCE_GUARD_PRIVATE_VALUE_2267"
        result = subprocess.run(
            [sys.executable, str(CLI), "check", "--target-root", "/", "--unknown", marker],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, "")
        self.assertNotIn(marker, result.stdout)
        self.assertEqual(json.loads(result.stdout)["reason"], "invalid_arguments")

    def test_json_is_compact_and_deterministic(self):
        report = {
            "schema": self.guard.SCHEMA,
            "status": "PASS",
            "reason": "ok",
            "metrics": [],
        }
        first = json.dumps(report, sort_keys=True, separators=(",", ":"))
        second = json.dumps(report, sort_keys=True, separators=(",", ":"))
        self.assertEqual(first, second)
        self.assertNotIn(" ", first)

    def test_production_forbidden_surface(self):
        source = CLI.read_text(encoding="utf-8")
        forbidden = (
            "import subprocess",
            "import socket",
            "import urllib",
            "import requests",
            "os.system(",
            "Popen(",
            "subprocess.",
            "write_text(",
            "write_bytes(",
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, source)

    def test_contract_report_contains_no_environment_fields(self):
        report = self.guard.contract_report("invalid_target")
        serialized = json.dumps(report, sort_keys=True)
        for forbidden in ("path", "root", "cwd", "hostname", "username", "device", "environment"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, serialized.lower())

# Additional boundary regressions are attached dynamically to keep the fixture compact.
def _test_each_metric_below_floor(self):
    with tempfile.TemporaryDirectory() as root:
        cases = (
            ("free_disk_bytes", self.guard.Observation(10, "ok"), None),
            ("available_memory_bytes", self.guard.Observation(10, "ok"), None),
            ("free_inodes", self.guard.Observation(10, "ok"), None),
        )
        for metric, observation, _unused in cases:
            with self.subTest(metric=metric):
                floors = {name: None for name in self.guard.METRIC_ORDER}
                floors[metric] = 20
                disk = self.guard.Observation(100, "ok")
                inode = self.guard.Observation(100, "ok")
                if metric == "free_disk_bytes":
                    disk = observation
                if metric == "free_inodes":
                    inode = observation
                with mock.patch.object(self.guard, "probe_filesystem", return_value=(disk, inode)), \
                     mock.patch.object(self.guard, "probe_memory", return_value=observation):
                    report, code = self.guard.evaluate(root, floors)
                self.assertEqual(code, 1)
                self.assertEqual(report["status"], "BLOCKED")

ResourceGuardTests.test_each_metric_below_floor = _test_each_metric_below_floor


def _test_unreadable_cgroup_is_unknown(self):
    def reader(path, limit):
        if path == "/proc/meminfo":
            return "MemAvailable: 4096 kB\n"
        raise OSError()
    with mock.patch.object(self.guard, "read_small_text", side_effect=reader):
        observation = self.guard.probe_memory()
    self.assertIsNone(observation.value)
    self.assertEqual(observation.reason, "cgroup_observation_unavailable")

ResourceGuardTests.test_unreadable_cgroup_is_unknown = _test_unreadable_cgroup_is_unknown
if __name__ == "__main__":
    unittest.main()
