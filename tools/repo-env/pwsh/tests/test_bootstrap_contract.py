import os
import pathlib
import stat
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SH = ROOT / "bootstrap.sh"
PS1 = ROOT / "bootstrap.ps1"
README = ROOT / "README.md"


def make_executable(path: pathlib.Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class BootstrapContractTests(unittest.TestCase):
    def run_sh(self, mode: str, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["/bin/sh", str(SH), mode],
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )

    def test_satisfied_pwsh_install_is_noop_before_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            bindir = pathlib.Path(td)
            marker = bindir / "MUTATED"
            make_executable(bindir / "pwsh", "#!/bin/sh\nprintf '7.6.6\\n'\n")
            for name in ("sudo", "apt-get", "dpkg", "wget", "curl", "installer"):
                make_executable(
                    bindir / name,
                    f"#!/bin/sh\nprintf '%s\\n' {name!r} >> {str(marker)!r}\nexit 91\n",
                )
            env = os.environ.copy()
            env["PATH"] = f"{bindir}:{env.get('PATH', '')}"
            result = self.run_sh("install", env)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("action=NOOP", result.stdout)
            self.assertIn("reason=ALREADY_SATISFIED", result.stdout)
            self.assertFalse(marker.exists(), marker.read_text() if marker.exists() else "")

    def test_verify_missing_is_non_mutating_failure(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            env = os.environ.copy()
            env["PATH"] = td
            result = self.run_sh("verify", env)
            self.assertEqual(result.returncode, 3)
            self.assertIn("status=MISSING", result.stderr)

    def test_termux_install_fails_closed_without_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            bindir = pathlib.Path(td)
            marker = bindir / "MUTATED"
            for name in ("sudo", "apt-get", "dpkg", "wget", "curl", "installer"):
                make_executable(
                    bindir / name,
                    f"#!/bin/sh\nprintf '%s\\n' {name!r} >> {str(marker)!r}\nexit 91\n",
                )
            env = os.environ.copy()
            env["PATH"] = f"{bindir}:/usr/bin:/bin"
            env["REPO_PWSH_TESTING"] = "1"
            env["REPO_PWSH_TEST_ROUTE"] = "termux-community"
            result = self.run_sh("install", env)
            self.assertEqual(result.returncode, 4)
            self.assertIn("community/unsupported", result.stderr)
            self.assertFalse(marker.exists(), marker.read_text() if marker.exists() else "")

    def test_supported_routes_plan_without_installing(self) -> None:
        for route in ("debian-pmc", "ubuntu-pmc", "macos-official-pkg"):
            with self.subTest(route=route), tempfile.TemporaryDirectory() as td:
                env = os.environ.copy()
                env["PATH"] = f"{td}:/usr/bin:/bin"
                env["REPO_PWSH_TESTING"] = "1"
                env["REPO_PWSH_TEST_ROUTE"] = route
                result = self.run_sh("plan", env)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("action=INSTALL", result.stdout)
                self.assertIn("support=SUPPORTED", result.stdout)
                self.assertIn(f"route={route}", result.stdout)

    def test_windows_script_has_noop_barrier_before_winget_lookup(self) -> None:
        text = PS1.read_text(encoding="utf-8")
        install_block = text.index("'Install' {")
        noop = text.index("action=NOOP", install_block)
        winget = text.index("Get-Command winget.exe", install_block)
        self.assertLess(noop, winget)
        self.assertIn("Microsoft.PowerShell", text)
        self.assertIn("--installer-type", text)
        self.assertIn("'Wix'", text)

    def test_documented_contract_forbids_automatic_reinstall_or_upgrade(self) -> None:
        text = README.read_text(encoding="utf-8")
        self.assertIn("action=NOOP", text)
        self.assertIn("It does not auto-upgrade", text)
        self.assertIn("Cloning or opening the repository never installs anything automatically", text)
        self.assertIn("Termux / Android", text)


if __name__ == "__main__":
    unittest.main()
