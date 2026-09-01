from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable

from canonical import canonical_json_bytes

DEFAULT_SCHEMA_DIR = Path(__file__).with_name("schemas")

class ContractValidationError(ValueError):
    pass

def load_schema(schema_name: str, schema_dir: Path | str = DEFAULT_SCHEMA_DIR) -> dict[str, Any]:
    path = Path(schema_dir) / schema_name
    with path.open("r", encoding="utf-8") as handle:
        schema = json.load(handle)
    if not isinstance(schema, dict):
        raise ContractValidationError(f"schema {schema_name!r} is not an object")
    return schema

def validate_contract(instance: Any, schema_name: str, *, schema_dir: Path | str = DEFAULT_SCHEMA_DIR, known_source_refs: Iterable[str] | None = None) -> None:
    known = None if known_source_refs is None else frozenset(known_source_refs)
    directory = Path(schema_dir)
    _validate(instance, load_schema(schema_name, directory), path="$", schema_dir=directory, known_source_refs=known)

def _fail(path: str, message: str) -> None:
    raise ContractValidationError(f"{path}: {message}")

def _validate(value: Any, schema: dict[str, Any], *, path: str, schema_dir: Path, known_source_refs: frozenset[str] | None) -> None:
    ref = schema.get("$ref")
    if ref is not None:
        if not isinstance(ref, str) or ref.startswith("#") or "/" in ref or "\\" in ref:
            _fail(path, f"unsupported local schema ref {ref!r}")
        _validate(value, load_schema(ref, schema_dir), path=path, schema_dir=schema_dir, known_source_refs=known_source_refs)
        return
    expected_type = schema.get("type")
    if expected_type is not None:
        _validate_type(value, expected_type, path)
    if "const" in schema and value != schema["const"]:
        _fail(path, f"must equal {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        _fail(path, f"must be one of {schema['enum']!r}")
    if isinstance(value, str):
        if schema.get("minLength") is not None and len(value) < schema["minLength"]:
            _fail(path, f"length must be >= {schema['minLength']}")
        if schema.get("maxLength") is not None and len(value) > schema["maxLength"]:
            _fail(path, f"length must be <= {schema['maxLength']}")
        if schema.get("pattern") is not None and re.search(schema["pattern"], value) is None:
            _fail(path, f"does not match pattern {schema['pattern']!r}")
        if schema.get("x-known-source-ref"):
            if known_source_refs is None:
                _fail(path, "known_source_refs is required for source-reference validation")
            if value not in known_source_refs:
                _fail(path, f"unknown source ref {value!r}")
    if isinstance(value, list):
        if schema.get("minItems") is not None and len(value) < schema["minItems"]:
            _fail(path, f"item count must be >= {schema['minItems']}")
        if schema.get("maxItems") is not None and len(value) > schema["maxItems"]:
            _fail(path, f"item count must be <= {schema['maxItems']}")
        if schema.get("uniqueItems"):
            fingerprints = [canonical_json_bytes(item) for item in value]
            if len(fingerprints) != len(set(fingerprints)):
                _fail(path, "items must be unique")
        if schema.get("items") is not None:
            for index, item in enumerate(value):
                _validate(item, schema["items"], path=f"{path}[{index}]", schema_dir=schema_dir, known_source_refs=known_source_refs)
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                _fail(path, f"missing required property {key!r}")
        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        for key, item in value.items():
            if key in properties:
                _validate(item, properties[key], path=f"{path}.{key}", schema_dir=schema_dir, known_source_refs=known_source_refs)
            elif additional is False:
                _fail(path, f"unexpected property {key!r}")
            elif isinstance(additional, dict):
                _validate(item, additional, path=f"{path}.{key}", schema_dir=schema_dir, known_source_refs=known_source_refs)

def _validate_type(value: Any, expected: str, path: str) -> None:
    checks = {
        "object": lambda v: isinstance(v, dict),
        "array": lambda v: isinstance(v, list),
        "string": lambda v: isinstance(v, str),
        "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
        "boolean": lambda v: isinstance(v, bool),
        "null": lambda v: v is None,
    }
    check = checks.get(expected)
    if check is None:
        _fail(path, f"unsupported schema type {expected!r}")
    if not check(value):
        _fail(path, f"expected {expected}")
