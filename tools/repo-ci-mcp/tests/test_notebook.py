from __future__ import annotations

import json
import unittest
from typing import Any

from repo_ci_mcp.notebook import MAX_NOTEBOOK_BYTES, repo_notebook_read


class FakeReader:
    def __init__(self, raw: bytes):
        self.raw = raw
        self.calls: list[tuple[Any, ...]] = []

    def resolve_commit(self, ref: str) -> str:
        self.calls.append(("resolve", ref))
        return "a" * 40

    def get_repository_file(self, path: str, commit_sha: str, *, max_bytes: int) -> dict[str, Any]:
        self.calls.append(("file", path, commit_sha, max_bytes))
        return {"content": self.raw, "blob_sha": "b" * 40, "size": len(self.raw)}


def make_notebook() -> bytes:
    value = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"},
            "language_info": {"name": "python", "version": "3.12"},
        },
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {"tags": ["intro"]},
                "source": ["# Title\n", "hello"],
                "attachments": {"pic.png": {"image/png": "AAAA"}},
            },
            {
                "cell_type": "code",
                "metadata": {"tags": ["run"]},
                "execution_count": 1,
                "source": "print('x')",
                "outputs": [
                    {"output_type": "stream", "name": "stdout", "text": ["x\n"]},
                    {
                        "output_type": "execute_result",
                        "execution_count": 1,
                        "data": {
                            "text/plain": ["42"],
                            "text/html": "<b>42</b>",
                            "image/png": "AAAA",
                        },
                        "metadata": {},
                    },
                ],
            },
            {"cell_type": "raw", "metadata": {}, "source": "raw-data"},
        ],
    }
    return json.dumps(value).encode("utf-8")


class NotebookReadTests(unittest.TestCase):
    def test_source_only_default_is_bounded_and_identified(self):
        reader = FakeReader(make_notebook())
        result = repo_notebook_read(reader, "notebooks/demo.ipynb", ref="feature")
        self.assertTrue(result["ok"])
        self.assertEqual(result["requested_ref"], "feature")
        self.assertEqual(result["resolved_commit_sha"], "a" * 40)
        self.assertEqual(result["blob_sha"], "b" * 40)
        self.assertEqual(result["cell_count"], 3)
        self.assertEqual(result["cells"][0]["source"], "# Title\nhello")
        self.assertEqual(result["cells"][0]["attachment_count"], 1)
        self.assertTrue(result["cells"][0]["attachments_omitted"])
        self.assertEqual(result["cells"][1]["output_count"], 2)
        self.assertNotIn("outputs", result["cells"][1])
        self.assertEqual(
            reader.calls,
            [
                ("resolve", "feature"),
                ("file", "notebooks/demo.ipynb", "a" * 40, MAX_NOTEBOOK_BYTES),
            ],
        )

    def test_include_outputs_keeps_text_and_omits_rich_payloads(self):
        result = repo_notebook_read(FakeReader(make_notebook()), "demo.ipynb", include_outputs=True)
        self.assertTrue(result["ok"])
        outputs = result["cells"][1]["outputs"]
        self.assertEqual(outputs[0]["text"], "x\n")
        self.assertEqual(outputs[1]["text_data"]["text/plain"]["text"], "42")
        self.assertEqual(outputs[1]["omitted_mime_types"], ["image/png", "text/html"])
        self.assertNotIn("<b>42</b>", json.dumps(result))
        self.assertNotIn("AAAA", json.dumps(result))

    def test_cell_window_paginates_without_dumping_whole_notebook(self):
        result = repo_notebook_read(
            FakeReader(make_notebook()), "demo.ipynb", start_cell=1, max_cells=1
        )
        self.assertTrue(result["ok"])
        self.assertEqual([cell["index"] for cell in result["cells"]], [1])
        self.assertEqual(result["window"], {"start_cell": 1, "returned": 1, "has_more": True})

    def test_rejects_path_traversal_before_any_repository_read(self):
        reader = FakeReader(make_notebook())
        result = repo_notebook_read(reader, "../secret.ipynb")
        self.assertFalse(result["ok"])
        self.assertIn("traversal", result["error"])
        self.assertEqual(reader.calls, [])

    def test_rejects_non_notebook_path(self):
        reader = FakeReader(make_notebook())
        result = repo_notebook_read(reader, "demo.json")
        self.assertFalse(result["ok"])
        self.assertIn(".ipynb", result["error"])
        self.assertEqual(reader.calls, [])

    def test_malformed_json_fails_closed(self):
        result = repo_notebook_read(FakeReader(b"{not-json"), "demo.ipynb")
        self.assertFalse(result["ok"])
        self.assertIn("JSON decode failed", result["error"])

    def test_invalid_notebook_structure_fails_closed(self):
        raw = json.dumps({"nbformat": 4, "nbformat_minor": 5, "metadata": {}, "cells": {}}).encode()
        result = repo_notebook_read(FakeReader(raw), "demo.ipynb")
        self.assertFalse(result["ok"])
        self.assertIn("cells must be an array", result["error"])

    def test_unsupported_cell_type_fails_closed_even_outside_window(self):
        value = json.loads(make_notebook())
        value["cells"].append({"cell_type": "future", "metadata": {}, "source": "x"})
        result = repo_notebook_read(
            FakeReader(json.dumps(value).encode()), "demo.ipynb", start_cell=0, max_cells=1
        )
        self.assertFalse(result["ok"])
        self.assertIn("unsupported cell_type", result["error"])

    def test_window_limits_are_enforced(self):
        result = repo_notebook_read(FakeReader(make_notebook()), "demo.ipynb", max_cells=51)
        self.assertFalse(result["ok"])
        self.assertIn("max_cells", result["error"])

    def test_output_count_is_bounded(self):
        value = json.loads(make_notebook())
        value["cells"][1]["outputs"] = [
            {"output_type": "stream", "name": "stdout", "text": str(index)}
            for index in range(25)
        ]
        result = repo_notebook_read(
            FakeReader(json.dumps(value).encode()), "demo.ipynb", include_outputs=True
        )
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["cells"][1]["outputs"]), 20)
        self.assertTrue(result["cells"][1]["outputs_truncated"])

    def test_empty_ref_fails_closed_instead_of_defaulting_to_main(self):
        reader = FakeReader(make_notebook())
        result = repo_notebook_read(reader, "demo.ipynb", ref="")
        self.assertFalse(result["ok"])
        self.assertIn("ref must be", result["error"])
        self.assertEqual(reader.calls, [])


if __name__ == "__main__":
    unittest.main()
