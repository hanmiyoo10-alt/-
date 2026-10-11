from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import fast_boot
import taskbridge
from store import Store


class FastBootTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.state_dir = self.root / "state"
        self.store = Store(self.state_dir)
        self.taskbridge_script = self.root / "taskbridge.py"
        self.coordinator = self.root / "coordinator.py"
        self.taskbridge_script.write_text("# taskbridge\n")
        self.coordinator.write_text("# coordinator\n")

    def tearDown(self):
        self.tmp.cleanup()

    def test_version_is_043(self):
        self.assertEqual(taskbridge.VERSION, "0.4.3")

    def test_render_boot_script_uses_fast_launcher(self):
        text = taskbridge.render_boot_script(self.taskbridge_script, self.store)
        self.assertIn("fast_boot.py", text)
        self.assertIn("boot_script_enter", text)
        self.assertIn("boot.trace", text)
        self.assertIn("--taskbridge-script", text)
        self.assertNotIn(f"{self.taskbridge_script} --state-dir", text)

    def test_boot_status_reports_fast_mode(self):
        home = self.root / "home"
        taskbridge.install_boot_script(self.taskbridge_script, self.store, home=home)
        data = taskbridge.boot_status(home=home)
        self.assertTrue(data["installed"])
        self.assertEqual(data["mode"], fast_boot.BOOT_MODE)

    def test_launcher_reuses_verified_existing_coordinator(self):
        self.store.set_meta("daemon_pid", "777")
        with patch("fast_boot.coordinator_identity_matches", return_value=True), patch(
            "fast_boot.subprocess.Popen"
        ) as popen:
            pid = fast_boot.launch_coordinator(self.state_dir, self.taskbridge_script)
        self.assertEqual(pid, 777)
        popen.assert_not_called()

    def test_launcher_replaces_stale_or_reused_pid_without_signalling_it(self):
        self.store.set_meta("daemon_pid", "10516")
        fake = SimpleNamespace(pid=4321)
        with patch("fast_boot.coordinator_identity_matches", return_value=False), patch(
            "fast_boot.subprocess.Popen", return_value=fake
        ) as popen:
            pid = fast_boot.launch_coordinator(self.state_dir, self.taskbridge_script)

        self.assertEqual(pid, 4321)
        self.assertEqual(Store(self.state_dir).get_meta("daemon_pid"), "4321")
        args = popen.call_args.args[0]
        self.assertEqual(Path(args[1]).name, "coordinator.py")
        self.assertIn("--state-dir", args)
        self.assertTrue(popen.call_args.kwargs["start_new_session"])
        self.assertTrue((self.state_dir / "boot.trace").exists())

    def test_identity_requires_coordinator_cmdline(self):
        target = self.coordinator.resolve()
        with patch("fast_boot.read_cmdline", return_value=[sys.executable, str(target), "--state-dir", "x"]):
            self.assertTrue(fast_boot.coordinator_identity_matches(123, target))
        with patch("fast_boot.read_cmdline", return_value=[sys.executable, "other.py"]):
            self.assertFalse(fast_boot.coordinator_identity_matches(123, target))


if __name__ == "__main__":
    unittest.main()
