from pathlib import Path
import unittest

SKILL = Path(__file__).resolve().parents[1] / "SKILL.md"


class WebAcquisitionRoutingContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")

    def test_lighter_evidence_precedes_browser(self):
        web = self.text.index("Existing web/search/connector evidence sufficient")
        static = self.text.index("Static public retrieval sufficient")
        browser = self.text.index("rendered DOM on one public unauthenticated")
        self.assertLess(web, static)
        self.assertLess(static, browser)
        self.assertIn("Browser availability is never itself a reason", self.text)

    def test_public_stateless_boundary_is_explicit(self):
        for token in (
            "public, unauthenticated, and stateless only",
            "only `http:` and `https:`",
            "fresh browser state",
            "validated resolved address",
            "never persist cookies",
            "Local/private targets exist only for deterministic tests",
        ):
            self.assertIn(token, self.text)
    def test_failure_fidelity_is_named(self):
        for token in (
            "Policy rejection",
            "timeout",
            "browser",
            "unavailability",
            "navigation failure",
            "truncation",
        ):
            self.assertIn(token, self.text)

    def test_v1_refuses_broader_browser_authority(self):
        for token in (
            "No Crawlee",
            "Firecrawl",
            "browser-use",
            "authenticated session",
            "persistent profile",
            "general browser control plane",
            "recursive/site-wide crawl authority",
        ):
            self.assertIn(token, self.text)


if __name__ == "__main__":
    unittest.main()
