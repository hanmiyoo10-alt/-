import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

SCREEN_ON_DIR = Path(__file__).resolve().parents[1]
APP_DIR = SCREEN_ON_DIR / "android-companion" / "app"
MANIFEST = APP_DIR / "src" / "main" / "AndroidManifest.xml"
PAIRING_ACTIVITY = APP_DIR / "src" / "main" / "java" / "io" / "hanmiyoo" / "screenoncompanion" / "PairingActivity.java"
STARTUP_DIAGNOSTICS = APP_DIR / "src" / "main" / "java" / "io" / "hanmiyoo" / "screenoncompanion" / "StartupDiagnostics.java"
SCREEN_ON_RECEIVER = APP_DIR / "src" / "main" / "java" / "io" / "hanmiyoo" / "screenoncompanion" / "ScreenOnReceiver.java"
BUILD_FILE = APP_DIR / "build.gradle"
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


class AndroidCompanionContractTests(unittest.TestCase):
    def test_pairing_window_hides_overlays_and_auto_surfaces_code(self):
        source = PAIRING_ACTIVITY.read_text()
        self.assertIn("Build.VERSION.SDK_INT >= Build.VERSION_CODES.S", source)
        self.assertIn("getWindow().setHideOverlayWindows(true);", source)
        self.assertIn("buildBaseUi();", source)
        self.assertIn("runStartupSequence();", source)
        self.assertIn("PairingStore.getOrArmPairing(this)", source)
        self.assertNotIn("Generate one-time pairing code", source)

    def test_startup_diagnostics_fail_closed_without_logging_pairing_material(self):
        activity = PAIRING_ACTIVITY.read_text()
        diagnostics = STARTUP_DIAGNOSTICS.read_text()
        self.assertIn("Startup diagnostic safe mode", activity)
        self.assertIn("PHASE_OVERLAY_PROTECTION", activity)
        self.assertIn("PHASE_PAIRING_CODE_VISIBLE", activity)
        self.assertIn("STABLE_UI_DELAY_MS", activity)
        self.assertIn("status.hasWindowFocus()", activity)
        self.assertIn("requiresSafeMode", diagnostics)
        self.assertNotIn("Log.", activity)
        self.assertNotIn("pair_code", diagnostics)

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
        self.assertIn("Startup failed during", source)
        self.assertIn("No pairing action was completed", source)
        self.assertNotIn("Log.", source)

    def test_startup_diagnostic_receiver_is_read_only_sanitized_and_pre_auth(self):
        receiver = SCREEN_ON_RECEIVER.read_text()
        diagnostics = STARTUP_DIAGNOSTICS.read_text()
        manifest = MANIFEST.read_text()
        self.assertIn("action.DIAGNOSTIC", manifest)
        self.assertLess(
            receiver.index("ACTION_DIAGNOSTIC"),
            receiver.index("PairingStore.isAuthorized"),
        )
        self.assertIn('"startup_phase=" + StartupDiagnostics.readSanitizedPhase(context)', receiver)
        self.assertIn('"startup_phase=UNKNOWN"', receiver)
        self.assertIn('return "FAILED_PAIRING_CODE";', diagnostics)
        self.assertIn('return "UNKNOWN";', diagnostics)
        self.assertNotIn("pair_code", diagnostics)

    def test_pairing_ui_repair_has_distinguishable_install_version(self):
        build = BUILD_FILE.read_text()
        self.assertIn("versionCode 5", build)
        self.assertIn("versionName '0.1.4'", build)


if __name__ == "__main__":
    unittest.main()
