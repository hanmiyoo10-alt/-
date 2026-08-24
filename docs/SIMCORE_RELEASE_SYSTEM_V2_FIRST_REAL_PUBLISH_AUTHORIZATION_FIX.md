# SimCore Release System v2 — First Real Publish Authorization Canonicalization Fix

Date: 2026-08-25
Status: **FIX ACTIVE · NON-RUNTIME · PRODUCTION UNCHANGED**
Release: `simcore-v0.64.7-new-01`

## 1. Direct production evidence

The first genuine permanent R transaction was dispatched through the merged PR activation adapter.

```text
activation PR: #247
activation adapter run: 32748467375
permanent release run: 32748487837
```

Permanent release results before publication:

```text
Resolve Permanent Authorization / 97499582355 = SUCCESS
Candidate Required / Verify / 97499640604 = SUCCESS
Candidate Required / Required / 97499733471 = SUCCESS
Publish Exact Candidate / 97499770216 = FAILURE
Declare Published State / 97499835653 = SKIPPED
Permanent Release Required / 97499834775 = FAILURE
```

The failing publisher emitted exactly:

```text
RELEASE_AUTHORIZATION_MIXED_COMMIT RELEASE_AUTHORIZATION_MIXED_COMMIT
```

Post-failure production observation:

```text
release-simcore = 47969d24771f6cc188df6e32150fc6fde519182d
production version = 0.64.6
production mutation = NONE
```

Classification:

```text
RELEASE_AUTHORIZATION_JSON_SERIALIZATION_FALSE_POSITIVE
= FIX / R_FEEDBACK / RELEASE_CONTROLLER / NON_RUNTIME / BLOCKING
```

## 2. Root cause

The immutable release spec authorization commit is:

`08b54993876a687182469ee2cc9124f56ce77d9c`

GitHub commit evidence shows that commit changed exactly one path:

`products/simcore/releases/specs/simcore-v0.64.7-new-01.json`

and the file contains the authorized v0.64.7 tuple.

The controller's `verifyImmutableAuthorization` currently compares:

```text
git-show bytes from authorization commit
vs
JSON.stringify(parsed current spec) + newline
```

The checked-in release spec is human-readable pretty JSON, while `JSON.stringify(parsed current spec)` is compact one-line JSON. Therefore semantically identical JSON is rejected solely due to formatting.

The qualification fixture did not expose this because its `authorizeSpec` helper wrote only compact JSON.

## 3. Frozen correction

Do not weaken immutable authorization.

Correct the comparison boundary to:

```text
authorization commit spec bytes
→ parse JSON
→ canonical semantic JSON bytes
→ compare with canonical semantic bytes of current parsed spec
```

The following remain mandatory and unchanged:

```text
authorizationCommit is an immutable commit
spec exists at that commit
spec semantic content is exactly identical
spec path has exactly one authorization touch in canonical history
CANDIDATE_REQUIRED exact C/P = PASS
current release-simcore == expected P
candidate direct-parent/path/blob constraints
no force publication
```

Invalid JSON at the authorization commit must fail closed.

A real field/content mutation must continue to fail authorization.

## 4. Permanent regression requirement

The controller qualification suite must permanently cover:

```text
pretty-printed authorization JSON + same semantic current spec = PASS
compact authorization JSON + same semantic current spec = PASS
actual semantic spec mutation = FAIL
post-authorization spec mutation = FAIL
```

At minimum, normal positive release qualification must use pretty-printed JSON so the first-real-release failure cannot recur.

## 5. Retry boundary

The existing immutable release spec and merged activation record are historical evidence and must not be edited.

After this controller fix passes permanent CI and merges to main:

```text
release-simcore must still equal P
candidate ref must still equal C
spec must remain unchanged
```

Then issue a new immutable activation retry record pointing to the same authorized release instance and candidate. The retry must again execute the existing permanent caller and exact CANDIDATE_REQUIRED gate.

No manual `release-simcore` write is permitted.
