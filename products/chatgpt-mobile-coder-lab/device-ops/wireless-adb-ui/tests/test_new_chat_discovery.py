from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m


def analyze_nodes(nodes):
    raw = (
        '<?xml version="1.0"?><hierarchy>'
        + "".join(nodes)
        + "</hierarchy>"
    ).encode()
    return m.analyze(raw)


def node(
    *,
    package="com.openai.chatgpt",
    text="",
    desc="",
    resource="",
    clickable="true",
    password="false",
    bounds="[1,2][101,202]",
):
    return (
        f'<node package="{package}" class="android.widget.Button" '
        f'text="{text}" content-desc="{desc}" resource-id="{resource}" '
        f'clickable="{clickable}" password="{password}" bounds="{bounds}"/>'
    )


class ProbeRunner:
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


class NewChatSemanticTests(unittest.TestCase):
    def test_existing_exact_visible_label_still_resolves(self):
        analysis = analyze_nodes([node(text="New chat")])
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_exact_target_resource_id_resolves_unlabeled_node(self):
        analysis = analyze_nodes([
            node(resource="com.openai.chatgpt:id/new_chat_button")
        ])
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_other_package_resource_id_does_not_match(self):
        analysis = analyze_nodes([
            node(resource="com.example.other:id/new_chat")
        ])
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_non_allowlisted_and_fuzzy_resource_ids_do_not_match(self):
        for resource in (
            "com.openai.chatgpt:id/new_chat_backup",
            "com.openai.chatgpt:id/new_chat_button_old",
            "com.openai.chatgpt:id/chat_new",
        ):
            analysis = analyze_nodes([node(resource=resource)])
            self.assertEqual(
                m.find_alias(analysis, "new_chat"),
                ("not_found", "0", "none"),
            )

    def test_malformed_and_oversized_resource_ids_do_not_match(self):
        self.assertIsNone(m._resource_id_local("com.openai.chatgpt:id/new-chat"))
        self.assertIsNone(
            m._resource_id_local(
                "com.openai.chatgpt:id/" + ("a" * (m.MAX_RESOURCE_LOCAL_CHARS + 1))
            )
        )

    def test_label_and_resource_match_on_same_node_deduplicate(self):
        analysis = analyze_nodes([
            node(
                text="New chat",
                resource="com.openai.chatgpt:id/new_chat_button",
            )
        ])
        labels, resources, combined = m._new_chat_match_indices(analysis)
        self.assertEqual((len(labels), len(resources), len(combined)), (1, 1, 1))
        self.assertEqual(m.find_alias(analysis, "new_chat")[:2], ("found", "1"))

    def test_distinct_label_and_resource_nodes_are_ambiguous(self):
        analysis = analyze_nodes([
            node(text="New chat"),
            node(resource="com.openai.chatgpt:id/new_conversation"),
        ])
        labels, resources, combined = m._new_chat_match_indices(analysis)
        self.assertEqual((len(labels), len(resources), len(combined)), (1, 1, 2))
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("ambiguous", "many", "none"),
        )

    def test_sensitive_resource_node_is_filtered_before_matching(self):
        analysis = analyze_nodes([
            node(
                resource="com.openai.chatgpt:id/new_chat",
                password="true",
            )
        ])
        self.assertEqual(
            m.find_alias(analysis, "new_chat"),
            ("not_found", "0", "none"),
        )

    def test_send_alias_remains_label_only(self):
        analysis = analyze_nodes([
            node(resource="com.openai.chatgpt:id/new_chat"),
            node(text="Send"),
        ])
        self.assertEqual(m.find_alias(analysis, "send")[:2], ("found", "1"))


class NewChatProbeReceiptTests(unittest.TestCase):
    def test_probe_is_bounded_private_and_read_only(self):
        raw = (
            '<?xml version="1.0"?><hierarchy>'
            + node(
                text="Secret conversation body",
                desc="",
                resource="com.openai.chatgpt:id/new_chat_button",
                bounds="[12,34][212,234]",
            )
            + "</hierarchy>"
        ).encode()
        runner = ProbeRunner(raw)
        receipt = "\n".join(m.probe_new_chat_receipt(m.AdbClient(runner)))

        self.assertIn("schema=mcl-wireless-adb-ui-new-chat-probe.v1", receipt)
        self.assertIn("label_match_count=0", receipt)
        self.assertIn("resource_match_count=1", receipt)
        self.assertIn("combined_match_count=1", receipt)
        self.assertIn("result=found", receipt)
        self.assertIn("cleanup=pass", receipt)

        for forbidden in (
            "Secret conversation body",
            "new_chat_button",
            "resource-id",
            "android.widget.Button",
            "[12,34]",
            "serial-1",
            "com.openai.chatgpt:id",
        ):
            self.assertNotIn(forbidden, receipt)

        for call in runner.calls:
            self.assertNotIn("input", call)
            self.assertNotIn("am", call)
            self.assertNotIn("resolve-activity", call)

    def test_probe_reports_ambiguous_without_handle(self):
        raw = (
            '<?xml version="1.0"?><hierarchy>'
            + node(text="New chat")
            + node(resource="com.openai.chatgpt:id/start_new_chat")
            + "</hierarchy>"
        ).encode()
        receipt = "\n".join(
            m.probe_new_chat_receipt(m.AdbClient(ProbeRunner(raw)))
        )
        self.assertIn("combined_match_count=many", receipt)
        self.assertIn("handle=none", receipt)
        self.assertIn("result=ambiguous", receipt)


if __name__ == "__main__":
    unittest.main()
