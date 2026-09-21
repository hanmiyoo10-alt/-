import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

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


    def test_same_size_external_change_fails_closed_with_restored_mtime(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("original", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            original_stat = path.stat()
            path.write_text("changed!", encoding="utf-8")
            os.utime(path, ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
            self.assertEqual(path.stat().st_mtime_ns, original_stat.st_mtime_ns)
            with self.assertRaises(SourceChangedError):
                session.save()

    def test_successful_save_refreshes_source_identity(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("first", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            session.update_chunk(0, "second")
            session.save()
            session.update_chunk(0, "third")
            session.save()
            self.assertEqual(path.read_text(encoding="utf-8"), "third")
            self.assertFalse(session.dirty)

    def test_source_disappearance_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("original", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            path.unlink()
            with self.assertRaises(SourceChangedError):
                session.save()

    def test_second_verification_catches_change_before_replace(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("original", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            session.update_chunk(0, "editor update")
            original_verify = session._verify_source_unchanged
            verify_calls = 0

            def verify_with_external_change():
                nonlocal verify_calls
                verify_calls += 1
                if verify_calls == 2:
                    path.write_text("external after first verification", encoding="utf-8")
                original_verify()

            tmp_path = path.with_name(f".{path.name}.termux-editor.tmp")
            with mock.patch.object(session, "_verify_source_unchanged", side_effect=verify_with_external_change):
                with self.assertRaises(SourceChangedError):
                    session.save()
            self.assertEqual(verify_calls, 2)
            self.assertEqual(path.read_text(encoding="utf-8"), "external after first verification")
            self.assertFalse(tmp_path.exists())

    def test_metadata_only_change_is_not_a_content_conflict(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "doc.txt"
            path.write_text("original", encoding="utf-8")
            session = DocumentSession(Path(temp), "doc.txt", 2048)
            stat = path.stat()
            os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 2_000_000_000))
            session.save()
            self.assertEqual(path.read_text(encoding="utf-8"), "original")


if __name__ == "__main__":
    unittest.main()
