# SimCore v0.65.0 Approval Spec Path Blocker

Date: 2026-08-28
Status: FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE
Release: `simcore-v0.65.0-new-04`

## Summary

The v0.65.0 runtime candidate remained valid and byte-stable, and approval PR #734 passed permanent SimCore Verify and Required. Exact Approval Activation then failed closed before permanent caller dispatch because the approval package placed the committed release spec under an unauthorized path.

## Evidence

- Approval PR: #734
- Approval PR title: `SimCore exact release approval: simcore-v0.65.0-new-04`
- Approval PR merge: `45212827349628b75d08c3000d9b6fb8842eb10d`
- Candidate commit: `9dd3ca95e92a7abc58fb3b608df06776eca51d28`
- Expected production commit: `7765ad75359f8d9736a7dea65141e4e45b713c10`
- Candidate release blob: `1b38e2b2874f2581edae8f1080edc39558febefa`
- Exact Approval Activation run: `33172503192`
- Failing `Dispatch Permanent Caller` job: `98852833705`
- Exact failure: `SIMCORE_RELEASE_APPROVAL_CHANGED_PATH_INVALID:products/simcore/releases/authorized-specs/simcore-v0.65.0-new-04.json`
- `Dispatch and observe permanent caller`: SKIPPED

## Root cause

The approval package's second file was written to:

`products/simcore/releases/authorized-specs/simcore-v0.65.0-new-04.json`

The activation contract accepts exactly one approval JSON under:

`products/simcore/releases/approvals/*.json`

and exactly one committed release spec under:

`products/simcore/releases/specs/*.json`

For this transaction the required spec path was therefore:

`products/simcore/releases/specs/simcore-v0.65.0-new-04.json`

This was an operator packaging/path error. It was not a runtime defect and did not require a release-system code change.

## Safety result

The adapter rejected the merged transaction while resolving the exact delegated approval boundary. Permanent publisher dispatch did not begin, so `release-simcore` received no v0.65.0 mutation from this failed activation.

Classification remains `FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE` until a fresh append-only approval transaction reaches permanent publication.

## Recovery decision

Do not mutate or reuse the failed `new-04` approval transaction. Continue through an append-only `intent-05 / new-05` recovery transaction using the same approved v0.65.0 builder and the unchanged production parent. The resulting candidate must reproduce the same release blob before approval.

The `new-05` approval package must use the repository's actual activation contract paths, specifically:

- `products/simcore/releases/approvals/simcore-v0.65.0-new-05.json`
- `products/simcore/releases/specs/simcore-v0.65.0-new-05.json`

The approval PR title must be exactly:

`SimCore exact release approval: simcore-v0.65.0-new-05`

No runtime feature changes and no release-system overhaul are authorized in this recovery.