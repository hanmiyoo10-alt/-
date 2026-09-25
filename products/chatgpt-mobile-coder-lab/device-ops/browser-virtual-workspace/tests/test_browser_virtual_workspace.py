from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
MODULE_PATH = HERE / "mcl_browser_virtual_workspace.py"
spec = importlib.util.spec_from_file_location("mcl_browser_virtual_workspace", MODULE_PATH)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def activity_dump(display_id: int = 6) -> str:
    return f"""Display #{display_id} (activities from top to bottom):
    topResumedActivity=ActivityRecord{{1 u0 com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity t1}}
Display #0 (activities from top to bottom):
    topResumedActivity=ActivityRecord{{2 u0 com.android.chrome/org.chromium.chrome.browser.webapps.SameTaskWebApkActivity t2}}
"""


class FakeProc:
    pid = 4242

    def poll(self):
        return None


class FakeRuntime:
    def __init__(self) -> None:
        self.state = None
        self.saved = None
        self.cleared = False
        self.forward_created = False
        self.forward_removed = False
        self.signal_count = 0
        self.launch_count = 0
        self.mutations = 0
        self.display_calls = 0
        self.initial_displays = {0}
        self.targets_calls = 0
        self.proc_cmdline = ["scrcpy", "-s", "opaque-device", *mod.SCRCPY_ARGS]

    def load_state(self):
        return self.state

    def require_command(self, name):
        assert name in {"adb", "scrcpy", "python3"}

    def resolve_serial(self):
        return "opaque-device"

    def displays(self, serial):
        assert serial == "opaque-device"
        self.display_calls += 1
        if self.state is not None and self.cleared:
            return {0}
        if self.signal_count:
            return {0}
        if self.display_calls == 1:
            return set(self.initial_displays)
        return {0, 6}

    def forward_in_use(self):
        return False

    def start_scrcpy(self, serial):
        assert serial == "opaque-device"
        self.mutations += 1
        return FakeProc()

    def wait_display_id(self, proc):
        assert proc.pid == 4242
        return 6

    def create_forward(self, serial):
        assert serial == "opaque-device"
        self.forward_created = True
        self.mutations += 1

    def remove_forward(self, serial):
        assert serial == "opaque-device"
        self.forward_removed = True
        self.mutations += 1

    def list_targets(self):
        self.targets_calls += 1
        if self.targets_calls == 1:
            return [{"id": "AAAAAAAA", "type": "page", "url": "https://chatgpt.com/"}]
        return [
            {"id": "AAAAAAAA", "type": "page", "url": "https://chatgpt.com/"},
            {"id": "6585", "type": "page", "url": mod.COLAB_ROOT},
        ]

    def launch_chrome(self, serial, display_id):
        assert serial == "opaque-device"
        assert display_id == 6
        self.launch_count += 1
        self.mutations += 1

    def activities(self, serial):
        assert serial == "opaque-device"
        return activity_dump()

    def save_state(self, state):
        self.saved = dict(state)
        self.state = dict(state)
        self.mutations += 1

    def process_cmdline(self, pid):
        assert pid == 4242
        if self.signal_count:
            return None
        return list(self.proc_cmdline)

    def signal_int(self, pid):
        assert pid == 4242
        self.signal_count += 1
        self.mutations += 1

    def wait_process_exit(self, pid):
        assert pid == 4242
        return True

    def clear_state(self):
        self.cleared = True
        self.state = None
        self.mutations += 1


class BrowserVirtualWorkspaceTest(unittest.TestCase):
    def test_fixed_commands_are_narrow(self):
        scrcpy = mod.build_scrcpy_command("opaque")
        self.assertEqual(scrcpy[:3], ["scrcpy", "-s", "opaque"])
        self.assertIn("--new-display=720x1280/240", scrcpy)
        self.assertIn("--record=/dev/null", scrcpy)
        self.assertIn("--no-window", scrcpy)
        self.assertIn("--no-audio", scrcpy)
        self.assertIn("--no-clipboard-autosync", scrcpy)
        self.assertNotIn("--display-id=0", scrcpy)

        chrome = mod.build_chrome_command("opaque", 6)
        self.assertIn("--display", chrome)
        self.assertEqual(chrome[chrome.index("--display") + 1], "6")
        self.assertEqual(chrome[chrome.index("-d") + 1], mod.COLAB_ROOT)
        self.assertEqual(chrome[chrome.index("-f") + 1], "0x18080000")
        self.assertNotIn("force-stop", " ".join(chrome))

    def test_adb_model_must_be_unique_and_exact(self):
        good = """List of devices attached
serial-1 device product:x model:SM-S938N device:y transport_id:1
"""
        self.assertEqual(mod.parse_adb_devices(good), "serial-1")
        with self.assertRaises(mod.WorkspaceError):
            mod.parse_adb_devices(
                "List of devices attached\nserial-1 device model:OTHER transport_id:1\n"
            )
        with self.assertRaises(mod.WorkspaceError):
            mod.parse_adb_devices(good + "serial-2 device model:SM-S938N transport_id:2\n")
        with self.assertRaises(mod.WorkspaceError):
            mod.parse_adb_devices(good + "other device model:OTHER transport_id:2\n")

    def test_display_parser_rejects_missing_or_ambiguous(self):
        self.assertEqual(
            mod.parse_created_display_id(
                "[server] INFO: New display: 720x1280/240 (id=6)\n"
            ),
            6,
        )
        with self.assertRaises(mod.WorkspaceError):
            mod.parse_created_display_id("no display here")
        with self.assertRaises(mod.WorkspaceError):
            mod.parse_created_display_id(
                "New display: x (id=6)\nNew display: y (id=7)\n"
            )

    def test_start_refuses_preexisting_nonzero_display(self):
        runtime = FakeRuntime()
        runtime.initial_displays = {0, 9}
        with self.assertRaisesRegex(mod.WorkspaceError, "display-baseline-conflict"):
            mod.run_start(runtime)
        self.assertEqual(runtime.mutations, 0)

    def test_start_rejects_multiple_new_displays(self):
        runtime = FakeRuntime()
        calls = {"count": 0}

        def displays(serial):
            assert serial == "opaque-device"
            calls["count"] += 1
            return {0} if calls["count"] == 1 else {0, 6, 7}

        runtime.displays = displays
        with self.assertRaisesRegex(mod.WorkspaceError, "display-admission-failed"):
            mod.run_start(runtime)
        self.assertGreaterEqual(runtime.signal_count, 1)

    def test_pid_ownership_binds_current_device(self):
        good = ["scrcpy", "-s", "opaque-device", *mod.SCRCPY_ARGS]
        self.assertTrue(mod.is_owned_scrcpy_cmdline(good, "opaque-device"))
        self.assertFalse(mod.is_owned_scrcpy_cmdline(good, "different-device"))

    def test_start_materializes_only_virtual_workspace(self):
        runtime = FakeRuntime()
        receipt = mod.run_start(runtime)
        self.assertIn("state=running", receipt)
        self.assertIn("display_id=6", receipt)
        self.assertIn("bound_target=present", receipt)
        self.assertTrue(runtime.forward_created)
        self.assertEqual(runtime.launch_count, 1)
        self.assertEqual(runtime.saved["marker"], mod.MARKER)
        self.assertEqual(runtime.saved["target_id"], "6585")
        self.assertNotIn("opaque-device", receipt)
        self.assertNotIn("colab.research.google.com", receipt)

    def test_start_refuses_existing_state_without_effect(self):
        runtime = FakeRuntime()
        runtime.state = {
            "marker": mod.MARKER,
            "pid": 4242,
            "display_id": 6,
            "target_id": "6585",
            "started_at": "2026-09-25T00:00:00Z",
            "forward_port": mod.FORWARD_PORT,
        }
        with self.assertRaisesRegex(mod.WorkspaceError, "existing-state"):
            mod.run_start(runtime)
        self.assertEqual(runtime.mutations, 0)

    def test_status_is_read_only(self):
        runtime = FakeRuntime()
        runtime.state = {
            "marker": mod.MARKER,
            "pid": 4242,
            "display_id": 6,
            "target_id": "6585",
            "started_at": "2026-09-25T00:00:00Z",
            "forward_port": mod.FORWARD_PORT,
        }
        runtime.display_calls = 1
        runtime.targets_calls = 1
        receipt = mod.run_status(runtime)
        self.assertIn("state=running", receipt)
        self.assertEqual(runtime.mutations, 0)

    def test_status_missing_bound_target_is_absent_not_exception(self):
        runtime = FakeRuntime()
        runtime.state = {
            "marker": mod.MARKER,
            "pid": 4242,
            "display_id": 6,
            "target_id": "BEEF",
            "started_at": "2026-09-25T00:00:00Z",
            "forward_port": mod.FORWARD_PORT,
        }
        runtime.display_calls = 1
        runtime.targets_calls = 1
        receipt = mod.run_status(runtime)
        self.assertIn("state=running", receipt)
        self.assertIn("bound_target=absent", receipt)

    def test_stop_is_idempotent_when_absent(self):
        runtime = FakeRuntime()
        receipt = mod.run_stop(runtime)
        self.assertIn("state=stopped", receipt)
        self.assertEqual(runtime.mutations, 0)

    def test_stop_refuses_pid_command_mismatch(self):
        runtime = FakeRuntime()
        runtime.state = {
            "marker": mod.MARKER,
            "pid": 4242,
            "display_id": 6,
            "target_id": "6585",
            "started_at": "2026-09-25T00:00:00Z",
            "forward_port": mod.FORWARD_PORT,
        }
        runtime.proc_cmdline = ["python3", "unrelated.py"]
        with self.assertRaisesRegex(mod.WorkspaceError, "pid-command-mismatch"):
            mod.run_stop(runtime)
        self.assertEqual(runtime.signal_count, 0)
        self.assertFalse(runtime.forward_removed)

    def test_stop_signals_only_owned_scrcpy_and_cleans_owner_state(self):
        runtime = FakeRuntime()
        runtime.state = {
            "marker": mod.MARKER,
            "pid": 4242,
            "display_id": 6,
            "target_id": "6585",
            "started_at": "2026-09-25T00:00:00Z",
            "forward_port": mod.FORWARD_PORT,
        }
        receipt = mod.run_stop(runtime)
        self.assertIn("state=stopped", receipt)
        self.assertEqual(runtime.signal_count, 1)
        self.assertTrue(runtime.forward_removed)
        self.assertTrue(runtime.cleared)

    def test_receipt_schema_is_bounded(self):
        receipt = mod.bounded_receipt(
            "status",
            "unknown",
            display_id="unknown",
            owner_process="unknown",
            virtual_display="unknown",
            chrome_task="unknown",
            cdp="unknown",
            bound_target="unknown",
        )
        lines = receipt.splitlines()
        self.assertEqual(len(lines), 10)
        self.assertEqual(lines[0], f"schema={mod.SCHEMA}")
        self.assertEqual(lines[-1], "details=withheld")
        joined = "\n".join(lines).lower()
        for forbidden in ("serial", "cookie", "account", "http://", "https://"):
            self.assertNotIn(forbidden, joined)


if __name__ == "__main__":
    unittest.main()
