import tempfile
import unittest
from pathlib import Path

from chunk_store import DocumentSession, SourceChangedError, resolve_workspace_path, split_text


class ChunkStoreTests(unittest.TestCase):
    def test_split_round_trip(self):
        text = ("alpha beta gamma\n" * 5000) + "끝"
        chunks = split_text(text, 2048)
        self.assertEqual("".join(chunks), text)
        self.assertGreater(len(chunks), 1)

    def test_empty_document_has_one_chunk(self):
        self.assertEqual(split_text(""), [""])

    def test_workspace_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with self.assertRaises(ValueError):
                resolve_workspace_path(root, "../outside.txt")

    def test_edit_and_atomic_save(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("hello\n" * 4000, encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            session.update_chunk(0, "PREFIX\n" + session.get_chunk(0))
            session.save()
            self.assertTrue(path.read_text(encoding="utf-8").startswith("PREFIX\n"))
            self.assertFalse(session.dirty)

    def test_external_change_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("original", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            path.write_text("external change with a different size", encoding="utf-8")
            with self.assertRaises(SourceChangedError):
                session.save()


if __name__ == "__main__":
    unittest.main()
