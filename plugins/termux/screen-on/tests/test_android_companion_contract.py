import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

SCREEN_ON_DIR = Path(__file__).resolve().parents[1]
APP_DIR = SCREEN_ON_DIR / "android-companion" / "app"
MANIFEST = APP_DIR / "src" / "main" / "AndroidManifest.xml"
PAIRING_ACTIVITY = APP_DIR / "src" / "main" / "java" / "io" / "hanmiyoo" / "screenoncompanion" / "PairingActivity.java"
BUILD_FILE = APP_DIR / "build.gradle"
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


class AndroidCompanionContractTests(unittest.TestCase):
    def test_pairing_window_hides_overlays_and_auto_surfaces_code(self):
        source = PAIRING_ACTIVITY.read_text()
        self.assertIn("Build.VERSION.SDK_INT >= Build.VERSION_CODES.S", source)
        self.assertIn("getWindow().setHideOverlayWindows(true);", source)
        self.assertIn("setContentView(root);\n        showPairingCode();", source)
        self.assertIn("PairingStore.getOrArmPairing(this)", source)
        self.assertNotIn("Generate one-time pairing code", source)

    def test_security_sensitive_revoke_keeps_obscured_touch_filter(self):
        source = PAIRING_ACTIVITY.read_text()
        self.assertIn("setFilterTouchesWhenObscured(true);", source)
        self.assertIn("onFilterTouchEventForSecurity", source)
        self.assertIn("Tap blocked because another window is covering this screen.", source)

    def test_manifest_keeps_overlay_effect_and_pairing_protection_permissions(self):
        manifest = ET.parse(MANIFEST).getroot()
        permissions = {node.attrib[ANDROID_NS + "name"] for node in manifest.findall("uses-permission")}
        self.assertIn("android.permission.SYSTEM_ALERT_WINDOW", permissions)
        self.assertIn("android.permission.HIDE_OVERLAY_WINDOWS", permissions)
        self.assertNotIn("android.permission.INTERNET", permissions)

    def test_pairing_failures_are_visible_without_logging_pairing_material(self):
        source = PAIRING_ACTIVITY.read_text()
        self.assertIn("Pairing code generation failed", source)
        self.assertNotIn("Log.", source)

    def test_pairing_ui_repair_has_distinguishable_install_version(self):
        build = BUILD_FILE.read_text()
        self.assertIn("versionCode 3", build)
        self.assertIn("versionName '0.1.2'", build)


if __name__ == "__main__":
    unittest.main()
