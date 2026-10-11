import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from reference_scope import classify_reference
from registry import load_domain_registry, registry_sha256

TERMUX_FROZEN = "tests/fixtures/termux-large-doc-editor-o4f0-frozen-domain-registry.json"
VOYAGE_FROZEN = "tests/fixtures/voyage-token-check-o4h0-frozen-domain-registry.json"


class ReferenceScopeTests(unittest.TestCase):
    def request(self, scope, field, value, *, kind=None, frozen=None):
        reference = {"field": field, "value": value}
        if kind is not None:
            reference["kind"] = kind
        return {
            "schema_version": 1,
            "scope": scope,
            "reference": reference,
            "frozen_registry_paths": list(frozen or []),
        }

    def test_retired_termux_primary_path_is_frozen_only(self):
        out = classify_reference(self.request(
            "plugin:termux-large-doc-editor",
            "primary_path",
            "plugins/termux/large-doc-editor/**",
            frozen=[TERMUX_FROZEN],
        ))
        self.assertEqual(out["disposition"], "FROZEN_RETROSPECTIVE_ONLY")
        self.assertFalse(out["live"]["scope_present"])
        self.assertEqual(out["frozen"]["match_fixtures"], [TERMUX_FROZEN])
        self.assertFalse(out["retirement_authorized"])

    def test_current_voyage_primary_path_is_live_only(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "primary_path",
            "plugins/risu/local/voyage/**",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "LIVE_CURRENT_ONLY")
        self.assertTrue(out["live"]["match"])
        self.assertEqual(out["frozen"]["match_fixtures"], [])

    def test_shared_voyage_guideline_is_live_and_frozen(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "LIVE_AND_FROZEN")

    def test_old_voyage_evidence_authority_is_frozen_only(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "authority_ref",
            "voyage-token-check/DESIGN_STATUS.md",
            kind="evidence",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "FROZEN_RETROSPECTIVE_ONLY")

    def test_absent_reference_is_non_authoritative_absence(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "authority_ref",
            "voyage-token-check/DOES_NOT_EXIST.md",
            kind="evidence",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "ABSENT_FROM_SUPPLIED_REGISTRIES")
        self.assertFalse(out["historical_exhaustiveness_claimed"])
        self.assertFalse(out["deletion_authorized"])
        self.assertFalse(out["retirement_authorized"])

    def test_missing_scope_is_unknown(self):
        out = classify_reference(self.request(
            "plugin:not-registered",
            "primary_path",
            "plugins/not-registered/**",
            frozen=[TERMUX_FROZEN, VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "SCOPE_NOT_FOUND")

    def test_frozen_fixture_order_does_not_change_result(self):
        first = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[TERMUX_FROZEN, VOYAGE_FROZEN],
        ))
        second = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[VOYAGE_FROZEN, TERMUX_FROZEN],
        ))
        self.assertEqual(first, second)

    def test_current_registry_cannot_be_supplied_as_frozen(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "primary_path",
            "plugins/risu/local/voyage/**",
            frozen=["domains/registry.json"],
        ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "FROZEN_FIXTURE_INVALID")

    def test_malformed_request_is_unknown(self):
        out = classify_reference({"schema_version": 1})
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_schema_version_requires_non_boolean_integer_one(self):
        for value in (True, 1.0):
            request = self.request(
                "plugin:voyage-token-check",
                "primary_path",
                "plugins/risu/local/voyage/**",
                frozen=[VOYAGE_FROZEN],
            )
            request["schema_version"] = value
            out = classify_reference(request)
            self.assertEqual(out["disposition"], "UNKNOWN")
            self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_unhashable_reference_field_is_request_invalid(self):
        for value in ([], {}):
            request = self.request(
                "plugin:voyage-token-check",
                "primary_path",
                "plugins/risu/local/voyage/**",
                frozen=[VOYAGE_FROZEN],
            )
            request["reference"]["field"] = value
            out = classify_reference(request)
            self.assertEqual(out["disposition"], "UNKNOWN")
            self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_alias_paths_for_same_frozen_fixture_are_deduplicated(self):
        absolute = str((PACKAGE / VOYAGE_FROZEN).resolve())
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[VOYAGE_FROZEN, absolute],
        ))
        self.assertEqual(out["disposition"], "LIVE_AND_FROZEN")
        self.assertEqual(out["frozen"]["scope_present_fixtures"], [VOYAGE_FROZEN])
        self.assertEqual(out["frozen"]["match_fixtures"], [VOYAGE_FROZEN])
        self.assertEqual(len(out["frozen"]["registries"]), 1)

    def test_results_bind_live_and_frozen_registry_digests(self):
        live = load_domain_registry()
        frozen = load_domain_registry(PACKAGE / VOYAGE_FROZEN)
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["live"]["registry_sha256"], registry_sha256(live))
        self.assertEqual(
            out["frozen"]["registries"],
            [{
                "registry": VOYAGE_FROZEN,
                "registry_sha256": registry_sha256(frozen),
                "scope_present": True,
                "match": True,
            }],
        )

    def test_cli_returns_deterministic_json(self):
        request = self.request(
            "plugin:voyage-token-check",
            "primary_path",
            "plugins/risu/local/voyage/**",
            frozen=[VOYAGE_FROZEN],
        )
        with tempfile.TemporaryDirectory() as temp:
            request_path = Path(temp) / "request.json"
            request_path.write_text(json.dumps(request), encoding="utf-8")
            run = subprocess.run(
                [sys.executable, str(PACKAGE / "reference_scope.py"), str(request_path)],
                check=False,
                capture_output=True,
                text=True,
                cwd=PACKAGE,
            )
        self.assertEqual(run.returncode, 0, run.stderr)
        output = json.loads(run.stdout)
        self.assertEqual(output["disposition"], "LIVE_CURRENT_ONLY")
        self.assertFalse(output["mutation_authorized"])
        self.assertFalse(output["network_used"])


if __name__ == "__main__":
    unittest.main()
