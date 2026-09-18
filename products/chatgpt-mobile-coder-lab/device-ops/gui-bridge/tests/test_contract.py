import re
from pathlib import Path
import unittest

REPO = Path(__file__).resolve().parents[5]
BRIDGE = REPO / "products/chatgpt-mobile-coder-lab/device-ops/gui-bridge"
MANIFEST = BRIDGE / "android-companion/app/src/main/AndroidManifest.xml"
CONFIG = BRIDGE / "android-companion/app/src/main/res/xml/accessibility_service_config.xml"
SERVICE = BRIDGE / "android-companion/app/src/main/java/io/hanmiyoo/mcl/guibridge/GuiBridgeService.java"
WORKFLOW = REPO / ".github/workflows/mcl-gui-bridge.yml"

class ContractTests(unittest.TestCase):
    def test_android_surface_is_allowlisted_and_networkless(self):
        manifest = MANIFEST.read_text()
        config = CONFIG.read_text()
        self.assertNotIn("android.permission.INTERNET", manifest)
        self.assertIn('android:name="com.openai.chatgpt"', manifest)
        self.assertIn('android:name="com.termux"', manifest)
        self.assertIn('android:packageNames="com.openai.chatgpt"', config)
        self.assertIn('android:canTakeScreenshot="true"', config)
        self.assertNotIn("canPerformGestures", config)

    def test_service_has_no_forbidden_fallbacks(self):
        service = SERVICE.read_text()
        for token in ("dispatchGesture", "MediaProjection", "ClipboardManager"):
            self.assertNotIn(token, service)
        self.assertIn("BLOCKED_PEER_IDENTITY", service)
        self.assertIn("ERROR_TAKE_SCREENSHOT_SECURE_WINDOW", service)
        self.assertIn("ACTION_SET_TEXT", service)
        self.assertIn("ACTION_CLICK", service)

    def test_workflow_actions_are_full_sha_pinned(self):
        workflow = WORKFLOW.read_text()
        uses = re.findall(r"uses:\s+([^\s]+)", workflow)
        self.assertGreaterEqual(len(uses), 5)
        for value in uses:
            ref = value.rsplit("@", 1)[1]
            self.assertRegex(ref, r"^[0-9a-f]{40}$")

if __name__ == "__main__":
    unittest.main()
