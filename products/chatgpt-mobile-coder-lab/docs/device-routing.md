# Device routing - ChatGPT Mobile Coder Lab

This document owns the Mobile Coder Lab v1 **semantic routing policy** for choosing among the already-existing S/M execution surfaces.
It is operating policy only. It does not own device health, Git state, work reservation, runtime truth, merge authority, release state, or production truth.

Read `../README.md`, `../CURRENT.md`, `architecture.md`, and `decisions.md` together with repository-wide authority before acting.
The current-status projection `.agents/skills/sm-status/` may be consumed after routing, but it is not routing authority.

## Routing rule

Route one bounded semantic subtask at a time:

1. determine which execution context the subtask intrinsically requires;
2. select the narrowest existing route that satisfies that requirement;
3. only then read current status/preflight evidence for that route;
4. preserve `UNKNOWN`, `blocked`, dirty, stale, or offline evidence without converting it into repair authority;
5. if one user task spans contexts, split it into separately routed phases rather than forcing one device to own all effects.

A context-required task does not silently move to a different context because its preferred surface is unavailable.
Only ordinary device-agnostic repository work has the declared `S` to `M` fallback in v1.

## Route precedence

Use the first class whose semantic requirement actually applies. Earlier classes are narrower, not "healthier" or more privileged.

1. `S_PRIVATE_LOCAL`
2. `M_VM_LAB`
3. `M_PRIVATE_LAB`
4. `S_ANDROID_GUI_ADB_ACTION`
5. `S_ANDROID_GUI_ADB_READ`
6. `S_ANDROID_GUI`
7. `S_TERMUX`
8. `M`
9. `S` with `M` allowed as fallback/explicit target
10. `UNSUPPORTED / SEPARATE_AUTHORITY`
11. `UNKNOWN`

## Routing matrix

| Route | Semantic job | Execution context | Repository / landing locator | Branch namespace / worktree | Current preflight owner | Allowed fallback | Forbidden or out-of-scope effects |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `S_PRIVATE_LOCAL` | Proof intrinsically dependent on real live S auth/session or secret-bearing state | Separately authorized S device-local private runner | not applicable | no ordinary repo branch | fixed sanitized receipt gateway/owning private-runner authority when proven | none | GPT/RDC constructing sensitive commands; copying raw auth/session/log/device identifiers outward; improvising a missing private runner |
| `M_VM_LAB` | Experiment requiring the stronger guest/VM boundary and supported by current VM LAB v1 | M Termux-native fixed QEMU/TCG VM LAB | not applicable | no ordinary host-repo branch | `device-ops/vm-lab/verify.sh` and owner admission path | none | arbitrary image/QEMU/guest command; host repo/home share; standing guest network; bypassing admission |
| `M_PRIVATE_LAB` | Credential-free reproducible vendor/security experiment not needing VM isolation | dedicated M PRoot `mcl-private-lab` through its reviewed controllers | not applicable | no ordinary host-repo branch | `mcl-env-status status` first pass, then `device-ops/private-lab/**` owner as needed | none | live S credentials/session material; private live logs; shared host home/repo bind; arbitrary command widening; claiming PRoot is VM/kernel isolation |
| `S_ANDROID_GUI_ADB_ACTION` | Bounded semantic observation/action of visible ChatGPT Android UI after explicit user Wireless-ADB pairing | M Termux stale-guarded semantic adapter over already-paired Wireless ADB to physical S | runtime repo path not applicable; source changes use normal `S` repository worktree | runtime no ordinary repo branch; source changes use isolated `server/*` worktree | `device-ops/wireless-adb-ui/**` action receipt | none | caller coordinates/serial/path; arbitrary ADB shell; swipe/keyevent/clipboard; login/unlock/account automation; package/settings/security mutation; action without fresh semantic evidence |
| `S_ANDROID_GUI_ADB_READ` | Read-only semantic observation of visible ChatGPT Android UI after explicit user Wireless-ADB pairing | M Termux bounded adapter over already-paired Wireless ADB to physical S | runtime repo path not applicable; source changes use normal `S` repository worktree | runtime no ordinary repo branch; source changes use isolated `server/*` worktree | `device-ops/wireless-adb-ui/**` fixed receipt | none | automatic pairing; raw hierarchy output; arbitrary ADB shell; click/tap/text input; package/settings/security mutation; claiming action capability |
| `S_ANDROID_GUI` | Visible allowlisted ChatGPT Android UI observation/action that cannot be proven from repository or shell state | physical S Android GUI through the MCL GUI companion; existing `S-Termux` RDC endpoint is transport only | runtime repo path not applicable; source changes use normal `S` repository worktree | runtime no ordinary repo branch; source changes use isolated `server/*` worktree | `device-ops/gui-bridge/**` status/receipt plus explicit user accessibility consent | none | other apps/packages; login/password/account automation; raw-coordinate gestures; DOM/Playwright; network-exposed GUI control; treating S-Termux as GUI authority |
| `S_TERMUX` | Native server-phone Termux semantics: runit, Termux-host RDC/service state, Termux package/profile work | `S-Termux` native Termux endpoint | **no repository path is assumed** | source changes, when required, are prepared separately in `server/*` isolated repo worktrees | relevant S-Termux owner, such as `mcl-rdcctl` where its contract applies | none to a semantically different context | assuming `/root/nyang-repo` or an M-style path; mutating Ubuntu `S` merely because S-Termux is unavailable |
| `M` | Mainphone host/device-specific work outside PRIVATE LAB/VM LAB | M host / Termux-native surface as required by owner | repo baseline `/data/data/com.termux/files/home/nyang-repo`; landing `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` | `mainphone/*`; isolated feature worktree required for repo mutation | `mcl-env-status status` when sufficient, then the specific M owner | none for M-specific semantics | touching the preserved dirty ordinary checkout as a convenience; repurposing ordinary M Ubuntu as PRIVATE LAB |
| `S` | Ordinary device-agnostic repository source/test/PR work | S Ubuntu PRoot coding surface | `/root/nyang-repo`; landing branch intent `server/work` | `server/*`; isolated feature worktree from current `origin/main` | current Git/worktree/collision checks; `sm-status` may supplement presence/freshness | `M` is allowed fallback or explicit target | direct feature work on `server/work`; shared worktree; treating S preference as M prohibition |
| `UNSUPPORTED / SEPARATE_AUTHORITY` | Requirement is clear but no current reviewed owner supports it | none | not applicable | not applicable | separate authority/design required | none | shared secret pool; proposed shared secure enclave before ownership exists; arbitrary lab execution; VM networking/sharing outside v1; PocketRisu ownership expansion |
| `UNKNOWN` | Semantic requirement is ambiguous or conflicting | unknown | unknown | unknown | gather bounded authority/context evidence | none until resolved | guessing a device/context or manufacturing a route |

The M landing worktree is a landing/read baseline, not a generic feature workspace. The ordinary M repository may contain unrelated dirty work and is not made safe merely by selecting route `M`.

## Route details

### `S_PRIVATE_LOCAL`

Use only when the evidence cannot be produced without real live S secret-bearing/auth/session state. Execution must stay inside a separately authorized device-local private runner. GPT/RDC may consume only an allowlisted sanitized receipt. If that runner is not proven to exist, the task is blocked or unsupported; routing never authorizes inventing, installing, or transmitting a sensitive producer.

### `M_VM_LAB`

Use only when the experiment genuinely needs the stronger guest-kernel boundary and fits the existing fixed VM LAB contract. VM admission and owner preflight remain mandatory. Route selection does not add guest networking, host sharing, caller-selected images, arbitrary QEMU flags, or arbitrary guest commands.

### `M_PRIVATE_LAB`

Use for credential-free, reproducible vendor/security experiments that do not require live S credentials and do not require the VM boundary. The lab remains an isolated PRoot execution owner with bounded reviewed controllers. PRoot improves userland/filesystem separation but is not represented as a VM or kernel security boundary.

### `S_ANDROID_GUI_ADB_ACTION`

Use only when the visible ChatGPT Android client on physical S requires a bounded semantic effect after the user has already enabled and paired Android Wireless Debugging. The route composes as `ordinary ChatGPT -> RDC M -> M Termux mcl-adb-ui -> paired Wireless ADB -> fresh S uiautomator hierarchy -> M-local semantic revalidation -> internally derived bounded input -> bounded receipt`. V1 can launch only `com.openai.chatgpt`, resolve fixed `new_chat|send` aliases, perform one-point taps derived from fresh unique semantic handles, enter strictly bounded ASCII into a verified empty/focused editor, and wait for one exact bounded string. Caller coordinates, serials, paths, arbitrary shell, swipe/keyevent/clipboard, login/unlock/account automation, and package/settings/security mutation are forbidden. Stale, absent, ambiguous, invalid-bounds, focus-failed, or text-verification-failed evidence blocks the effect and never authorizes a wider fallback.

### `S_ANDROID_GUI_ADB_READ`

Use only for **read-only** semantic observation of the visible ChatGPT Android client on physical S after the user has already enabled and paired Android Wireless Debugging. The route composes as `ordinary ChatGPT -> RDC M -> M Termux mcl-adb-ui -> paired Wireless ADB -> S uiautomator hierarchy -> M-local parser -> bounded receipt`. Raw hierarchy, device serial/address, conversation body, and account/credential-like nodes remain local/withheld. V1 has no click/tap/text-input action and no arbitrary ADB shell. Missing pairing, zero/multiple devices, model mismatch, hierarchy failure, or platform output blocking fail closed rather than authorizing another route.

### `S_ANDROID_GUI`

Use only when the semantic evidence or effect is the visible ChatGPT Android client UI on physical S. The route composes as `ordinary ChatGPT -> existing S-Termux RDC transport -> mcl-gui -> MCL Android GUI companion -> com.openai.chatgpt`. The S-Termux endpoint transports bounded commands but does not own GUI authority. The route is device-backed, not cloud-backed: S must be powered, reachable, interactive/unlocked, already signed in to ChatGPT, and the user must have explicitly enabled the MCL AccessibilityService. Missing consent, lock state, inaccessible/secure windows, stale snapshots, ambiguous nodes, or unproven peer identity fail closed. Source changes for this route are still ordinary repository work and therefore use route `S` plus an isolated `server/*` worktree before any separately authorized Android live phase.

### `S_TERMUX`

Use when correctness depends on native server-phone Termux semantics. Do not assume this endpoint has an Ubuntu/M-style repository path. If a repository change is required, mutate source through the normal `S` repository path in an isolated `server/*` worktree, then perform any separately authorized native-Termux validation/apply phase through `S-Termux`.

### `M`

Use when the work is intrinsically tied to the mainphone host/device and is not itself PRIVATE LAB or VM LAB execution. Repo mutation uses `mainphone/*` plus an isolated worktree. Selecting `M` never authorizes disturbing an unrelated dirty ordinary checkout.

### `S` with `M` fallback

For ordinary device-agnostic repository work, prefer S as the default coding surface. This is an operating preference, not a capability or authority ban on M. D-001/D-002 continue to treat both phones as independent repository workers, so M remains a valid explicit target or fallback when current Git/worktree/collision evidence permits it.

## Current status is a separate axis

Route selection answers **where this semantic job belongs**. Current status answers **whether that selected surface can be used now**.

After selecting a route, read only the bounded current evidence needed for execution. `sm-status` may project RDC presence, Git branch/dirty/freshness, S-Termux profile state, M supervision, PRIVATE LAB state, and VM admission. Each field remains a scoped observation. No `sm-status` value grants repair, sync, fallback, merge, release, or production authority.

For context-required routes (`S_PRIVATE_LOCAL`, `M_VM_LAB`, `M_PRIVATE_LAB`, `S_ANDROID_GUI_ADB_ACTION`, `S_ANDROID_GUI_ADB_READ`, `S_ANDROID_GUI`, `S_TERMUX`, `M`), offline/blocked/unknown evidence blocks or defers that semantic phase unless its owning contract explicitly provides an equivalent route. Do not substitute a different context merely to continue.

For ordinary route `S`, M fallback is allowed only after current Git/worktree/collision evidence proves the M execution workspace is safe for that task. A dirty or stale observation is evidence to preserve, not an instruction to reset, stash, switch, fetch, or sync automatically.

## Multi-context example

A change to an S-Termux service contract may legitimately split into two phases:

```text
repository source edit/test
-> route S
-> server/* isolated worktree

native Termux verification/apply, if separately authorized
-> route S_TERMUX
-> no assumed repository path
```

The routing policy does not merge those authorities into one execution surface.

## Cross-cutting boundaries

- Never share one mutable Git working tree between S and M.
- Never auto-sync, checkout, reset, clean, or stash a dirty tree.
- Device landing branches/worktrees are not feature workspaces.
- Routing does not create a work lease or prove a scope is collision-free.
- Routing does not create a central runtime/production truth database.
- Routing does not replace Git, CI, main-write, release, security, or production gates.
- Routing does not expand PocketRisu ownership, replace runit with a general supervisor, or authorize a dispatcher.
- Never copy live S credentials/session/token material into M PRIVATE LAB or VM LAB.
- The proposed neutral S/M shared sensitive-work enclave remains a separate authority/design topic and is not a v1 route.

## Relationship to later coordination

`sm-status` supplies read-only current observations. A future task lease may own coordination-only reservation. Future task manifests/receipts may reference these route names. An automatic dispatcher remains deferred until routing, status, lease, and receipt contracts exist and are separately reviewed; any dispatcher must consume this policy rather than silently replacing it.
