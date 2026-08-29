# SimCore Release System R2.6 implementation worksheet

Date: 2026-08-29 KST

Status: **IMPLEMENTATION IN PROGRESS · NONRUNTIME · ACTIVATION NOT AUTHORIZED**

Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_DESIGN.md`

Implementation authorization: `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

## Ownership scope record

Primary semantic owner:

```text
products/simcore/tooling/release-state-converge.mjs
```

New bounded directional adapters:

```text
products/simcore/tooling/release-state-main-gate.mjs
products/simcore/tooling/release-state-reobserve.mjs
products/simcore/tooling/release-state-preplay.mjs
```

Orchestration surfaces:

```text
.github/workflows/simcore-release-permanent.yml
.github/workflows/simcore-release-state-sync.yml
```

Permanent regression authority:

```text
products/simcore/tests/post-publish-state-permanent.test.mjs
products/simcore/tests/registry.mjs when needed
```

Policy surface:

```text
products/simcore/state-sync/writer-policy.json
```

Explicitly excluded:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
v0.67/M2-5 runtime work
human LIVE_PASS semantics
trusted predecessor semantics
repo-main-write.py authority
unrelated WATCH/FIX items
```

## Frozen implementation slices

```text
A. semantic owner emits normalized PostPublishStateEnvelope
B. static policy declares bounded post-publish transaction path families
C. shared main-gate derives staging/allow from owner envelope
D. shared durable reobserver checks owner hashes + durable claims + production parity
E. prepublication simulation uses same semantic owner and closure-integrity before publication
F. permanent/recovery workflows become thin orchestration over shared tools
G. permanent regression matrix proves marker/payload/receipt/parity/durability/authority boundaries
```

## Safety invariants

```text
one publisher = Permanent Release
one main integration gateway = repo-main-write.py
no force push
no new required job
no new lifecycle state
no background retry/polling
latest.js == install.js remains mandatory
preplay has productionMutation = NONE
implementation does not mutate release-simcore
activation remains separately gated
```

## Completion gate

```text
node syntax PASS for all changed/new JS
YAML parse PASS for changed workflows
post-publish permanent regression PASS
full SimCore Verify + Required PASS
workflow-local persistent payload lists absent
workflow-local disposition vocabulary absent
preplay cannot publish or write main
reobserver has no write/publish primitives
release-simcore unchanged
```
