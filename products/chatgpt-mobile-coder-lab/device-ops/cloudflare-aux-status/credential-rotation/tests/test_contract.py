import importlib.machinery
import importlib.util
import json
import os
import secrets
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve()
SCRIPT = HERE.parents[1] / "mcl-cloudflare-aux-status-rotate"

def load_owner():
    loader = importlib.machinery.SourceFileLoader("mcl_cf_rotation", str(SCRIPT))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    loader.exec_module(module)
    return module

M = load_owner()

class FakeBackend:
    def __init__(self, old_password):
        self.old_password = old_password
        self.live_password = old_password
        self.accept_old_too = False
        self.fail_create = False
        self.fail_deploy = False
        self.deploy_changes_before_error = False
        self.fail_rollback = False
        self.fail_new_auth = False
        self.deployments = 2
        self.versions = {"old-a", "old-b"}
        self.current = "old-b"
        self.version_password = {"old-b": old_password}
        self.sequence = 0
        self.rollback_calls = 0
    def auth(self):
        return None

    def inventory(self):
        return M.Inventory(self.deployments, frozenset(self.versions), self.current)

    def probe(self, _hostname, password):
        accepted = password == self.live_password
        if self.accept_old_too and password == self.old_password:
            accepted = True
        if self.fail_new_auth and password != self.old_password:
            accepted = False
        return M.Probe(
            anonymous_status=401,
            basic_challenge=True,
            health_status=200 if accepted else 401,
            health_contract=accepted,
            capabilities_status=200 if accepted else 401,
            capabilities_contract=accepted,
        )

    def create_secret_version(self, password):
        if self.fail_create:
            raise M.RotationError("VERSION_CREATE_FAILED")
        self.sequence += 1
        new_id = f"new-{self.sequence}"
        self.versions.add(new_id)
        self.version_password[new_id] = password

    def deploy_version(self, version_id):
        if self.fail_deploy and not self.deploy_changes_before_error:
            raise M.RotationError("DEPLOY_FAILED")
        self.current = version_id
        self.deployments += 1
        self.live_password = self.version_password[version_id]
        if self.fail_deploy:
            raise M.RotationError("DEPLOY_ACK_FAILED")

    def rollback_version(self, version_id):
        self.rollback_calls += 1
        if self.fail_rollback:
            raise M.RotationError("ROLLBACK_FAILED", unknown=True)
        self.current = version_id
        self.deployments += 1
        self.live_password = self.version_password[version_id]
        self.accept_old_too = False

class Fixture:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.home = root / "home"
        self.home.mkdir()
        os.chmod(self.home, 0o700)
        self.state = self.home / ".local/state/mcl/cloudflare-aux-status"
        self.state.mkdir(parents=True)
        for path in (
            self.home / ".local",
            self.home / ".local/state",
            self.home / ".local/state/mcl",
            self.state,
        ):
            os.chmod(path, 0o700)
        source_root = self.home / "source/cloudflare-aux-status"
        source_root.mkdir(parents=True)
        os.chmod(self.home / "source", 0o700)
        os.chmod(source_root, 0o700)
        self.source_config = source_root / "wrangler.jsonc"
        self.source_config.write_text(json.dumps({
            "name": M.WORKER_NAME,
            "workers_dev": False,
            "preview_urls": False,
            "secrets": {"required": [M.SECRET_NAME]},
        }))
        self.profile = M.Profile(
            home=self.home,
            state_dir=self.state,
            current_credential=self.state / "MCL_STATUS_PASSWORD",
            candidate_credential=self.state / "MCL_STATUS_PASSWORD.next",
            previous_credential=self.state / "MCL_STATUS_PASSWORD.previous",
            hostname_file=self.state / "custom-domain-hostname",
            rotation_lock=self.state / "credential-rotation.lock",
            source_config=self.source_config,
        )
        self.old = secrets.token_urlsafe(32)
        M._atomic_write(self.profile.current_credential, self.old, self.profile)
        M._atomic_write(self.profile.hostname_file, "private.example.invalid", self.profile)
        self.backend = FakeBackend(self.old)

    def close(self):
        self.tmp.cleanup()

class ContractTests(unittest.TestCase):
    def setUp(self):
        self.f = Fixture()

    def tearDown(self):
        self.f.close()

    def candidate(self):
        return secrets.token_urlsafe(32)

    def test_check_pass_is_read_only(self):
        before = sorted(p.name for p in self.f.state.iterdir())
        result, context = M.check(self.f.profile, self.f.backend)
        after = sorted(p.name for p in self.f.state.iterdir())
        self.assertEqual(result["result"], "pass")
        self.assertIsNotNone(context)
        self.assertEqual(before, after)
        self.assertFalse(self.f.profile.rotation_lock.exists())

    def test_missing_and_drifted_current_custody_block(self):
        self.f.profile.current_credential.unlink()
        result, _ = M.check(self.f.profile, self.f.backend)
        self.assertEqual(result["result"], "blocked")
        M._atomic_write(self.f.profile.current_credential, self.f.old, self.f.profile)
        os.chmod(self.f.profile.current_credential, 0o644)
        result, _ = M.check(self.f.profile, self.f.backend)
        self.assertEqual(result["result"], "blocked")

    def test_recovery_material_blocks_clean_check(self):
        M._atomic_write(self.f.profile.candidate_credential, self.candidate(), self.f.profile)
        result, _ = M.check(self.f.profile, self.f.backend)
        self.assertEqual(result["result"], "blocked")
        self.assertIn("RECOVERY_MATERIAL_PRESENT", result["reason"])
    def test_version_create_failure_preserves_current(self):
        self.f.backend.fail_create = True
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["result"], "blocked")
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), self.f.old)
        self.assertFalse(self.f.profile.candidate_credential.exists())

    def test_deploy_failure_without_traffic_change_preserves_current(self):
        self.f.backend.fail_deploy = True
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["deployment"], "blocked")
        self.assertEqual(result["reason"], "DEPLOY_FAILED_NO_TRAFFIC_CHANGE")
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), self.f.old)

    def test_new_auth_failure_rolls_back(self):
        self.f.backend.fail_new_auth = True
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["deployment"], "rolled_back")
        self.assertEqual(self.f.backend.rollback_calls, 1)
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), self.f.old)

    def test_old_auth_still_valid_rolls_back(self):
        self.f.backend.accept_old_too = True
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["deployment"], "rolled_back")
        self.assertEqual(result["reason"], "OLD_AUTH_STILL_VALID_ROLLED_BACK")
        self.assertEqual(self.f.backend.rollback_calls, 1)

    def test_successful_rotation(self):
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["result"], "pass")
        self.assertEqual(result["custody"], "rotated")
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), new)
        self.assertFalse(self.f.profile.candidate_credential.exists())
        self.assertFalse(self.f.profile.previous_credential.exists())
        self.assertEqual(self.f.backend.rollback_calls, 0)

    def test_second_rotation_works_with_persistent_lock_file(self):
        first = self.candidate()
        second = self.candidate()
        result1 = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: first)
        result2 = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: second)
        self.assertEqual(result1["result"], "pass")
        self.assertEqual(result2["result"], "pass")
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), second)
    def test_rollback_ambiguity_preserves_recovery_material(self):
        self.f.backend.fail_new_auth = True
        self.f.backend.fail_rollback = True
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["result"], "unknown")
        self.assertTrue(self.f.profile.candidate_credential.exists())
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), self.f.old)

    def test_custody_promotion_failure_rolls_back(self):
        new = self.candidate()
        original_replace = M.os.replace

        def fail_candidate(src, dst):
            if Path(src) == self.f.profile.candidate_credential and Path(dst) == self.f.profile.current_credential:
                raise OSError("synthetic promotion failure")
            return original_replace(src, dst)

        with mock.patch.object(M.os, "replace", side_effect=fail_candidate):
            result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        self.assertEqual(result["deployment"], "rolled_back")
        self.assertEqual(result["reason"], "CUSTODY_PROMOTION_FAILED_ROLLED_BACK")
        self.assertEqual(M._read_private(self.f.profile.current_credential, self.f.profile), self.f.old)

    def test_receipt_redacts_generated_credentials(self):
        new = self.candidate()
        result = M.rotate(self.f.profile, self.f.backend, password_factory=lambda _n: new)
        rendered = M.render_receipt(result)
        self.assertNotIn(self.f.old, rendered)
        self.assertNotIn(new, rendered)
        self.assertNotIn("private.example.invalid", rendered)

    def test_argument_contract_is_exact(self):
        with mock.patch.object(M, "check") as check_mock:
            code = M.main(["--bogus"])
        self.assertEqual(code, 64)
        check_mock.assert_not_called()

if __name__ == "__main__":
    unittest.main()
