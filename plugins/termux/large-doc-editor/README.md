# Termux Large Doc Editor — Prototype 0

Purpose: test whether a chunked mobile editing surface remains responsive on large documents without rendering the entire document in the browser.

This is **not** a Google Docs replacement, production release, or APK patch. It is an evidence-gathering prototype for Issue #202.

## Current scope

- localhost-only Python server
- no third-party Python packages
- UTF-8 `.txt`, `.md`, `.log`, `.json`
- current-chunk-only browser editing
- explicit atomic file save
- fail-closed save if the source changed outside the editor
- basic input-to-paint latency display
- no Google account, Drive, Docs API, DOCX, rich formatting, comments, suggestions, or collaboration yet

## Run in Termux

From this directory:

```sh
python server.py --workspace ~/storage/shared/Documents
```

Then open:

```text
http://127.0.0.1:8765
```

The server binds only to `127.0.0.1`.

If Termux storage access has not been granted yet, use Android/Termux's normal storage permission flow before selecting a shared-storage workspace.

## Large fixture

Generate a 5 MiB test document:

```sh
python tools/generate_fixture.py ~/storage/shared/Documents/large-fixture.txt --megabytes 5
```

Then open that file in the prototype and compare:

- typing responsiveness
- scroll responsiveness inside one chunk
- median `input → paint`
- memory/heat behavior
- the same large document in Google Docs on the same device

## Tests

```sh
python -m unittest discover -s tests -v
```

## Design boundary

The browser never receives the full document. The Python process holds the document as chunks and serves only the current chunk. This intentionally tests front-end rendering pressure first.

A positive result does **not** prove the Google Docs bottleneck is the same. It only establishes that chunked rendering is a viable candidate worth deeper measurement.

Follow `docs/TERMUX_DEVELOPMENT_GUIDELINES.md` before any production or Google-sync work.
