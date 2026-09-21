from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m

FIXTURES = Path(__file__).resolve().parent / "fixtures"
PROBE = "Reply exactly with GUI_BRIDGE_PROBE_OK"

def fixture(name):
    return (FIXTURES / name).read_bytes()

class ActionRunner:
    def __init__(
        self,
        xmls,
        devices=b"List of devices attached\nserial-1\tdevice\n",
        model=b"SM-G998N\n",
        cleanup=0,
        resolver=b"priority=0 preferredOrder=0 match=0x108000 specificIndex=-1 isDefault=false\ncom.openai.chatgpt/.MainActivity\n",
        launch=0,
        tap=0,
        text=0,
    ):
        self.xmls = list(xmls)
        self.last_xml = self.xmls[-1] if self.xmls else b""
        self.devices = devices
        self.model = model
        self.cleanup = cleanup
        self.resolver = resolver
        self.launch = launch
        self.tap_code = tap
        self.text_code = text
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
            if self.xmls:
                self.last_xml = self.xmls.pop(0)
            return 0, self.last_xml
        if args[-4:] == ["shell", "rm", "-f", m.REMOTE_XML]:
            return self.cleanup, b""
        if "resolve-activity" in args:
            return 0, self.resolver
        if "am" in args and "start" in args:
            return self.launch, b""
        if len(args) >= 7 and args[-4:-2] == ["input", "tap"]:
            return self.tap_code, b""
        if len(args) >= 6 and args[-3:-1] == ["input", "text"]:
            return self.text_code, b""
        return 2, b""

def effect_calls(runner, kind):
    return [
        call for call in runner.calls
        if "input" in call and kind in call
    ]

class ActionSemanticTests(unittest.TestCase):
    def test_bounds_parser_is_fail_closed(self):
        self.assertEqual(m.parse_bounds("[10,20][110,120]"), (10, 20, 110, 120))
        for value in (
            "", "10,20,110,120", "[-1,0][10,10]", "[10,10][10,20]",
            "[20,10][10,20]", "[0,0][10001,20]", "[0,0][20,10001]",
        ):
            self.assertIsNone(m.parse_bounds(value))

    def test_alias_resolution_zero_one_many(self):
        one = m.analyze(fixture("action_new_chat.xml"))
        self.assertEqual(m.find_alias(one, "new_chat")[:2], ("found", "1"))
        zero = m.analyze(fixture("no_target.xml"))
        self.assertEqual(m.find_alias(zero, "new_chat")[:2], ("not_found", "0"))
        many = m.analyze(fixture("action_new_chat_ambiguous.xml"))
        self.assertEqual(m.find_alias(many, "new_chat")[:2], ("ambiguous", "many"))

    def test_sensitive_exact_text_is_not_matchable(self):
        raw = b'''<?xml version="1.0"?><hierarchy><node package="com.openai.chatgpt" class="android.widget.EditText" text="GUI_BRIDGE_PROBE_OK" password="true" editable="true" focused="true" bounds="[1,1][10,10]"/></hierarchy>'''
        analysis = m.analyze(raw)
        self.assertEqual(m._exact_text_matches(analysis, "GUI_BRIDGE_PROBE_OK"), [])

class ActionRuntimeTests(unittest.TestCase):
    def test_launch_target_is_fixed(self):
        runner = ActionRunner([fixture("action_new_chat.xml")])
        receipt = "\n".join(m.launch_receipt(m.AdbClient(runner)))
        self.assertIn("result=launched", receipt)
        resolve = [call for call in runner.calls if "resolve-activity" in call][0]
        self.assertEqual(
            resolve,
            (
                "-s", "serial-1", "shell", "cmd", "package",
                "resolve-activity", "--brief",
                "-a", "android.intent.action.MAIN",
                "-c", "android.intent.category.LAUNCHER",
                "com.openai.chatgpt",
            ),
        )
        launch = [call for call in runner.calls if "am" in call][0]
        self.assertEqual(
            launch,
            (
                "-s", "serial-1", "shell", "am", "start",
                "-a", "android.intent.action.MAIN",
                "-c", "android.intent.category.LAUNCHER",
                "-n", "com.openai.chatgpt/.MainActivity",
            ),
        )
        self.assertNotIn("serial-1", receipt)
        self.assertNotIn("MainActivity", receipt)

    def test_activate_derives_coordinate_and_withholds_it(self):
        pre = m.analyze(fixture("action_new_chat.xml"))
        _, _, handle = m.find_alias(pre, "new_chat")
        runner = ActionRunner([
            fixture("action_new_chat.xml"),
            fixture("editor_empty.xml"),
        ])
        receipt = "\n".join(
            m.activate_receipt(m.AdbClient(runner), pre["snapshot"], handle)
        )
        self.assertIn("result=acted", receipt)
        self.assertIn("freshness=pass", receipt)
        taps = effect_calls(runner, "tap")
        self.assertEqual(len(taps), 1)
        self.assertEqual(taps[0][-2:], ("60", "70"))
        for forbidden in ("serial-1", "bounds=", "x=", "y=", "[10,20]"):
            self.assertNotIn(forbidden, receipt)

    def test_stale_snapshot_executes_no_tap(self):
        pre = m.analyze(fixture("action_new_chat.xml"))
        _, _, handle = m.find_alias(pre, "new_chat")
        runner = ActionRunner([fixture("action_new_chat.xml")])
        receipt = "\n".join(
            m.activate_receipt(
                m.AdbClient(runner),
                "s-0000000000000000",
                handle,
            )
        )
        self.assertIn("result=stale", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])

    def test_unknown_handle_executes_no_tap(self):
        pre = m.analyze(fixture("action_new_chat.xml"))
        runner = ActionRunner([fixture("action_new_chat.xml")])
        receipt = "\n".join(
            m.activate_receipt(
                m.AdbClient(runner),
                pre["snapshot"],
                "h-0000000000000000",
            )
        )
        self.assertIn("target_match=none", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])

    def test_bad_bounds_executes_no_tap(self):
        pre = m.analyze(fixture("action_bad_bounds.xml"))
        _, _, handle = m.find_alias(pre, "new_chat")
        runner = ActionRunner([fixture("action_bad_bounds.xml")])
        receipt = "\n".join(
            m.activate_receipt(m.AdbClient(runner), pre["snapshot"], handle)
        )
        self.assertIn("result=blocked", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])

    def test_type_ascii_success_is_exact_and_bounded(self):
        pre = m.analyze(fixture("editor_empty.xml"))
        _, _, handle = m.find_editable(pre)
        runner = ActionRunner([
            fixture("editor_empty.xml"),
            fixture("editor_focused_empty.xml"),
            fixture("editor_typed.xml"),
        ])
        receipt = "\n".join(
            m.type_ascii_receipt(
                m.AdbClient(runner), pre["snapshot"], handle, PROBE
            )
        )
        self.assertIn("result=typed", receipt)
        self.assertIn("verified=pass", receipt)
        self.assertEqual(len(effect_calls(runner, "tap")), 1)
        text_calls = effect_calls(runner, "text")
        self.assertEqual(len(text_calls), 1)
        self.assertEqual(
            text_calls[0][-1],
            "Reply%sexactly%swith%sGUI_BRIDGE_PROBE_OK",
        )
        self.assertNotIn(PROBE, receipt)
        self.assertNotIn("%s", receipt)
        self.assertNotIn("serial-1", receipt)

    def test_invalid_ascii_text_is_rejected_before_adb(self):
        invalid = (
            "", "한글", "a%b", "a-b", "a.b", "a\nb", "a\tb",
            "a'b", 'a"b', "a;b", "a&b", "a|b", "a$b", "a<b", "a>b",
            "a" * 161,
        )
        for value in invalid:
            runner = ActionRunner([fixture("editor_empty.xml")])
            receipt = "\n".join(
                m.type_ascii_receipt(
                    m.AdbClient(runner),
                    "s-0000000000000000",
                    "h-0000000000000000",
                    value,
                )
            )
            self.assertIn("result=blocked", receipt)
            self.assertEqual(runner.calls, [])

    def test_stale_type_snapshot_executes_no_effect(self):
        pre = m.analyze(fixture("editor_empty.xml"))
        _, _, handle = m.find_editable(pre)
        runner = ActionRunner([fixture("editor_empty.xml")])
        receipt = "\n".join(
            m.type_ascii_receipt(
                m.AdbClient(runner),
                "s-0000000000000000",
                handle,
                PROBE,
            )
        )
        self.assertIn("result=stale", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])
        self.assertEqual(effect_calls(runner, "text"), [])

    def test_ambiguous_alias_receipt_has_no_effect(self):
        runner = ActionRunner([fixture("action_new_chat_ambiguous.xml")])
        receipt = "\n".join(
            m.find_alias_receipt(m.AdbClient(runner), "new_chat")
        )
        self.assertIn("result=ambiguous", receipt)
        self.assertIn("match_count=many", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])
        self.assertEqual(effect_calls(runner, "text"), [])

    def test_nonempty_editor_blocks_before_effect(self):
        pre = m.analyze(fixture("editor_typed.xml"))
        _, _, handle = m.find_editable(pre)
        runner = ActionRunner([fixture("editor_typed.xml")])
        receipt = "\n".join(
            m.type_ascii_receipt(
                m.AdbClient(runner), pre["snapshot"], handle, PROBE
            )
        )
        self.assertIn("result=blocked", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])
        self.assertEqual(effect_calls(runner, "text"), [])

    def test_focus_verification_failure_prevents_text(self):
        pre = m.analyze(fixture("editor_empty.xml"))
        _, _, handle = m.find_editable(pre)
        runner = ActionRunner([
            fixture("editor_empty.xml"),
            fixture("editor_empty.xml"),
        ])
        receipt = "\n".join(
            m.type_ascii_receipt(
                m.AdbClient(runner), pre["snapshot"], handle, PROBE
            )
        )
        self.assertIn("focus=fail", receipt)
        self.assertEqual(len(effect_calls(runner, "tap")), 1)
        self.assertEqual(effect_calls(runner, "text"), [])

    def test_post_type_verification_failure_is_not_typed(self):
        pre = m.analyze(fixture("editor_empty.xml"))
        _, _, handle = m.find_editable(pre)
        runner = ActionRunner([
            fixture("editor_empty.xml"),
            fixture("editor_focused_empty.xml"),
            fixture("editor_wrong_text.xml"),
        ])
        receipt = "\n".join(
            m.type_ascii_receipt(
                m.AdbClient(runner), pre["snapshot"], handle, PROBE
            )
        )
        self.assertIn("verified=fail", receipt)
        self.assertIn("result=failed", receipt)
        self.assertEqual(len(effect_calls(runner, "text")), 1)

    def test_wait_text_found_without_echoing_query(self):
        runner = ActionRunner([fixture("reply_visible.xml")])
        receipt = "\n".join(
            m.wait_text_receipt(
                m.AdbClient(runner),
                "GUI_BRIDGE_PROBE_OK",
                sleeper=lambda _: None,
            )
        )
        self.assertIn("result=found", receipt)
        self.assertIn("match_count=1", receipt)
        self.assertNotIn("GUI_BRIDGE_PROBE_OK", receipt)
        self.assertEqual(effect_calls(runner, "tap"), [])
        self.assertEqual(effect_calls(runner, "text"), [])

    def test_wait_text_timeout_is_bounded(self):
        old_attempts = m.WAIT_ATTEMPTS
        m.WAIT_ATTEMPTS = 2
        sleeps = []
        try:
            runner = ActionRunner([fixture("no_target.xml")])
            receipt = "\n".join(
                m.wait_text_receipt(
                    m.AdbClient(runner),
                    "GUI_BRIDGE_PROBE_OK",
                    sleeper=lambda seconds: sleeps.append(seconds),
                )
            )
        finally:
            m.WAIT_ATTEMPTS = old_attempts
        self.assertIn("result=timeout", receipt)
        self.assertEqual(len(sleeps), 1)
        self.assertEqual(effect_calls(runner, "tap"), [])
        self.assertEqual(effect_calls(runner, "text"), [])

if __name__ == "__main__":
    unittest.main()
