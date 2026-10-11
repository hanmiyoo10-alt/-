from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import os


class SourceChangedError(RuntimeError):
    """Raised when the backing file changed outside the editor session."""


def split_text(text: str, target_chars: int = 12_000) -> list[str]:
    """Split text into UI-sized chunks while preferring nearby newline boundaries."""
    if target_chars < 1024:
        raise ValueError("target_chars must be >= 1024")
    if not text:
        return [""]

    chunks: list[str] = []
    start = 0
    length = len(text)

    while start < length:
        target_end = min(start + target_chars, length)
        if target_end == length:
            chunks.append(text[start:])
            break

        low = start + max(1, int(target_chars * 0.60))
        high = min(length, start + int(target_chars * 1.40))
        before = text.rfind("\n", low, target_end)
        after = text.find("\n", target_end, high)

        if before != -1 and after != -1:
            cut = before + 1 if (target_end - before) <= (after - target_end) else after + 1
        elif before != -1:
            cut = before + 1
        elif after != -1:
            cut = after + 1
        else:
            cut = target_end

        if cut <= start:
            cut = target_end

        chunks.append(text[start:cut])
        start = cut

    return chunks


def resolve_workspace_path(workspace: Path, relative_path: str) -> Path:
    """Resolve a client path without allowing traversal outside workspace."""
    root = workspace.resolve()
    candidate = (root / relative_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError("path escapes workspace") from exc
    return candidate


def source_digest(source_bytes: bytes) -> bytes:
    """Return the byte-level identity used for save conflict detection."""
    return hashlib.sha256(source_bytes).digest()


@dataclass
class DocumentSession:
    workspace: Path
    relative_path: str
    target_chars: int = 12_000

    def __post_init__(self) -> None:
        self.workspace = self.workspace.resolve()
        self.path = resolve_workspace_path(self.workspace, self.relative_path)
        if not self.path.is_file():
            raise FileNotFoundError(self.relative_path)

        source_bytes = self.path.read_bytes()
        self.original_source_digest = source_digest(source_bytes)
        self.chunks = split_text(source_bytes.decode("utf-8"), self.target_chars)
        self.dirty = False

    @property
    def character_count(self) -> int:
        return sum(len(chunk) for chunk in self.chunks)

    def get_chunk(self, index: int) -> str:
        return self.chunks[index]

    def update_chunk(self, index: int, text: str) -> None:
        if index < 0 or index >= len(self.chunks):
            raise IndexError(index)
        self.chunks[index] = text
        self.dirty = True

    def _read_source_bytes(self) -> bytes:
        try:
            return self.path.read_bytes()
        except FileNotFoundError as exc:
            raise SourceChangedError("source file disappeared") from exc

    def _verify_source_unchanged(self) -> None:
        current_bytes = self._read_source_bytes()
        if source_digest(current_bytes) != self.original_source_digest:
            raise SourceChangedError("source file changed outside this editor")

    def save(self) -> None:
        """Write atomically after two source-byte identity checks."""
        self._verify_source_unchanged()

        output_bytes = "".join(self.chunks).encode("utf-8")
        tmp_path = self.path.with_name(f".{self.path.name}.termux-editor.tmp")
        try:
            tmp_path.write_bytes(output_bytes)
            self._verify_source_unchanged()
            os.replace(tmp_path, self.path)
        except Exception:
            try:
                tmp_path.unlink()
            except FileNotFoundError:
                pass
            raise

        self.original_source_digest = source_digest(output_bytes)
        self.dirty = False
