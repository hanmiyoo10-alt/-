# SimCore Release History — 0.64.x

> Lifecycle role: `POINT_IN_TIME_EVIDENCE`.
>
> Historical evidence only. Nothing in this file owns current production identity, current release state, current priority, release authorization, or runtime truth. Read `docs/CURRENT_DEVELOPMENT.md` and the current SimCore authority chain for live state.

## Migration provenance

- Source path: `docs/CURRENT_DEVELOPMENT.md`
- Source main commit: `53005f0fdeecf7801f594fbfd41418330788a389`
- Migration packet: #4346
- Migration status: `ROLLED_OVER`
- Source identities: historical ledger `v0.64.3` through `v0.64.0`
- Preservation rule: migrated source prose below is copied verbatim; surrounding provenance/navigation is new migration metadata only.

---

## v0.64.3 — B_END Diagnostic Builder Binding Repair

Status: **PRODUCTION · PENDING NATURAL B_END LIVE CLOSE GATE**

```text
Version: 0.64.3
Release: B_END Diagnostic Builder Binding Repair
Release commit: d7fd45cd193ef1ff187c73761ded958d89558ebf
Release blob: ff481aa904340b844ef29b0d89aa20bd6286286d
Parent: v0.64.2 Diagnostic Copy Resilience
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
outer runtime binds existing Kernel + Time modules
buildLastTurnDiagnosticReport body byte-identical
B_END terminal coverage expression byte-identical
COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED unchanged
no request/output hot-path behavior change
no Broadcast/Time semantic change
no persistent schema or host/storage/network/timer surface change
M2-3 design remains frozen for v0.65.0
```

Static release gate requires syntax, latest/install identity, Contracts v2, B_END report-builder binding fixture, unchanged builder body, unchanged protected side-effect counts, and unchanged diagnostic-copy stage fixtures.

Natural live close gate:

```text
current runtime mode B_END
output COMMITTED
report build succeeds
Broadcast closure / terminal coverage lines present
copy result COPIED or COPIED_FALLBACK
```

After the live close gate, review `POST_BEND_C_CLOCK_DOMAIN_GAP` as a separate correctness contract. Do not fold it into v0.64.3 or M2-3; if confirmed, release a narrow post-B_END clock-authority mini before v0.65.0. M2-3 remains blocked until that review is resolved.

## v0.64.2 — Diagnostic Copy Resilience

Status: **PRODUCTION · PENDING ONE LIVE COPY RESULT**

```text
Version: 0.64.2
Release: Diagnostic Copy Resilience
Release commit: 7a1f1692920abbc890c6663b40e38a24676c3de9
Release blob: 3058e5bafa7f3abd15277ceabd0bd9d8518f52dc
Parent: v0.64.1 Summary Scope Authority
Major checkpoint: M2-2 unchanged
```

Primary contract:

```text
BUILD exactly once
primary Clipboard API
fallback temporary textarea + execCommand('copy')
results: COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED
bounded memory-only probe; no raw report retention
builder body byte-identical; runtime semantics unchanged
```

Static CI verifies report build count, primary/fallback exact payload identity, builder-failure short circuit, fallback cleanup/focus restoration, latest/install equality, architecture contracts, Summary Scope fixtures, frozen M2 markers, and unchanged storage/chat/network/timer call counts.

Live routing:

```text
COPIED or COPIED_FALLBACK -> v0.64.2 live gate PASS; proceed with M2-3
REPORT_BUILD_FAILED       -> separate builder-repair mini before M2-3
CLIPBOARD_WRITE_FAILED    -> PocketRisu/WebView clipboard transport scope
```

## v0.64.1 — Summary Scope Authority

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Production identity:

```text
Version: 0.64.1
Release: Summary Scope Authority
Release commit: 0cd0b01440e0d8654a84b64362541a9fbfcb03b3
Release blob: 2d5d0acf4d2da52874aafaa5bbd074a81c7f7b52
Parent production baseline: v0.64.0 M2-2 Representation Ownership Split
Major checkpoint remains: M2-2
```

Direct triggering evidence came from paired year-end C requests in runtime `mt2qjgt5-9oi0sk`:

```text
ANNUAL_ONLY candidate @2020:
- target-year achievements may be omitted while earlier achievements can bleed into the annual summary
- standalone summary remained over-chained to root A@2014 (WATCH; Lineage not patched)

CUMULATIVE_YOY @2022:
- explicit 2029.12.31 -> 2030.12.31 baseline/current comparison
- visible COSMIC section used 3,400만 as the 2029 baseline, while a later comment reused 720만
- several requested per-metric absolute/percentage YoY deltas were omitted
- recurrence matched an older template; correlation preserved, causality not assumed
```

Patch boundary:

```text
Lifecycle request classifier: NONE / ANNUAL_ONLY / CUMULATIVE_YOY
pending metadata only; no persistent schema
Prompt compiler v3 serializes scope authority
Summary factual authority > Recurrence factual carryover
Recurrence/Lineage implementation unchanged
no output-body parser or semantic repair
```

Static release gate:

```text
python helper compile            PASS
node --check latest/install      PASS
latest == install               PASS
Contracts v2 checker             PASS
summary classifier fixtures 9/9 PASS
M2-2 frozen markers retained     PASS
```

Live targets:

```text
ANNUAL_ONLY input -> Summary scope ANNUAL_ONLY / target 2030
- target-year achievements stay target-year scoped
- earlier facts only labeled context/metadata
- cumulative counters labeled year-end snapshot

CUMULATIVE_YOY input -> Summary scope CUMULATIVE_YOY / target 2030 / comparison 2029
- every requested comparable metric gets previous/current/absolute delta/percentage delta
- older historical values cannot replace the requested 2029 baseline

Lineage over-chain remains WATCH and is intentionally unchanged for attribution isolation.
```

## v0.64.0 — M2-2 Representation Ownership Split

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Production identity:

```text
Version: 0.64.0
Release: M2-2 Representation Ownership Split
Release commit: d0407c5cd7441a978f815db068344219f8c15027
Release blob: 6d7ed75b14ad042cc8bfab1be16fc3c97069f5bb
Parent production baseline: v0.63.59 Broadcast End Closure Contract
```

This is a mechanical ownership checkpoint, not a feature release.

```text
Before
Runtime Mirror
├─ Fresh observation / mirror transport
└─ bounded representation provenance ledger

Outer request shell
└─ prior/current representation taxonomy + carryover shape

After M2-2
Representation
├─ bounded fingerprint-only provenance ledger
├─ CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
├─ prior representation classification
├─ current exact carryover classification
└─ fingerprint-length deltas / carryover shape

Runtime Mirror
├─ Fresh chat observation
├─ strict identity/location/staleness guards
└─ mirror write scheduling
```

Static checkpoint evidence:

```text
node syntax latest/install          PASS
latest.js == install.js             PASS
Contracts v2 architecture checker   PASS
representation module present       PASS
runtime-mirror provenance API gone  PASS
Fresh raw body retention             NONE
persistent schema change             NONE
new host/network/timer surfaces      NONE
```

Frozen behavioral controls that must remain unchanged in live validation:

```text
Prior OUTPUT_MISMATCH + current == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT

Deferred Mirror unknown representation
→ conservative OUTPUT_MISMATCH / no unsafe mirror write
```

New diagnostic ownership line:

```text
Representation ownership: REPRESENTATION · ledger <N> · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED
```

Live gate before M2 advances to Edit Reconcile extraction:

1. ordinary A/C/B turns keep stable request/output/binding/mirror behavior;
2. a normal exact carryover remains `SAME_FAST` / `Edit origin NONE`;
3. when a natural CANONICAL↔FRESH mismatch occurs, exact Fresh carryover still reaches `REPRESENTATION_FAST_RECONCILED` without the old multi-second rebuild;
4. a genuine user edit still reaches `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`;
5. no regression appears in Recovery, timeline, Broadcast closure, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history observation, or persistent schema.

Do not start physical `edit-reconcile` extraction until this checkpoint has direct real-long-chat evidence.
