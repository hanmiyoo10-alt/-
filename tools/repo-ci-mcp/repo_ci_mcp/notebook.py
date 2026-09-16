from __future__ import annotations

import json
from pathlib import PurePosixPath
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_NOTEBOOK_BYTES = 1024 * 1024
DEFAULT_MAX_CELLS = 20
MAX_CELLS = 50
MAX_CELL_SOURCE_CHARS = 32 * 1024
MAX_OUTPUT_TEXT_CHARS = 16 * 1024
MAX_OUTPUTS_PER_CELL = 20
MAX_TAGS = 32


class NotebookReadError(ValueError):
    """Malformed, unsupported, or unsafe notebook projection request."""


def _text(value: object, *, field: str, limit: int) -> tuple[str, bool]:
    if isinstance(value, str):
        text = value
    elif isinstance(value, list) and all(isinstance(item, str) for item in value):
        text = "".join(value)
    else:
        raise NotebookReadError(f"{field} must be a string or string array")
    return (text, False) if len(text) <= limit else (text[:limit], True)


def _bounded_scalar(value: object, *, limit: int = 200) -> str | int | float | bool | None:
    if value is None or isinstance(value, (int, float, bool)):
        return value
    text = str(value)
    return text if len(text) <= limit else text[:limit]


def _safe_tags(metadata: dict[str, Any]) -> list[str]:
    tags = metadata.get("tags", [])
    if not isinstance(tags, list):
        return []
    return [str(tag)[:100] for tag in tags[:MAX_TAGS] if isinstance(tag, str)]


def _safe_notebook_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    kernelspec = metadata.get("kernelspec")
    if isinstance(kernelspec, dict):
        result["kernelspec"] = {
            key: _bounded_scalar(kernelspec.get(key))
            for key in ("name", "display_name", "language")
            if key in kernelspec
        }
    language = metadata.get("language_info")
    if isinstance(language, dict):
        result["language_info"] = {
            key: _bounded_scalar(language.get(key))
            for key in ("name", "version")
            if key in language
        }
    return result


def _project_rich_output(output: dict[str, Any]) -> dict[str, Any]:
    data = output.get("data")
    if not isinstance(data, dict):
        raise NotebookReadError("rich output data must be an object")
    text_data: dict[str, Any] = {}
    omitted: list[str] = []
    for mime, value in data.items():
        if not isinstance(mime, str):
            raise NotebookReadError("output mime type must be a string")
        if mime in {"text/plain", "text/markdown"}:
            text, truncated = _text(value, field=f"output {mime}", limit=MAX_OUTPUT_TEXT_CHARS)
            text_data[mime] = {"text": text, "truncated": truncated}
        else:
            omitted.append(mime[:200])
    result: dict[str, Any] = {
        "output_type": str(output.get("output_type")),
        "text_data": text_data,
        "omitted_mime_types": sorted(omitted),
    }
    if output.get("output_type") == "execute_result":
        count = output.get("execution_count")
        if count is not None and (isinstance(count, bool) or not isinstance(count, int)):
            raise NotebookReadError("execute_result execution_count must be integer or null")
        result["execution_count"] = count
    return result


def _project_output(output: object) -> dict[str, Any]:
    if not isinstance(output, dict):
        raise NotebookReadError("code cell output must be an object")
    output_type = output.get("output_type")
    if output_type == "stream":
        text, truncated = _text(output.get("text", ""), field="stream text", limit=MAX_OUTPUT_TEXT_CHARS)
        name = output.get("name")
        if name not in {"stdout", "stderr"}:
            name = "unknown"
        return {"output_type": "stream", "name": name, "text": text, "truncated": truncated}
    if output_type == "error":
        traceback, truncated = _text(output.get("traceback", []), field="error traceback", limit=MAX_OUTPUT_TEXT_CHARS)
        return {
            "output_type": "error",
            "ename": str(output.get("ename", ""))[:200],
            "evalue": str(output.get("evalue", ""))[:500],
            "traceback": traceback,
            "truncated": truncated,
        }
    if output_type in {"display_data", "execute_result"}:
        return _project_rich_output(output)
    return {
        "output_type": str(output_type)[:100],
        "omitted": True,
        "reason": "UNSUPPORTED_OUTPUT_TYPE",
    }


def _attachment_summary(cell: dict[str, Any]) -> dict[str, Any]:
    attachments = cell.get("attachments")
    if attachments is None:
        return {"attachment_count": 0, "attachment_mime_types": []}
    if not isinstance(attachments, dict):
        raise NotebookReadError("cell attachments must be an object")
    mime_types: set[str] = set()
    for bundle in attachments.values():
        if not isinstance(bundle, dict):
            raise NotebookReadError("attachment bundle must be an object")
        mime_types.update(str(mime)[:200] for mime in bundle if isinstance(mime, str))
    return {
        "attachment_count": len(attachments),
        "attachment_mime_types": sorted(mime_types)[:MAX_TAGS],
        "attachments_omitted": bool(attachments),
    }


def _validate_cell(cell: object, index: int) -> dict[str, Any]:
    if not isinstance(cell, dict):
        raise NotebookReadError(f"cell {index} must be an object")
    cell_type = cell.get("cell_type")
    if cell_type not in {"markdown", "code", "raw"}:
        raise NotebookReadError(f"cell {index} has unsupported cell_type")
    _text(cell.get("source", ""), field=f"cell {index} source", limit=MAX_CELL_SOURCE_CHARS)
    metadata = cell.get("metadata", {})
    if not isinstance(metadata, dict):
        raise NotebookReadError(f"cell {index} metadata must be an object")
    return cell


def _project_cell(cell: dict[str, Any], index: int, *, include_outputs: bool) -> dict[str, Any]:
    source, source_truncated = _text(
        cell.get("source", ""), field=f"cell {index} source", limit=MAX_CELL_SOURCE_CHARS
    )
    metadata = cell.get("metadata", {})
    result: dict[str, Any] = {
        "index": index,
        "cell_type": cell["cell_type"],
        "source": source,
        "source_truncated": source_truncated,
        "metadata": {"tags": _safe_tags(metadata)},
    }
    if cell["cell_type"] in {"markdown", "raw"}:
        result.update(_attachment_summary(cell))
    if cell["cell_type"] == "code":
        count = cell.get("execution_count")
        if count is not None and (isinstance(count, bool) or not isinstance(count, int)):
            raise NotebookReadError(f"cell {index} execution_count must be integer or null")
        result["execution_count"] = count
        outputs = cell.get("outputs", [])
        if not isinstance(outputs, list):
            raise NotebookReadError(f"cell {index} outputs must be an array")
        result["output_count"] = len(outputs)
        if include_outputs:
            projected = [_project_output(item) for item in outputs[:MAX_OUTPUTS_PER_CELL]]
            result["outputs"] = projected
            result["outputs_truncated"] = len(outputs) > MAX_OUTPUTS_PER_CELL
    return result


def _validate_path(path: str) -> str:
    if not isinstance(path, str) or not path or len(path) > 500:
        raise NotebookReadError("path must be a non-empty repository-relative string")
    if "\\" in path or path.startswith("/"):
        raise NotebookReadError("path must use repository-relative POSIX form")
    parsed = PurePosixPath(path)
    if any(part in {"", ".", ".."} for part in parsed.parts):
        raise NotebookReadError("path traversal or ambiguous path is not allowed")
    if parsed.suffix.lower() != ".ipynb":
        raise NotebookReadError("path must end with .ipynb")
    return parsed.as_posix()


def _validate_window(start_cell: int, max_cells: int) -> tuple[int, int]:
    if isinstance(start_cell, bool) or not isinstance(start_cell, int) or start_cell < 0:
        raise NotebookReadError("start_cell must be a non-negative integer")
    if isinstance(max_cells, bool) or not isinstance(max_cells, int) or not 1 <= max_cells <= MAX_CELLS:
        raise NotebookReadError(f"max_cells must be between 1 and {MAX_CELLS}")
    return start_cell, max_cells


def _decode_notebook(raw: bytes) -> dict[str, Any]:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise NotebookReadError(f"notebook JSON decode failed: {str(exc)[:200]}") from None
    if not isinstance(value, dict):
        raise NotebookReadError("notebook root must be an object")
    if value.get("nbformat") != 4:
        raise NotebookReadError("only nbformat 4 notebooks are supported")
    if not isinstance(value.get("nbformat_minor"), int):
        raise NotebookReadError("nbformat_minor must be an integer")
    if not isinstance(value.get("metadata", {}), dict):
        raise NotebookReadError("notebook metadata must be an object")
    if not isinstance(value.get("cells"), list):
        raise NotebookReadError("notebook cells must be an array")
    return value


def repo_notebook_read(
    reader: GitHubReader,
    path: str,
    ref: str | None = None,
    start_cell: int = 0,
    max_cells: int = DEFAULT_MAX_CELLS,
    include_outputs: bool = False,
) -> dict[str, Any]:
    requested_ref = "main" if ref is None else ref
    try:
        if not isinstance(requested_ref, str) or not requested_ref or len(requested_ref) > 200:
            raise NotebookReadError("ref must be a non-empty string <= 200 characters")
        clean_path = _validate_path(path)
        start_cell, max_cells = _validate_window(start_cell, max_cells)
        if not isinstance(include_outputs, bool):
            raise NotebookReadError("include_outputs must be boolean")
        resolved_sha = reader.resolve_commit(requested_ref)
        source = reader.get_repository_file(clean_path, resolved_sha, max_bytes=MAX_NOTEBOOK_BYTES)
        notebook = _decode_notebook(source["content"])
        cells = notebook["cells"]
        validated = [_validate_cell(cell, index) for index, cell in enumerate(cells)]
        end = min(start_cell + max_cells, len(validated))
        projected = [
            _project_cell(validated[index], index, include_outputs=include_outputs)
            for index in range(start_cell, end)
        ]
        return {
            "ok": True,
            "path": clean_path,
            "requested_ref": requested_ref,
            "resolved_commit_sha": resolved_sha,
            "blob_sha": source["blob_sha"],
            "size_bytes": source["size"],
            "nbformat": notebook["nbformat"],
            "nbformat_minor": notebook["nbformat_minor"],
            "metadata": _safe_notebook_metadata(notebook.get("metadata", {})),
            "cell_count": len(validated),
            "window": {"start_cell": start_cell, "returned": len(projected), "has_more": end < len(validated)},
            "include_outputs": include_outputs,
            "cells": projected,
        }
    except (GitHubReadError, NotebookReadError) as exc:
        return {"ok": False, "path": str(path)[:500], "requested_ref": str(requested_ref)[:200], "error": str(exc)[:500]}
