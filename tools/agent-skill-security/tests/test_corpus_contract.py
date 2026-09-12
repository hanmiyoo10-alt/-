from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus.json"
EXPECTED_BENIGN = {f"B{index:02d}" for index in range(1, 7)}
EXPECTED_MALICIOUS = {f"M{index:02d}" for index in range(1, 9)}
URL_PATTERN = re.compile(r"https?://([A-Za-z0-9.-]+)")


class CorpusContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.document = json.loads(CORPUS.read_text(encoding="utf-8"))
        cls.fixtures = cls.document["fixtures"]

    def test_scanner_contract_is_pinned(self):
        scanner = self.document["scanner"]
        self.assertEqual(scanner["package"], "cisco-ai-skill-scanner")
        self.assertEqual(scanner["version"], "2.1.0")
        self.assertEqual(
            scanner["upstreamTagCommit"],
            "a24df340ca6056a6446a239f4a7b114b11c6073a",
        )
        self.assertEqual(scanner["policy"], "balanced")
        self.assertEqual(scanner["repeats"], 3)
        self.assertEqual(scanner["modes"], ["CORE", "CORE_BEHAVIORAL"])

    def test_fixture_ids_are_complete_and_unique(self):
        ids = [item["id"] for item in self.fixtures]
        self.assertEqual(len(ids), len(set(ids)))
        benign = {item["id"] for item in self.fixtures if item["kind"] == "benign"}
        malicious = {item["id"] for item in self.fixtures if item["kind"] == "malicious"}
        self.assertEqual(benign, EXPECTED_BENIGN)
        self.assertEqual(malicious, EXPECTED_MALICIOUS)

    def test_fixture_paths_are_inert_and_materialized(self):
        for item in self.fixtures:
            with self.subTest(item=item["id"]):
                relative = Path(item["path"])
                self.assertFalse(relative.is_absolute())
                self.assertNotIn(".agents", relative.parts)
                target = ROOT / relative
                self.assertTrue(target.is_dir())
                self.assertTrue((target / "SKILL.md").is_file())
                self.assertTrue(item["securityProperty"].strip())

    def test_malicious_expectations_are_independent_and_high(self):
        for item in self.fixtures:
            if item["kind"] != "malicious":
                continue
            with self.subTest(item=item["id"]):
                self.assertEqual(item["minimumSeverity"], "HIGH")
                self.assertGreater(len(item["acceptableCategories"]), 0)

    def test_benign_fixtures_do_not_define_acceptable_attack_categories(self):
        for item in self.fixtures:
            if item["kind"] != "benign":
                continue
            with self.subTest(item=item["id"]):
                self.assertEqual(item["acceptableCategories"], [])
                self.assertNotIn("minimumSeverity", item)

    def test_fixture_urls_use_reserved_invalid_domain(self):
        for item in self.fixtures:
            target = ROOT / item["path"]
            for path in target.rglob("*"):
                if not path.is_file():
                    continue
                text = path.read_text(encoding="utf-8")
                for host in URL_PATTERN.findall(text):
                    with self.subTest(item=item["id"], path=str(path), host=host):
                        self.assertTrue(host.endswith(".invalid"))


if __name__ == "__main__":
    unittest.main()
