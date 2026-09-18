from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m

FIXTURE = (Path(__file__).resolve().parent / "fixtures" / "chatgpt_unique.xml").read_bytes()

class FakeRunner:
    def __init__(self, devices=b"List of devices attached\nserial-1\tdevice\n", model=b"SM-G998N\n", xml=FIXTURE, cleanup=0):
        self.devices = devices
        self.model = model
        self.xml = xml
        self.cleanup = cleanup
        self.calls = []

    def run(self, args, timeout=12, max_output=65536):
        self.calls.append(tuple(args))
        if args == ["devices"]:
            return 0, self.devices
        if args[-2:] == ["getprop", "ro.product.model"]:
            return 0, self.model
        if "uiautomator" in args:
            return 0, b"UI hierarchy dumped"
        if args[-3:] == ["exec-out", "cat", m.REMOTE_XML]:
            return 0, self.xml
        if args[-4:] == ["shell", "rm", "-f", m.REMOTE_XML]:
            return self.cleanup, b""
        return 2, b""

class RuntimeTests(unittest.TestCase):
    def test_snapshot_receipt_suppresses_raw_ui_and_identity(self):
        runner = FakeRunner()
        receipt = "\n".join(m.snapshot_receipt(m.AdbClient(runner)))
        self.assertIn("connection=connected", receipt)
        self.assertIn("model=match", receipt)
        self.assertIn("target_package=present", receipt)
        self.assertIn("cleanup=pass", receipt)
        for forbidden in ("serial-1", "Conversation body", "user@example.com", "<hierarchy"):
            self.assertNotIn(forbidden, receipt)

    def test_runtime_uses_only_fixed_adb_shapes(self):
        runner = FakeRunner()
        m.snapshot_receipt(m.AdbClient(runner))
        self.assertEqual(runner.calls[0], ("devices",))
        self.assertEqual(
            runner.calls[1],
            ("-s", "serial-1", "shell", "getprop", "ro.product.model"),
        )
        self.assertEqual(
            runner.calls[2],
            ("-s", "serial-1", "shell", "uiautomator", "dump", m.REMOTE_XML),
        )
        self.assertEqual(
            runner.calls[3],
            ("-s", "serial-1", "exec-out", "cat", m.REMOTE_XML),
        )
        self.assertEqual(
            runner.calls[4],
            ("-s", "serial-1", "shell", "rm", "-f", m.REMOTE_XML),
        )

    def test_multiple_connected_devices_are_ambiguous_without_probe(self):
        runner = FakeRunner(devices=b"List of devices attached\na\tdevice\nb\tdevice\n")
        receipt = "\n".join(m.status_receipt(m.AdbClient(runner)))
        self.assertIn("connection=ambiguous", receipt)
        self.assertEqual(runner.calls, [("devices",)])

    def test_model_mismatch_fails_closed(self):
        runner = FakeRunner(model=b"OTHER\n")
        receipt = "\n".join(m.snapshot_receipt(m.AdbClient(runner)))
        self.assertIn("model=mismatch", receipt)
        self.assertIn("snapshot=none", receipt)
        self.assertEqual(len(runner.calls), 2)

    def test_cleanup_failure_is_visible(self):
        runner = FakeRunner(cleanup=1)
        receipt = "\n".join(m.snapshot_receipt(m.AdbClient(runner)))
        self.assertIn("cleanup=fail", receipt)

    def test_find_receipt_also_reports_cleanup(self):
        runner = FakeRunner(cleanup=1)
        receipt = "\n".join(m.find_receipt(m.AdbClient(runner), "action", "New chat"))
        self.assertIn("result=found", receipt)
        self.assertIn("cleanup=fail", receipt)

if __name__ == "__main__":
    unittest.main()
