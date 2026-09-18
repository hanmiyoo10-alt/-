from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_ui as m

FIXTURES = Path(__file__).resolve().parent / "fixtures"

def fixture(name):
    return (FIXTURES / name).read_bytes()

class SemanticTests(unittest.TestCase):
    def test_unique_fixture_is_bounded(self):
        result = m.analyze(fixture("chatgpt_unique.xml"))
        self.assertTrue(result["target_present"])
        self.assertEqual(result["node_count"], 3)
        self.assertEqual(result["actionable_count"], 2)
        self.assertEqual(result["editable_count"], 1)
        disposition, count, handle = m.find_action(result, "New chat")
        self.assertEqual((disposition, count), ("found", "1"))
        self.assertTrue(handle.startswith("h-"))
        disposition, count, handle = m.find_editable(result)
        self.assertEqual((disposition, count), ("found", "1"))
        self.assertTrue(handle.startswith("h-"))

    def test_sensitive_query_and_node_are_withheld(self):
        result = m.analyze(fixture("chatgpt_unique.xml"))
        disposition, count, handle = m.find_action(result, "email")
        self.assertEqual((disposition, count, handle), ("blocked", "unknown", "none"))
        labels = [node["label"] for node in result["nodes"]]
        self.assertNotIn("user@example.com", labels)

    def test_ambiguous_matches_fail_closed(self):
        result = m.analyze(fixture("chatgpt_ambiguous.xml"))
        self.assertEqual(m.find_action(result, "New chat")[:2], ("ambiguous", "many"))
        self.assertEqual(m.find_editable(result)[:2], ("ambiguous", "many"))

    def test_non_target_package_is_absent(self):
        result = m.analyze(fixture("no_target.xml"))
        self.assertFalse(result["target_present"])
        self.assertEqual(result["node_count"], 0)

    def test_handles_change_with_snapshot_identity(self):
        first = m.analyze(fixture("chatgpt_unique.xml"))
        second = m.analyze(fixture("chatgpt_unique.xml") + b"\n")
        self.assertNotEqual(first["snapshot"], second["snapshot"])
        self.assertNotEqual(
            m.find_action(first, "New chat")[2],
            m.find_action(second, "New chat")[2],
        )

if __name__ == "__main__":
    unittest.main()
