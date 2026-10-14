import contextlib
import fcntl
import importlib.machinery
import importlib.util
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
SCRIPT = HERE.parents[1] / "mcl-l-secure-mcp-tunnel"


def load_owner():
    loader = importlib.machinery.SourceFileLoader("mcl_l_secure_mcp_tunnel", str(SCRIPT))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    loader.exec_module(module)
    return module


M = load_owner()


class Fixture:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory(dir=Path.home())
        root = Path(self.tmp.name)
        self.home = root / "home"
        self.bin_dir = self.home / ".local/libexec/mcl-secure-mcp"
        self.mcp_dir = self.home / ".local/share/mcl-secure-mcp/repo-ci-mcp-venv/bin"
        self.config_dir = self.home / ".config/mcl-secure-mcp"
        self.state_dir = self.home / ".local/state/mcl-secure-mcp"
        for path in (self.bin_dir, self.mcp_dir, self.config_dir, self.state_dir):
            path.mkdir(parents=True, exist_ok=True)
        os.chmod(self.config_dir, 0o700)
        os.chmod(self.state_dir, 0o700)

        self.tunnel = self.bin_dir / "tunnel-client"
        release_sha = "a" * 40
        self.tunnel.write_text(
            "#!/bin/sh\n"
            f"printf '0.0.15+{release_sha} (git sha: {release_sha})\\n'\n"
        )
        os.chmod(self.tunnel, 0o700)

        self.repo_mcp = self.mcp_dir / "repo-ci-mcp"
        self.repo_mcp.write_text("#!/bin/sh\nexit 0\n")
        os.chmod(self.repo_mcp, 0o700)

        self.tunnel_id = self.config_dir / "tunnel-id"
        self.tunnel_id.write_text("tunnel_0123456789abcdef0123456789abcdef\n")
        os.chmod(self.tunnel_id, 0o600)

        self.key = self.config_dir / "runtime-api-key"
        self.key.write_text("secret-fixture-value\n")
        os.chmod(self.key, 0o600)

        self.health = self.state_dir / "health.url"
        self.lock = self.state_dir / "run.lock"
        self.profile = M.Profile(
            tunnel_client=self.tunnel,
            repo_mcp=self.repo_mcp,
            tunnel_id_file=self.tunnel_id,
            runtime_key_file=self.key,
            state_dir=self.state_dir,
            health_url_file=self.health,
            lock_file=self.lock,
            home=self.home,
        )

    def close(self):
        self.tmp.cleanup()


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.f = Fixture()

    def tearDown(self):
        self.f.close()

    def test_exact_fixture_passes_without_secret_output(self):
        receipt, tunnel_id = M.check_profile(self.f.profile)
        text = M.render_receipt(receipt)
        self.assertEqual(receipt["result"], "pass")
        self.assertEqual(receipt["tunnel_client_version"], "0.0.15")
        self.assertNotIn("secret-fixture-value", text)
        self.assertNotIn(tunnel_id, text)

    def test_missing_tunnel_client_is_rejected(self):
        self.f.tunnel.unlink()
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_CLIENT_MISSING", receipt["reason"])

    def test_version_drift_fails_closed(self):
        self.f.tunnel.write_text("#!/bin/sh\nprintf '0.0.16\\n'\n")
        os.chmod(self.f.tunnel, 0o700)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertEqual(receipt["tunnel_client_version"], "unknown")
        self.assertIn("TUNNEL_CLIENT_VERSION_DRIFT", receipt["reason"])

    def test_bare_pinned_semantic_version_is_accepted(self):
        self.f.tunnel.write_text("#!/bin/sh\nprintf '0.0.15\\n'\n")
        os.chmod(self.f.tunnel, 0o700)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "pass")
        self.assertEqual(receipt["tunnel_client_version"], "0.0.15")

    def test_release_version_requires_matching_git_sha(self):
        self.f.tunnel.write_text(
            "#!/bin/sh\nprintf '0.0.15+aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa "
            "(git sha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)\\n'\n"
        )
        os.chmod(self.f.tunnel, 0o700)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertEqual(receipt["tunnel_client_version"], "unknown")
        self.assertIn("TUNNEL_CLIENT_VERSION_DRIFT", receipt["reason"])

    def test_version_probe_output_never_crosses_receipt_boundary(self):
        self.f.tunnel.write_text(
            "#!/bin/sh\nprintf '0.0.16\\nresult=pass\\nsecret-probe-output\\n'\n"
        )
        os.chmod(self.f.tunnel, 0o700)
        receipt, _ = M.check_profile(self.f.profile)
        text = M.render_receipt(receipt)
        self.assertEqual(receipt["result"], "blocked")
        self.assertEqual(receipt["tunnel_client_version"], "unknown")
        self.assertNotIn("secret-probe-output", text)
        self.assertNotIn("result=pass", text)

    def test_group_or_world_writable_executables_are_rejected(self):
        os.chmod(self.f.tunnel, 0o775)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_CLIENT_WRITABLE_BY_OTHERS", receipt["reason"])

        os.chmod(self.f.tunnel, 0o700)
        os.chmod(self.f.repo_mcp, 0o777)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("REPOSITORY_READ_MCP_WRITABLE_BY_OTHERS", receipt["reason"])

    def test_group_or_world_writable_ancestor_is_rejected(self):
        os.chmod(self.f.bin_dir, 0o770)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_CLIENT_ANCESTOR_WRITABLE_BY_OTHERS", receipt["reason"])

    def test_runtime_key_size_is_bounded_before_read(self):
        with self.f.key.open("wb") as handle:
            handle.truncate(1024 * 1024 * 1024)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("RUNTIME_KEY_REF_INVALID", receipt["reason"])

    def test_foreign_owner_is_rejected(self):
        original_ancestor = M._ancestor_problem
        original_getuid = M.os.getuid
        current_uid = original_getuid()
        M._ancestor_problem = lambda _path: None
        M.os.getuid = lambda: current_uid + 1
        try:
            receipt, _ = M.check_profile(self.f.profile)
        finally:
            M.os.getuid = original_getuid
            M._ancestor_problem = original_ancestor
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_CLIENT_FOREIGN_OWNER", receipt["reason"])

    def test_symlinked_tunnel_client_is_rejected(self):
        real = self.f.bin_dir / "real"
        self.f.tunnel.rename(real)
        self.f.tunnel.symlink_to(real)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_CLIENT_SYMLINK", receipt["reason"])

    def test_missing_repo_mcp_is_rejected(self):
        self.f.repo_mcp.unlink()
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("REPOSITORY_READ_MCP_MISSING", receipt["reason"])

    def test_secret_refs_require_private_regular_files(self):
        os.chmod(self.f.key, 0o644)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("RUNTIME_KEY_REF_MODE_INVALID", receipt["reason"])

    def test_tunnel_id_shape_is_fixed(self):
        self.f.tunnel_id.write_text("not-a-tunnel\n")
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("TUNNEL_ID_REF_INVALID", receipt["reason"])

    def test_run_plan_is_fixed_and_contains_no_secret_value(self):
        receipt, argv, env = M.build_run_plan(self.f.profile)
        self.assertEqual(receipt["result"], "starting")
        self.assertEqual(argv[0], str(self.f.tunnel))
        self.assertIn("--health.listen-addr=127.0.0.1:0", argv)
        self.assertIn("--allow-remote-ui=false", argv)
        self.assertIn("--open-web-ui=false", argv)
        self.assertIn(f"--mcp.command={self.f.repo_mcp}", argv)
        self.assertIn(f"--control-plane.api-key=file:{self.f.key}", argv)
        self.assertNotIn("secret-fixture-value", "\n".join(argv))
        self.assertNotIn("secret-fixture-value", "\n".join(f"{k}={v}" for k, v in env.items()))
        self.assertEqual(env["REPO_CI_GITHUB_REPO"], "hanmiyoo10-alt/-")
        self.assertNotIn("GITHUB_TOKEN", env)

    def test_run_removes_only_safe_fixed_health_file(self):
        self.f.health.write_text("http://127.0.0.1:1234\n")
        os.chmod(self.f.health, 0o600)
        captured = {}

        def fake_exec(path, argv, env):
            captured["path"] = path
            captured["argv"] = list(argv)
            captured["env"] = dict(env)

        code = M.main(["--run"], profile=self.f.profile, executor=fake_exec)
        self.assertEqual(code, 0)
        self.assertFalse(self.f.health.exists())
        self.assertTrue(self.f.lock.exists())
        self.assertEqual(self.f.lock.stat().st_mode & 0o777, 0o600)
        self.assertEqual(captured["path"], str(self.f.tunnel))

    def test_run_lock_blocks_a_second_active_instance(self):
        fd = os.open(self.f.lock, os.O_RDWR | os.O_CREAT, 0o600)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            called = []
            with contextlib.redirect_stdout(io.StringIO()) as output:
                code = M.main(
                    ["--run"],
                    profile=self.f.profile,
                    executor=lambda *args: called.append(args),
                )
            self.assertEqual(code, 3)
            self.assertEqual(called, [])
            self.assertIn("reason=RUN_ALREADY_ACTIVE", output.getvalue())
        finally:
            os.close(fd)

    def test_run_lock_fd_is_close_on_exec(self):
        fd = M._acquire_run_lock(self.f.profile)
        try:
            self.assertFalse(os.get_inheritable(fd))
        finally:
            os.close(fd)

    def test_unsafe_existing_lock_file_is_rejected(self):
        self.f.lock.write_text("")
        os.chmod(self.f.lock, 0o666)
        receipt, _ = M.check_profile(self.f.profile)
        self.assertEqual(receipt["result"], "blocked")
        self.assertIn("RUN_LOCK_FILE_MODE_INVALID", receipt["reason"])

    def test_arbitrary_arguments_are_rejected(self):
        self.assertEqual(M.main(["--run", "--command", "sh"], profile=self.f.profile), 64)


if __name__ == "__main__":
    unittest.main()
