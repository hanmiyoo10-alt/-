import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PS1 = ROOT / "bootstrap.ps1"
README = ROOT / "README.md"


class WslBootstrapContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.script = PS1.read_text(encoding="utf-8")
        cls.readme = README.read_text(encoding="utf-8")

    def block(self, mode: str) -> str:
        match = re.search(
            rf"(?ms)^    '{re.escape(mode)}' \{{(?P<body>.*?)(?=^    '[A-Za-z]+' \{{|^\}}\s*$)",
            self.script,
        )
        self.assertIsNotNone(match, f"missing {mode} block")
        return match.group("body")

    def test_only_one_install_invocation_and_it_is_bounded_official_route(self) -> None:
        invocations = re.findall(r"(?m)^[ \t]*& \$wsl --install\b.*$", self.script)
        self.assertEqual(invocations, [
            "        & $wsl --install --distribution $TargetDistro --no-launch"
        ])
        self.assertIn("$TargetDistro = 'Ubuntu'", self.script)

    def test_check_and_plan_do_not_contain_mutating_wsl_commands(self) -> None:
        forbidden = (
            "--install", "--unregister", "--set-version", "--set-default",
            "--set-default-version", "--update", "--shutdown", "--terminate",
            "--web-download",
        )
        for mode in ("Check", "Plan"):
            body = self.block(mode)
            for token in forbidden:
                self.assertNotIn(token, body, f"{mode} contains {token}")

    def test_install_noop_barrier_precedes_install_invocation(self) -> None:
        body = self.block("Install")
        noop = body.index("action=NOOP")
        invoke = body.index("& $wsl --install")
        self.assertLess(noop, invoke)
        self.assertIn("UBUNTU_WSL2_REGISTERED", body)

    def test_no_destructive_default_conversion_or_hidden_fallback_commands(self) -> None:
        forbidden = (
            "--unregister", "--set-version", "--set-default ",
            "--set-default-version", "--update", "--shutdown", "--terminate",
            "--web-download", "dism.exe", "Enable-WindowsOptionalFeature",
            "wslconfig.exe", "lxrun", "Git Bash", "msys2.exe",
        )
        for token in forbidden:
            self.assertNotIn(token, self.script)

    def test_wsl1_and_uninitialized_wsl2_are_manual_boundaries(self) -> None:
        self.assertIn("Reason = 'UBUNTU_WSL1'", self.script)
        self.assertIn("reason=UBUNTU_NOT_INITIALIZED_OR_NOT_RUNNABLE", self.script)
        self.assertIn("Status = 'MANUAL_BOUNDARY'", self.script)
        self.assertNotIn("--set-version", self.script)

    def test_inventory_is_locale_resistant_for_state_column(self) -> None:
        self.assertIn("@('--list', '--quiet')", self.script)
        self.assertIn("@('--list', '--verbose')", self.script)
        self.assertNotIn("Running|Stopped", self.script)
        self.assertRegex(self.script, r"\(\?<Version>\[12\]\)")

    def test_verify_requires_wsl2_and_real_shell_probe(self) -> None:
        self.assertIn("if ($ubuntu.Version -eq 1)", self.script)
        self.assertIn("Test-RepoUbuntuRunnable", self.script)
        self.assertIn("'/bin/sh', '-c', 'id -u'", self.script)
        verify = self.block("Verify")
        self.assertIn("Test-RepoUbuntuRunnable", verify)
        self.assertIn("shell_probe=PASS", verify)
        self.assertIn("wsl_version=2", verify)

    def test_check_plan_and_install_do_not_launch_a_distribution(self) -> None:
        for mode in ("Check", "Plan", "Install"):
            body = self.block(mode)
            self.assertNotIn("Test-RepoUbuntuRunnable", body, mode)
            self.assertNotIn("--exec", body, mode)
        self.assertIn("Test-RepoUbuntuRunnable", self.block("Verify"))

    def test_supported_windows_build_floor_is_explicit(self) -> None:
        self.assertIn("$MinimumSupportedBuild = 19041", self.script)
        self.assertIn("WINDOWS_BUILD_TOO_OLD", self.script)
        self.assertIn("NON_WINDOWS", self.script)

    def test_install_does_not_self_elevate_or_reboot(self) -> None:
        body = self.block("Install")
        self.assertIn("Test-RepoAdministrator", body)
        for token in ("Start-Process", "runas", "Restart-Computer", "shutdown.exe"):
            self.assertNotIn(token, body)

    def test_explicit_failure_paths_keep_script_owned_exit_codes(self) -> None:
        self.assertNotIn("Write-Error", self.script)
        self.assertIn("[Console]::Error.WriteLine", self.script)
        self.assertIn("Status = 'UNSUPPORTED'; Reason = 'WSL_COMMAND_MISSING'", self.script)

    def test_readme_preserves_manual_and_git_bash_boundaries(self) -> None:
        self.assertIn("Git Bash / MSYS2 is not a repository-standard lane", self.readme)
        self.assertIn("does not silently switch to the manual legacy installation procedure", self.readme)
        self.assertIn("never self-elevates", self.readme)
        self.assertIn("must never invoke or install WSL", self.readme)


if __name__ == "__main__":
    unittest.main()
