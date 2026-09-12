import os
import pathlib
import stat
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BOOTSTRAP = ROOT / "bootstrap.sh"
WRAPPER = ROOT / "adb.sh"
README = ROOT / "README.md"


def make_executable(path: pathlib.Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class AdbBootstrapContractTests(unittest.TestCase):
    def run_bootstrap(self, mode: str, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["/bin/sh", str(BOOTSTRAP), mode],
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )

    def test_satisfied_install_is_noop_before_package_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            marker = root / "MUTATED"
            fake_adb = root / "adb"
            make_executable(fake_adb, "#!/bin/sh\nprintf 'Android Debug Bridge version 1.0.41\\n'\n")
            for name in ("pkg", "apt-get"):
                make_executable(
                    root / name,
                    f"#!/bin/sh\nprintf '%s\\n' {name!r} >> {str(marker)!r}\nexit 91\n",
                )

            env = os.environ.copy()
            env["REPO_ADB_TESTING"] = "1"
            env["REPO_ADB_TEST_ADB_PATH"] = str(fake_adb)
            env["PATH"] = f"{root}:{env.get('PATH', '')}"
            result = self.run_bootstrap("install", env)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("action=NOOP", result.stdout)
            self.assertIn("reason=ALREADY_SATISFIED", result.stdout)
            self.assertFalse(marker.exists(), marker.read_text() if marker.exists() else "")

    def test_supported_routes_plan_without_installing(self) -> None:
        cases = {
            "termux-android-tools": "package=android-tools",
            "apt-adb-root": "package=adb",
        }
        for route, package_fragment in cases.items():
            with self.subTest(route=route):
                env = os.environ.copy()
                env["REPO_ADB_TESTING"] = "1"
                env["REPO_ADB_TEST_ADB_PATH"] = "MISSING"
                env["REPO_ADB_TEST_ROUTE"] = route
                result = self.run_bootstrap("plan", env)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("action=INSTALL", result.stdout)
                self.assertIn("support=SUPPORTED", result.stdout)
                self.assertIn(f"route={route}", result.stdout)
                self.assertIn(package_fragment, result.stdout)

    def test_blocked_routes_remain_non_mutating(self) -> None:
        for route, reason in (
            ("apt-adb-admin-required", "ADMIN_REQUIRED"),
            ("termux-root-blocked", "TERMUX_PKG_REFUSES_ROOT"),
            ("unsupported", "NO_AUTHORIZED_ROUTE"),
        ):
            with self.subTest(route=route):
                env = os.environ.copy()
                env["REPO_ADB_TESTING"] = "1"
                env["REPO_ADB_TEST_ADB_PATH"] = "MISSING"
                env["REPO_ADB_TEST_ROUTE"] = route
                result = self.run_bootstrap("plan", env)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("action=BLOCKED", result.stdout)
                self.assertIn(reason, result.stdout)

    def test_termux_wrapper_supplies_writable_tmpdir(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            termux_tmp = root / "termux-tmp"
            termux_tmp.mkdir()
            fake_adb = root / "adb"
            make_executable(fake_adb, "#!/bin/sh\nprintf 'TMPDIR=%s ARGS=%s\\n' \"${TMPDIR:-}\" \"$*\"\n")
            env = os.environ.copy()
            env["REPO_ADB_TESTING"] = "1"
            env["REPO_ADB_TEST_ADB_PATH"] = str(fake_adb)
            env["REPO_ADB_TEST_TERMUX"] = "1"
            env["REPO_ADB_TEST_TERMUX_TMP"] = str(termux_tmp)
            env.pop("TMPDIR", None)
            result = subprocess.run(
                ["/bin/sh", str(WRAPPER), "devices"],
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(f"TMPDIR={termux_tmp}", result.stdout)
            self.assertIn("ARGS=devices", result.stdout)

    def test_documented_contract_keeps_pairing_explicit(self) -> None:
        text = README.read_text(encoding="utf-8")
        self.assertIn("No ADB binaries are committed", text)
        self.assertIn("does not enable Developer Options", text)
        self.assertIn("empty `adb devices` list is not an installation failure", text)


if __name__ == "__main__":
    unittest.main()
