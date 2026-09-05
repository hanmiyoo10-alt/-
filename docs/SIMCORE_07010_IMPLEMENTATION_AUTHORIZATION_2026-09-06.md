# SimCore v0.70.10 Implementation Authorization

Date: 2026-09-06 KST
Status: **AUTHORIZED · DESIGN FROZEN · IMPLEMENTATION MAY BEGIN**
Classification: **RUNTIME OBSERVABILITY MINI · HOST-LOCAL TELEMETRY CHECKPOINT COST ATTRIBUTION**

## 1. Operator authorization

The operator explicitly authorized implementation in the active SimCore maintenance session after the v0.70.10 design was merged to `main`.

```text
Operator instruction = 새버전 설계 완료됨 / 내가 허락함 / 구현ㄱ
Authorization = GRANTED
Design expansion = NOT GRANTED
Release-system restructuring = NOT GRANTED
```

Canonical frozen design:

```text
docs/SIMCORE_07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_DESIGN_2026-09-06.md
Design PR = #1636
Design merge main = efe4ff2fe6855ddcfc3d8d6644cca8a18ca2c507
Version = 0.70.10
Release = Host-Local Telemetry Set Cost Attribution
Primary evidence owner = #1588 HOST_LOCAL_CHECKPOINT_LATENCY
```

## 2. Fresh implementation-time authority preflight

Observed immediately before opening this authorization transaction:

```text
main = efe4ff2fe6855ddcfc3d8d6644cca8a18ca2c507
production version = 0.70.9
production release = Inline Planning Marker Hygiene Guard
release-simcore = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
production blob = dc82006c468ebef76fa0126e0533dda245bd222d
validation = LIVE_PASS
current priority = POST_07009_NEXT_STEP_REVIEW
major checkpoint = M2-6
provider cache = UNVERIFIED
```

`release-simcore` remains the runtime/deployment authority. `main` remains design/evidence/roadmap authority.

## 3. Authorized implementation boundary

Implement exactly the frozen observability shape:

```text
1. split existing Host-local outer timing into hostAcquireMs + hostSetMs
2. preserve hostElapsedMs as the enclosing total
3. reuse existing serializedChars
4. derive bounded residual accounting only
5. derive Host set ms-per-1K only for a real set attempt with valid chars
6. expose one bounded Last Turn Diagnostic host-cost line
7. add deterministic permanent regression for all frozen branches
8. qualify metadata/runtime/host identity as 0.70.10
9. preserve latest.js == install.js in candidate materialization
```

The implementation must stay in existing owners: runtime telemetry plus the existing outer checkpoint/OPS diagnostic surface. No new runtime module or Host transport owner is authorized.

## 4. Explicit non-changes

The following remain forbidden by this authorization:

```text
remove/detach OUTPUT_COMMIT await
change output-success ordering or runtime/location guards
change MEMORY -> SESSION -> HOST_LOCAL transport order
add Host read/write/acquisition/set attempt
change Host-local key, TTL, size cap, consume rules, or mailbox schema
add retry, polling, queue, worker, timer, network, chat/history mutation
change persistent semantic schemas
change PROMPT_COMPILER_VERSION
change COMMUNITY_CLASSIFIER_VERSION
mix #1556 or #1587 optimization work
modify release-system machinery as part of the runtime feature implementation
```

Additional clock reads used only to decompose the already-existing awaited Host span are authorized by the frozen design.

## 5. Qualification and publication sequence

Required order remains:

```text
repo authorization evidence
-> implementation branch
-> deterministic/static/CI qualification
-> separate candidate/release transaction
-> release-simcore publication
-> real long-chat Stage A/B/C evidence
-> main documentation / durable development-memory synchronization
```

If implementation requires widening the frozen side-effect boundary, stop and record the finding as WATCH / DEFER / FIX / BLOCKER rather than silently expanding scope.

## 6. Authorization verdict

```text
V07010_DESIGN = FROZEN / KEEP
V07010_IMPLEMENTATION = AUTHORIZED
V07010_RUNTIME_SCOPE_EXPANSION = FORBIDDEN
V07010_RELEASE_SYSTEM_REFACTOR = FORBIDDEN
NEXT = IMPLEMENT ON FRESH MAIN AFTER THIS AUTHORIZATION PASSES REQUIRED CI
```
