# SimCore Reference Plugin Idea - LightBoard News 4.0.0 Source Intake

Date: 2026-08-30 KST

Status: **ARCHIVED · REFERENCE ONLY · NO PLUGIN RUNTIME AUTHORITY**

## 1. Scope

This intake adds the user-supplied reference artifact `🔦라이트보드 📰뉴스 4.0.0.charx` to the existing SimCore plugin idea/reference archive.

This transaction is source preservation only. It does not analyze or adopt News behavior and does not authorize any runtime feature.

## 2. Artifact identity

```text
source label   = 🔦라이트보드 📰뉴스 4.0.0.charx
restored name  = lightboard-news-4.0.0.charx
raw bytes      = 29,320
base64 chars   = 39,096
SHA-256        = 9bef481204e87a3f8856074eea23e0f780ab43aa43b755de9069de8fc4bebe1d
source dir     = references/simcore-plugin-idea-drop-2026-08-30/source-base64/news
```

SHA-256 of the restored artifact is the artifact identity authority.

## 3. Transport evidence

An initial 2,000-character text-chunk trial was rejected because GitHub-side blob identity did not match the locally computed identity for the same intended source slice.

First rejected trial:

```text
expected Git blob SHA = 49d4ae5244d2fb0ea692a75a9d8023f175e6bfc7
observed Git blob SHA = e8f96853792c12ab308dba07a2549096c1a9a1a7
```

Classification:

```text
FIX · REFERENCE_BINARY_TRANSPORT_CHUNK_DRIFT_RECURRENCE
```

The rejected representation is not part of final archive authority.

The intake then switched to 1,000-character base64 source slices. Every admitted slice was checked against its locally computed Git blob SHA before assembly.

Final source shape:

```text
parts       = 40
part001-039 = 1,000 chars each
part040     = 96 chars
news tree   = ef6a3a77cb38353421aa8e3718314c97bd6c5405
```

All forty admitted blob identities matched local expected identities.

Result:

```text
NEWS_SOURCE_TRANSPORT_INTEGRITY = PASS
BLOCKER                        = NONE
```

The existing direct-binary transport limitation remains:

```text
DEFER · DIRECT_BINARY_BLOB_TRANSPORT
```

## 4. Archive updates

The clean archive transaction adds:

```text
source-base64/news/part001..part040
MANIFEST.json news record
SHA256SUMS news checksum
RESTORE.sh news restore step
README.md six-artifact index
this intake evidence document
```

`RESTORE.sh` reconstructs `lightboard-news-4.0.0.charx` and verifies the SHA-256 together with the other archived reference artifacts.

## 5. Isolation

This source intake does not modify:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
SimCore runtime behavior
persistent runtime schema
v0.70.1 Cold First-Turn Tail Attribution design
R2.9 runtime/release work
```

No content-analysis conclusion is created here. News 4.0.0 remains an external idea/reference source until separately analyzed.

## 6. Verdict

```text
NEWS_4_0_0_SOURCE_ARCHIVED = YES
REFERENCE_ONLY             = YES
RUNTIME_AUTHORITY          = NONE
RELEASE_AUTHORITY          = NONE
TRANSPORT_FIX_PRESERVED    = YES
READY_FOR_SEPARATE_ANALYSIS = YES
```
