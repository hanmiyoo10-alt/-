# SimCore Reference Plugin Idea Source Drop Evidence — 2026-08-30

## Status

`REFERENCE_ARCHIVE_EXPANDED_TO_SIX_ARTIFACTS`

## Purpose

Preserve six user-supplied plugin/reference artifacts for later SimCore idea analysis without promoting any referenced behavior, implementation, dependency, or architecture into the SimCore product.

The archive originally landed with five artifacts and was later expanded with LightBoard News 4.0.0 through its dedicated intake record:

`docs/SIMCORE_REFERENCE_PLUGIN_IDEA_NEWS_4_0_0_SOURCE_INTAKE_2026-08-30.md`

## Authority boundary

This change is **reference/archive only**.

It does not:

- implement a SimCore feature,
- authorize reuse of any third-party implementation,
- alter the v0.70.1 design or implementation gate,
- modify `release-simcore`,
- modify `plugins/simcore/latest.js`,
- modify `plugins/simcore/install.js`,
- change runtime state/schema/ownership,
- change the release/repository operating system.

`main` is the authority for this reference/evidence record. SimCore runtime authority remains `release-simcore`.

## Archived artifacts

| Artifact | Bytes | Original SHA-256 |
| --- | ---: | --- |
| Lightboard comments 4.0.0 | 17,939 | `d6cb46311481c64d3bf8829cdb6f6a1b3e30cf68099035cc4b2aab80f494b8bf` |
| Lightboard miniboard 4.1.1 | 25,559 | `dc3eb38d9b4195ccaaf079bb761aa4f5c35b489f761ac7ad1f6e034170341236` |
| Lightboard hunternet 4.0.0 | 23,160 | `ae7ecb090e5def555cfbef28b2e9c4d55b09ffaeb6443d9796ecc6d0b87f3f81` |
| Lightboard news 4.0.0 | 29,320 | `9bef481204e87a3f8856074eea23e0f780ab43aa43b755de9069de8fc4bebe1d` |
| Lightboard core 4.1.1 | 37,503 | `fd97f4dab7b5fd1749dc4984d723790485fe37d0b54b9140eb54b518a7d1d6f5` |
| RisuAI scripting skill ZIP | 38,522 | `bce7013f542b7947a48a192e971b7be20e2cea2d1061b4b9ea3e20ef79c90431` |

The sanitized restored filenames, byte counts, and checksums are duplicated in the archive `MANIFEST.json` and `SHA256SUMS` so the reference set can be reconstructed without relying on this narrative document.

## Transport design

The GitHub connector available for this task exposes UTF-8 Git blob/tree primitives but no reliable local-file binary upload primitive for arbitrary `.charx` and `.zip` files.

The final archive therefore stores the originals as ordered base64 source slices. Each admitted slice was checked against the locally computed Git blob SHA for that exact UTF-8 slice before being accepted into the final source tree. Final archive assembly references only admitted blob SHAs.

`RESTORE.sh` performs deterministic lexical concatenation of each artifact's `part*` files, base64-decodes the result, and verifies the reconstructed bytes against the original SHA-256 values.

## Preserved anomalies

### FIX · REFERENCE_BINARY_TRANSPORT_CHUNK_DRIFT

Early scratch uploads used larger text chunks. GitHub-side size/blob identity showed one-to-several-character drift on some transfers. Those scratch representations are non-authoritative and are excluded from the clean final archive.

Resolution: reduce transfer slices and require exact Git blob SHA equality before admission.

### DEFER · DIRECT_BINARY_BLOB_TRANSPORT

A direct `create_blob(..., encoding=base64)` path was explored for storing the binary originals directly. Large tool arguments were not reliably transmitted end-to-end, so this transport path is not used for the archive.

This is a transport/tooling limitation, not a SimCore runtime defect.

### FIX · SCRIPTING_PART017_TRUNCATION

One scripting-skill source slice intended to be 2,000 UTF-8 characters arrived as 1,980 characters. It was rejected. The same logical 2,000-character interval was retransmitted as two independently verified 1,000-character slices and only those corrected blobs are present in the final source tree.

### FIX · HUNTERNET_MISSING_SOURCE_SLICE

One previously computed hunternet slice was not present in the repository object store when final clean assembly began. The missing 8,000-character interval was retransmitted as four independently verified 2,000-character slices. The clean archive references the replacement slices only.

### FIX · REFERENCE_SOURCE_DROP_INDEX_DRIFT

After News 4.0.0 was archived through its dedicated intake, this umbrella source-drop document still described the archive as five artifacts and omitted `source-base64/news/` from the current contract.

Resolution: synchronize this umbrella record to the six-artifact archive authority. No archived bytes or runtime/release files are changed by this documentation repair.

## Final archive contract

Path:

`references/simcore-plugin-idea-drop-2026-08-30/`

Required contents:

- `README.md`
- `MANIFEST.json`
- `SHA256SUMS`
- executable `RESTORE.sh`
- `source-base64/comments/`
- `source-base64/miniboard/`
- `source-base64/hunternet/`
- `source-base64/news/`
- `source-base64/core/`
- `source-base64/scripting/`

## Acceptance criteria

The current reference archive authority is acceptable only if:

1. archive/document sync is based on the then-current `main`,
2. reference changes remain isolated from SimCore runtime/release files,
3. no scratch `raw-base64` transport path is treated as authority,
4. archive source trees resolve entirely to verified blob identities,
5. restore metadata contains all six original SHA-256 values,
6. `RESTORE.sh` covers all six artifact source directories,
7. exact-head static/CI checks required by the repository pass for each archive/document transaction.

## Product consequence

None yet.

These files exist to support idea/reference analysis. Any SimCore feature inspired by them must receive its own design/evidence record, working branch, validation, release, and live-test lifecycle. This archive itself grants no implementation authority.
