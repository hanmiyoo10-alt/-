import os
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "workspace-doctor.sh"


def run_doctor(path=None):
    env = os.environ.copy()
    env["WSL_DISTRO_NAME"] = "Ubuntu-24.04"
    args = ["bash", str(SCRIPT)]
    if path is not None:
        args.append(path)
    completed = subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    receipt = {}
    for line in completed.stdout.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            receipt[key] = value
    return completed, receipt


class WslWorkspaceDoctorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SCRIPT.read_text(encoding="utf-8")

    def test_linux_home_path_passes_without_claiming_filesystem_type(self):
        completed, receipt = run_doctor("/home/alice/project")
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(receipt["environment"], "wsl")
        self.assertEqual(receipt["path_kind"], "not_windows_drive_mount")
        self.assertEqual(receipt["result"], "pass")
        self.assertEqual(receipt["reason"], "NO_WINDOWS_DRIVE_MOUNT_DETECTED")

    def test_windows_c_drive_mount_warns(self):
        completed, receipt = run_doctor("/mnt/c/Users/alice/project")
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(receipt["path_kind"], "windows_drive_mount")
        self.assertEqual(receipt["result"], "warn")
        self.assertEqual(receipt["reason"], "WINDOWS_DRIVE_MOUNT")
        self.assertEqual(receipt["recommendation"], "prefer_wsl_linux_filesystem")

    def test_other_drive_root_warns(self):
        _, receipt = run_doctor("/mnt/d")
        self.assertEqual(receipt["result"], "warn")

    def test_similarly_named_mnt_directory_is_not_misclassified_as_drive(self):
        _, receipt = run_doctor("/mnt/cache/project")
        self.assertEqual(receipt["result"], "pass")

    def test_non_wsl_contract_is_explicit(self):
        self.assertIn("'non_wsl' 'unknown' 'none' 'not_applicable' 'NOT_WSL'", self.source)
        self.assertIn("/proc/sys/kernel/osrelease", self.source)
        self.assertIn("*microsoft*", self.source)

    def test_receipt_withholds_input_path(self):
        completed, receipt = run_doctor("/mnt/c/Users/private-name/secret-project")
        self.assertNotIn("private-name", completed.stdout)
        self.assertNotIn("secret-project", completed.stdout)
        self.assertEqual(receipt["details"], "withheld")

    def test_relative_missing_path_fails_closed(self):
        completed, receipt = run_doctor("definitely-not-a-real-relative-path")
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(receipt["result"], "unknown")
        self.assertEqual(receipt["reason"], "RELATIVE_PATH_UNRESOLVED")


if __name__ == "__main__":
    unittest.main()
