from pathlib import Path
import unittest

SKILL = Path(__file__).resolve().parents[1] / "SKILL.md"


class WebAcquisitionRoutingContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")
        cls.normalized = " ".join(cls.text.split())

    def test_lighter_evidence_precedes_v1_v2_and_v3(self):
        web = self.text.index("Existing web/search/connector evidence sufficient")
        static = self.text.index("Static public retrieval sufficient")
        single = self.text.index("rendered DOM on exactly one public unauthenticated URL")
        crawl = self.text.index("finite same-origin rendered recursion")
        provider = self.text.index("schema-constrained structured data")
        self.assertLess(web, static)
        self.assertLess(static, single)
        self.assertLess(single, crawl)
        self.assertLess(crawl, provider)
        self.assertIn("v3 never replaces v1/v2", self.text)

    def test_public_stateless_local_transport_boundary_is_explicit(self):
        for token in (
            "public, unauthenticated, and stateless only",
            "only `http:` and `https:`",
            "validated resolved address",
            "fresh browser state",
            "never persist cookies",
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

    def test_v3_is_explicit_single_request_provider_opt_in(self):
        for token in (
            "explicit `--provider firecrawl` opt-in is mandatory",
            "runtime `FIRECRAWL_API_KEY`",
            "https://api.firecrawl.dev/v2/scrape",
            "at most one provider request",
            "`zeroDataRetention: true`",
            "fail closed rather than retrying",
            "validate against the requested schema",
        ):
            self.assertIn(token, self.normalized)

    def test_v3_does_not_claim_v1_transport_guarantee(self):
        self.assertIn("Firecrawl\ncontrols its own DNS resolution", self.text)
        self.assertIn("does not inherit v1's validated-address policy-proxy socket guarantee", self.text)
        self.assertIn("third-party data egress", self.text)
    def test_broader_provider_and_browser_authority_remains_outside_v3(self):
        for token in (
            "Do not install the Firecrawl SDK/CLI",
            "No multi-seed or multi-URL provider jobs",
            "Firecrawl crawl/map/search/agent/",
            "browser-use",
            "Stagehand",
            "authenticated session",
            "target-site\ncookies/auth headers",
            "general browser control\nplane",
        ):
            self.assertIn(token, self.text)


if __name__ == "__main__":
    unittest.main()
