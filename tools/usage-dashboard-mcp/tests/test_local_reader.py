from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from usage_dashboard_mcp.local_reader import LocalBridgeConfig, LocalBridgeReadError, LocalBridgeReader


class LocalReaderTests(unittest.TestCase):
    def test_reads_explicit_token_file_without_exposing_path_or_value(self):
        with tempfile.TemporaryDirectory() as td:
            token_file = Path(td) / "token"
            token_file.write_text("secret-value\n", encoding="utf-8")
            reader = LocalBridgeReader(LocalBridgeConfig(token_file=str(token_file)))
            self.assertEqual(reader.read_token(), "secret-value")

    def test_rejects_non_loopback_bridge_url(self):
        reader = LocalBridgeReader(LocalBridgeConfig(base_url="https://example.com"))
        with self.assertRaises(LocalBridgeReadError):
            reader._validated_base_url()

    def test_route_allowlist_rejects_arbitrary_bridge_path(self):
        reader = LocalBridgeReader()
        with self.assertRaises(LocalBridgeReadError):
            reader._request_json("/orgs")


if __name__ == "__main__":
    unittest.main()
