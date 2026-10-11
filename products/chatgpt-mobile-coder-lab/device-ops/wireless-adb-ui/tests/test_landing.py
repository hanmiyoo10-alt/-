from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m


GOOD = (
    b"priority=0 preferredOrder=0 match=0x508000 specificIndex=-1 isDefault=true\n"
    b"com.openai.chatgpt/.ChatGptDeeplinkActivity\n"
)


class LandingRunner:
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


def resolver_calls(runner):
    return [call for call in runner.calls if "resolve-activity" in call]


def launch_calls(runner):
    return [call for call in runner.calls if "am" in call and "start" in call]


class LandingRouteTests(unittest.TestCase):
    def test_route_map_is_exact_and_small(self):
        self.assertEqual(
            m.LANDING_ROUTES,
            {
                "root": "https://chatgpt.com/",
                "open_app": "https://chatgpt.com/open-app",
            },
        )
        self.assertEqual(
            m.LANDING_COMPONENT,
            "com.openai.chatgpt/.ChatGptDeeplinkActivity",
        )

    def test_root_resolver_and_launch_are_fixed(self):
        runner = LandingRunner()
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        self.assertIn("route=root", receipt)
        self.assertIn("resolution=found", receipt)
        self.assertIn("result=launched", receipt)
        self.assertEqual(
            resolver_calls(runner),
            [(
                "-s", "serial-1", "shell", "cmd", "package",
                "resolve-activity", "--brief",
                "-a", "android.intent.action.VIEW",
                "-c", "android.intent.category.BROWSABLE",
                "-d", "https://chatgpt.com/",
                "com.openai.chatgpt",
            )],
        )
        self.assertEqual(
            launch_calls(runner),
            [(
                "-s", "serial-1", "shell", "am", "start",
                "-a", "android.intent.action.VIEW",
                "-c", "android.intent.category.BROWSABLE",
                "-d", "https://chatgpt.com/",
                "-n", "com.openai.chatgpt/.ChatGptDeeplinkActivity",
            )],
        )

    def test_open_app_resolver_and_launch_are_fixed(self):
        runner = LandingRunner()
        receipt = "\n".join(
            m.landing_receipt(m.AdbClient(runner), "open_app")
        )
        self.assertIn("route=open_app", receipt)
        self.assertIn("resolution=found", receipt)
        self.assertIn("result=launched", receipt)
        self.assertIn("https://chatgpt.com/open-app", resolver_calls(runner)[0])
        self.assertIn("https://chatgpt.com/open-app", launch_calls(runner)[0])

    def test_other_package_component_is_blocked_without_launch(self):
        runner = LandingRunner(
            resolver=b"com.example.other/.ChatGptDeeplinkActivity\n"
        )
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        self.assertIn("resolution=blocked", receipt)
        self.assertIn("result=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_other_target_component_is_blocked_without_launch(self):
        runner = LandingRunner(resolver=b"com.openai.chatgpt/.MainActivity\n")
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        self.assertIn("resolution=blocked", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_zero_multiple_and_malformed_components_block(self):
        for resolver in (
            b"priority=0 preferredOrder=0\n",
            (
                b"com.openai.chatgpt/.ChatGptDeeplinkActivity\n"
                b"com.openai.chatgpt/.ChatGptDeeplinkActivity\n"
            ),
            b"com.openai.chatgpt/../../Other\n",
        ):
            runner = LandingRunner(resolver=resolver)
            receipt = "\n".join(
                m.landing_receipt(m.AdbClient(runner), "root")
            )
            self.assertIn("resolution=blocked", receipt)
            self.assertEqual(launch_calls(runner), [])

    def test_resolver_failure_is_unknown_without_launch(self):
        runner = LandingRunner(resolver_code=1)
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        self.assertIn("resolution=unknown", receipt)
        self.assertIn("result=unknown", receipt)
        self.assertEqual(launch_calls(runner), [])

    def test_launch_failure_is_unknown(self):
        runner = LandingRunner(launch_code=1)
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        self.assertIn("resolution=found", receipt)
        self.assertIn("result=unknown", receipt)
        self.assertEqual(len(launch_calls(runner)), 1)

    def test_invalid_route_blocks_before_resolver(self):
        runner = LandingRunner()
        receipt = "\n".join(
            m.landing_receipt(m.AdbClient(runner), "auth_callback")
        )
        self.assertIn("route=auth_callback", receipt)
        self.assertIn("resolution=blocked", receipt)
        self.assertIn("result=blocked", receipt)
        self.assertEqual(resolver_calls(runner), [])
        self.assertEqual(launch_calls(runner), [])

    def test_receipt_withholds_uri_component_and_adb_identity(self):
        runner = LandingRunner()
        receipt = "\n".join(m.landing_receipt(m.AdbClient(runner), "root"))
        for forbidden in (
            "https://",
            "chatgpt.com/",
            "ChatGptDeeplinkActivity",
            "priority=",
            "serial-1",
        ):
            self.assertNotIn(forbidden, receipt)
        self.assertIn("details=withheld", receipt)

    def test_direct_launch_method_refuses_wrong_component_or_route(self):
        runner = LandingRunner()
        client = m.AdbClient(runner)
        code, _ = client.launch_landing(
            "serial-1", "root", "com.openai.chatgpt/.MainActivity"
        )
        self.assertNotEqual(code, 0)
        code, _ = client.launch_landing(
            "serial-1", "unknown", m.LANDING_COMPONENT
        )
        self.assertNotEqual(code, 0)
        self.assertEqual(launch_calls(runner), [])


if __name__ == "__main__":
    unittest.main()
