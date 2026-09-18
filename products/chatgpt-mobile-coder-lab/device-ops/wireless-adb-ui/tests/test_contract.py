from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[5]
OWNER = ROOT / "products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-ui"
SOURCE = OWNER / "mcl_adb_ui.py"
WORKFLOW = ROOT / ".github/workflows/mcl-wireless-adb-ui.yml"

class ContractTests(unittest.TestCase):
    def test_v1_has_no_mutation_commands(self):
        source = SOURCE.read_text()
        for forbidden in (
            'add_parser("click")',
            'add_parser("tap")',
            'add_parser("set-text")',
            '"install"',
            '"uninstall"',
            '"settings"',
            '"input"',
            "shell=True",
        ):
            self.assertNotIn(forbidden, source)

    def test_receipts_withhold_details(self):
        source = SOURCE.read_text()
        self.assertIn('DETAILS = "withheld"', source)
        self.assertNotIn("print(result.stderr", source)
        self.assertNotIn("sys.stderr.write", source)

    def test_target_and_temp_path_are_fixed(self):
        source = SOURCE.read_text()
        self.assertIn('EXPECTED_MODEL = "SM-G998N"', source)
        self.assertIn('TARGET_PACKAGE = "com.openai.chatgpt"', source)
        self.assertIn('REMOTE_XML = "/data/local/tmp/mcl-adb-ui-v1.xml"', source)

    def test_workflow_actions_are_full_sha_pinned(self):
        workflow = WORKFLOW.read_text()
        uses = re.findall(r"uses:\s+([^\s]+)", workflow)
        self.assertGreaterEqual(len(uses), 1)
        for value in uses:
            ref = value.rsplit("@", 1)[1]
            self.assertRegex(ref, r"^[0-9a-f]{40}$")

if __name__ == "__main__":
    unittest.main()
