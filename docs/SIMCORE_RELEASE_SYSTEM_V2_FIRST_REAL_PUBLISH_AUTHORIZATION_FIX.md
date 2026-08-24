# SimCore Release System v2 — First Real Publish Authorization Canonicalization Fix

Date: 2026-08-25
Status: **FIX IMPLEMENTED · PERMANENT CI PASS · NON-RUNTIME · PRODUCTION UNCHANGED**
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

The controller's former `verifyImmutableAuthorization` compared:

```text
git-show bytes from authorization commit
vs
JSON.stringify(parsed current spec) + newline
```

The checked-in release spec is human-readable pretty JSON, while `JSON.stringify(parsed current spec)` is compact one-line JSON. Therefore semantically identical JSON was rejected solely due to formatting.

The qualification fixture did not expose this because its `authorizeSpec` helper wrote only compact JSON.

## 3. Implemented correction

Immutable authorization is not weakened.

The comparison boundary is now:

```text
authorization commit spec bytes
→ parse JSON
→ normalized JSON bytes
→ compare with normalized bytes of current parsed spec
```

Invalid authorization JSON fails closed with `RELEASE_AUTHORIZATION_SPEC_INVALID`.

The following remain mandatory and unchanged:

```text
authorizationCommit is an immutable commit
spec exists at that commit
spec normalized content is exactly identical
spec path has exactly one authorization touch
CANDIDATE_REQUIRED exact C/P = PASS
current release-simcore == expected P
candidate direct-parent/path/blob constraints
no force publication
```

A real field/content mutation continues to fail authorization.

## 4. Permanent regression

`products/simcore/tests/release-controller-qualification.test.mjs` now makes normal positive authorization fixtures human-readable pretty JSON for:

```text
NEW_VERSION
SAME_VERSION_CORRECTION
ROLLBACK
```

and retains an explicit compact-JSON positive authorization control.

Existing negative controls still require:

```text
actual semantic spec mutation = FAIL
post-authorization spec mutation = FAIL
```

The pass marker now includes `AUTH_JSON_PRETTY_COMPACT`, while retaining the previous qualification marker prefix consumed by permanent CI.

## 5. Permanent CI evidence

PR: `#249 — fix(simcore): canonicalize permanent release authorization JSON`

Implementation head before this evidence-only amendment:

`ac29b410be89bafb7442828f18ad4f607fa650b3`

Authoritative permanent CI:

```text
SimCore CI run: 32749119043
Verify job: 97501593249 — SUCCESS
Required job: 97501679298 — SUCCESS
```

The run executed the proposed release-controller qualification including pretty and compact authorization representations.

No runtime or production mutation occurred.

A final CI run after this evidence-only amendment is the merge gate.

## 6. Retry boundary

The existing immutable release spec and merged activation record are historical evidence and remain unedited.

Before retry:

```text
release-simcore must still equal P
candidate ref must still equal C
spec must remain unchanged
```

Then issue a new immutable activation retry record pointing to the same authorized release instance and candidate. The retry must again execute the existing permanent caller and exact CANDIDATE_REQUIRED gate.

No manual `release-simcore` write is permitted.
