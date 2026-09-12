from pathlib import Path
import unittest

SKILL = Path(__file__).resolve().parents[1] / "SKILL.md"


class WebAcquisitionRoutingContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")

    def test_lighter_evidence_precedes_browser_and_crawl(self):
        web = self.text.index("Existing web/search/connector evidence sufficient")
        static = self.text.index("Static public retrieval sufficient")
        single = self.text.index("rendered DOM on exactly one public unauthenticated URL")
        crawl = self.text.index("finite same-origin rendered recursion")
        self.assertLess(web, static)
        self.assertLess(static, single)
        self.assertLess(single, crawl)
        self.assertIn("Browser or Crawlee availability is never itself a reason", self.text)
        self.assertIn("V2 never\nreplaces the v1 single-page route", self.text)

    def test_public_stateless_transport_boundary_is_explicit(self):
        for token in (
            "public, unauthenticated, and stateless only",
            "only `http:` and `https:`",
            "validated resolved address",
            "fresh browser state",
            "never persist cookies",
            "Local/private targets exist only for deterministic tests",
        ):
            self.assertIn(token, self.text)
    def test_v2_is_bounded_queue_orchestration_only(self):
        for token in (
            "Crawlee does not own browser transport",
            "exactly one seed and same-origin recursive expansion only",
            "concurrency fixed at 1",
            "`maxDepth` is bounded to 0..3",
            "`maxPages` to 1..20",
            "Crawlee storage persistence is disabled",
            "Crawlee built-in robots fetching remains disabled",
        ):
            self.assertIn(token, self.text)

    def test_failure_fidelity_covers_crawl_specific_failures(self):
        for token in (
            "Policy rejection",
            "timeout",
            "browser\nunavailability",
            "navigation failure",
            "child-page failure",
            "robots rejection",
            "limit exhaustion",
            "`PARTIAL`",
        ):
            self.assertIn(token, self.text)

    def test_broader_authority_remains_outside_v1_and_v2(self):
        for token in (
            "No multi-seed crawl",
            "cross-origin/site-wide traversal",
            "sitemap discovery",
            "Firecrawl",
            "browser-use",
            "Stagehand",
            "authenticated session",
            "general browser control plane",
        ):
            self.assertIn(token, self.text)


if __name__ == "__main__":
    unittest.main()
