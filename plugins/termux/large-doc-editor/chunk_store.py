from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
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

        self.original_mtime_ns = self.path.stat().st_mtime_ns
        self.chunks = split_text(self.path.read_text(encoding="utf-8"), self.target_chars)
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

    def save(self) -> None:
        """Write atomically and fail closed if another process changed the source."""
        if not self.path.exists():
            raise SourceChangedError("source file disappeared")

        current_mtime_ns = self.path.stat().st_mtime_ns
        if current_mtime_ns != self.original_mtime_ns:
            raise SourceChangedError("source file changed outside this editor")

        tmp_path = self.path.with_name(f".{self.path.name}.termux-editor.tmp")
        tmp_path.write_text("".join(self.chunks), encoding="utf-8")
        os.replace(tmp_path, self.path)

        self.original_mtime_ns = self.path.stat().st_mtime_ns
        self.dirty = False
