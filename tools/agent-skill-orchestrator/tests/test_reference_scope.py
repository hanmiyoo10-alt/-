import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from reference_scope import (
    AUTHORITY_REF_KINDS,
    MAX_REGISTRY_BYTES,
    _bounded_registry_snapshot,
    _read_bounded_regular_file,
    _read_cli_input,
    classify_reference,
)
from registry import load_domain_registry, registry_sha256, validate_domain_registry_data

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

    def test_authority_ref_kind_must_match_registry_schema_enum(self):
        schema_path = PACKAGE / "schemas" / "domain-profile.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        expected = set(
            schema["properties"]["authority_refs"]["items"]["properties"]["kind"]["enum"]
        )
        self.assertEqual(set(AUTHORITY_REF_KINDS), expected)

        request = self.request(
            "plugin:voyage-token-check",
            "authority_ref",
            "plugins/risu/local/voyage/DESIGN_STATUS.md",
            kind="manifestt",
            frozen=[VOYAGE_FROZEN],
        )
        out = classify_reference(request)
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_scope_identity_disagreement_preserves_registry_provenance(self):
        conflicting = load_domain_registry(PACKAGE / VOYAGE_FROZEN)
        conflicting = copy.deepcopy(conflicting)
        conflicting["domains"][0]["domain_id"] = "voyage-token-check-historical"
        with mock.patch(
            "reference_scope._load_frozen_fixture",
            return_value=(VOYAGE_FROZEN, conflicting),
        ):
            out = classify_reference(self.request(
                "plugin:voyage-token-check",
                "guidelines_path",
                "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
                frozen=[VOYAGE_FROZEN],
            ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "SCOPE_IDENTITY_DISAGREEMENT")
        self.assertEqual(out["scope"], "plugin:voyage-token-check")
        self.assertEqual(out["reference"]["field"], "guidelines_path")
        self.assertIsNotNone(out["live"]["registry_sha256"])
        self.assertEqual(len(out["frozen"]["registries"]), 1)
        self.assertIsNotNone(out["frozen"]["registries"][0]["registry_sha256"])

    def test_cli_file_read_enforces_actual_byte_ceiling(self):
        oversized = b"{" + (b" " * (32 * 1024)) + b"}"
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            handle.write(oversized)
            target = Path(handle.name)
        try:
            real = target.stat()
            with mock.patch(
                "reference_scope.os.fstat",
                return_value=mock.Mock(st_mode=real.st_mode, st_size=1),
            ):
                with self.assertRaisesRegex(ValueError, "file too large"):
                    _read_cli_input([str(target)])
        finally:
            target.unlink(missing_ok=True)

    def test_invalid_frozen_fixture_preserves_known_live_provenance(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "primary_path",
            "plugins/risu/local/voyage/**",
            frozen=["domains/registry.json"],
        ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "FROZEN_FIXTURE_INVALID")
        self.assertEqual(out["scope"], "plugin:voyage-token-check")
        self.assertTrue(out["live"]["scope_present"])
        self.assertTrue(out["live"]["match"])
        self.assertIsNotNone(out["live"]["registry_sha256"])

    def test_scope_must_match_domain_registry_scope_contract(self):
        for scope in ("voyage-token-check", "scope:repo", "plugin:Bad", "plugin:"):
            out = classify_reference(self.request(
                scope,
                "guidelines_path",
                "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
                frozen=[VOYAGE_FROZEN],
            ))
            self.assertEqual(out["disposition"], "UNKNOWN")
            self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_query_value_honors_registry_256_character_ceiling(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "authority_ref",
            "x" * 257,
            kind="evidence",
            frozen=[VOYAGE_FROZEN],
        ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "REQUEST_INVALID")

    def test_duplicate_json_keys_are_rejected_by_cli(self):
        raw = (
            '{"schema_version":1,'
            '"scope":"plugin:not-real",'
            '"scope":"plugin:voyage-token-check",'
            '"reference":{"field":"primary_path","value":"plugins/risu/local/voyage/**"},'
            '"frozen_registry_paths":[]}'
        )
        run = subprocess.run(
            [sys.executable, str(PACKAGE / "reference_scope.py")],
            input=raw,
            check=False,
            capture_output=True,
            text=True,
            cwd=PACKAGE,
        )
        self.assertEqual(run.returncode, 2)
        output = json.loads(run.stdout)
        self.assertEqual(output["disposition"], "UNKNOWN")
        self.assertEqual(output["reason_code"], "INPUT_JSON_INVALID")

    def test_frozen_registry_source_read_is_bounded_before_loader(self):
        oversized = b"{" + (b" " * MAX_REGISTRY_BYTES) + b"}"
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            handle.write(oversized)
            target = Path(handle.name)
        try:
            real = target.stat()
            with mock.patch(
                "reference_scope.os.fstat",
                return_value=mock.Mock(st_mode=real.st_mode, st_size=1),
            ):
                with self.assertRaisesRegex(ValueError, "file too large"):
                    _bounded_registry_snapshot(target)
        finally:
            target.unlink(missing_ok=True)

    def test_registry_byte_cap_covers_schema_maximal_escaped_representation(self):
        glyph = "😀"
        domains = []
        for index in range(64):
            prefix = f"d{index:02d}"
            domain_id = prefix + ("a" * (128 - len(prefix)))
            authority_refs = []
            for ref_index in range(16):
                authority_refs.append({
                    "kind": "release_spec_dir",
                    "value": (glyph * 255) + chr(ord("a") + ref_index),
                })
            domains.append({
                "domain_id": domain_id,
                "scope": f"plugin:{domain_id}",
                "name": glyph * 128,
                "lifecycle": glyph * 64,
                "primary_path": glyph * 256,
                "authority_refs": authority_refs,
                "guidelines_path": glyph * 256,
                "registration_semantics": "domain_metadata_only_no_skill_promotion",
            })
        registry = {"schema_version": 1, "domains": domains}
        validate_domain_registry_data(registry)
        encoded = json.dumps(registry, ensure_ascii=True, indent=4).encode("utf-8")
        self.assertLess(len(encoded), MAX_REGISTRY_BYTES)

    def test_frozen_fixture_symlink_is_rejected(self):
        fixture_root = PACKAGE / "tests" / "fixtures"
        with tempfile.TemporaryDirectory(dir=fixture_root) as temp:
            target = Path(temp) / "target-frozen-domain-registry.json"
            target.write_text(
                (PACKAGE / VOYAGE_FROZEN).read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            handle = tempfile.NamedTemporaryFile(
                prefix="reference-scope-",
                suffix="-frozen-domain-registry.json",
                dir=fixture_root,
                delete=False,
            )
            link = Path(handle.name)
            handle.close()
            link.unlink()
            created = False
            try:
                link.symlink_to(target)
                created = True
                out = classify_reference(self.request(
                    "plugin:voyage-token-check",
                    "guidelines_path",
                    "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
                    frozen=[str(link)],
                ))
            finally:
                if created:
                    link.unlink(missing_ok=True)
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "FROZEN_FIXTURE_INVALID")

    def test_fixture_read_is_anchored_to_opened_directory_descriptor(self):
        fixture_root = PACKAGE / "tests" / "fixtures"
        outside = PACKAGE / "tests" / "outside-reference-scope"
        outside.mkdir(exist_ok=True)
        fixture_name = "anchored-reference-scope-frozen-domain-registry.json"
        outside_fixture = outside / fixture_name
        outside_fixture.write_text(
            (PACKAGE / VOYAGE_FROZEN).read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        real_open = os.open

        def anchored_open(path, flags, *args, **kwargs):
            if Path(path) == fixture_root:
                fd = real_open(path, flags, *args, **kwargs)
                replacement = fixture_root.with_name("fixtures-reference-scope-backup")
                fixture_root.rename(replacement)
                try:
                    fixture_root.symlink_to(outside, target_is_directory=True)
                except Exception:
                    replacement.rename(fixture_root)
                    os.close(fd)
                    raise
                self.addCleanup(
                    lambda: (
                        fixture_root.unlink(missing_ok=True),
                        replacement.rename(fixture_root),
                    )
                )
                return fd
            return real_open(path, flags, *args, **kwargs)

        try:
            with mock.patch("reference_scope.os.open", side_effect=anchored_open):
                out = classify_reference(self.request(
                    "plugin:voyage-token-check",
                    "guidelines_path",
                    "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
                    frozen=[f"tests/fixtures/{fixture_name}"],
                ))
            self.assertEqual(out["disposition"], "UNKNOWN")
            self.assertEqual(out["reason_code"], "FROZEN_FIXTURE_INVALID")
            self.assertEqual(
                out["frozen"]["error_locator"],
                f"tests/fixtures/{fixture_name}",
            )
        finally:
            outside_fixture.unlink(missing_ok=True)
            outside.rmdir()

    def test_live_registry_failure_preserves_validated_query(self):
        with mock.patch(
            "reference_scope._bounded_registry_snapshot",
            side_effect=ValueError("live registry unavailable"),
        ):
            out = classify_reference(self.request(
                "plugin:voyage-token-check",
                "primary_path",
                "plugins/risu/local/voyage/**",
                frozen=[],
            ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "LIVE_REGISTRY_INVALID")
        self.assertEqual(out["scope"], "plugin:voyage-token-check")
        self.assertEqual(
            out["reference"],
            {"field": "primary_path", "value": "plugins/risu/local/voyage/**"},
        )

    def test_invalid_later_fixture_preserves_accumulated_frozen_provenance(self):
        out = classify_reference(self.request(
            "plugin:voyage-token-check",
            "guidelines_path",
            "docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md",
            frozen=[VOYAGE_FROZEN, "domains/registry.json"],
        ))
        self.assertEqual(out["disposition"], "UNKNOWN")
        self.assertEqual(out["reason_code"], "FROZEN_FIXTURE_INVALID")
        self.assertEqual(out["frozen"]["error_locator"], "domains/registry.json")
        self.assertEqual(len(out["frozen"]["registries"]), 1)
        self.assertEqual(out["frozen"]["registries"][0]["registry"], VOYAGE_FROZEN)
        self.assertIsNotNone(out["frozen"]["registries"][0]["registry_sha256"])

    def test_one_descriptor_reader_rejects_fifo_and_symlink_without_blocking(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            regular = root / "regular.json"
            regular.write_bytes(b"{}")
            link = root / "link.json"
            link.symlink_to(regular)
            fifo = root / "fifo"
            os.mkfifo(fifo)
            with self.assertRaises((OSError, ValueError)):
                _read_bounded_regular_file(link, 32)
            with self.assertRaises(ValueError):
                _read_bounded_regular_file(fifo, 32)

    def test_registry_duplicate_json_keys_fail_closed_before_loader(self):
        raw = b'{"schema_version":1,"schema_version":1,"domains":[]}'
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            handle.write(raw)
            target = Path(handle.name)
        try:
            with self.assertRaisesRegex(ValueError, "duplicate JSON key"):
                _bounded_registry_snapshot(target)
        finally:
            target.unlink(missing_ok=True)

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
