# Termux Large Document Prototype 0

Date: 2026-08-24
Status: DEVELOPMENT PROTOTYPE · NON-PRODUCTION
Issue: #202
Scope: `plugins/termux/large-doc-editor/`

## Primary goal

Test one hypothesis only:

> Keeping the mobile editing surface limited to a small current chunk can preserve responsive typing on a large document better than rendering the entire document at once.

This is not yet a claim about the internal cause of Google Docs lag.

## Implementation

Prototype 0 uses:

```text
large UTF-8 file
→ Python localhost process
→ in-memory chunk store
→ current chunk only
→ mobile browser textarea
```

Properties:

- binds to localhost only;
- exposes only a user-selected workspace;
- rejects path traversal outside that workspace;
- saves atomically;
- fails closed when the source file changed externally;
- has no Google credentials or account integration;
- records a lightweight `input → paint` median in the client.

## Verification completed before PR

The chunk-store test suite was executed independently before repository promotion:

```text
5 tests passed
```

Covered contracts:

- split/join round-trip fidelity;
- empty-document behavior;
- workspace path escape rejection;
- edit + atomic save;
- fail-closed external-change handling.

Repository CI must repeat syntax and unit checks on relevant changes.

## Evidence required

Before adding Google Docs/Drive integration, collect on one real device:

1. small-file baseline in this prototype;
2. large-file result in this prototype;
3. comparable large-document behavior in Google Docs;
4. typing vs scrolling vs open/save symptoms;
5. device model, Android version, and Google Docs app version.

## Interpretation

If large-file typing remains responsive in this prototype, mark only:

```text
VERIFIED:
A current-chunk-only editing surface can remain responsive for the tested local text fixture/device.
```

Do not claim:

```text
Google Docs is slow because it renders the entire document.
```

unless later evidence proves that attribution.

## Next gate

No Google API, DOCX fidelity layer, release branch, or production artifact should be created until real-device evidence is reviewed in a diagnostic-only turn.
