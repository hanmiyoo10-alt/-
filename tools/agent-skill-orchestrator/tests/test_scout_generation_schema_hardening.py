import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from roles.scout import scout_response_schema


class ScoutGenerationSchemaHardeningTests(unittest.TestCase):
    def variants(self):
        schema = scout_response_schema()
        items = schema["properties"]["r"]["items"]
        variants = items["oneOf"]
        self.assertEqual(len(variants), 2)
        return {
            variant["properties"]["k"]["enum"][0]: variant
            for variant in variants
        }

    def test_record_union_is_disjoint_authority_and_source_selection(self):
        variants = self.variants()
        self.assertEqual(set(variants), {"a", "s"})
        for kind, variant in variants.items():
            self.assertEqual(variant["type"], "object")
            self.assertFalse(variant["additionalProperties"])
            self.assertEqual(variant["required"], ["k", "v", "r"])
            self.assertEqual(variant["properties"]["k"]["enum"], [kind])

    def test_source_selection_value_is_grammar_fixed_to_contract_literal(self):
        source = self.variants()["s"]
        self.assertEqual(
            source["properties"]["v"],
            {"type": "string", "enum": ["relevant_source"]},
        )
        for invalid_observed_shape in (
            "authority_class=domain_primary | path=plugins/usage-dashboard/*",
            "S1@L21|exact-final-http-status-input",
            "runtime owns release flow",
        ):
            self.assertNotIn(invalid_observed_shape, source["properties"]["v"]["enum"])

    def test_authority_value_surface_remains_bounded_string_for_validator(self):
        authority = self.variants()["a"]
        self.assertEqual(
            authority["properties"]["v"],
            {"type": "string", "minLength": 1, "maxLength": 64},
        )

    def test_both_variants_preserve_ref_shape_and_bounds(self):
        for variant in self.variants().values():
            refs = variant["properties"]["r"]
            self.assertEqual(refs["type"], "array")
            self.assertEqual(refs["minItems"], 1)
            self.assertEqual(refs["maxItems"], 3)
            self.assertTrue(refs["uniqueItems"])
            self.assertEqual(
                refs["items"],
                {"type": "string", "pattern": "^S[1-9][0-9]*@L[1-9][0-9]*$"},
            )

    def test_outer_wire_contract_remains_closed_and_empty_selection_representable(self):
        schema = scout_response_schema()
        self.assertEqual(schema["required"], ["r"])
        self.assertFalse(schema["additionalProperties"])
        records = schema["properties"]["r"]
        self.assertEqual(records["type"], "array")
        self.assertEqual(records["maxItems"], 12)
        self.assertNotIn("minItems", records)

    def test_existing_broad_record_shape_stays_visible_for_compatibility(self):
        items = scout_response_schema()["properties"]["r"]["items"]
        self.assertEqual(items["type"], "object")
        self.assertEqual(items["required"], ["k", "v", "r"])
        self.assertFalse(items["additionalProperties"])
        self.assertEqual(items["properties"]["k"]["enum"], ["a", "s"])
        self.assertEqual(
            items["properties"]["v"],
            {"type": "string", "minLength": 1, "maxLength": 64},
        )


if __name__ == "__main__":
    unittest.main()
