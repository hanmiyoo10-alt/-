from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_variables import repo_variable_metadata


class GithubVariablesTests(unittest.TestCase):
    def test_empty_variable_inventory_is_known_zero(self):
        reader = Mock()
        reader.list_actions_variable_metadata.return_value = []
        result = repo_variable_metadata(reader)
        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["variables"], [])
        self.assertFalse(result["values_exposed"])
        self.assertFalse(result["configuration_authority"])
        self.assertFalse(result["production_authority"])

    def test_variable_projection_omits_value(self):
        reader = Mock()
        reader.list_actions_variable_metadata.return_value = [{
            "name": "PUBLIC_SETTING",
            "value": "MODEL_MUST_NOT_SEE_THIS_VALUE",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
        }]
        result = repo_variable_metadata(reader)
        self.assertTrue(result["ok"])
        self.assertEqual(result["variables"], [{
            "name": "PUBLIC_SETTING",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
        }])
        rendered = repr(result)
        self.assertNotIn("MODEL_MUST_NOT_SEE_THIS_VALUE", rendered)
        self.assertNotIn("'value'", rendered)
        self.assertFalse(result["values_exposed"])

    def test_malformed_variable_fails_closed(self):
        reader = Mock()
        reader.list_actions_variable_metadata.return_value = [{"name": "bad\nname", "value": "ignored"}]
        result = repo_variable_metadata(reader)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["count"])
        self.assertEqual(result["variables"], [])
        self.assertFalse(result["values_exposed"])


if __name__ == "__main__":
    unittest.main()
