from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m


def element(
    children="",
    *,
    package="com.openai.chatgpt",
    text="",
    desc="",
    resource="",
    clickable="false",
    password="false",
    bounds="[1,2][101,202]",
):
    return (
        f'<node package="{package}" class="android.widget.Button" '
        f'text="{text}" content-desc="{desc}" resource-id="{resource}" '
        f'clickable="{clickable}" password="{password}" bounds="{bounds}">'
        f'{children}</node>'
    )


def analyze_tree(children):
    raw = f'<?xml version="1.0"?><hierarchy>{children}</hierarchy>'.encode()
    return m.analyze(raw)


class ContextRunner:
    def __init__(self, raw_xml):
        self.raw_xml = raw_xml
        self.calls = []

    def run(self, args, timeout=12, max_output=65536):
        self.calls.append(tuple(args))
        if args == ["devices"]:
            return 0, b"List of devices attached\nserial-1\tdevice\n"
        if args[-2:] == ["getprop", "ro.product.model"]:
            return 0, b"SM-G998N\n"
        if "uiautomator" in args:
            return 0, b"UI hierarchy dumped"
        if args[-3:] == ["exec-out", "cat", m.REMOTE_XML]:
            return 0, self.raw_xml
        if args[-4:] == ["shell", "rm", "-f", m.REMOTE_XML]:
            return 0, b""
        return 2, b""


class NewChatContextTests(unittest.TestCase):
    def test_direct_actionable_label_is_unchanged(self):
        analysis = analyze_tree(element(text="New chat", clickable="true"))
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_direct_actionable_resource_is_unchanged(self):
        analysis = analyze_tree(
            element(
                resource="com.openai.chatgpt:id/new_chat_button",
                clickable="true",
            )
        )
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_label_child_lifts_to_nearest_actionable_parent(self):
        child = element(text="New chat", clickable="false")
        analysis = analyze_tree(element(child, clickable="true"))
        result, count, handle = m.find_alias(analysis, "new_chat")
        self.assertEqual((result, count), ("found", "1"))
        self.assertEqual(handle, m._handle(analysis["snapshot"], 0, "action"))

    def test_resource_child_lifts_to_nearest_actionable_parent(self):
        child = element(
            resource="com.openai.chatgpt:id/new_conversation",
            clickable="false",
        )
        analysis = analyze_tree(element(child, clickable="true"))
        result, count, handle = m.find_alias(analysis, "new_chat")
        self.assertEqual((result, count), ("found", "1"))
        self.assertEqual(handle, m._handle(analysis["snapshot"], 0, "action"))

    def test_label_and_resource_children_same_parent_deduplicate(self):
        children = (
            element(text="New chat", clickable="false")
            + element(
                resource="com.openai.chatgpt:id/start_new_chat",
                clickable="false",
            )
        )
        analysis = analyze_tree(element(children, clickable="true"))
        labels, resources, combined = m._new_chat_match_indices(analysis)
        self.assertEqual((len(labels), len(resources), len(combined)), (1, 1, 1))
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_semantics_under_different_actionable_parents_are_ambiguous(self):
        first = element(
            element(text="New chat", clickable="false"),
            clickable="true",
        )
        second = element(
            element(
                resource="com.openai.chatgpt:id/new_chat",
                clickable="false",
            ),
            clickable="true",
        )
        analysis = analyze_tree(first + second)
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("ambiguous", "many", "none"),
        )

    def test_nearest_actionable_ancestor_wins(self):
        source = element(text="New chat", clickable="false")
        inner = element(source, clickable="true")
        outer = element(inner, clickable="true")
        analysis = analyze_tree(outer)
        result, count, handle = m.find_alias(analysis, "new_chat")
        self.assertEqual((result, count), ("found", "1"))
        self.assertEqual(handle, m._handle(analysis["snapshot"], 1, "action"))

    def test_lift_beyond_fixed_depth_does_not_match(self):
        source = element(text="New chat", clickable="false")
        level2 = element(source, clickable="false")
        level1 = element(level2, clickable="false")
        outer = element(level1, clickable="true")
        analysis = analyze_tree(outer)
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_lift_does_not_cross_other_package(self):
        source = element(text="New chat", clickable="false")
        barrier = element(
            source,
            package="com.example.other",
            clickable="false",
        )
        outer = element(barrier, clickable="true")
        analysis = analyze_tree(outer)
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_lift_does_not_cross_sensitive_ancestor(self):
        source = element(text="New chat", clickable="false")
        barrier = element(
            source,
            clickable="false",
            password="true",
        )
        outer = element(barrier, clickable="true")
        analysis = analyze_tree(outer)
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_unidentified_and_fuzzy_descendants_do_not_create_target(self):
        children = (
            element(text="Create something else", clickable="false")
            + element(
                resource="com.openai.chatgpt:id/new_chat_backup",
                clickable="false",
            )
        )
        analysis = analyze_tree(element(children, clickable="true"))
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_probe_lift_receipt_is_private_and_read_only(self):
        child = element(
            text="New chat",
            resource="",
            clickable="false",
            bounds="[12,34][212,234]",
        )
        raw = (
            '<?xml version="1.0"?><hierarchy>'
            + element(
                child,
                text="Private container",
                clickable="true",
                bounds="[1,1][300,300]",
            )
            + "</hierarchy>"
        ).encode()
        runner = ContextRunner(raw)
        receipt = "\n".join(m.probe_new_chat_receipt(m.AdbClient(runner)))
        self.assertIn("label_match_count=1", receipt)
        self.assertIn("resource_match_count=0", receipt)
        self.assertIn("combined_match_count=1", receipt)
        self.assertIn("result=found", receipt)
        for forbidden in (
            "New chat",
            "Private container",
            "android.widget.Button",
            "[12,34]",
            "[1,1]",
            "parent",
            "ancestor",
            "serial-1",
        ):
            self.assertNotIn(forbidden, receipt)
        for call in runner.calls:
            self.assertNotIn("input", call)
            self.assertNotIn("am", call)
            self.assertNotIn("resolve-activity", call)


if __name__ == "__main__":
    unittest.main()
