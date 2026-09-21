#!/usr/bin/env python3
"""Restore pinned Ghidra or checkpoint a CLOSED analysis directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import zipfile

REPO = "hanmiyoo10-alt/-"
TAG = "ghidra-toolchain-34213335872"

def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def check(folder, manifest):
    for line in (folder / manifest).read_text().splitlines():
        expected, name = line.split(maxsplit=1)
        name = name.lstrip("*")
        if Path(name).name != name:
            raise ValueError("Checksum filename must be a basename")
        if digest(folder / name) != expected:
            raise ValueError("Checksum mismatch: " + name)

def restore(destination, parts):
    if platform.system() != "Linux" or platform.machine() not in ("x86_64", "AMD64"):
        raise SystemExit("This release requires Linux x86_64.")
    destination = destination.resolve()
    if destination.exists():
        raise SystemExit("Destination exists; use its run-ghidra or choose a new directory.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        work = Path(temporary)
        patterns = ["SHA256SUMS"]
        patterns += ["PARTS-SHA256SUMS", "*.part*"] if parts else ["ghidra-linux-x64.tar.gz"]
        command = ["gh", "release", "download", TAG, "--repo", REPO, "--dir", str(work)]
        for pattern in patterns:
            command += ["--pattern", pattern]
        subprocess.run(command, check=True)
        if parts:
            check(work, "PARTS-SHA256SUMS")
            names = [line.split(maxsplit=1)[1].lstrip("*") for line in (work / "PARTS-SHA256SUMS").read_text().splitlines()]
            with (work / "ghidra-linux-x64.tar.gz").open("wb") as out:
                for name in sorted(names):
                    with (work / name).open("rb") as source:
                        shutil.copyfileobj(source, out)
        check(work, "SHA256SUMS")
        extracted = work / "runtime"
        extracted.mkdir()
        with tarfile.open(work / "ghidra-linux-x64.tar.gz") as archive:
            archive.extractall(extracted, filter="data")
        subprocess.run([str(extracted / "run-ghidra"), "--projects-dir", str(work / "doctor-projects"), "doctor"], check=True)
        extracted.rename(destination)
    print(destination / "run-ghidra")

def checkpoint(source, output, note):
    source, output = source.resolve(), output.resolve()
    if output.is_relative_to(source):
        raise ValueError("Checkpoint must be outside its source directory.")
    if not source.is_dir():
        raise ValueError("Missing analysis directory")
    files = sorted(p for p in source.rglob("*") if p.is_file())
    if any(p.suffix == ".lock" for p in files):
        raise ValueError("Close Ghidra and resolve its project lock before checkpointing.")
    if any(p.is_symlink() for p in source.rglob("*")):
        raise ValueError("Checkpoint source must not contain symlinks.")
    output.parent.mkdir(parents=True, exist_ok=True)
    manifest = {"resume_note": note, "files": {}}
    try:
        with output.open("xb") as stream:
            with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
                for path in files:
                    if path.name.endswith(".lock~"):
                        continue
                    name = path.relative_to(source).as_posix()
                    data = path.read_bytes()
                    manifest["files"][name] = hashlib.sha256(data).hexdigest()
                    archive.writestr("analysis/" + name, data)
                archive.writestr("checkpoint.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        verify(output)
    except FileExistsError:
        raise
    except Exception:
        output.unlink(missing_ok=True)
        raise
    print(json.dumps({"checkpoint": str(output), "sha256": digest(output), "files": len(manifest["files"])}, ensure_ascii=False))

def verify(path):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip():
            raise ValueError("ZIP CRC mismatch")
        manifest = json.loads(archive.read("checkpoint.json"))
        expected = {"checkpoint.json"} | {"analysis/" + n for n in manifest["files"]}
        if len(archive.namelist()) != len(expected) or set(archive.namelist()) != expected:
            raise ValueError("Unexpected checkpoint members")
        for name, expected_hash in manifest["files"].items():
            if Path(name).is_absolute() or ".." in Path(name).parts:
                raise ValueError("Unsafe checkpoint member")
            if hashlib.sha256(archive.read("analysis/" + name)).hexdigest() != expected_hash:
                raise ValueError("Checkpoint hash mismatch: " + name)
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("restore")
    p.add_argument("destination", type=Path)
    p.add_argument("--parts", action="store_true")
    p = commands.add_parser("checkpoint")
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--note", required=True)
    p = commands.add_parser("verify")
    p.add_argument("archive", type=Path)
    args = parser.parse_args()
    if args.command == "restore":
        restore(args.destination, args.parts)
    elif args.command == "checkpoint":
        checkpoint(args.source, args.output, args.note)
    else:
        print(json.dumps(verify(args.archive), ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
