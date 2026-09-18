from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m

GOOD = (
    b"priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=false\n"
    b"com.openai.chatgpt/.MainActivity\n"
)

class LaunchRunner:
    def __init__(self, resolver=GOOD, resolver_code=0, launch_code=0):
        self.resolver = resolver
        self.resolver_code = resolver_code
        self.launch_code = launch_code
        self.calls = []

    def run(self, args, timeout=12, max_output=65536):
        self.calls.append(tuple(args))
        if args == ["devices"]:
            return 0, b"List of devices attached\nserial-1\tdevice\n"
        if args[-2:] == ["getprop", "ro.product.model"]:
            return 0, b"SM-G998N\n"
        if "resolve-activity" in args:
            return self.resolver_code, self.resolver
        if "am" in args and "start" in args:
            return self.launch_code, b""
        return 2, b""

def launch_calls(runner):
    return [call for call in runner.calls if "am" in call and "start" in call]

class LaunchRepairTests(unittest.TestCase):
    def test_realistic_resolver_output_launches_explicit_component(self):
        runner = LaunchRunner()
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=launched", receipt)
        self.assertEqual(
            launch_calls(runner),
            [(
                "-s", "serial-1", "shell", "am", "start",
                "-a", "android.intent.action.MAIN",
                "-c", "android.intent.category.LAUNCHER",
                "-n", "com.openai.chatgpt/.MainActivity",
            )],
        )
        self.assertNotIn("MainActivity", receipt)
        self.assertNotIn("priority=", receipt)
        self.assertNotIn("serial-1", receipt)

    def test_other_package_component_is_blocked_without_launch(self):
        runner = LaunchRunner(resolver=b"com.example.other/.MainActivity\n")
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_zero_component_is_blocked_without_launch(self):
        runner = LaunchRunner(resolver=b"priority=0 preferredOrder=0\n")
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_multiple_components_are_blocked_without_launch(self):
        runner = LaunchRunner(
            resolver=(
                b"com.openai.chatgpt/.MainActivity\n"
                b"com.openai.chatgpt/.OtherActivity\n"
            )
        )
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_malformed_component_is_blocked_without_launch(self):
        runner = LaunchRunner(resolver=b"com.openai.chatgpt/../../Other\n")
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_resolver_failure_is_unknown_without_launch(self):
        runner = LaunchRunner(resolver_code=1)
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=unknown", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_launch_failure_is_unknown(self):
        runner = LaunchRunner(launch_code=1)
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=unknown", receipt)
        self.assertEqual(len(launch_calls(runner)), 1)

if __name__ == "__main__":
    unittest.main()
