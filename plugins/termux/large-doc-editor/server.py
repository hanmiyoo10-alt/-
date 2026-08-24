from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import uuid
from urllib.parse import parse_qs, urlparse

from chunk_store import DocumentSession, SourceChangedError


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
ALLOWED_SUFFIXES = {".txt", ".md", ".log", ".json"}


class EditorState:
    def __init__(self, workspace: Path, chunk_chars: int) -> None:
        self.workspace = workspace.resolve()
        self.chunk_chars = chunk_chars
        self.sessions: dict[str, DocumentSession] = {}
        self.lock = threading.RLock()

    def list_files(self) -> list[str]:
        files: list[str] = []
        for path in self.workspace.rglob("*"):
            if len(files) >= 2000:
                break
            if path.is_file() and path.suffix.lower() in ALLOWED_SUFFIXES:
                files.append(path.relative_to(self.workspace).as_posix())
        return sorted(files)

    def open_document(self, relative_path: str) -> tuple[str, DocumentSession]:
        session = DocumentSession(self.workspace, relative_path, self.chunk_chars)
        session_id = uuid.uuid4().hex
        with self.lock:
            self.sessions[session_id] = session
        return session_id, session

    def get(self, session_id: str) -> DocumentSession:
        with self.lock:
            session = self.sessions.get(session_id)
        if not session:
            raise KeyError("unknown session")
        return session


class Handler(BaseHTTPRequestHandler):
    server_version = "TermuxLargeDoc/0"

    @property
    def state(self) -> EditorState:
        return self.server.state  # type: ignore[attr-defined]

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[editor] {self.address_string()} - {fmt % args}")

    def send_json(self, payload: dict | list, status: int = HTTPStatus.OK) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def send_static(self, path: Path, content_type: str) -> None:
        if not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        raw = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2_000_000:
            raise ValueError("request too large")
        raw = self.rfile.read(length)
        payload = json.loads(raw.decode("utf-8") or "{}")
        if not isinstance(payload, dict):
            raise ValueError("JSON object required")
        return payload

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/":
                self.send_static(WEB_ROOT / "index.html", "text/html; charset=utf-8")
                return
            if parsed.path == "/app.js":
                self.send_static(WEB_ROOT / "app.js", "text/javascript; charset=utf-8")
                return
            if parsed.path == "/styles.css":
                self.send_static(WEB_ROOT / "styles.css", "text/css; charset=utf-8")
                return
            if parsed.path == "/api/files":
                self.send_json({"workspace": str(self.state.workspace), "files": self.state.list_files()})
                return
            if parsed.path == "/api/chunk":
                query = parse_qs(parsed.query)
                session_id = query.get("session", [""])[0]
                index = int(query.get("index", ["0"])[0])
                session = self.state.get(session_id)
                self.send_json({
                    "index": index,
                    "text": session.get_chunk(index),
                    "chunkCount": len(session.chunks),
                    "dirty": session.dirty,
                })
                return

            self.send_error(HTTPStatus.NOT_FOUND)
        except (ValueError, IndexError, KeyError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json()

            if parsed.path == "/api/open":
                relative_path = str(payload.get("path", ""))
                session_id, session = self.state.open_document(relative_path)
                self.send_json({
                    "session": session_id,
                    "path": relative_path,
                    "chunkCount": len(session.chunks),
                    "characterCount": session.character_count,
                })
                return

            if parsed.path == "/api/chunk":
                session = self.state.get(str(payload.get("session", "")))
                index = int(payload.get("index", -1))
                text = payload.get("text")
                if not isinstance(text, str):
                    raise ValueError("text must be a string")
                session.update_chunk(index, text)
                self.send_json({"ok": True, "dirty": session.dirty})
                return

            if parsed.path == "/api/save":
                session = self.state.get(str(payload.get("session", "")))
                session.save()
                self.send_json({"ok": True, "dirty": session.dirty})
                return

            self.send_error(HTTPStatus.NOT_FOUND)
        except FileNotFoundError as exc:
            self.send_json({"error": f"file not found: {exc}"}, HTTPStatus.NOT_FOUND)
        except SourceChangedError as exc:
            self.send_json({"error": str(exc), "code": "SOURCE_CHANGED"}, HTTPStatus.CONFLICT)
        except (ValueError, IndexError, KeyError, json.JSONDecodeError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Termux large-document local editor prototype")
    parser.add_argument("--workspace", type=Path, default=Path.cwd(), help="directory exposed to the editor")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--chunk-chars", type=int, default=12_000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    workspace = args.workspace.expanduser().resolve()
    if not workspace.is_dir():
        raise SystemExit(f"workspace does not exist: {workspace}")

    state = EditorState(workspace, args.chunk_chars)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.state = state  # type: ignore[attr-defined]

    print(f"Termux Large Doc prototype: http://127.0.0.1:{args.port}")
    print(f"Workspace: {workspace}")
    print("Only localhost is exposed. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
