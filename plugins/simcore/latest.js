//@name simcore
//@api 3.0
//@version 0.66.0
//@display-name SimCore
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-simcore/plugins/simcore/latest.js
//@link https://github.com/hanmiyoo10-alt/-/tree/main/plugins/simcore SimCore Update Channel
//
// Optimization/architecture refactor built on the v0.62 golden behavior baseline.
// Design goal: preserve every proven Core/Community contract while shortening the normal request/output path.
//
// Internal modules (single installable plugin; ownership frozen by Contracts v1):
// - Contracts: module responsibility/non-goal registry only; no runtime policy
// - Kernel: state schema + shared primitives/normalization glue
// - Store: snapshot persistence/retention + deferred retention housekeeping mechanics only
// - Lifecycle: mode/broadcast/episode request preparation
// - Time: timestamp syntax + narrative/broadcast clock primitives + world-year/age synchronization
// - Frame: visible response-frame parsing + backward floor + same-title Chapter hold
// - Recurrence: repeated request-template detection/state only
// - Lineage: request root/parent/depth tracking only
// - Handoff: short-C source/parent-shift detection/state only
// - Evidence: authoritative request-message resolution + safe request-only source fencing
// - Community: COMMUNITY parsing/platform-family/group taxonomy only
// - Reaction: reaction parser, per-family historical maxima, normalization
// - Structure: validation/integrity/state-commit safety (judge; does not repair)
// - Representation: bounded CANONICAL/HOST_RAW/FRESH_CHAT identity + provenance classification only; memory-only, no raw bodies or chat writes
// - Edit Reconcile: previous-assistant reconcile decision tree + manual rebuild fallback coordination; application-only, no host reads
// - Output Finalize: deterministic prepared-output → committed state/content transition composition; application-only, no I/O
// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata
// - Bootstrap Migration: history bootstrap + legacy migration/repair coordination
// - Recovery: M2 compatibility facade preserving the v0.63.55 public recovery API
// - Prompt: cache-aware runtime prompt compilation/serialization only; does not own semantic state
// - Session: thin orchestrator; delegates prompt serialization to Prompt
// - OPS: performance helpers/diagnostic formatting only
//
// v0.66.0 M2-4 Session / Runtime Mirror Boundary Completion:
// - Physically extracts deterministic output finalization from Session into one application-level Output Finalize service while preserving Frame/Time/Structure/Reaction ordering and receipts
// - Moves deferred retention cadence/running bookkeeping from Session into Store housekeeping without changing index-17/%17 cadence, 750 ms deferral, failure isolation or output-critical awaits
// - Migrates Session/Edit Reconcile runtime calls from the Recovery compatibility facade to Output Compat / Bootstrap Migration / Output Finalize physical owners while retaining the Recovery shim
// - Splits Deferred Mirror compatibility ownership into Output Compat candidate-plan/interpretation policy, Runtime Mirror one-read exact observation/guards/transport, and Representation accepted canonical-equivalence provenance
// - Preserves FRESH_CONFIRMED_SUFFIX / BOUNDARY_CONFIRMED_SUFFIX / SAFE_BOUNDARY_CONFIRMED external meanings, SAME_FAST / REPRESENTATION_FAST_RECONCILED / MANUAL_EDIT_REBUILT controls, persistent schema, provider-cache UNVERIFIED policy and all unrelated domain semantics
// - Keeps latest.js and install.js byte-identical and requires real long-chat human evidence after release publication
//
// v0.65.0 M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence:
// - Converges userscript metadata, SIMCORE_RUNTIME_VERSION and HOST_COMPAT_VERSION on one v0.65.0 release identity so bounded Host-local telemetry capsules are stamped with the installed runtime version
// - Physically extracts the existing previous-assistant edit reconciliation decision tree from the outer runtime shell + Session into one application-level Edit Reconcile module without changing its frozen decisions
// - Preserves SAME_FAST / SAME_HOST_FAST, snapshot exact carryover, REPRESENTATION_FAST_RECONCILED, USER_EDIT_CANDIDATE and MANUAL_EDIT_REBUILT behavior; Representation remains provenance/taxonomy authority and Runtime Mirror remains transport-only
// - Adds permanent build assertions for metadata/runtime/host identity equality plus physical ownership/delegate markers; latest.js and install.js remain byte-identical
// - Keeps telemetry capsule schema/budgets, Host-local mailbox/TTL/location/consume semantics, Deferred Mirror gates, persistent schema, output semantics, provider-cache policy and all unrelated domain owners frozen
// - Live acceptance is ordered: Stage A proves v0.65.0 Host-local reload continuity first; only then may Stage B claim M2-3 behavioral equivalence
//
// v0.64.11 Bounded Telemetry Capsule Compaction:
// - Repairs real v0.64.10 long-chat capsules of 44,660 / 40,291 / 59,965 chars that exceeded the frozen 16,384-character durable handoff cap before Host-local setItem
// - Keeps rich same-generation prompt/topology observers and adds bounded reload-only exports: prompt <=64 line summaries, topology <=64 signatures, system0 <=8 head + 8 tail hashes
// - Keeps prompt/topology/trajectory component budgets 4,096 / 6,144 / 2,048 chars, 2,048 envelope reserve, and the authoritative whole-capsule 16,384-char hard cap
// - Makes reload precision explicit as EXACT_IDENTITY / LINE_BOUND / COMPLETE_PREFIX / PREFIX_FLOOR / BOUNDED and never renders a floor as false exactness
// - Skips cache-trajectory mutation once on a first-post-reload topology PREFIX_FLOOR, then returns to the existing exact same-generation path
// - Preserves MEMORY -> SESSION -> HOST_LOCAL, one Host-local key, 10-minute TTL, exact location, consume-before-adopt, output failure isolation, and provider cache UNVERIFIED
// - M2-3 remains frozen until 06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT closes with HUMAN_EVIDENCE
//
// v0.64.10 Host-Local One-Shot Telemetry Handoff:
// - Follows confirmed v0.64.9 live evidence where both WINDOW.sessionStorage and GLOBAL_THIS.sessionStorage throw ACCESS_ERROR and therefore cannot provide the pre-refresh durable telemetry sidecar
// - Preserves MEMORY -> browser SESSION priority and adds exactly one lowest-priority HOST_LOCAL fallback through the authorized Host local plugin-storage API only when the common metadata-only capsule is valid and browser SESSION did not write
// - Uses one SimCore-owned Host-local pending mailbox, one runtime-scoped lazy Host store acquisition, one boot mailbox read, consume-before-adopt for matching locations, and non-destructive FOREIGN_LOCATION handling; no retry, polling, queue, key enumeration or second Host-local key is added
// - Keeps the existing schema-1 capsule, exact location guard, 10-minute age bound, 16,384-character serialized cap and provider cache UNVERIFIED contract; raw user/assistant/prompt bodies and Core semantic state are never persisted
// - Authoritative OUTPUT_COMMIT awaits at most one Host-local write after Core output success so the copied diagnostic reports actual durability before refresh; any Host-local failure remains telemetry-only and cannot downgrade the committed output
// - Last Turn Diagnostic adds bounded Host-local acquisition/clear/boot/write attribution and Host write timing while preserving v0.64.9 Session surface diagnostics and existing Core semantic owners
// - Updates the existing collapsed 업데이트 내역 card to the 0.64.10/0.64.9/0.64.8 ledger without adding a top-level UI part or rendering-time storage/network/timer operation
// - M2-3 ownership extraction remains frozen until 06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT closes with human evidence
//
// v0.64.9 Session Transport Root Resolution:
// - Repairs the confirmed v0.64.8 live-gate pre-refresh failure by resolving the existing telemetry session sidecar across exactly two bounded browser-local roots: WINDOW then GLOBAL_THIS
// - Passively classifies each sessionStorage surface as ROOT_ABSENT / STORAGE_ABSENT / ACCESS_ERROR / METHODS_INCOMPLETE / USABLE, de-duplicates identical storage objects, serializes once, and performs at most two real checkpoint write attempts with bounded fallback attribution
// - Boot claim consumes each distinct usable session candidate at most once, preserves memory-first validation, and can adopt a compatible capsule from either WINDOW or GLOBAL_THIS without replaying consumed duplicates
// - Last Turn Diagnostic now exposes Session surface, memory/session checkpoint disposition, selected root/fallback attribution, and session-adoption root; provider cache remains explicitly UNVERIFIED
// - Adds one bounded operator-facing 업데이트 내역 card inside the existing SimCore diagnostic panel; it is static/pure guidance only and adds no top-level UI registration, storage operation, network request, timer, polling, automatic experiment action, or live-gate mutation
// - Core semantic owners, telemetry capsule schema/key/age/size bounds, output commit semantics, Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/Structure/COMMUNITY/Reaction/Prompt semantics and M2-3 ownership remain frozen
//
// v0.64.8 Output-Complete Telemetry Checkpoint Repair:
// - Repairs the confirmed v0.64.7 live-gate omission where same-tab session telemetry was published only from onUnload and no output-complete checkpoint existed before a full page refresh
// - Adds one best-effort outer-runtime telemetry checkpoint wrapper shared by active authoritative OUTPUT_COMMIT and UNLOAD; the existing runtime-telemetry capsule schema, memory-first/session-fallback transport, 10-minute age bound and 16,384-character session bound remain unchanged
// - OUTPUT_COMMIT checkpointing occurs only after CoreRulesetSession.processOutput returns active from its authoritative out save, requires the runtime generation to remain current and a known location key, and never downgrades or throws through an already committed output
// - Adds one bounded Last Turn Diagnostic checkpoint line exposing session write disposition, serialized character count, local checkpoint cost and trigger only; no exception message or raw capsule/body content is retained
// - Provider cache remains explicitly UNVERIFIED; no provider-cache control/claim, network call, timer loop, pluginStorage write, SnapshotStore semantic write, host chat write or request-history mutation is introduced
// - Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/Structure/COMMUNITY/Reaction/Prompt semantics and M2-3 ownership remain frozen
//
// v0.64.7 Cross-Reload Cache Observer Continuity:
// - Extends the existing metadata-only runtime telemetry handoff from globalThis memory to a two-tier same-tab transport: globalThis first, window.sessionStorage fallback
// - sessionStorage uses __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__ with a 16,384-character serialized bound; malformed, oversized, unavailable, disabled, quota-failed, stale, schema-mismatched and location-mismatched capsules fail open without affecting Core state
// - Claims both transport candidates once at runtime boot, validates memory first and session second, and consumes stored session data so a refresh fallback cannot replay indefinitely
// - Retains only the existing runtime-prefix sketch, request-topology signatures and cache-trajectory metadata; raw request/output bodies, prompts, hooks, sessions, Core SnapshotStore state and provider cache controls are never persisted in the handoff
// - Adds transport attribution to continuity diagnostics while provider cache remains explicitly UNVERIFIED; no provider hit/miss claim, network call, timer, pluginStorage call, request-history mutation or generation semantic change is introduced
// - Scope is runtime-telemetry transport only; Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Structure/COMMUNITY/Reaction and M2-3 ownership remain frozen
//
// v0.64.6 Post-B_END C Clock Handoff Authority:
// - Repairs the directly recurrent POST_BEND_C_CLOCK_DOMAIN_GAP: the first direct Mode C after a completed B_END may no longer use a stale Narrative current-time anchor earlier than the completed broadcast terminal airtime
// - Adds a request-scoped POST_B_END_CURRENT_TIME_FLOOR only for the direct first C after B_END; Lifecycle owns eligibility, Time owns timestamp validation/comparison/floor selection, Prompt serializes the resulting current-frame authority, and finalization reuses the existing Narrative floor primitive
// - Keeps Broadcast airtime and Narrative/event time as separate domains: no B_END-time Narrative mutation, no persistent Broadcast→Narrative coupling, no invented offset, and explicit user-requested historical/flashback timestamps remain allowed below the current-frame floor
// - Source Handoff eligibility is intentionally not a clock prerequisite; a recurrence-owned Source Handoff may still receive the post-B_END clock bridge when lifecycle/lineage conditions are direct and valid
// - Pre-live closure hardening reconstructs bounded facts from the directly preceding visible B_END output and requires Structure-clean closure plus an explicit monotonic terminal timestamp; Time also requires that visible terminal to equal the stored B_END airtime before the floor can apply
// - Consolidates regression checks for Current Timeline Authority, Narrative Tail Time, B_END terminal airtime authority, explicit past-scene allowance, current calendar baseline, Representation/Edit controls, Summary Scope, and v0.64.5 COMMUNITY multiline behavior without changing those owners
// - Adds no persistent schema/key, host read/write, network call, timer, request-history mutation, Representation taxonomy change, Edit Reconcile movement, Reaction normalization change, COMMUNITY structure change, Bootstrap Migration change, or cache/provider claim
//
// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:
// - Follows v0.64.4 natural B_CONTINUE/B_END evidence where bilingual X(EN) comments repeatedly attributed missing 5: each logical comment/reply had its valid [RT N] tag on a translation continuation line while Structure inspected only the physical starter line
// - Adds Community.commentUnits() as a pure structural grouping helper and makes Structure inspect each complete logical comment/reply unit; 4-top + 1-reply cardinality checks remain byte-equivalent and Structure stays judge-only
// - Reuses the existing Reaction grammar and inspectCommentReactionLine() unchanged: one valid tag at logical-unit end passes, while missing, multiple, and visible trailing content continue to fail
// - Adds no output repair, reaction synthesis, grammar tolerance, normalization change, Broadcast/Time/Frame semantic change, persistent state, host/storage/network/timer call, or Edit Reconcile ownership movement
// - Preserves the v0.64.4 bounded warning attribution fields so future malformed units remain diagnosable without retaining raw comment text
//
// v0.64.4 COMMUNITY Reaction Validator Attribution:
// - Follows recurrent v0.64.3 B_START/B_CONTINUE/B_END COMMUNITY reaction-tail warnings whose retained visible suffix examples are accepted by the current Reaction regex and therefore do not statically reproduce the live failure
// - Adds bounded reason attribution only: Reaction exposes inspectCommentReactionLine() while Structure keeps the exact old pass/fail predicate semantics and remains judge-only
// - Invalid lines are classified as MISSING / MULTIPLE / FINAL_TAIL with bounded tail kind/count metadata; raw comment text is never retained, persisted or logged by the helper
// - No reaction grammar tolerance, normalization rule, supported label, output repair, COMMUNITY shape, Broadcast/Time/Frame, Representation/Edit Reconcile, Store schema, host/network/timer or prompt-generation semantic changes are introduced
// - The next natural recurrence is the gate for an evidence-backed repair mini; this release intentionally does not guess at invisible-character or trimming behavior
//
// v0.64.3 B_END Diagnostic Builder Binding Repair:
// - Repairs the confirmed v0.64.2 B_END-only diagnostic report construction failure where buildLastTurnDiagnosticReport referenced Time/Kernel through unbound outer-runtime identifiers
// - Binds the existing Kernel and Time modules once in the outer runtime scope; the diagnostic report-builder body and its B_END terminal-coverage expression remain byte-identical
// - Adds no new host/storage/network/timer call, persistent state, request/output hot-path work, Broadcast/Time semantic change, or clipboard transport behavior
// - Keeps COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED unchanged and leaves M2-2 plus the frozen v0.65.0 M2-3 design untouched
//
// v0.64.2 Diagnostic Copy Resilience:
// - Separates one-time diagnostic report construction from clipboard transport so report-builder failures and clipboard failures no longer collapse into one boolean result
// - Builds the report exactly once, then reuses the identical immutable string for the primary Clipboard API and the browser-local textarea fallback
// - Adds four bounded results only: COPIED, COPIED_FALLBACK, REPORT_BUILD_FAILED and CLIPBOARD_WRITE_FAILED
// - Adds a user-click-only temporary-textarea fallback with unconditional DOM cleanup and best-effort focus restoration; no background task, timer loop, network call or host chat write is introduced
// - Keeps only bounded memory telemetry (status, length, API availability, error names and timestamp); raw reports and exception messages are never retained
// - Leaves buildLastTurnDiagnosticReport byte-identical and does not speculate about the earlier B_END failure; a future REPORT_BUILD_FAILED result is the gate for a separate builder-repair mini
// - Request/output hot paths, M2-2 behavior, Summary Scope, Broadcast/Time/Frame, Representation/Edit/Runtime Mirror/Deferred Mirror, Recovery, Lineage/Handoff/Recurrence/Evidence/Structure/Community/Reaction, Prompt, Store and persistent schema remain frozen
//
// v0.64.1 Summary Scope Authority:
// - Follows paired real long-chat C-mode year-end summary evidence: an ANNUAL_ONLY request mixed/omitted target-year achievements, while an explicit 2029->2030 cumulative comparison reused an older historical value inside the same visible response and incompletely covered requested YoY deltas
// - Adds a deterministic request-scoped summary classifier in Lifecycle with three bounded results only: NONE, ANNUAL_ONLY, CUMULATIVE_YOY; ambiguous/multi-year requests fail closed to NONE
// - ANNUAL_ONLY makes the target year the achievement authority while allowing earlier facts only as labeled context/metadata and requiring cumulative counters to be labeled as year-end snapshots rather than prior achievements
// - CUMULATIVE_YOY requires the explicit previous-year baseline plus target-year-end current value, absolute delta and percentage delta for requested metrics; older lifetime/history values may be secondary context but cannot replace the requested previous-year baseline
// - Summary scope authority is serialized after Recurrence guidance so recurrence may preserve structure/style but cannot become factual authority for target-year or baseline values; Recurrence and Lineage implementations remain frozen
// - Adds Summary scope diagnostics (scope/target/comparison/authority/reason) without output-body parsing, semantic repair, persistent schema changes or new host/storage/network/timer calls
// - M2-2 Representation/Edit/Runtime Mirror/Deferred Mirror, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Structure/COMMUNITY, cache/history observers and provider-cache policy remain frozen
//
// v0.64.0 M2-2 Representation Ownership Split:
// - Starts the next staged 2.0M Major checkpoint from the v0.63.59 production baseline; this checkpoint is mechanical ownership movement, not a feature release
// - Introduces Representation as a first-class memory-only module owning the bounded CANONICAL / HOST_RAW / FRESH_CHAT provenance ledger, prior representation taxonomy, exact visible carryover classification and fingerprint-length deltas
// - Runtime Mirror still owns Fresh chat observation plus strict identity/location/staleness guards and mirror writes, but no longer owns the provenance ledger or exposes provenance through its runtime API
// - The outer request shell consumes Representation facts directly; v0.63.55 representation-fast eligibility and edit-origin routing remain unchanged in decision semantics
// - Genuine user edits remain the frozen positive control: Prior EXACT + current matches neither canonical nor Fresh continues to route USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
// - Fresh remains identity evidence, never a body source: no raw Fresh body retention, persistent representation state, chat/history mutation, network call or timer is introduced
// - Recovery/output-compat/bootstrap-migration, Deferred Mirror safety, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure, cache/history observation, storage schema and prompt placement remain frozen
//
// v0.63.59 Broadcast End Closure Contract:
// - Follows direct 24-hour B_START -> B_CONTINUE -> B_END long-chat evidence where Broadcast End Authority correctly allowed the explicit B_END and unlocked the session, but the response began at 08:30, visibly progressed through "5 minutes remaining" to the 09:00 end, and persisted broadcast airtime at the stale 08:30 frame timestamp
// - Extends the v0.63.58 explicit terminal-time contract only to B_END: every B_END must emit a final canonical timestamp line for the terminal current broadcast airtime, even when equal to the frame time; prose-only end-time progression is not authoritative
// - B_END airtime commit now uses the last line-level canonical timestamp only when the complete timestamp sequence is monotonic and an explicit terminal line exists; malformed/non-monotonic/missing tails fail closed to the existing frame airtime rather than inferring arbitrary prose times
// - Clarifies the already-existing B_END COMMUNITY contract as exactly two COMMUNITY blocks with exactly three platform sections each; one COMMUNITY block containing six sections is explicitly invalid, while Structure remains judge/quarantine-only and performs no output repair
// - Adds Broadcast closure / terminal coverage diagnostics separating end authority, terminal airtime coverage and COMMUNITY structural closure; unlock success alone no longer reads as complete closure
// - Scope is B_END closure only: B_START/B_CONTINUE airtime semantics, v0.63.58 non-broadcast Narrative Tail Time Contract, v0.63.57 current-timeline authority, Representation/Edit Reconcile, Recovery, Deferred Mirror, Frame, Evidence/Lineage/Handoff/Recurrence, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
// v0.63.58 Narrative Tail Time Contract:
// - Follows direct long-chat evidence where a visible non-broadcast scene began at 01:00, explicitly progressed in prose to a 03:00 ending, but emitted no later canonical timestamp line; Time therefore reported scenes 0 / FRAME_ONLY and persisted 01:00 into the next turn
// - Requires non-broadcast rendering to emit a canonical timestamp line whenever the current scene advances beyond the frame time, including a user-stated later current/end time; elapsed current time must not exist only as prose when it changes the terminal narrative time
// - Reuses the existing v0.63.28 line-level monotonic timestamp sequence and commit logic unchanged: SimCore does not infer or auto-commit arbitrary prose clock mentions, avoiding confusion with historical/event/reference times
// - Adds Narrative tail coverage diagnostics so FRAME_ONLY explicitly means no terminal timestamp beyond the frame was observable and copied RAW prose must be cross-checked for elapsed/current/end-time cues
// - Scope is renderer time-tail contract + diagnostics only: v0.63.57 current-timeline authority, M2-1 Recovery boundaries, Representation/Edit Reconcile, Deferred Mirror, Broadcast, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
// v0.63.57 Current Timeline Authority Guard:
// - Follows direct long-chat evidence where the persisted/current frame remained in 2030 while a non-broadcast response silently reverted visible scene timestamps and character-era state to 2017; existing Continuity correctly protected the persisted narrative clock but left the visible body unchanged
// - Adds a current-timeline authority anchor on every non-broadcast request with a known persisted narrative timestamp, not only turns that contain an explicit forward calendar transition
// - Historical context remains usable as reference, and explicitly user-requested past scenes/flashbacks remain allowed; absent such a request, historical context must not silently replace the current scene timeline or current character age/status
// - Adds explicit visible-chronology diagnostics for non-monotonic scene timestamp sequences while preserving the existing fail-closed state floor and leaving generated body text untouched rather than performing unsafe semantic/date rewrites
// - Scope is chronology authority + diagnostics only: M2-1 Recovery boundaries, Representation/Edit Reconcile, Deferred Mirror, Broadcast, Frame sequencing, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
// v0.63.56 M2-1 Recovery Boundary Split:
// - Begins the 2.0M Major M2 mechanical boundary refactor after v0.63.55 Representation Fast Reconcile passed real long-chat validation
// - Splits the former Recovery implementation into output-compat (envelope/tail/Fresh-confirmation candidate logic) and bootstrap-migration (history bootstrap + legacy repair) while preserving every moved function body verbatim
// - Keeps Recovery as a compatibility facade with the exact v0.63.55 exported API, so Session/runtime call sites and request/output sequencing remain unchanged in M2-1
// - No representation/edit-reconcile algorithm is moved yet; v0.63.55 REPRESENTATION_FAST_RECONCILED and genuine USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT behavior remain frozen regression controls
// - No state schema, storage key/call, host API, network/timer, request-history mutation, provider-cache claim, prompt placement, generation semantic, Structure/COMMUNITY, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence behavior change
//
// v0.63.55 Representation Fast Reconcile:
// - Follows two same-runtime production cases where an unedited previous assistant was recorded as CANONICAL!=FRESH_CHAT, the next request visible assistant matched the prior FRESH_CHAT exactly, Edit Origin classified REPRESENTATION_DRIFT_CORRELATED, and the existing manual-edit path spent 4.091 s / 6.257 s rebuilding state
// - Adds one request-side provenance fast path before snapshot I/O: only a prior OUTPUT_MISMATCH for the same assistant slot/location whose current visible fingerprint equals the recorded prior FRESH_CHAT exactly may bypass the full manual-edit reconstruction
// - Requires the live CoreSession to still point at the same output index with both current.outputFingerprint and trustedOutputFingerprint equal to the recorded prior canonical fingerprint; any stale/missing/third representation fails open to the existing reconcile path
// - The fast path is representation acceptance only: it performs no state rebuild, no snapshot write, no visible-chat write, no Fresh-body copy/retention and no canonical-state mutation. Genuine user edits that match neither prior canonical nor prior Fresh remain USER_EDIT_CANDIDATE and keep MANUAL_EDIT_REBUILT
// - Output-side Deferred Mirror, v0.63.53/v0.63.54 envelope recovery, Structure/COMMUNITY quarantine, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History OBSERVE_ONLY, Host Prefix Attribution and provider cache UNVERIFIED remain frozen
// - Adds no host/storage/network/timer call, persistent field, request-history mutation, provider-cache claim, prompt relocation or generation-semantic change
//
// v0.63.54 Safe-Envelope Structural Boundary Reconcile:
// - Follows v0.63.53 same-runtime A/B evidence where a SAFE_ENVELOPE_COMPAT B_CONTINUE produced CANONICAL 4238 vs FRESH_CHAT 4237, Deferred Mirror OUTPUT_MISMATCH, and the next unedited request was classified REPRESENTATION_DRIFT_CORRELATED and spent 4.091 s in MANUAL_EDIT_REBUILT; an exact predecessor returned to SAME_FAST 0 ms
// - Corrects the initial trailing-newline hypothesis before production: SimCore fingerprints already normalize CRLF and trim trailing whitespace, and safe envelope candidates are trimmed, so the observed -1 cannot be explained by document-end CR/LF
// - Adds a bounded canonical-derived structural-boundary confirmation only for already-safe THOUGHTS_COMPAT / SAFE_ENVELOPE_COMPAT outputs with zero structure warnings and safe state commit: one internal LF may be removed only at deterministic base→COMMUNITY, COMMUNITY→COMMUNITY, COMMUNITY→Knowledge, or base→Knowledge separators
// - The existing Deferred Mirror fresh-chat read is the sole confirmation boundary; exactly one derived boundary fingerprint must equal FRESH_CHAT exactly before SAFE_BOUNDARY_CONFIRMED may promote the trusted canonical identity. Fresh bodies are never copied or retained, and ambiguous/non-boundary mismatches remain OUTPUT_MISMATCH with setChat blocked
// - Adds Safe-envelope reconcile/boundary telemetry and treats all Fresh-confirmed identities as exact for next-turn Edit Origin Attribution; v0.63.53 unresolved-envelope recovery, Structure/COMMUNITY rules, request/history/cache behavior and strict mirror identity/staleness gates remain frozen
// - No new host read, storage read/write, network call, timer, persistent field, request mutation, history mutation, provider-cache claim, prompt relocation, or generation-semantic change is introduced
//
// v0.63.53 Boundary-Normalized Envelope Recovery:
// - Follows v0.63.52 real long-chat validation where a genuine user edit was correctly classified USER_EDIT_CANDIDATE, while a separate unedited B_END entered SAME_FAST/EXACT and then produced THOUGHTS_COMPAT 4252c, one # 응답 candidate, CANONICAL↔FRESH -4247c and Deferred Mirror OUTPUT_MISMATCH
// - Extends the existing v0.63.51 Fresh-Confirmed Envelope Recovery with a bounded fingerprint-only boundary check: after the exact candidate fingerprint misses, at most two trailing CR/LF characters may be removed from the unique HOST_RAW suffix and each bounded variant is compared against the already-read FRESH_CHAT fingerprint
// - Recovery succeeds only when one such CR/LF-only boundary variant is FRESH_EXACT; the Fresh body is never copied into canonical output, candidate/variant bodies are not retained, and non-CR/LF differences or larger deltas remain FRESH_MISMATCH with setChat blocked
// - Adds BOUNDARY_CONFIRMED_SUFFIX plus boundary delta/kind/chars telemetry while preserving existing FRESH_CONFIRMED_SUFFIX behavior, Edit Origin Attribution, Structure/COMMUNITY quarantine, Deferred Mirror strict identity/staleness gates and all request/cache/history semantics
// - Output-boundary scope only: Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History stabilization OBSERVE_ONLY, Host Prefix Attribution, provider cache UNVERIFIED, persistent schema, network/timer/storage surfaces and generation semantics remain frozen
//
// v0.63.52 Edit Origin Attribution:
// - Adds diagnostic-only edit-origin attribution after v0.63.51 real long-chat validation produced both genuine user edits and prior-output CANONICAL↔FRESH mismatches that converged on the same MANUAL_EDIT_REBUILT path; the reconcile behavior itself remains unchanged
// - Reuses the existing memory-only Deferred Mirror provenance ledger and compares only fingerprints for the previous assistant slot against the current visible assistant fingerprint, classifying NONE / USER_EDIT_CANDIDATE / REPRESENTATION_DRIFT_CORRELATED / AMBIGUOUS_CHANGE / UNKNOWN without claiming user intent as fact
// - Reports prior representation state plus canonical/fresh length deltas and exact fingerprint carryover shape; no previous output body, edit body, common-head/tail text, or persistent edit payload is retained, and no extra chat/storage/network/timer read is added
// - Attribution scope only: MANUAL_EDIT_REBUILT/SAME_FAST semantics, Recovery including Fresh-Confirmed Envelope Recovery, Deferred Mirror strict gates, Structure/COMMUNITY quarantine, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History stabilization OBSERVE_ONLY, Host Prefix Attribution and provider-cache policy remain frozen
//
// v0.63.51 Fresh-Confirmed Envelope Recovery:
// - Targets the real v0.63.50 B_END failure where a unique # 응답 suffix followed a THOUGHTS_COMPAT preamble but full Structure safety rejected the suffix because COMMUNITY shape was independently malformed; the initial Recovery pass remains fail-open and does not weaken Structure acceptance
// - Records only a bounded memory-only fingerprint/length/offset for one unique THOUGHTS_COMPAT response suffix when frame + Knowledge are intact; the suffix body is not retained and no request/chat/persistent snapshot mutation occurs on the critical output path
// - Reuses the already-existing Deferred Mirror fresh-chat read as the confirmation boundary: only exact FRESH_CHAT fingerprint equality may promote the suffix representation to canonical for the current in-memory state and mirrored portable state; mismatch remains OUTPUT_MISMATCH with setChat blocked
// - Adds Envelope recovery telemetry with RECOVERED / FRESH_MISMATCH / NOT_APPLICABLE and FRESH_CONFIRMED_SUFFIX provenance while leaving COMMUNITY structural quarantine independent for a later targeted repair
// - Output-recovery scope only: Deferred Mirror identity/location/staleness guards, Structure/COMMUNITY rules, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History stabilization OBSERVE_ONLY, Host Prefix Attribution, cache/provider policy, persistent schema, network and timer surfaces remain frozen
//
// v0.63.50 Host Prefix Reset Attribution:
// - Follows v0.63.49 real long-chat validation where externally observed cache hits coexisted with rolling CHAT_HISTORY frontier movement, while the one externally observed cache miss coincided with a PRE_SIMCORE HOST_PREFIX break at system @0, 0% local common prefix and a cache-family reset
// - Adds a memory-only system @0 block sketch using 512-character FNV-1a hashes from both the head and tail so message-level HOST_PREFIX resets can be localized without retaining raw system bodies or changing request bytes/order
// - Classifies system @0 changes as STABLE / DELTA_LOCALIZED / WIDESPREAD / UNAVAILABLE and reports bounded head/tail agreement, changed-span upper bounds, size delta, insertion/removal/replacement-like shape and family-reset correlation; block bounds are diagnostic approximations, not semantic source attribution
// - Keeps v0.63.49 History stabilization OBSERVE_ONLY and provider cache UNVERIFIED: no request/chat/persistent-state mutation, provider hit/miss inference, network/timer/storage call, prompt relocation, or cache directive is added
// - Attribution scope only: TAIL_AFTER_CURRENT_USER, Broadcast End Authority, Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery, compiler tiers, Deferred Mirror, persistent schema and all generation semantics remain frozen
//
// v0.63.49 Cache Effect Verification:
// - Retires request-history repair attempts after v0.63.48 real long-chat validation showed the exact compact assistant frontier continuing to advance while externally observed caching still occurred on distinct natural B_START/B_CONTINUE/B_END turns; the known compact signature remains diagnostic evidence only
// - Converts History stabilization to OBSERVE_ONLY: it scans only the already-built request for the frozen assistant/text 21:4a852496 signature, reports candidate positions/cost, and performs no request, visible-chat, persistent-state, raw-body, network, timer, or provider-routing mutation
// - Adds a local Cache effect summary that classifies the observed reusable request-prefix window as BASELINE / REUSE_WINDOW_GROWING / REUSE_WINDOW_STABLE / REUSE_WINDOW_SHRINKING / PREFIX_COLLAPSE using existing topology/frontier telemetry; the summary never claims a provider cache hit or miss
// - Reframes frontier movement as representation-boundary telemetry rather than cache-failure proof: common-prefix size/ratio, frontier position/movement and PRE_SIMCORE break ownership are reported together while provider cache remains explicitly UNVERIFIED
// - Verification scope only: TAIL_AFTER_CURRENT_USER, Broadcast End Authority, Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery, compiler tiers, Deferred Mirror, persistent schema, storage/API/network/timer policy and provider-cache policy remain frozen
//
// v0.63.48 History Turn-Ordinal Alignment:
// - Replaces v0.63.47's body/calibrator-derived alignment candidate search after real long-chat validation produced NO_CANDIDATE with zero assistant calibrators across C/B_START/B_CONTINUE/B_END while the compact assistant frontier still advanced @16→@18→@20
// - Anchors the request conversation spine to the authoritative raw-chat current user already identified by sendIndex, then maps the bounded suffix backward by conversation ordinal; current-user and historical assistant body equality are explicitly not required for alignment
// - Requires the endpoint-aligned user/assistant role sequence to match across the entire bounded request spine; any missing/inserted conversational role, short raw suffix, unmappable compact target, or unsafe raw assistant fails open without request mutation
// - Keeps the repair target frozen at assistant/text 21:4a852496 and still replaces only with a bounded canonical # 응답 envelope from the mapped raw assistant; no visible/persistent chat write or raw-body persistence is added
// - Adds turn-ordinal alignment telemetry (SEND_INDEX endpoint, role matches, mapped targets, fixed suffix offset, body equality NOT_REQUIRED) while keeping provider-cache status UNVERIFIED and all non-alignment runtime semantics frozen
//
// v0.63.47 History Alignment Stabilization:
// - Replaces v0.63.46's exact current-user body gate with a bounded conversation-spine alignment over the final request and authoritative raw-chat tail, because real long-chat validation showed CURRENT_USER_MISMATCH across C/B_START/B_CONTINUE/B_END while request-only repair stayed safely inactive
// - Requires one unique tail alignment, matching user/assistant role order and at least two exact substantial historical assistant calibrators; user text equality is telemetry only, so host-side user projection differences no longer block entry by themselves
// - Keeps the repair target intentionally unchanged at the repeatedly verified compact assistant signature `assistant/text 21:4a852496`; mapped raw assistants are reduced to their canonical `# 응답` envelope before request-only replacement, and ambiguous/insufficient/unsafe mappings fail open
// - Adds explicit History alignment telemetry (RESOLVED_UNIQUE / NOT_NEEDED / SKIPPED reason, bounded spine sizes, candidate count, exact-user anchors, assistant calibrators and spine offset) while retaining History stabilization APPLIED/NOOP/SKIPPED telemetry
// - Repair boundary only: no visible/persistent chat write, no raw-body persistence, no network/timer/storage schema change, and Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery/Deferred Mirror/compiler tiers/TAIL_AFTER_CURRENT_USER/provider-cache policy remain frozen
//
// v0.63.46 Prompt Prefix Stabilization:
// - Adds a conservative request-only History Materialization Gate for the repeatedly verified compact historical assistant signature `assistant/text 21:4a852496`; the gate runs only on active SimCore model requests and never writes visible chat or persistent storage
// - Aligns the final request conversation suffix to authoritative raw chat from the current user backward, requires exact user-anchor agreement plus at least one exact full-assistant calibration, and replaces compact slots only when every bounded candidate maps deterministically to a substantial raw `# 응답` assistant body; any ambiguity fails open with the original request untouched
// - Stabilizes all verified compact slots in the aligned suffix in one pass (hard cap 12) so the rolling CHAT_HISTORY frontier can stop advancing one assistant at a time; no semantic similarity, provider-cache claim, new network/storage call, timer, or second request-history scan is added
// - Adds explicit materialization telemetry (APPLIED/NOOP/SKIPPED reason, slot range, anchor/calibration counts, added chars, cost, persistent mutation NONE) while retaining v0.63.45 attribution probes for regression comparison
// - Repair scope only: request history projection may change under the strict gate; TAIL_AFTER_CURRENT_USER, Broadcast End Authority, Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure, compiler tiers, Recovery, Deferred Mirror acceptance/scheduling, persistent state schema and provider-cache policy remain frozen
//
// v0.63.45 History Rebuild Frontier Attribution:
// - Adds a bounded PRE_RECONCILE / POST_RECONCILE / FINAL request-window comparison around the prior CHAT_HISTORY break frontier, reusing runtime-topology messageSignature and touching at most six candidate request slots per phase; no second full-history scan or raw-body retention is added
// - Classifies whether the current first-break representation already existed before reconcile, changed during reconcile, changed later in request preparation, or moved outside the bounded attribution window; claims stay local to request representation and never imply provider-cache behavior
// - Adds memory-only repeated-break-family and frontier-movement telemetry so recurring compact assistant stubs and rolling stable-prefix recovery can be distinguished across natural turns without persistence or prompt mutation
// - Diagnostics only: request prompt bytes/order, TAIL_AFTER_CURRENT_USER placement, Broadcast End Authority, compiler tiers, Continuity/Evidence, Deferred Mirror acceptance/scheduling, storage/API/network/timer/provider-cache policy remain frozen
//
// v0.63.44 History Mutation Attribution:
// - Extends existing request-topology telemetry with compact previous/current first-break signatures, bounded mutation-shape classification and one output-compatible fingerprint of the current break message; no request bodies are retained and no second history scan is added
// - Adds a bounded memory-only ledger of the 16 most recent assistant output provenance fingerprints already produced by Deferred Mirror, then correlates a CHAT_HISTORY prefix break against canonical/host-raw/fresh representations without claiming provider-cache behavior
// - Reports FRESH_MISMATCH_HISTORY_MATCH only when the current historical break exactly matches a prior divergent FRESH_CHAT fingerprint; equivalent, ambiguous and no-match cases remain explicit and fail-open
// - Diagnostics only: prompt bytes/order, TAIL_AFTER_CURRENT_USER placement, Broadcast End Authority, compiler tiers, Continuity/Evidence, Deferred Mirror acceptance/scheduling, storage/API/network/timer/provider-cache policy remain frozen
//
// v0.63.43 Broadcast End Authority & Runtime Identity Precision:
// - Makes episode/broadcast completion an explicit lifecycle authority: an open broadcast denies end narration across broadcast prose, COMMUNITY and Knowledge until the current lifecycle is B_END
// - B_END is the only active-broadcast mode that authorizes episode-end narration; local scene/segment/mission/vote/player-departure completion does not imply broadcast completion
// - Keeps the guard state-driven rather than phrase-blacklist-driven: SimCore communicates lifecycle authority but does not semantically parse or rewrite narrative text
// - Replaces runtime identity's regex tier guess on the live path with compiler-native stable/slow/volatile source tiers while preserving the exact runtime prompt byte order and TAIL_AFTER_CURRENT_USER placement
// - Keeps v0.63.42 cache topology/trajectory/exposure, v0.63.41 Continuity, v0.63.40 Evidence, Deferred Mirror acceptance, provider-cache policy and storage/API/timer/network surfaces frozen
//
// v0.63.42 Cache Integrity & Cost Stabilization:
// - Adds deterministic request-prefix break attribution (HOST_PREFIX / CHAT_HISTORY / CURRENT_USER / SIMCORE_RUNTIME / POST_CURRENT_USER) and PRE_SIMCORE / SIMCORE_RUNTIME / POST_SIMCORE ownership without retaining request bodies
// - Adds a local uncached-exposure proxy from already-computed common-prefix characters; it is explicitly not provider billing or proof of a provider-cache hit/miss
// - Adds stable/slow/volatile runtime-prompt identity fingerprints so byte drift is attributable while preserving TAIL_AFTER_CURRENT_USER request placement and all generation semantics
// - Canonicalizes reaction_max top-level key order before JSON serialization to remove self-inflicted equivalent-state byte drift
// - Keeps v0.63.41 Continuity, v0.63.40 Evidence, v0.63.39 retry/trajectory/EMA, provider-cache policy, request order, mirror/recovery/lifecycle semantics and storage/API/timer/network surfaces frozen
//
// v0.63.41 Deterministic Continuity Consolidation:
// - Resolves explicit opening month/day current-time transitions against the persisted narrative clock, including deterministic year rollover, calendar-valid dates, weekday normalization and pre-generation worldYear/age-offset advancement
// - Repairs only deterministic timestamp components: the frame date/weekday must match a resolved current-date target, while later canonical scene timestamps retain fail-closed monotonic validation with a narrow one-year rollover repair when that same rollover is already proven by the current user transition
// - Upgrades Frame continuity from backward-only floors to deterministic sequencing: Chatindex is exactly previous visible +1, Volume jumps normalize to previous +1 only when the model already advances Volume, same-title Chapters hold, changed-title Chapters advance by one, and a Volume advance resets Chapter to 1
// - Preserves visible-user edits as the next continuity baseline and uses number-only rewrites for new sequencing repairs while retaining the proven full-header rollback for true backward Volume/Chapter regressions
// - Keeps v0.63.40 Evidence, v0.63.39 trajectory/retry/EMA, provider-cache policy, request order, mirror/edit acceptance, Reaction/Recurrence/Lineage/Handoff and storage/API/timer/network surfaces frozen
//
// v0.63.40 Current Source Integrity & Runtime Surface Consolidation:
// - Adds a root-first current-event authority contract so explicit facts in the current user event outrank conflicting prior versions without parsing or storing event semantics
// - Splits Short-C request fencing into CURRENT_ROOT_EVIDENCE plus the existing CURRENT_SOURCE_EVIDENCE: safe roots remain concretely fenced even when a host-transformed assistant source fails the existing strict source-boundary gate
// - Preserves the v0.63.39 source acceptance criteria; unsafe source boundaries are never relaxed, and root-unsafe requests remain unfenced rather than promoting source-only evidence
// - Consolidates runtime-facing version strings through one runtime constant for panel, copied diagnostics, telemetry source version and console prefixes; plugin metadata is CI-checked against the same value
// - Keeps trajectory/retry/EMA behavior, request order, runtime tail placement, provider-cache policy, edit/mirror acceptance, storage/API/timer/network surface, Frame/Time/Recovery and all non-Evidence/non-Prompt Core modules frozen
//
// v0.63.39 Cache Trajectory Identity & Representation Diagnostics:
// - Corrects trajectory identity so repeated sends/regenerations of the same user turn increment attempts but not distinct observations; distinct identity is location + send index + current-user compact signature, while full-request topology remains separately observed
// - Corrects cadence EMA initialization and scope: BASELINE contributes no zero sample, the first real distinct-turn interval becomes the EMA seed, and retry timing remains visible only in request cadence
// - Adds diagnostic-only canonical↔fresh representation length-delta reporting from existing fingerprints, fixes stale Diagnostic Version output, and renders BASELINE cadence/frontier values as BASELINE/n/a instead of synthetic zeroes
// - Bumps cache-candidate handoff state to v2 so polluted v0.63.38 trajectory state is rejected while compatible runtime-prefix/topology telemetry may still be adopted across refreshless reloads
// - Keeps request order/runtime prompt bytes, provider routing/cache policy, edit acceptance, Deferred Mirror acceptance gate, host/storage/API/timer surface and all 17 Core generation modules frozen
//
// v0.63.38 Cache Trajectory & Refreshless Telemetry Continuity:
// - Extends v0.63.37 request-topology telemetry into a memory-only same-chat trajectory: cache-family id, distinct observations versus retry attempts, rolling stable floor, moving frontier, frontier streak, divergence count and cadence EMA
// - Adds a pure-data refreshless telemetry handoff capsule so v0.63.38 and later targeted reloads can preserve runtime-prefix sketch, prior request signatures and cache trajectory without retaining raw request bodies or adding pluginStorage/network/timer work
// - The first upgrade from v0.63.37-or-earlier intentionally starts FRESH because those older runtimes cannot publish a handoff capsule retroactively; no prior telemetry is required
// - Handoff is schema/location/age checked and fail-open; functions, hooks, sessions, mirror work, Core state, raw chat messages and provider cache controls are never transferred
// - Keeps request ordering, runtime prompt bytes, provider routing/cache policy, mirror acceptance gate, host/storage/API call surface and all 17 Core generation modules frozen
//
// v0.63.37 Cache Topology, Cadence & Output Provenance Diagnostics:
// - Adds a memory-only signature pass over the final already-built beforeRequest message array to measure full-request common-prefix topology without retaining message bodies or changing request ordering/content
// - Reports same-chat request cadence, first divergent message slot/role, current-user/runtime-prompt placement relative to the prefix break, and keeps provider cache status explicitly UNVERIFIED for correlation with external LLM Gateway / Gemini usage data
// - Extends Deferred Chat Mirror diagnostics with the already-computed canonical, host-raw and fresh-chat output fingerprints plus exact match kind; mirror acceptance/fail-open behavior is unchanged
// - Exposes existing manual-edit representation provenance (canonical/host-raw/etc.) and measures topology scan cost so observability overhead is attributable
// - Adds no provider-cache directive, session/routing mutation, prompt relocation, storage/API/network call, polling, output repair or fingerprint acceptance relaxation; all 17 Core modules and generation semantics remain frozen
//
// v0.63.36 Runtime Boundary Modularization + Cache Contract:
// - Extracts host access, session loading, runtime-prompt cache observation, deferred mirroring, named-hook registration and cache-posture formatting from the outer runtime shell into explicit internal modules while keeping the proven v0.63.35 Core modules byte-identical
// - Freezes request message order and runtime prompt bytes: the current runtime block remains TAIL_AFTER_CURRENT_USER, and cache telemetry explicitly distinguishes SimCore runtime-block stability from provider/host prompt-cache behavior rather than claiming a cache hit
// - Preserves LOCATION_REUSE/KEY_REUSE/COLD_INIT decisions, authoritative snapshot sequencing, Deferred Chat Mirror guards, named callback identity, storage schema, async ordering and all Frame/Time/Evidence/Recovery/Prompt semantics
// - Adds no provider-cache directive, host/storage/API call, polling, history scan or prompt reordering; the modular cache seam is intentionally observational so a later stable/volatile prefix A/B experiment can be isolated from the 0.63 golden runtime
//
// v0.63.35 Runtime Stability Consolidation:
// - Promotes the proven v0.63.34 runtime into the 0.63 golden baseline: generation/state semantics stay frozen while CI now executes behavioral regression fixtures across lifecycle modes, Frame, Time, Recovery, Evidence, persistence, manual-edit repair, repeat-send/rewind and deferred-mirror ordering
// - Exposes the already-collected manual-edit reconcile path in the two-turn diagnostic so SAME_FAST, snapshot recovery and MANUAL_EDIT_REBUILT costs are distinguishable without inferring from elapsed time alone
// - Adds a compact runtime Stability summary derived only from existing in-memory turn binding, authoritative output commit, deferred-mirror status, stale-drop count and named-hook lifecycle telemetry
// - Adds no host/storage/API call, timer, polling, history scan, prompt/state field or output work; all 17 internal modules, request/output handlers, authoritative snapshot sequencing and Deferred Chat Mirror behavior remain byte-identical to v0.63.34
//
// v0.63.34 Deferred Chat Mirror:
// - Moves the secondary scriptstate mirror write out of the output-handler critical path while keeping the authoritative out snapshot fully awaited before COMMITTED
// - Captures the committed portable state, defers mirror work by one task, fresh-reads the exact target chat, and writes only when chat identity plus canonical/raw output fingerprint still match the committed output
// - Guards deferred work with runtime epoch and per-location latest-wins tokens; unload, targeted reload, superseded output, chat replacement and output-not-ready/mismatch paths fail open without touching chat state
// - Adds no new pluginStorage work and keeps all 17 internal SimCore modules, request path, Recovery/Thoughts, Time, Structure, Frame, Evidence, Prompt and snapshot schemas byte-identical to v0.63.33; one fresh chat read is intentionally moved off-path to make deferred full-chat mirroring safe
//
// v0.63.33 Output Commit Breakdown Diagnostics:
// - Exposes the output timing measurements already collected by the existing output pipeline so core commit, mirror write and diagnostic overhead can be attributed instead of inferred from the single committed delta
// - Reports output handler phases, processOutput state source and subphases, chat mirror subphases, plus one largest leaf hotspot; MEMORY_FAST versus STORAGE_FALLBACK is surfaced without changing the existing state-selection logic
// - Adds no new timer, storage/API call, encoding pass, history scan or output work; the output handler, processCoreOutput, mirrorCoreState and all 17 internal SimCore modules remain byte-identical to v0.63.32
// - Keeps Request/Handshake v0.63.31, Snapshot Write v0.63.32, Recovery/Thoughts, Time, Structure, Frame, Evidence, Prompt, reload safety and storage schema fully frozen
//
// v0.63.32 Snapshot Write Cost Attribution:
// - Extends the existing request telemetry with the already-serialized bundled turn snapshot character length so pluginStorage set latency can be compared against payload size without another storage call or encoding pass
// - Reports whether the pre snapshot recovery read was skipped/read-hit/read-miss, the restore reason, turn payload characters, serialize time, set time and set milliseconds per 1K serialized characters
// - Uses payload string length rather than UTF-8 byte measurement deliberately: no TextEncoder/Blob/second stringify scan is added to the request-critical path
// - Keeps snapshot keys, bundled {pre,send} payload shape, durability/await ordering, storage schema, host/API call counts and all generation/output semantics frozen; only Store/Session metric plumbing plus runtime diagnostic formatting changes
//
// v0.63.31 Request / Handshake Breakdown Diagnostics:
// - Exposes the request timing measurements already collected on the hot path and adds read-only substage timing around loadCoreForChat so intermittent handshake latency can be attributed instead of guessed
// - Reports handshake, session-load, post-handshake and onSend breakdowns plus one largest request hotspot; all values are memory-only telemetry and do not alter request prompts, state transitions or output semantics
// - Distinguishes LOCATION_REUSE, KEY_REUSE and COLD_INIT session paths, including character fetch and session init timing, while preserving the exact existing load/reuse decisions
// - Keeps every SimCore internal module byte-identical to v0.63.30; Recovery/Thoughts, Time, Structure, Frame, Evidence, Prompt, Session semantics, storage schema, reload safety and host/API call counts are frozen
//
// v0.63.30 Thoughts Compatibility Finalization:
// - Consolidates complete/partial Thoughts preamble detection into one Recovery classifier with explicit policy labels while preserving v0.63.29 output-selection and warning behavior
// - Complete standalone <Thoughts> wrappers are SILENT_COMPAT; partial Thoughts are SAFE_ENVELOPE_COMPAT only after a safe canonical # 응답 is selected; unknown prefixes remain WARNING and unresolved envelopes remain FAIL_OPEN
// - Extends memory-only preamble provenance with the applied policy label; no preamble text is retained and no model/host generation behavior is modified
// - Keeps Time v0.63.28, Structure v0.63.27, Frame, Evidence, Prompt, Session semantics, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; only Recovery classification plus runtime diagnostic formatting changes
//
// v0.63.29 Preamble Provenance Diagnostics:
// - Adds memory-only classification for text before the canonical # 응답 envelope: NONE, WHITESPACE_ONLY, THOUGHTS_COMPAT, DUPLICATE_ENVELOPE, UNKNOWN_TEXT or UNRESOLVED
// - Records only kind, character/line counts, action, selected envelope offset and candidate count; preamble text itself is never retained in diagnostic provenance
// - Preserves existing Recovery selection/removal/warning/compatibility behavior and state-commit semantics; this update observes provenance rather than changing repair policy
// - Keeps Time v0.63.28, Structure v0.63.27, Frame, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; only Recovery metadata plus minimal Session/runtime diagnostic wiring changes
//
// v0.63.28 Multi-scene Narrative Clock Commit:
// - Promotes the final line-level scene timestamp to the persisted narrative clock only when every canonical timestamp in the current # 응답 envelope is valid and monotonically non-decreasing
// - Falls back to the frame timestamp for malformed or non-monotonic timestamp sequences; no semantic inference about flashbacks/montages is attempted and no quarantine/warning is introduced for a skipped tail
// - Keeps broadcast airtime semantics first-timestamp based; synchronizes worldYear/age offset to the safely committed narrative tail when that tail crosses a year boundary
// - Keeps Structure v0.63.27, Frame, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; only Time plus minimal Session commit/diagnostic wiring changes
//
// v0.63.27 Response Envelope Scope:
// - Restricts Structure validation, Knowledge scanning and state-commit judgement to the canonical # 응답 envelope instead of treating host/model preamble text as part of the response body
// - Defines the first canonical timestamp immediately after the ordered response/Volume/Chapter/Chatindex frame as the single frame timestamp; later body/scene timestamps are intentionally allowed and no longer count as duplicate frame timestamps
// - Preserves Recovery preamble telemetry while allowing a structurally complete canonical envelope to resolve independently, preventing valid multi-scene outputs from being quarantined solely because of later scene timestamps or pre-envelope tag noise
// - Keeps Time first-timestamp semantics, Frame continuity, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; no new timer, polling or background activity
//
// v0.63.25 Targeted Reload Hook Cleanup:
// - Corrects the v0.63.23 reload-safety assumption exposed by the v0.63.24 identity probe: Risu V3 delegates beforeRequest replacers and output script handlers to the legacy Set-based API and does not automatically unregister those callbacks on targeted plugin unload
// - Stores the exact beforeRequest/output callback references and removes them in SimCore onUnload before the old sandbox is terminated, matching the proven explicit-cleanup pattern used by other refresh-safe V3 plugins
// - Keeps runtimeDisposed/epoch stale-work guards and UI cleanup as secondary safety; no timer, polling, storage/state-schema, request content retention or background activity is added
// - Generation behavior, runtime prompt text and all 17 internal modules including Frame/Evidence/Time/Structure/Prompt remain byte-identical to v0.63.24
//
// v0.63.23 Refreshless Update Safety:
// - Aligns SimCore unload behavior with the proven Local Usage refreshless-update lifecycle: mark the old runtime disposed immediately, reject stale in-flight work before Core state mutation, and explicitly unregister SimCore-owned UI parts
// - Relies on Risu API 3.0 plugin-unload auto-cleanup for replacer/script hooks rather than manually duplicating host hook-removal behavior
// - Adds memory-only reload-safety diagnostics (runtime epoch, stale-drop count, tracked UI-part count); no storage/state schema, timer, polling, sensor read or background activity is added
// - Generation behavior, runtime prompt text and all 17 internal modules including Frame/Evidence/Time/Structure/Prompt remain byte-identical to v0.63.22
//
// v0.63.22 Diagnostic Runtime Timing:
// - Adds memory-only wall-clock telemetry for plugin boot, request hook entry, Core handshake resolution, Core preparation, beforeRequest completion, output-hook entry and output commit
// - Reports the request-to-output gap, diagnostic age, hook invocation counts, >=50 ms slow-hook counts and per-hook maximum wall time without adding timers or polling
// - Runtime timing is observational only: it does not label request-to-output gap as model latency and does not read battery, temperature or device sensors
// - Generation behavior, runtime prompt text, state schema, storage, Frame/Evidence/Time/Lineage/Handoff/Recurrence/Structure semantics and host/API call sites remain frozen
//
// v0.63.21 Diagnostic Turn Binding:
// - Binds manual/panel runtime diagnostics to the exact current user turn and chat location instead of treating any same-chat in-memory probe as current
// - Records memory-only beforeRequest route telemetry (hook seen, Core handshake found/not found, active/inactive/error, send index) without retaining request/story content or adding storage
// - Separates current runtime mode from persisted last mode so a stale/inactive request can never display an older mode as if it were the current request classification
// - Gates request/output-derived probes by turn freshness; RAW Frame continuity remains independently computed from the two visible completed turns
// - Generation behavior, runtime prompt text, Frame/Evidence/Time/Lineage/Handoff/Recurrence semantics, state schema, storage and host/API call sites remain frozen
//
// v0.63.20 Same-Title Chapter Hold:
// - Extends the proven Frame Guard with one deterministic frame invariant observed in live long-chat use: an unchanged Chapter title must not advance its Chapter number
// - Compares only normalized visible Chapter-title text (NFKC + whitespace collapse); it does not interpret story meaning, infer progression, scan history semantically, or add prompt guidance
// - When the previous/current Chapter titles are identical and the model advances the Chapter number, restores the previous full Chapter heading while leaving Volume, Chatindex, timestamp, body, COMMUNITY and Knowledge untouched
// - Existing backward Volume/Chapter/Chatindex floors remain unchanged, genuine Chapter-title changes may advance normally, and a Volume advance may still reset Chapter numbering
// - Evidence Fence, Prompt, Time, Lineage, Handoff, Recurrence, Community, Reaction, Structure, Recovery, Session, storage/state schema and host/API call sites remain frozen
//
// v0.63.19 Evidence Fence:
// - Promotes the v0.63.16-v0.63.18 provenance probes into a request-only concrete-evidence boundary for eligible Short-C source locks
// - Locates the authoritative source assistant in the final beforeRequest array and wraps only that existing request message when root/source identity is unique, S/M/E anchors survive, outer gaps are zero, and normalized length drift is small
// - Preserves the host-transformed request body verbatim inside <CURRENT_SOURCE_EVIDENCE>; it does not replace it with raw chat text, summarize it, scan semantics, persist source bodies, or mutate visible chat history
// - Fails open on ambiguous/merged/unsafe boundaries and records APPLIED/SKIPPED diagnostics; Frame, Time, Recurrence, Lineage, Handoff, output handling, state schema, storage and host/API call sites remain frozen
// - Adds the dedicated Evidence module and only retargets the two existing Short-C provenance prompt lines to the fence when present
//
// v0.63.18 Evidence Boundary Probe:
// - Diagnostics-only follow-up after v0.63.17 live mapping uniquely located the root user as NORMALIZED and the authoritative source assistant as TRANSFORMED in the final beforeRequest array
// - Extends transformed-source telemetry with deterministic start/middle/end anchor survival, normalized source/request lengths, and leading/trailing boundary gaps so the next release can decide whether whole-message in-place fencing is safe
// - Does not fence, inject, copy, summarize, semantically compare, retain source bodies, repair output, or add state/schema/storage fields
// - Adds no host/storage/API call, timer, polling, or visible-chat mutation and keeps all 16 internal modules byte-identical to v0.63.17
//
// v0.63.17 Evidence Shape Probe:
// - Diagnostics-only follow-up after v0.63.16 live mapping returned MISSING for both authoritative root messages
// - Classifies how each raw source message appears in the already-built beforeRequest array using deterministic stages only: EXACT, NORMALIZED, EMBEDDED, TRANSFORMED, AMBIGUOUS, or ABSENT
// - Records request index and request role without retaining source text; light normalization is whitespace-only and transformed detection uses fixed source anchors rather than semantic similarity
// - Adds no prompt text, source injection/fence, output repair, state/schema/storage field, host/storage/API call, timer, polling, or visible-chat mutation
// - Keeps all 16 internal modules byte-identical to v0.63.16, including Frame, Prompt, Time, Structure, Recovery, Lineage, Handoff, Recurrence, Community, Reaction, Session, and OPS
//
// v0.63.16 Evidence Mapping Probe:
// - Diagnostics-only probe for the next Short-C provenance design: measures whether the authoritative raw lineage root turn maps uniquely onto the final beforeRequest message array
// - Confirms raw chat indices and provider-request indices as separate coordinate systems; never indexes request messages directly with the lineage rootIndex
// - For source-locked requests only, compares the raw root user plus its first completed assistant response against already-loaded request messages by exact role/content, retaining only indices/counts/lengths
// - Adds no prompt text, source-body copy, output repair, semantic scan, state/schema/storage field, host/storage/API call, timer, polling, or visible-chat mutation
// - Keeps all 16 internal modules byte-identical to v0.63.15, including Frame, Prompt, Time, Structure, Recovery, Lineage, Handoff, Recurrence, Community, Reaction, Session, and OPS
//
// v0.63.15 Frame Guard:
// - Adds a dedicated Frame module after repeated live regressions proved Volume/Chapter/Chatindex continuity is independent from Short-C source/provenance behavior
// - Captures only the immediately previous visible assistant frame from the already-loaded request history; adds no host/storage read, history semantic scan, prompt line, or creative decision
// - Enforces a deterministic backward-only floor: same-volume Chapter and Chatindex may not decrease, Volume may not decrease, and Chapter reset remains allowed after a genuine Volume advance
// - A regressed heading is restored as the prior full heading rather than rewriting only its number, preventing mixed-number/mixed-title Frankenstein headers
// - Keeps Prompt, Time, Recovery, Structure, Lineage, Handoff, Recurrence, Community, Reaction, storage paths, provenance policy, and diagnostics UI behavior otherwise frozen
//
// v0.63.14 Short-C Example Provenance Lock:
// - Refines the eligible Short-C evidence contract after v0.63.13 live testing showed that broad character-pattern generalization was legitimate but unsupported concrete prior-event examples still leaked into posts/comments
// - Replaces the three v0.63.13 scope lines with three provenance-focused lines: abstract generalization and stable background remain available, while every concrete event example/scene/action/item/quote/outcome requires support from the authoritative current root
// - Outside-root specific event evidence is omitted unless the current user explicitly requests prior-event/history/comparison/retrospective context; the boundary applies across title/body/comments/descriptions/Knowledge
// - Preserves reaction/opinion/joke/tone/emphasis freedom and does not parse source semantics, copy source bodies, scan history, store event facts, or repair output
// - Keeps Frame/Chapter/Chatindex handling deliberately frozen for independent live validation; all non-Prompt modules, state/storage paths, compiler structure, and v0.63.10 diagnostics UI remain unchanged
//
// v0.63.13 Short-C Event Scope Lock:
// - Refines the v0.63.12 Short-C scope contract after live testing showed that outside-root events were correctly labeled as past but the model still widened a plain current-scene reaction into a series-wide recap
// - Replaces the three v0.63.12 scope lines with three sharper lines that separate stable character/world background from concrete outside-root event details
// - Stable background remains available as background only; concrete prior-event details are forbidden unless the current user explicitly requests overall/history/comparison/retrospective/prior-event scope
// - Without explicit scope expansion, the model must not reframe the current-root reaction as a series-wide recap, compilation, history, or prior-event example set
// - Keeps Frame handling deliberately frozen despite the separately observed chapter/chatindex regression so the next live test can determine whether that regression persists independently; all non-Prompt modules and v0.63.10 diagnostics UI remain unchanged
//
// v0.63.12 Short-C Scope Boundary:
// - Refines the eligible Short-C source contract after v0.63.11 live testing showed that prior event details could still be presented as if they occurred in the current source event
// - Replaces the two v0.63.11 evidence lines with three compact scope lines: current lineage root is the default event scope, reaction style remains free, and every factual premise must obey that scope
// - Scope may expand only when the current user explicitly requests overall/history/comparison/retrospective context; outside-root background may remain background but must never be presented as an action from the current event
// - Applies the current-event fact boundary across title/body/comments/descriptions/Knowledge without parsing source semantics, copying source bodies, scanning history, or repairing output
// - Keeps Lineage, Handoff, Recurrence, Frame, Time, Recovery, Store, Community, Reaction, Session, OPS, and v0.63.10 diagnostics UI frozen; A/B/ordinary long-C/recurrence-owned C/non-source-lock Short-C prompts remain byte-identical
//
// v0.63.11 Short-C Evidence Boundary:
// - Tightens eligible Short-C current-event reactions after live evidence showed correct lineage/root/source-lock metadata but prior similar-event details still leaked into the post body and comments
// - Adds exactly two fixed source-lock-only Prompt contracts: current-event factual claims require support from the authoritative current lineage root, while reaction/opinion/jokes/emphasis remain free
// - Broader or retrospective event facts remain allowed only when the current user request explicitly asks for broader/comparative/retrospective context
// - Does not parse source semantics, copy source bodies, scan history, store event facts, repair output, or change Lineage/Handoff/Recurrence/Frame/Time/Recovery/Storage ownership
// - A/B, ordinary long C, recurrence-owned C, and Short-C without an eligible source lock receive zero new runtime-prompt lines; v0.63.5-0.63.10 behavior/UI remains unchanged
//
// v0.63.10 Diagnostics UI Polish III:
// - UI-only mobile cleanup: empty EDIT/PREFIX chip states use a quiet dash instead of n/a
// - Collapses Storage diagnostics into a default-closed summary using only the already-existing scan snapshot; opening the panel performs no extra storage scan or keys() call
// - Converts Diagnostic Tools into a default-closed details card while preserving the existing manual two-turn diagnostic action and all probe semantics
// - Adds no timer, polling, observer, request-path work, storage/API call, prompt line, state field, history scan, or output repair
// - Keeps all 15 internal modules byte-identical to v0.63.9 and preserves runtime semantics, generation guidance, cache-prefix behavior, Recovery, Source Lock, Period Continuity, and diagnostics
//
// v0.63.9 Diagnostics UI Polish II:
// - UI-only readability pass: adds an overall HEALTHY/CHECK/REGRESSION badge, EDIT CLEAN/REBUILT status, clearer source-idle labeling, and directional frame icons
// - Collapses the dense secondary metric grid into a default-closed Advanced diagnostics section and visually dims standby/n/a metrics when the panel is opened
// - Generalizes the old Long-Chat Regression Probe panel footer to Diagnostic Tools while keeping the manual diagnostic-copy behavior unchanged
// - All display-only classification/counting runs after the existing panel DOM is rendered; no timer, polling, observer, request-path work, storage/API call, prompt line, or state field is added
// - Keeps all 15 internal modules byte-identical to v0.63.8 and preserves runtime semantics, generation guidance, cache-prefix behavior, Recovery, Source Lock, Period Continuity, and diagnostics
//
// v0.63.8 Diagnostics UI Polish:
// - UI-only panel refresh: adds a sticky header, compact health chips, lineage breadcrumb, frame-continuity summary, and slowest-step performance highlight
// - Frame summary is computed only when the SimCore panel is opened, using the chat object already loaded by the existing panel path; request/runtime generation paths receive no new work
// - Adds no timer, polling, observer, storage/API call, history persistence, prompt line, state field, output repair, or generation guidance
// - Keeps all internal modules byte-identical to v0.63.7, including Prompt, Session, Store, Recovery, Structure, Lineage, Handoff, Recurrence, Time, and Reaction
// - Existing diagnostic-copy behavior remains unchanged except for the displayed version number
//
// v0.63.7 Short-C Source Facts Reinforcement:
// - Strengthens the existing Short-C Source Lock after live long-chat drift where lineage/root metadata was correct but the model substituted facts from an older similar event
// - Adds exactly one fixed source-lock-only Prompt contract binding source-event identity and facts to the authoritative current lineage root and forbidding imported details from prior similar events
// - Does not change lineage/handoff classification, inspect source semantics, copy source bodies, scan history, store event facts, or add output repair
// - Keeps v0.63.6 Mode C Output Boundary and v0.63.5 Period Baseline Continuity unchanged; Recurrence, Time, Recovery, Structure, Reaction, Storage, Broadcast, diagnostics, and frame handling remain frozen
// - A/B, ordinary long C, recurrence-owned C, and Short-C without an eligible source lock receive zero new runtime-prompt lines
//
// v0.63.6 Mode C Output Boundary:
// - Closes a live Mode C formatting gap where model-side intent/analysis/narrative text could appear between the required frame and the first <COMMUNITY> block
// - Adds exactly one fixed Mode C-only Prompt contract requiring <COMMUNITY> to begin immediately after the frame, with no intent/analysis/narrative/action/dialogue body before it
// - Keeps the existing Structure warning as judge-only telemetry and does not add output deletion/repair logic
// - Keeps v0.63.5 Period Baseline Continuity, Recurrence, Lineage, Handoff, Time, Recovery, Reaction, Storage, Broadcast, diagnostics, and output handling unchanged
// - A/B runtime prompts are byte-identical to v0.63.5; no state/schema/storage/history/content parsing is added
//
// v0.63.5 Period Baseline Continuity:
// - Adds one compact mode-independent continuity contract for successive period comparisons: the completed terminal state of the previous period becomes the next period baseline
// - Forbids replaying an already-completed prior-period baseline-to-terminal transition as the current period transition
// - Uses no year/number/platform parsing, content extraction, history scan, response copy, state-schema field, or pluginStorage/API call; the main model still interprets exposed history/content
// - Keeps Recurrence, Lineage, Handoff, Time, Recovery, Reaction, Storage, Broadcast, diagnostics, and output handling unchanged
// - Adds exactly two fixed Stable Contract lines on active prompts; compiler tier order and all existing dynamic prompt serialization stay unchanged
//
// v0.63.4 Long-Chat Regression Probe:
// - Diagnostics-only mini release: generation behavior, runtime prompt, state schema, storage, recurrence, lineage, handoff, time, recovery, reaction, and broadcast semantics stay unchanged
// - Extends the manual two-turn raw diagnostic with Volume/Chapter/Chatindex continuity and explicit regression flags
// - Reports recurrence guidance state, the current template fingerprint, and the most recent exact historical fingerprint match by user/assistant index
// - Historical fingerprint lookup runs only when the user presses the diagnostic-copy button; no request/output hot-path history scan, response persistence, or new pluginStorage call is added
// - Keeps the v0.63.0 cache-aware Prompt compiler byte-identical; runtime prompt text and cache-prefix behavior are unchanged by construction
//
// v0.63.3 Two-Turn Diagnostic Copy:
// - Changes the manual diagnostic copy body from lineage-selected root/parent/current raw turns to the two most recent completed user→assistant turns: 직전 턴 + 최근 턴
// - Keeps lineage/handoff/recurrence/cache/clock/warning metadata in the diagnostic header; root/parent remain metadata only rather than extra raw-response payloads
// - Locates the two completed turns only when the user presses the button; no persistent response copy, storage schema, runtime prompt, or generation behavior change
//
// v0.63.2 Release Channel Split:
// - Migration-only release: moves PocketRisu update checks from main to the dedicated release-simcore branch
// - Runtime prompt, state, storage, lineage, handoff, recovery, time, reaction, broadcast, and diagnostic-copy behavior are unchanged from v0.63.1
// - Future SimCore releases update release-simcore without moving main or the Usage Dashboard release channel
//
// v0.63.1 Short-C Source Lock + Turn Diagnostic Copy:
// - Strengthens eligible short Mode C source guidance without changing lineage/handoff classification: the current lineage root is explicitly authoritative and prior similar events/community answers may not substitute it
// - Emits only deterministic lineage metadata already computed by SimCore; no lore/content extraction, semantic source selection, history search, or state-schema/storage change
// - Adds a manual '최근 턴 진단 복사' panel action that copies raw root/parent/current turns plus live SimCore probes on demand, with no persistent response copy
// - Reuses the proven navigator.clipboard.writeText pattern from Local Usage Dashboard; clipboard work occurs only after the user presses the diagnostic button
// - Keeps Cache-Aware Prompt Compiler ordering, >=20% mode-transition cache-floor gate, visible Thoughts/preamble recovery, reaction/time/broadcast behavior, and pluginStorage call sites unchanged
//
// v0.63.0 Cache-Aware Prompt Compiler:
// - Replaces the monolithic runtime-prompt serializer with explicit Stable/Slow/Mode/Conditional/Hot/Footer compiler tiers inside the existing Prompt module
// - Keeps lifecycle/time/recurrence/lineage/handoff/reaction/recovery/state ownership unchanged; Prompt still serializes already-computed state only
// - Moves mode-independent output/reference/Knowledge contracts to the stable prefix and generalizes the existing Community comment/reaction format contract behind an explicit community_blocks_expected>0 guard
// - Keeps the proven Prompt Cache Probe active for live A/B/C verification; cache-floor tests require >=20% exact SimCore runtime-block common prefix across all synthetic A/B/C mode transitions
// - No state schema, storage key, snapshot, pluginStorage/API call, history scan, output repair, visible-Thoughts/preamble recovery, lore fetch, or creative/semantic ownership change
//
// v0.62.36 Prompt Cache Probe:
// - Diagnostics only: compares the current SimCore runtime prompt block with the previous live request for the same chat
// - Measures exact common-prefix chars/lines, first changed line, changed line slots, and a coarse change-reason category
// - Keeps only one prior runtime prompt in memory; no pluginStorage, snapshot, state-schema, history-scan, or persistent cache is added
// - Reports SimCore runtime-block stability only; it does not claim or infer provider/PocketRisu cache hit or miss
// - renderRuntimePrompt output remains byte-identical to v0.62.35; generation guidance and all Core/Community contracts are unchanged
//
// v0.62.35 Module Boundary Freeze:
// - Freezes explicit responsibility/non-goal contracts for every internal module before the v0.63 prompt-compiler work
// - Extracts renderRuntimePrompt from Session into a dedicated Prompt module; Session remains orchestration-only for prompt assembly
// - Keeps one installable JS artifact; this is internal modularization, not a multi-file runtime dependency
// - Runtime prompt output is byte-identical to v0.62.34 across A/B/C/B_END/recurrence/handoff/age/narrative cases
// - No state schema, storage key, snapshot, time, lineage, reaction, output-repair, lore access, or generation guidance change
//
// v0.62.32 Stable Menu Label:
// - UI/metadata only: changes //@display-name to a stable versionless "SimCore" label so future installs do not pin a stale version number in the PocketRisu sidebar
// - Keeps //@name simcore unchanged for plugin identity/storage namespace
// - Panel/runtime diagnostics still show the actual plugin version internally
// - No runtime prompt, state, timing, storage, lore, snapshot, output, or semantic behavior change
//
// v0.62.34 UI Label Consolidation:
// - Finishes the versionless SimCore UI cleanup by renaming the chat button from SimCore Lite to SimCore
// - Removes the stale v0.62.29 version prefix from the panel footer while keeping the Short Community Lineage Anchor status text
// - Keeps the panel header as the single human-facing place that shows the current runtime version
// - UI-only: no runtime prompt, state, time, lineage, storage, snapshot, lore, or generation behavior change
//
// v0.62.33 Stable Settings Label:
// - Fixes the PocketRisu settings-sidebar label that was still hardcoded as SimCore v0.62.20
// - Keeps //@name simcore and //@display-name SimCore unchanged; only the registerSetting label becomes versionless SimCore
// - UI/metadata only: no runtime prompt, state, time, lineage, storage, or generation behavior change
//
// v0.62.31 Timestamp Canonicalization Guard:
// - Fixes a live regression where a model-emitted 00:xx AM/PM timestamp looked structurally valid but failed semantic timestamp parsing, bypassing the narrative current-time floor
// - Canonicalizes unambiguous zero-hour 12-hour-clock tokens (00:xx AM/PM -> 12:xx AM/PM) before A/B/C time semantics run
// - Timestamp syntax normalization is shared across A/B/C, while existing A/C narrative-time and Mode B broadcast-airtime semantics remain unchanged
// - Adds output-only diagnostics for whether canonicalization occurred; no runtime prompt tokens, state schema change, history scan, auxiliary model, or new pluginStorage/API call site
//
// v0.62.30 Current Age Anchor:
// - Fixes a repeated live age-drift failure where a past event/candidacy age was reused as the current narrative age after the story year had advanced
// - Keeps the proven korean_age_offset state untouched and adds one compact current-age formula only when the offset is greater than zero
// - Current age is resolved as character-reference age plus SimCore's deterministic Korean-age offset; past-event age mentions must not override the current value
// - Applies uniformly to active A/B/C turns; no exact age is hardcoded and no character/lore content is fetched or copied
// - No state schema change, history scan, auxiliary model, output rewrite, or new pluginStorage/API call site
//
// v0.62.29 Short Community Lineage Anchor:
// - Fixes a live short-C gap observed when Request Lineage correctly knew the current source but Source Handoff was FIRST/SAME SOURCE and therefore injected no source guidance
// - For eligible short Mode C requests with a seeded A/B/C lineage and no NEW SOURCE transition, injects exactly one compact current-lineage anchor line
// - Existing v0.62.25 NEW SOURCE behavior remains authoritative and unchanged; its two-line current-source hint is never duplicated by this anchor
// - A/B requests, long/detailed C requests, recurrence-owned C requests, and unseeded short C requests add zero new prompt lines
// - No semantic source selection, content copying, history scan, state schema change, auxiliary model, or new pluginStorage API call site
//
// v0.62.28 Runtime Prompt Budget Probe:
// - Diagnostics only: measures the exact SimCore runtime prompt already injected on each active A/B/C request
// - Records total prompt characters/lines plus the dynamic reaction_max line size and active conditional feature flags
// - Adds panel-only runtime budget telemetry for the future prompt compiler baseline
// - renderRuntimePrompt output is byte-identical to v0.62.27; no generation guidance, state schema, history scan, or storage I/O change
// - Existing Reference Anchor/Broadcast/Community/Reaction/Narrative/Recurrence/Lineage/Handoff/Parent-Shift behavior is unchanged
//
// v0.62.27 Reference Attention Anchor:
// - Adds a tiny always-on reference pointer for every active A/B/C turn
// - Character card and currently exposed lore, when present in the host request context, are marked as authoritative reference sources for character/world facts
// - Does not fetch, copy, inject, summarize, select, or semantically rank lore content; it only points the main model back to context the host already exposed
// - Exactly two fixed runtime-prompt lines are added on active turns; no auxiliary model, history rescan, state field, or new pluginStorage API call site
// - Existing Broadcast/Community/Reaction/Narrative/Recurrence/Lineage/Handoff/Parent-Shift behavior is unchanged
//
// v0.62.26 Community Parent-Shift Probe:
// - Diagnostics/state only: observes repeated short Community requests that stay on the same A/B/C lineage root while their direct parent/depth changes
// - Extends the bounded short-request registry with parent mode/index/depth only; no source/content body is stored
// - Existing v1 registry rows establish a v2 parent baseline on first observation instead of guessing a shift
// - NEW SOURCE behavior from v0.62.25 is unchanged; parent-shift observations inject no generation guidance
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and zero new runtime-prompt tokens
//
// v0.62.25 Community New-Source Guard ABC:
// - Closes the short Community follow-up gap left intentionally outside the detailed Template Recurrence Guard
// - Remembers a bounded short-request fingerprint together with its latest A/B/C lineage root; no content body is stored
// - When the same short Community request recurs under a different source root, injects only two compact lines telling the model to derive from the current source instead of the prior answer
// - Same request + same source gets no hint; first occurrence gets no hint; long/detailed recurrence remains owned by v0.62.22
// - Source roots are ABC-wide: A scenes, B episodes, and inline-C sources all participate without cross-contract template contamination
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and normal requests add zero prompt tokens
//
// v0.62.24 Narrative Current-Time Floor:
// - Non-broadcast current narrative timestamps are monotonic even when a short A/C follow-up causes the model to emit an older source-event time
// - If the first/current response timestamp is earlier than the prior narrative anchor, only that timestamp is clamped to the prior anchor; embedded/source-event times remain untouched
// - State commit and manual-edit sync also refuse backward narrative-anchor movement as defense in depth
// - One-time v1 -> v2 migration checks only the immediately preceding turn snapshot to recover an anchor already regressed by v0.62.23; no history rescan
// - Mode B Broadcast Airtime Guard is unchanged; Request Lineage/Community/Reaction/Recurrence semantics are unchanged
// - No auxiliary model, no new runtime-prompt tokens, and no new pluginStorage API call sites
//
// v0.62.23 Request Lineage Probe:
// - Diagnostics/state only: observes A/B/C request lineage without changing generation guidance
// - Tracks root source, direct parent, C-chain depth, inline current-input source, and a tiny recent A/B source window
// - Mode B episode segments share one B root until a new B_START; Mode C can chain from A, B, C, or inline source
// - No history rescan/bootstrap, no auxiliary model, no new pluginStorage API calls, and zero new runtime-prompt tokens
// - Snapshot-aware and rewind-safe; existing Broadcast/Community/Reaction/Narrative/Recurrence semantics are unchanged
//
// v0.62.22 Template Recurrence Guard ABC:
// - Extends recurrence detection and guidance to Mode A, Mode B, and Mode C as one shared feature set
// - Fingerprints are mode-family scoped (A/B/C) so different output contracts never contaminate each other
// - Mode C keeps directive/checklist extraction; Mode B strips broadcast control tags; Mode A/B use conservative detailed-input matching
// - v1 recurrence memory is rebuilt once from pre-update user history into the ABC registry; current input remains excluded
// - Existing outputs are never rewritten; only new generations can receive the recurrence hint
// - No auxiliary model, no new pluginStorage API calls, and no Broadcast/Community/Reaction/Narrative semantics changes
//
// v0.62.21 Template Recurrence Guard:
// - Detects recurring detailed [커뮤니티] request templates without auxiliary-model calls
// - One-time migration bootstrap scans pre-update user history only; current input is excluded
// - Repeated templates keep the requested fields/format but prompt the model to reevaluate current-event delta, emphasis, reactions, and wording
// - Existing outputs are never rewritten; recurrence guidance affects only new generations
// - Registry is compact, bounded, snapshot-aware, and rewind-safe; no new storage API calls
//
// v0.62.20 Narrative Clock Diagnostics:
// - Runtime diagnostics only; Narrative Clock Guard behavior from v0.62.19 is unchanged
// - Records guard ON/OFF, trigger, previous anchor, output timestamp, and commit direction
// - Records non-broadcast mode transitions so C -> A / A -> C clock continuity can be observed
// - Backward movement with the guard OFF is reported as BACKWARD OBSERVED but is not blocked
// - No new prompt tokens, persistent state fields, storage I/O, or Broadcast/Community/Reaction changes
//
// v0.62.19 Narrative Clock Guard Phase 1:
// - Adds a conservative current-narrative timestamp anchor for non-broadcast modes
// - Activates only when the user opens with a clear forward calendar/relative-time transition
// - When active, the next current timestamp may not precede the previous non-broadcast timestamp
// - Embedded preview/flashback/event time must not replace the current narrative timestamp
// - No calendar guessing for ambiguous week/day phrases; no Broadcast/Community/Reaction behavior changes
//
// v0.62 optimization rules:
// - Stable behavior is the golden baseline; no semantic contract changes
// - Dead helpers removed
// - Recovery/legacy work consolidated behind cold paths
// - Output preparation/validation/commit runs once (no duplicate canonicalize/tail pass)
// - Output state is loaded once and fingerprint is saved with the same out snapshot write
// - Unchanged manual-edit checks return from the in-memory fingerprint fast path with no snapshot I/O
// - No auxiliary-model calls
//
// Compatibility retained:
// - Same plugin name/storage namespace (`simcore`)
// - Same `sim:core:<character>:<chat>` snapshot prefix
// - Same `$simcore_core_*` chat.scriptstate mirrors
// - Same <SIMCORE_CORE_SWITCH>1</SIMCORE_CORE_SWITCH> handshake
// - Existing v0.60+ snapshots/mirrors still migrate in place; no state reset
// - START+END => B_END; locked CONTINUE+END => B_CONTINUE
// - Reaction abbreviations: 천/만/억 and K/M/B
// - Per-platform-family reaction history remains shared across B/C
// - <Knowledge> remains the final output block after all COMMUNITY blocks

const SIMCORE_RUNTIME_VERSION = '0.66.0';
const SIMCORE_LOG_PREFIX = `[simcore/v${SIMCORE_RUNTIME_VERSION}]`;

const SimCore = (() => {
  const mods = {};
  const cache = {};
  const define = (name, fn) => { mods[name] = fn; };
  const requireFn = (name) => {
    const key = name.replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache[key]) return cache[key].exports;
    const fn = mods[key];
    if (!fn) throw new Error('module not found: ' + name);
    const module = { exports: {} };
    cache[key] = module;
    fn(requireFn, module, module.exports);
    return module.exports;
  };
  return { define, require: requireFn };
})();

SimCore.define("contracts", function (require, module, exports) {
const MODULE_CONTRACT_VERSION = 2;
const MODULE_CONTRACTS = Object.freeze({
  contracts: Object.freeze({ owns: 'module responsibility metadata', excludes: 'runtime policy or state mutation' }),
  kernel: Object.freeze({ owns: 'state schema and shared primitives/normalization glue', excludes: 'mode policy, prompt wording, output repair' }),
  store: Object.freeze({ owns: 'snapshot persistence, retention and deferred retention housekeeping mechanics', excludes: 'semantic state decisions or prompt wording' }),
  lifecycle: Object.freeze({ owns: 'mode/broadcast/episode request preparation', excludes: 'timestamp math, output repair, prompt serialization' }),
  time: Object.freeze({ owns: 'timestamp syntax, deterministic calendar transitions, narrative/broadcast clocks, world-year and age-offset primitives', excludes: 'scene meaning or mode classification' }),
  frame: Object.freeze({ owns: 'visible response-frame parsing and deterministic Volume/Chapter/Chatindex sequencing', excludes: 'semantic title interpretation, narrative progression decisions, host/storage I/O' }),
  recurrence: Object.freeze({ owns: 'request-template recurrence detection and bounded registry', excludes: 'source meaning or response composition' }),
  lineage: Object.freeze({ owns: 'request root/parent/depth tracking', excludes: 'source importance or response content' }),
  handoff: Object.freeze({ owns: 'short-C source/parent-shift detection and bounded registry', excludes: 'semantic source selection or reaction content' }),
  evidence: Object.freeze({ owns: 'authoritative request-message resolution and safe request-only source fencing', excludes: 'semantic interpretation, summarization, history search, storage, output repair, creative generation' }),
  community: Object.freeze({ owns: 'COMMUNITY parsing and platform taxonomy', excludes: 'reaction-number mutation or prose generation' }),
  reaction: Object.freeze({ owns: 'reaction parsing, per-family floors and deterministic normalization', excludes: 'community prose or platform selection' }),
  structure: Object.freeze({ owns: 'output validation and integrity judgement', excludes: 'repair or semantic rewriting' }),
  'output-compat': Object.freeze({ owns: 'output envelope compatibility/canonicalization plus bounded Fresh candidate planning and compatibility interpretation', excludes: 'host Fresh reads, history bootstrap, manual edit attribution, persistent raw body' }),
  'bootstrap-migration': Object.freeze({ owns: 'history bootstrap and legacy migration/repair coordination', excludes: 'ordinary output compatibility or manual edit attribution' }),
  'output-finalize': Object.freeze({ owns: 'deterministic prepared-output to committed-state/content transition composition', excludes: 'storage I/O, host I/O, envelope candidate policy or edit attribution' }),
  recovery: Object.freeze({ owns: 'deprecated M2 compatibility facade over output-compat + bootstrap-migration with zero runtime callers', excludes: 'new policy ownership' }),
  prompt: Object.freeze({ owns: 'runtime prompt serialization', excludes: 'persistent semantic state ownership, host/storage I/O, creative decisions' }),
  session: Object.freeze({ owns: 'per-chat application identity/current-state holder plus bounded persistence sequencing', excludes: 'output-finalization policy, retention housekeeping mechanics, prompt wording ownership or creative/semantic decisions' }),
  ops: Object.freeze({ owns: 'performance and diagnostic formatting', excludes: 'generation/state policy' }),
});
module.exports = { MODULE_CONTRACT_VERSION, MODULE_CONTRACTS };
});

SimCore.define("store", function (require, module, exports) {
function storeNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
class SnapshotStore {
  constructor(backend, prefix, keepN = 80) {
    this.b = backend;
    this.p = prefix;
    this.keepN = keepN;
    this.lastKeyScan = null;
    this.deferredPruneIndex = -1;
    this.deferredPruneRunning = false;
  }
  _recordKeyScan(op, startedAt, keys, currentChatKeys = null, matchingKeys = null) {
    const total = Array.isArray(keys) ? keys.length : 0;
    const current = currentChatKeys == null ? null : Math.max(0, Number(currentChatKeys) || 0);
    const matched = matchingKeys == null ? null : Math.max(0, Number(matchingKeys) || 0);
    this.lastKeyScan = {
      op: String(op || 'unknown'),
      ms: Math.max(0, storeNow() - startedAt),
      totalKeys: total,
      currentChatKeys: current,
      matchingKeys: matched,
      at: Date.now(),
    };
    return this.lastKeyScan;
  }
  keyScanStats() {
    return this.lastKeyScan ? { ...this.lastKeyScan } : null;
  }
  _k(phase, index) { return `${this.p}:${phase}:${index}`; }
  async save(phase, index, state, opts = {}) {
    const metric = opts.metric && typeof opts.metric === 'object' ? opts.metric : null;
    let t = storeNow();
    const payload = JSON.stringify(state);
    if (metric) metric.serializeMs = Math.max(0, storeNow() - t);
    t = storeNow();
    await this.b.set(this._k(phase, index), payload);
    if (metric) metric.setMs = Math.max(0, storeNow() - t);
    if (opts.prune !== false) {
      t = storeNow();
      await this._prune();
      if (metric) metric.pruneMs = Math.max(0, storeNow() - t);
    }
  }
  async saveTurn(index, preState, sendState, opts = {}) {
    const metric = opts.metric && typeof opts.metric === 'object' ? opts.metric : null;
    let t = storeNow();
    const payload = JSON.stringify({ snapshotVersion: 1, pre: preState, send: sendState });
    if (metric) {
      metric.serializeMs = Math.max(0, storeNow() - t);
      metric.payloadChars = payload.length;
    }
    t = storeNow();
    await this.b.set(this._k('turn', index), payload);
    if (metric) metric.setMs = Math.max(0, storeNow() - t);
    if (opts.prune !== false) {
      t = storeNow();
      await this._prune();
      if (metric) metric.pruneMs = Math.max(0, storeNow() - t);
    }
  }
  async loadTurn(index) {
    const raw = await this.b.get(this._k('turn', index));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return { pre: parsed.pre || null, send: parsed.send || null };
    } catch { return null; }
  }
  async load(phase, index) {
    // New bundled snapshots first; old pre/send keys remain a transparent recovery fallback.
    if (phase === 'pre' || phase === 'send') {
      const turn = await this.loadTurn(index);
      if (turn && turn[phase]) return turn[phase];
    }
    const raw = await this.b.get(this._k(phase, index));
    return raw ? JSON.parse(raw) : null;
  }
  async latestAtOrBelow(phase, index) {
    const re = new RegExp(`^${escapeRe(this.p)}:${phase}:(\\d+)$`);
    let best = -1;
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    let currentChatKeys = 0;
    let matching = 0;
    for (const k of keys) {
      if (String(k).startsWith(`${this.p}:`)) currentChatKeys += 1;
      const m = k.match(re);
      if (!m) continue;
      matching += 1;
      const i = parseInt(m[1], 10);
      if (i <= index && i > best) best = i;
    }
    this._recordKeyScan(`latest:${phase}`, scanStarted, keys, currentChatKeys, matching);
    return best >= 0 ? { index: best, state: await this.load(phase, best) } : null;
  }
  async clockAnchorsAtOrBelow(index) {
    const re = new RegExp(`^${escapeRe(this.p)}:(pre|send|out|turn):(\\d+)$`);
    const rows = [];
    const addState = (state, i) => {
      const year = Number(state?.worldYear ?? state?.narrativeYear);
      const offset = Number(state?.koreanAgeOffset);
      if (Number.isFinite(year) && Number.isFinite(offset)) rows.push({ index: i, year, offset });
    };
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    let currentChatKeys = 0;
    let matching = 0;
    for (const k of keys) {
      if (String(k).startsWith(`${this.p}:`)) currentChatKeys += 1;
      const m = k.match(re);
      if (!m) continue;
      matching += 1;
      const i = parseInt(m[2], 10);
      if (i > index) continue;
      const raw = await this.b.get(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (m[1] === 'turn') {
          addState(parsed?.pre, i);
          addState(parsed?.send, i);
        } else {
          addState(parsed, i);
        }
      } catch { /* ignore broken legacy snapshot */ }
    }
    this._recordKeyScan('clock-anchors', scanStarted, keys, currentChatKeys, matching);
    return rows;
  }
  scheduleDeferredPrune(outIndex) {
    // Retention is housekeeping, not part of the user-visible output commit. Run it only
    // periodically and after the output promise can resolve. 17 is coprime with the usual
    // user/assistant index step of 2, so long chats still hit the cadence after reloads.
    if (!Number.isInteger(outIndex) || outIndex < 17 || (outIndex % 17) !== 0) return false;
    if (this.deferredPruneIndex === outIndex || this.deferredPruneRunning) return false;
    this.deferredPruneIndex = outIndex;

    const run = async () => {
      if (this.deferredPruneRunning) return;
      this.deferredPruneRunning = true;
      try { await this.prune(); }
      catch (e) { /* retention failure must never affect committed output/state */ }
      finally { this.deferredPruneRunning = false; }
    };

    if (typeof setTimeout === 'function') {
      const timer = setTimeout(run, 750);
      if (timer && typeof timer.unref === 'function') timer.unref();
    } else {
      Promise.resolve().then(run);
    }
    return true;
  }

  async prune() { return this._prune(); }
  async _prune() {
    const re = new RegExp(`^${escapeRe(this.p)}:(pre|send|out|turn):(\\d+)$`);
    const entries = [];
    const scanStarted = storeNow();
    const keys = await this.b.keys();
    for (const k of keys) {
      const m = k.match(re);
      if (m) entries.push({ k, index: parseInt(m[2], 10) });
    }
    this._recordKeyScan('prune', scanStarted, keys, entries.length, entries.length);
    if (entries.length <= this.keepN * 3) return;
    entries.sort((a, b) => b.index - a.index);
    const keep = new Set(entries.slice(0, this.keepN * 3).map((e) => e.k));
    for (const e of entries) if (!keep.has(e.k)) await this.b.remove(e.k);
  }
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); }
module.exports = { SnapshotStore };
});

SimCore.define("community", function (require, module, exports) {
const COMMUNITY_RE = /<COMMUNITY(?:\s[^>]*)?>[\s\S]*?<\/COMMUNITY>/gi;
const COMMUNITY_CLASSIFIER_VERSION = 2;
const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;
const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;

const PLATFORM_FAMILIES = [
  { key: 'YouTube(EN)', group: '해외', re: /^(?:YouTube|유튜브)\s*\(\s*EN\s*\)/i },
  { key: 'TikTok(EN)', group: '해외', re: /^(?:TikTok|틱톡)\s*\(\s*EN\s*\)/i },
  { key: 'X(EN)', group: '해외', re: /^(?:X|트위터)\s*\(\s*EN\s*\)/i },
  { key: 'Reddit', group: '해외', re: /^Reddit/i },
  { key: '네이버 카페', group: '학부모/지역', re: /^네이버\s*카페/i },
  { key: '맘카페', group: '학부모/지역', re: /^맘\s*카페|^맘카페/i },
  { key: '에브리타임', group: '대학생', re: /^(?:에브리타임|에타)(?=$|[\s\-–—/:|·])/i },
  { key: '블라인드', group: '직장인', re: /^블라인드/i },
  { key: '유튜브', group: '영상', re: /^(?:유튜브|YouTube)(?=$|[\s\-–—/:|·])/i },
  { key: '인스타', group: 'SNS', re: /^(?:인스타(?:그램)?|Instagram)(?=$|[\s\-–—/:|·])/i },
  { key: '틱톡', group: 'SNS', re: /^(?:틱톡|TikTok)(?=$|[\s\-–—/:|·])/i },
  { key: 'X', group: 'SNS', re: /^(?:X|트위터)(?=$|[\s\-–—/:|·])/i },
  { key: '더쿠', group: '여초', re: /^더쿠/i },
  { key: '네이트판', group: '여초', re: /^네이트\s*판|^네이트판/i },
  { key: '펨코', group: '남초', re: /^(?:펨코|에펨코리아)/i },
  { key: 'DC', group: '남초', re: /^(?:DC|디시인사이드|디시)/i },
];

function parentLocalAliasInfo(shown) {
  // Exact family rules above stay authoritative. This fallback runs only after all exact matches fail.
  // Keep it deliberately narrow: require both a parent/local identity and a community-shaped signal.
  const text = String(shown || '').trim();
  if (!text) return null;
  const namePart = text.split(/[\/|｜]/, 1)[0].trim();
  const compactName = namePart.replace(/\s+/g, '');

  const regionalMom = /^[가-힣A-Za-z0-9]{1,16}맘(?:$|[\s_\-–—])/i.test(namePart);
  const regionalParentWord = /^[가-힣A-Za-z0-9]{1,16}(?:엄마들?|어머님들?|학부모들?)$/i.test(compactName);
  const explicitParentWord = /(?:^|[\s_\-–—])(?:맘|엄마들?|어머님들?|학부모들?|육아맘)(?:$|[\s_\-–—])/i.test(namePart);
  const attachedMomCommunity = /(?:^|[가-힣A-Za-z0-9])맘(?:모여라|모임|소통|수다|커뮤니티|게시판|정보방|사랑방|놀이터|라운지|톡|방)(?:$|[^가-힣])/i.test(namePart);
  const communitySignal = /(?:모여라|모임|카페|소통|수다|커뮤니티|게시판|자유게시판|정보방|사랑방|놀이터|라운지|톡|방)/i.test(text);

  if ((regionalMom || regionalParentWord || explicitParentWord || attachedMomCommunity) && communitySignal) {
    return { shown, key: '맘카페', group: '학부모/지역', source: 'alias-parent-local' };
  }
  return null;
}

function platformInfo(header) {
  const shown = String(header || '').trim();
  for (const fam of PLATFORM_FAMILIES) {
    fam.re.lastIndex = 0;
    if (fam.re.test(shown)) return { shown, key: fam.key, group: fam.group, source: 'exact' };
  }
  const alias = parentLocalAliasInfo(shown);
  if (alias) return alias;
  return { shown, key: shown.replace(/\s+/g, '').toLowerCase(), group: null, source: 'unknown' };
}

function normalizePlatformMaxMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [name, value] of Object.entries(raw)) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    const info = platformInfo(name);
    const key = info.group ? info.key : String(name);
    out[key] = Math.max(Number(out[key] || 0), n);
  }
  return out;
}

function communityBlocks(content) {
  return String(content || '').match(COMMUNITY_RE) || [];
}

function splitCommunity(block) {
  const body = String(block || '')
    .replace(/^<COMMUNITY(?:\s[^>]*)?>/i, '')
    .replace(/<\/COMMUNITY>$/i, '');
  return body.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean);
}

function sectionHeader(section) {
  const m = String(section || '').match(/^\s*\[([^\]\n]+)\]/);
  return m ? m[1].trim() : '';
}

function sectionCommunityParts(section) {
  const text = String(section || '');
  const titleMatch = text.match(/^\s*제목\s*[:：]\s*(\S.*)$/m);
  const markers = [...text.matchAll(/^\s*\[베댓\]\s*$/gm)];
  let body = '';
  let commentsStart = -1;
  if (titleMatch && markers.length === 1) {
    const marker = markers[0];
    const titleEnd = titleMatch.index + titleMatch[0].length;
    body = text.slice(titleEnd, marker.index).trim();
    body = body.replace(/^내용\s*[:：]\s*/i, '').trim();
    commentsStart = marker.index + marker[0].length;
  }
  return {
    text,
    titleMatch,
    markerCount: markers.length,
    body,
    commentsStart,
    comments: commentsStart >= 0 ? text.slice(commentsStart) : text,
  };
}

function commentUnits(commentScope) {
  const lines = String(commentScope || '').split(/\r?\n/);
  const units = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    units.push({ kind: current.kind, text: current.lines.join('\n') });
    current = null;
  };

  for (const line of lines) {
    const top = /^\s*-\s+/.test(line);
    const reply = !top && /^\s*ㄴ\s+/.test(line);
    if (top || reply) {
      flush();
      current = { kind: top ? 'TOP' : 'REPLY', lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return units;
}


module.exports = {
  COMMUNITY_RE,
  COMMUNITY_CLASSIFIER_VERSION,
  ALIAS_BACKFILL_ASSISTANT_LIMIT,
  ALIAS_BACKFILL_MESSAGE_LIMIT,
  PLATFORM_FAMILIES,
  platformInfo,
  normalizePlatformMaxMap,
  communityBlocks,
  splitCommunity,
  sectionHeader,
  sectionCommunityParts,
  commentUnits,
};
});

SimCore.define("recurrence", function (require, module, exports) {
const TEMPLATE_RECURRENCE_VERSION = 2;
const TEMPLATE_REGISTRY_LIMIT = 384;
const COMMUNITY_MARKER = '[커뮤니티]';
const TEMPLATE_MAX_CHARS = 4096;
const TEMPLATE_MIN_CHARS_C = 32;
const TEMPLATE_MIN_CHARS_AB = 48;

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  return m === 'C' ? 'C' : 'A';
}

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const value of src) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const h = n >>> 0;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out.slice(-TEMPLATE_REGISTRY_LIMIT);
}

function stripBroadcastTags(text) {
  return String(text || '')
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function templateSource(userText, mode) {
  const family = modeFamily(mode);
  const raw = String(userText || '');
  const communityIndex = raw.indexOf(COMMUNITY_MARKER);
  let source = '';

  // C is an explicit request mode. In B, an embedded community directive is also the strongest
  // reusable request schema; otherwise B uses the broadcast request after removing control tags.
  if (family === 'C' || (family === 'B' && communityIndex >= 0)) {
    if (communityIndex < 0) return '';
    source = raw.slice(communityIndex + COMMUNITY_MARKER.length);
  } else {
    source = stripBroadcastTags(raw);
  }
  return source.slice(0, TEMPLATE_MAX_CHARS);
}

function normalizeTemplate(userText, mode) {
  const family = modeFamily(mode);
  let source = templateSource(userText, mode);
  if (!source) return '';
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }

  // A long parenthetical checklist is the most stable reusable schema across changed events.
  // This keeps the requested fields while ignoring the event/title that naturally changes over time.
  const open = source.indexOf('(');
  const close = source.lastIndexOf(')');
  if (open >= 0 && close > open && (close - open) >= TEMPLATE_MIN_CHARS_C) source = source.slice(open);

  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // A/B lack C's explicit directive boundary, so require a little more substance unless a
  // detailed parenthetical request schema was extracted. This avoids flagging short scene beats.
  const minChars = family === 'C' ? TEMPLATE_MIN_CHARS_C : TEMPLATE_MIN_CHARS_AB;
  return normalized.length >= minChars ? normalized : '';
}

function hashTemplate(normalized, mode) {
  const text = String(normalized || '');
  if (!text) return null;
  const family = modeFamily(mode);
  let h = 2166136261 >>> 0;
  const seed = `${family}:${text.length}:`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function templateFingerprint(userText, mode) {
  const family = modeFamily(mode);
  const normalized = normalizeTemplate(userText, mode);
  const hash = hashTemplate(normalized, mode);
  return {
    eligible: hash != null,
    hash,
    normalizedChars: normalized.length,
    modeFamily: family,
  };
}

function touchRegistry(registry, hash) {
  const list = normalizeRegistry(registry);
  const h = Number(hash) >>> 0;
  const idx = list.indexOf(h);
  const repeated = idx >= 0;
  if (idx >= 0) list.splice(idx, 1);
  list.push(h);
  if (list.length > TEMPLATE_REGISTRY_LIMIT) list.splice(0, list.length - TEMPLATE_REGISTRY_LIMIT);
  return { list, repeated };
}

function observe(state, userText, mode) {
  const fp = templateFingerprint(userText, mode);
  state.templateRegistry = normalizeRegistry(state.templateRegistry);
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  if (!fp.eligible) {
    return { ...fp, repeated: false, registrySize: state.templateRegistry.length };
  }
  const touched = touchRegistry(state.templateRegistry, fp.hash);
  state.templateRegistry = touched.list;
  return { ...fp, repeated: touched.repeated, registrySize: state.templateRegistry.length };
}

function needsBootstrap(state) {
  return Math.max(0, Number(state?.templateRecurrenceVersion || 0)) < TEMPLATE_RECURRENCE_VERSION;
}

function classifyHistoricalMode(runtime, input) {
  const text = String(input || '');
  const hasContinue = /\[방송\s*중\]/.test(text);
  const hasEnd = /\[방송\s*종료\]/.test(text);
  const hasStart = /\[방송\s*시작\]/.test(text);
  const hasCommunity = text.includes(COMMUNITY_MARKER);
  let mode;

  if (runtime.broadcastLocked) {
    mode = hasContinue ? 'B_CONTINUE' : (hasEnd ? 'B_END' : 'B_CONTINUE');
  } else if (hasStart && hasEnd) {
    mode = 'B_END';
  } else if (hasStart) {
    mode = 'B_START';
  } else if (hasCommunity) {
    mode = 'C';
  } else {
    mode = 'A';
  }

  if (mode === 'B_START') runtime.broadcastLocked = true;
  else if (mode === 'B_END') runtime.broadcastLocked = false;
  return mode;
}

function bootstrapState(state, messages, stopExclusive, getText) {
  const rows = Array.isArray(messages) ? messages : [];
  const stop = Number.isInteger(Number(stopExclusive))
    ? Math.max(0, Math.min(Number(stopExclusive), rows.length))
    : rows.length;

  // v1 hashes were C-only and unsalted. Rebuild from history once so the registry becomes
  // mode-family scoped and cannot cross-contaminate A/B/C.
  let registry = Number(state?.templateRecurrenceVersion || 0) >= TEMPLATE_RECURRENCE_VERSION
    ? normalizeRegistry(state.templateRegistry)
    : [];
  const runtime = { broadcastLocked: false };
  let visited = 0;
  let userMessages = 0;
  let eligibleTemplates = 0;
  let repeatedTemplates = 0;
  let normalizedChars = 0;
  const modeInputs = { A: 0, B: 0, C: 0 };
  const modeEligible = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < stop; i++) {
    visited += 1;
    const row = rows[i] || {};
    if (row.role !== 'user') continue;
    userMessages += 1;
    const text = typeof getText === 'function'
      ? getText(row)
      : String(row.data ?? row.content ?? row.text ?? '');
    const mode = classifyHistoricalMode(runtime, text);
    const family = modeFamily(mode);
    modeInputs[family] += 1;
    const fp = templateFingerprint(text, mode);
    normalizedChars += fp.normalizedChars || 0;
    if (!fp.eligible) continue;
    eligibleTemplates += 1;
    modeEligible[family] += 1;
    const touched = touchRegistry(registry, fp.hash);
    registry = touched.list;
    if (touched.repeated) repeatedTemplates += 1;
  }

  state.templateRegistry = registry;
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  const stats = {
    version: TEMPLATE_RECURRENCE_VERSION,
    scannedThroughExclusive: stop,
    visited,
    userMessages,
    eligibleTemplates,
    repeatedTemplates,
    registrySize: registry.length,
    normalizedChars,
    modeInputs,
    modeEligible,
  };
  return { state, stats };
}

module.exports = {
  TEMPLATE_RECURRENCE_VERSION,
  TEMPLATE_REGISTRY_LIMIT,
  modeFamily,
  normalizeRegistry,
  normalizeTemplate,
  templateFingerprint,
  observe,
  needsBootstrap,
  bootstrapState,
};
});

SimCore.define("lineage", function (require, module, exports) {
const LINEAGE_VERSION = 1;
const COMMUNITY_MARKER = '[커뮤니티]';
const RECENT_SOURCE_LIMIT = 4;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  if (m === 'C') return 'C';
  return 'A';
}

function normalizeRecent(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const mode = row?.mode === 'B' ? 'B' : 'A';
    const index = intIndex(row?.index);
    if (index < 0) continue;
    if (out.length && out[out.length - 1].mode === mode && out[out.length - 1].index === index) continue;
    out.push({ mode, index });
  }
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function normalizeLineage(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const rootMode = ['A', 'B', 'INLINE_C'].includes(x.rootMode) ? x.rootMode : null;
  const rootIndex = intIndex(x.rootIndex);
  const parentMode = ['A', 'B', 'C'].includes(x.parentMode) ? x.parentMode : null;
  const parentIndex = intIndex(x.parentIndex);
  const lastRequestMode = ['A', 'B', 'C'].includes(x.lastRequestMode) ? x.lastRequestMode : null;
  const lastRequestIndex = intIndex(x.lastRequestIndex);
  return {
    version: LINEAGE_VERSION,
    rootMode: rootMode && rootIndex >= 0 ? rootMode : null,
    rootIndex: rootMode && rootIndex >= 0 ? rootIndex : -1,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth: Math.max(0, Math.round(Number(x.depth) || 0)),
    inlineSource: !!x.inlineSource,
    sourceKind: ['ROOT', 'CHAIN', 'INLINE', 'UNSEEDED'].includes(x.sourceKind) ? x.sourceKind : 'UNSEEDED',
    lastRequestMode: lastRequestMode && lastRequestIndex >= 0 ? lastRequestMode : null,
    lastRequestIndex: lastRequestMode && lastRequestIndex >= 0 ? lastRequestIndex : -1,
    transitionFrom: ['A', 'B', 'C'].includes(x.transitionFrom) ? x.transitionFrom : null,
    recentSources: normalizeRecent(x.recentSources),
  };
}

function inlineSourceInfo(userText) {
  const text = String(userText || '');
  const marker = text.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return { active: false, prefixChars: 0 };
  const prefix = text.slice(0, marker)
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, '')
    .trim();
  const compact = prefix.replace(/\s+/g, '');
  return { active: compact.length >= 8, prefixChars: prefix.length };
}

function pushRecent(list, mode, index) {
  const out = normalizeRecent(list);
  const row = { mode, index };
  if (!out.length || out[out.length - 1].mode !== mode || out[out.length - 1].index !== index) out.push(row);
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function observe(state, userText, mode, sendIndex) {
  const prev = normalizeLineage(state?.requestLineage);
  const family = modeFamily(mode);
  const index = intIndex(sendIndex);
  const next = { ...prev, transitionFrom: prev.lastRequestMode };
  const inline = family === 'C' ? inlineSourceInfo(userText) : { active: false, prefixChars: 0 };

  if (family === 'A') {
    next.rootMode = 'A';
    next.rootIndex = index;
    next.parentMode = 'A';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = pushRecent(prev.recentSources, 'A', index);
  } else if (family === 'B') {
    const sameEpisode = String(mode || '') !== 'B_START' && prev.rootMode === 'B' && prev.rootIndex >= 0;
    next.rootMode = sameEpisode ? prev.rootMode : 'B';
    next.rootIndex = sameEpisode ? prev.rootIndex : index;
    next.parentMode = 'B';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = sameEpisode ? prev.recentSources : pushRecent(prev.recentSources, 'B', index);
  } else if (inline.active) {
    next.rootMode = 'INLINE_C';
    next.rootIndex = index;
    next.parentMode = 'C';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = true;
    next.sourceKind = 'INLINE';
  } else {
    next.parentMode = prev.lastRequestMode;
    next.parentIndex = prev.lastRequestIndex;
    next.depth = prev.lastRequestMode === 'C' ? prev.depth + 1 : 1;
    next.inlineSource = false;
    next.sourceKind = prev.rootMode && prev.rootIndex >= 0 ? 'CHAIN' : 'UNSEEDED';
  }

  next.lastRequestMode = family;
  next.lastRequestIndex = index;
  next.version = LINEAGE_VERSION;
  state.requestLineageVersion = LINEAGE_VERSION;
  state.requestLineage = normalizeLineage(next);
  return {
    ...state.requestLineage,
    currentMode: family,
    inlinePrefixChars: inline.prefixChars || 0,
  };
}

module.exports = {
  LINEAGE_VERSION,
  RECENT_SOURCE_LIMIT,
  modeFamily,
  normalizeLineage,
  inlineSourceInfo,
  observe,
};
});

SimCore.define("handoff", function (require, module, exports) {
const COMMUNITY_SOURCE_HANDOFF_VERSION = 2;
const HANDOFF_REGISTRY_LIMIT = 128;
const COMMUNITY_MARKER = '[커뮤니티]';
const SHORT_REQUEST_MIN_CHARS = 4;
const SHORT_REQUEST_MAX_CHARS = 31;
const SHORT_REQUEST_SCAN_CHARS = 512;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function sourceFamily(rootMode) {
  const m = String(rootMode || '');
  if (m === 'INLINE_C' || m === 'C') return 'C';
  if (m === 'B') return 'B';
  if (m === 'A') return 'A';
  return null;
}

function parentFamily(parentMode) {
  const m = String(parentMode || '');
  if (/^B_/.test(m) || m === 'B') return 'B';
  if (m === 'C') return 'C';
  if (m === 'A') return 'A';
  return null;
}

function normalizedDepth(v, fallback = -1) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const hash = Number(row?.hash);
    const rootMode = sourceFamily(row?.rootMode);
    const rootIndex = intIndex(row?.rootIndex);
    if (!Number.isFinite(hash) || !rootMode || rootIndex < 0) continue;
    const h = hash >>> 0;
    const parentMode = parentFamily(row?.parentMode);
    const parentIndex = intIndex(row?.parentIndex);
    const depth = normalizedDepth(row?.depth, -1);
    const prior = out.findIndex((x) => x.hash === h);
    if (prior >= 0) out.splice(prior, 1);
    out.push({
      hash: h,
      rootMode,
      rootIndex,
      parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
      parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
      depth,
    });
  }
  return out.slice(-HANDOFF_REGISTRY_LIMIT);
}

function normalizeShortRequest(userText, mode) {
  if (String(mode || '') !== 'C') return '';
  const raw = String(userText || '');
  const marker = raw.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return '';
  let source = raw.slice(marker + COMMUNITY_MARKER.length, marker + COMMUNITY_MARKER.length + SHORT_REQUEST_SCAN_CHARS);
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }
  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/^[\s:：\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.length >= SHORT_REQUEST_MIN_CHARS && normalized.length <= SHORT_REQUEST_MAX_CHARS
    ? normalized
    : '';
}

function hashRequest(normalized) {
  const text = String(normalized || '');
  if (!text) return null;
  let h = 2166136261 >>> 0;
  const seed = `C-short:${text.length}:`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function observe(state, userText, mode, requestLineage, templateRecurrence) {
  state.communitySourceRegistry = normalizeRegistry(state.communitySourceRegistry);
  state.communitySourceHandoffVersion = COMMUNITY_SOURCE_HANDOFF_VERSION;
  const normalized = normalizeShortRequest(userText, mode);
  const rootMode = sourceFamily(requestLineage?.rootMode);
  const rootIndex = intIndex(requestLineage?.rootIndex);
  const parentMode = parentFamily(requestLineage?.parentMode);
  const parentIndex = intIndex(requestLineage?.parentIndex);
  const depth = normalizedDepth(requestLineage?.depth, 0);
  const base = {
    eligible: false,
    seen: false,
    newSource: false,
    parentComparable: false,
    parentShift: false,
    hash: null,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: null,
    priorRootIndex: -1,
    priorParentMode: null,
    priorParentIndex: -1,
    priorDepth: -1,
    registrySize: state.communitySourceRegistry.length,
    reason: 'ineligible',
  };

  if (String(mode || '') !== 'C') return { ...base, reason: 'not-community' };
  if (templateRecurrence?.eligible) return { ...base, reason: 'template-recurrence-owned' };
  if (!normalized) return { ...base, reason: 'not-short-request' };
  if (!rootMode || rootIndex < 0 || requestLineage?.sourceKind === 'UNSEEDED') {
    return { ...base, reason: 'unseeded-source' };
  }

  const hash = hashRequest(normalized);
  const registry = state.communitySourceRegistry;
  const idx = registry.findIndex((x) => x.hash === hash);
  const prior = idx >= 0 ? registry[idx] : null;
  const seen = !!prior;
  const newSource = !!prior && (prior.rootMode !== rootMode || prior.rootIndex !== rootIndex);
  const sameRoot = !!prior && !newSource;
  const priorParentMode = parentFamily(prior?.parentMode);
  const priorParentIndex = intIndex(prior?.parentIndex);
  const priorDepth = normalizedDepth(prior?.depth, -1);
  const parentComparable = !!(
    sameRoot
    && priorParentMode && priorParentIndex >= 0 && priorDepth >= 0
    && parentMode && parentIndex >= 0
  );
  const parentShift = !!(
    parentComparable
    && (priorParentMode !== parentMode || priorParentIndex !== parentIndex || priorDepth !== depth)
  );

  if (idx >= 0) registry.splice(idx, 1);
  registry.push({
    hash,
    rootMode,
    rootIndex,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth,
  });
  if (registry.length > HANDOFF_REGISTRY_LIMIT) registry.splice(0, registry.length - HANDOFF_REGISTRY_LIMIT);
  state.communitySourceRegistry = registry;

  return {
    eligible: true,
    seen,
    newSource,
    parentComparable,
    parentShift,
    hash,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: prior?.rootMode || null,
    priorRootIndex: prior ? intIndex(prior.rootIndex) : -1,
    priorParentMode,
    priorParentIndex,
    priorDepth,
    registrySize: registry.length,
    reason: newSource
      ? 'same-short-request-new-source'
      : (parentShift
        ? 'same-root-new-parent'
        : (seen
          ? (parentComparable ? 'same-source-same-parent' : 'same-root-parent-baseline')
          : 'first')),
  };
}

module.exports = {
  COMMUNITY_SOURCE_HANDOFF_VERSION,
  HANDOFF_REGISTRY_LIMIT,
  sourceFamily,
  parentFamily,
  normalizeRegistry,
  normalizeShortRequest,
  hashRequest,
  observe,
};
});

SimCore.define("evidence", function (require, module, exports) {
const ROOT_FENCE_OPEN = '<CURRENT_ROOT_EVIDENCE>';
const ROOT_FENCE_CLOSE = '</CURRENT_ROOT_EVIDENCE>';
const FENCE_OPEN = '<CURRENT_SOURCE_EVIDENCE>';
const FENCE_CLOSE = '</CURRENT_SOURCE_EVIDENCE>';
const MAX_SOURCE_NORM_DELTA = 64;
const MAX_SOURCE_NORM_DELTA_RATIO = 0.02;

function assistantRole(m) {
  return m?.role === 'char' || m?.role === 'assistant';
}

function textOf(m, getText) {
  if (!m) return '';
  if (typeof getText === 'function') return String(getText(m) || '');
  const v = m.content ?? m.data ?? m.text ?? '';
  return typeof v === 'string' ? v : String(v || '');
}

function normalize(text) {
  return String(text || '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
}

function sourceAssistantIndex(chatMessages, rootIndex, sendIndex) {
  const rows = Array.isArray(chatMessages) ? chatMessages : [];
  const start = Number.isInteger(Number(rootIndex)) ? Number(rootIndex) + 1 : 0;
  const stopRaw = Number.isInteger(Number(sendIndex)) ? Number(sendIndex) : rows.length;
  const stop = Math.min(Math.max(start, stopRaw), rows.length);
  for (let i = start; i < stop; i++) if (assistantRole(rows[i])) return i;
  return -1;
}

function pick(rows, predicate, stage) {
  let count = 0;
  let picked = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!predicate(rows[i])) continue;
    count += 1;
    if (!picked) picked = { ...rows[i], requestIndex: i };
    if (count >= 2) break;
  }
  return {
    stage: count === 0 ? 'ABSENT' : (count === 1 ? stage : 'AMBIGUOUS'),
    count,
    requestIndex: picked?.requestIndex ?? -1,
    role: picked?.role || null,
    requestChars: picked?.text?.length || 0,
    requestNormChars: picked?.norm?.length || 0,
    requestNorm: picked?.norm || '',
  };
}

function anchorChunks(target) {
  const text = String(target || '');
  if (text.length < 48) return [];
  const size = Math.min(64, Math.max(24, Math.floor(text.length / 8)));
  const middleStart = Math.max(0, Math.floor((text.length - size) / 2));
  return [
    { key: 'S', text: text.slice(0, size) },
    { key: 'M', text: text.slice(middleStart, middleStart + size) },
    { key: 'E', text: text.slice(Math.max(0, text.length - size)) },
  ].filter((x, i, a) => x.text && a.findIndex((y) => y.text === x.text) === i);
}

function boundary(targetNorm, requestNorm) {
  const anchors = anchorChunks(targetNorm);
  const found = [];
  for (const anchor of anchors) {
    const pos = requestNorm.indexOf(anchor.text);
    if (pos >= 0) found.push({ key: anchor.key, pos, len: anchor.text.length });
  }
  found.sort((a, b) => a.pos - b.pos);
  const first = found[0] || null;
  const last = found[found.length - 1] || null;
  return {
    anchorMask: found.map((x) => x.key).join('') || 'NONE',
    anchorCount: found.length,
    leadingGap: first ? first.pos : -1,
    trailingGap: last ? Math.max(0, requestNorm.length - (last.pos + last.len)) : -1,
  };
}

function targetShape(requestMessages, targetText, getText) {
  const target = String(targetText || '');
  const targetNorm = normalize(target);
  if (!target || !targetNorm) {
    return { stage: 'ABSENT', count: 0, requestIndex: -1, role: null, requestChars: 0, requestNormChars: 0, targetNormChars: targetNorm.length, anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
  }
  const rows = (Array.isArray(requestMessages) ? requestMessages : []).map((m) => {
    const text = textOf(m, getText);
    return { role: m?.role || null, text, norm: normalize(text) };
  });
  let r = pick(rows, (x) => x.text === target, 'EXACT');
  if (!r.count) r = pick(rows, (x) => x.norm === targetNorm, 'NORMALIZED');
  if (!r.count && targetNorm.length >= 24) r = pick(rows, (x) => x.norm.length >= targetNorm.length && x.norm.includes(targetNorm), 'EMBEDDED');
  if (!r.count) {
    const anchors = anchorChunks(targetNorm);
    if (anchors.length >= 2) {
      const required = Math.min(2, anchors.length);
      r = pick(rows, (x) => anchors.reduce((n, a) => n + (x.norm.includes(a.text) ? 1 : 0), 0) >= required, 'TRANSFORMED');
    }
  }
  const b = r.requestIndex >= 0 ? boundary(targetNorm, r.requestNorm) : { anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
  return {
    stage: r.stage,
    count: r.count,
    requestIndex: r.requestIndex,
    role: r.role,
    requestChars: r.requestChars,
    requestNormChars: r.requestNormChars,
    targetNormChars: targetNorm.length,
    ...b,
  };
}

function combinedStatus(rootShape, assistantShape) {
  const stages = [rootShape?.stage || 'ABSENT', assistantShape?.stage || 'ABSENT'];
  if (stages.includes('AMBIGUOUS')) return 'AMBIGUOUS';
  if (stages.includes('ABSENT')) return 'ABSENT';
  const rank = { EXACT: 0, NORMALIZED: 1, EMBEDDED: 2, TRANSFORMED: 3 };
  return stages.sort((a, b) => (rank[b] ?? 99) - (rank[a] ?? 99))[0] || 'ABSENT';
}

function mappingProbe(requestMessages, chatMessages, pending, sendIndex, getText) {
  const p = pending && typeof pending === 'object' ? pending : null;
  const rootIndex = Number(p?.requestLineageRootIndex);
  const sourceLocked = !!p?.active && String(p?.mode || '') === 'C'
    && Number.isInteger(rootIndex) && rootIndex >= 0
    && String(p?.requestLineageSourceKind || '') !== 'UNSEEDED';
  if (!sourceLocked) return null;
  const chatRows = Array.isArray(chatMessages) ? chatMessages : [];
  const rootUser = chatRows[rootIndex];
  const rootUserText = rootUser?.role === 'user' ? textOf(rootUser, getText) : '';
  const rawAssistantIndex = sourceAssistantIndex(chatRows, rootIndex, sendIndex);
  const sourceAssistant = rawAssistantIndex >= 0 ? chatRows[rawAssistantIndex] : null;
  const sourceAssistantText = sourceAssistant ? textOf(sourceAssistant, getText) : '';
  const rootShape = targetShape(requestMessages, rootUserText, getText);
  const assistantShape = targetShape(requestMessages, sourceAssistantText, getText);
  return {
    status: combinedStatus(rootShape, assistantShape),
    rootUserShape: rootShape.stage,
    rootUserRawIndex: rootIndex,
    rootUserRequestIndex: rootShape.requestIndex,
    rootUserRequestRole: rootShape.role,
    rootUserMatches: rootShape.count,
    rootUserChars: rootUserText.length,
    rootUserRequestChars: rootShape.requestChars,
    rootUserNormChars: rootShape.targetNormChars,
    rootUserRequestNormChars: rootShape.requestNormChars,
    rootUserAnchorMask: rootShape.anchorMask,
    rootUserLeadingGap: rootShape.leadingGap,
    rootUserTrailingGap: rootShape.trailingGap,
    sourceAssistantShape: assistantShape.stage,
    sourceAssistantRawIndex: rawAssistantIndex,
    sourceAssistantRequestIndex: assistantShape.requestIndex,
    sourceAssistantRequestRole: assistantShape.role,
    sourceAssistantMatches: assistantShape.count,
    sourceAssistantChars: sourceAssistantText.length,
    sourceAssistantRequestChars: assistantShape.requestChars,
    sourceAssistantNormChars: assistantShape.targetNormChars,
    sourceAssistantRequestNormChars: assistantShape.requestNormChars,
    sourceAssistantAnchorMask: assistantShape.anchorMask,
    sourceAssistantLeadingGap: assistantShape.leadingGap,
    sourceAssistantTrailingGap: assistantShape.trailingGap,
    requestMessages: Array.isArray(requestMessages) ? requestMessages.length : 0,
  };
}

function smallDelta(shape, absoluteCap = MAX_SOURCE_NORM_DELTA) {
  const target = Math.max(0, Number(shape?.targetNormChars || 0));
  const request = Math.max(0, Number(shape?.requestNormChars || 0));
  const delta = Math.abs(request - target);
  const ratioCap = Math.max(12, Math.ceil(target * MAX_SOURCE_NORM_DELTA_RATIO));
  return { delta, safe: delta <= Math.min(absoluteCap, ratioCap) };
}

function rootBoundarySafe(shape) {
  if (!shape || shape.count !== 1 || shape.requestIndex < 0 || shape.role !== 'user') return false;
  if (!['EXACT', 'NORMALIZED'].includes(shape.stage)) return false;
  if (shape.targetNormChars >= 48 && (shape.anchorMask !== 'SME' || shape.leadingGap !== 0 || shape.trailingGap !== 0)) return false;
  return smallDelta(shape, 16).safe;
}

function sourceBoundarySafe(shape) {
  if (!shape || shape.count !== 1 || shape.requestIndex < 0 || shape.role !== 'assistant') return false;
  if (!['EXACT', 'NORMALIZED', 'TRANSFORMED'].includes(shape.stage)) return false;
  if (shape.targetNormChars < 48 || shape.anchorMask !== 'SME' || shape.leadingGap !== 0 || shape.trailingGap !== 0) return false;
  return smallDelta(shape).safe;
}

function stringSlot(message) {
  if (!message || typeof message !== 'object') return null;
  for (const key of ['content', 'data', 'text']) if (typeof message[key] === 'string') return key;
  return null;
}

function fenceProbe(status, reason, shape, normDelta) {
  return {
    status,
    reason,
    requestIndex: Number(shape?.requestIndex ?? -1),
    role: shape?.role || null,
    shape: shape?.stage || null,
    normDelta: normDelta == null ? null : Number(normDelta),
  };
}

function applyWholeMessageFence(rows, shape, openTag, closeTag, normDelta) {
  const message = rows[shape.requestIndex];
  const slot = stringSlot(message);
  if (!slot) return fenceProbe('SKIPPED', 'non-string-slot', shape, normDelta);
  const current = message[slot];
  if (current.includes(openTag) || current.includes(closeTag)) return fenceProbe('SKIPPED', 'already-fenced', shape, normDelta);
  rows[shape.requestIndex] = { ...message, [slot]: `${openTag}\n${current}\n${closeTag}` };
  return fenceProbe('APPLIED', 'safe-whole-message', shape, normDelta);
}

function inspectAndFence(requestMessages, chatMessages, pending, sendIndex, getText) {
  const mapping = mappingProbe(requestMessages, chatMessages, pending, sendIndex, getText);
  if (!mapping) {
    const none = fenceProbe('INELIGIBLE', 'source-lock-off', null, null);
    return { mapping: null, mode: 'INELIGIBLE', rootFence: none, sourceFence: none, fence: none };
  }
  const rootShape = {
    stage: mapping.rootUserShape, count: mapping.rootUserMatches, requestIndex: mapping.rootUserRequestIndex,
    role: mapping.rootUserRequestRole, targetNormChars: mapping.rootUserNormChars, requestNormChars: mapping.rootUserRequestNormChars,
    anchorMask: mapping.rootUserAnchorMask, leadingGap: mapping.rootUserLeadingGap, trailingGap: mapping.rootUserTrailingGap,
  };
  const sourceShape = {
    stage: mapping.sourceAssistantShape, count: mapping.sourceAssistantMatches, requestIndex: mapping.sourceAssistantRequestIndex,
    role: mapping.sourceAssistantRequestRole, targetNormChars: mapping.sourceAssistantNormChars, requestNormChars: mapping.sourceAssistantRequestNormChars,
    anchorMask: mapping.sourceAssistantAnchorMask, leadingGap: mapping.sourceAssistantLeadingGap, trailingGap: mapping.sourceAssistantTrailingGap,
  };
  const rootDelta = smallDelta(rootShape, 16).delta;
  const sourceDelta = smallDelta(sourceShape).delta;
  const rows = Array.isArray(requestMessages) ? requestMessages : [];

  if (!rootBoundarySafe(rootShape)) {
    const rootFence = fenceProbe('SKIPPED', 'unsafe-root-boundary', rootShape, rootDelta);
    const sourceFence = fenceProbe('SKIPPED', 'root-boundary-required', sourceShape, sourceDelta);
    return { mapping, mode: 'UNFENCED', rootFence, sourceFence, fence: rootFence };
  }

  const rootFence = applyWholeMessageFence(rows, rootShape, ROOT_FENCE_OPEN, ROOT_FENCE_CLOSE, rootDelta);
  if (rootFence.status !== 'APPLIED') {
    const sourceFence = fenceProbe('SKIPPED', 'root-fence-required', sourceShape, sourceDelta);
    return { mapping, mode: 'UNFENCED', rootFence, sourceFence, fence: rootFence };
  }

  if (!sourceBoundarySafe(sourceShape)) {
    const sourceFence = fenceProbe('SKIPPED', 'unsafe-source-boundary', sourceShape, sourceDelta);
    return { mapping, mode: 'ROOT_ONLY', rootFence, sourceFence, fence: rootFence };
  }

  const sourceFence = applyWholeMessageFence(rows, sourceShape, FENCE_OPEN, FENCE_CLOSE, sourceDelta);
  const mode = sourceFence.status === 'APPLIED' ? 'DUAL' : 'ROOT_ONLY';
  return { mapping, mode, rootFence, sourceFence, fence: sourceFence.status === 'APPLIED' ? sourceFence : rootFence };
}

module.exports = {
  ROOT_FENCE_OPEN, ROOT_FENCE_CLOSE, FENCE_OPEN, FENCE_CLOSE,
  normalize, mappingProbe, inspectAndFence,
};
});

SimCore.define("kernel", function (require, module, exports) {
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');

const STATE_VERSION = 5;
const CORE_STATE_VERSION = 10;
const HANDSHAKE_RE = /<SIMCORE_CORE_SWITCH>\s*1\s*<\/SIMCORE_CORE_SWITCH>/i;
const CONTROL_TAG_RE = /\[방송\s*(?:시작|중|종료)\]/g;
const KNOWLEDGE_RE = /<Knowledge>[\s\S]*?<\/Knowledge>/gi;

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function fingerprintText(content) {
  const text = String(content || '')
    .replace(/⟦simcore:\d+⟧/g, '')
    .replace(/\r\n/g, '\n')
    .trimEnd();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${text.length}:${(h >>> 0).toString(16)}`;
}

function initialState() {
  return {
    stateVersion: STATE_VERSION,
    coreStateVersion: CORE_STATE_VERSION,
    historyBootstrapped: false,
    historyBootstrappedAt: -1,
    historyBootstrapStats: null,
    templateRecurrenceVersion: 0,
    templateRegistry: [],
    requestLineageVersion: 1,
    requestLineage: lineage.normalizeLineage(null),
    communitySourceHandoffVersion: 2,
    communitySourceRegistry: [],
    broadcastLocked: false,
    broadcastAirtime: null,
    broadcastAirtimeStart: null,
    episodeNo: 0,
    community: { activationCount: 0, platformMax: {}, lastNormalization: [], classifierVersion: 2 },
    worldYear: null,
    koreanAgeOffset: 0,
    narrativeTimestamp: null,
    narrativeClockVersion: 2,
    clockRepairVersion: 0,
    lastMode: 'A',
    pending: null,
  };
}

function reconcileState(raw) {
  const source = raw && typeof raw === 'object' ? raw : initialState();
  const s = source;
  const legacyYear = s.worldYear ?? s.narrativeYear;
  const hadTemplateRecurrenceVersion = Object.prototype.hasOwnProperty.call(s, 'templateRecurrenceVersion');

  s.stateVersion = STATE_VERSION;
  s.coreStateVersion = CORE_STATE_VERSION;
  s.historyBootstrapped = !!s.historyBootstrapped;
  s.historyBootstrappedAt = Number.isInteger(Number(s.historyBootstrappedAt)) ? Number(s.historyBootstrappedAt) : -1;
  s.historyBootstrapStats = s.historyBootstrapStats && typeof s.historyBootstrapStats === 'object' ? s.historyBootstrapStats : null;
  s.templateRecurrenceVersion = hadTemplateRecurrenceVersion ? Math.max(0, Math.round(Number(s.templateRecurrenceVersion) || 0)) : 0;
  s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);
  s.requestLineageVersion = Math.max(1, Math.round(Number(s.requestLineageVersion) || 0));
  s.requestLineage = lineage.normalizeLineage(s.requestLineage);
  s.communitySourceHandoffVersion = Math.max(0, Math.round(Number(s.communitySourceHandoffVersion) || 0));
  s.communitySourceRegistry = handoff.normalizeRegistry(s.communitySourceRegistry);
  s.broadcastLocked = !!s.broadcastLocked;
  s.broadcastAirtime = typeof s.broadcastAirtime === 'string' && s.broadcastAirtime.trim() ? s.broadcastAirtime.trim() : null;
  s.broadcastAirtimeStart = typeof s.broadcastAirtimeStart === 'string' && s.broadcastAirtimeStart.trim() ? s.broadcastAirtimeStart.trim() : null;
  s.episodeNo = Math.max(0, Math.round(Number(s.episodeNo) || 0));
  s.community = s.community && typeof s.community === 'object' ? s.community : {};
  s.community.activationCount = Math.max(0, Math.round(Number(s.community.activationCount) || 0));
  s.community.platformMax = normalizePlatformMaxMap(s.community.platformMax);
  s.community.lastNormalization = Array.isArray(s.community.lastNormalization) ? s.community.lastNormalization.slice(-12) : [];
  s.community.classifierVersion = Math.max(0, Math.round(Number(s.community.classifierVersion) || 0));
  // v0.61.4 migration: the cross-platform global reaction floor was a short-lived bug.
  // Reaction authority is platformMax only; remove the stale global field from portable state/mirrors.
  delete s.community.globalReactionMax;
  s.worldYear = legacyYear != null && Number.isFinite(Number(legacyYear)) ? Number(legacyYear) : null;
  s.koreanAgeOffset = Math.max(0, Math.round(Number(s.koreanAgeOffset) || 0));
  s.narrativeTimestamp = typeof s.narrativeTimestamp === 'string' && s.narrativeTimestamp.trim() ? s.narrativeTimestamp.trim() : null;
  s.narrativeClockVersion = Math.max(1, Math.round(Number(s.narrativeClockVersion) || 0));
  s.clockRepairVersion = Math.max(0, Math.round(Number(s.clockRepairVersion) || 0));
  s.lastMode = typeof s.lastMode === 'string' ? s.lastMode : 'A';
  s.pending = s.pending && typeof s.pending === 'object' ? s.pending : null;

  // v0.60 -> v0.61 migration: worldYear replaces narrativeYear as the sole persisted year field.
  delete s.narrativeYear;
  // Older builds carried content memory. Keep mirrors/snapshots tiny.
  delete s.currentEpisodeSegments;
  delete s.lastCompletedEpisode;
  delete s.exposed;
  delete s.community.recent;
  delete s.community.commenters;
  return s;
}

function textOfMessage(m) {
  if (!m) return '';
  const v = m.data ?? m.content ?? m.text ?? '';
  return typeof v === 'string' ? v : String(v || '');
}

function latestUserIndex(chat) {
  const msgs = chat?.message || [];
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i]?.role === 'user') return i;
  return -1;
}

function latestUserText(chat) {
  const i = latestUserIndex(chat);
  return i >= 0 ? textOfMessage(chat.message[i]) : '';
}

// Incremental request-prompt probe. Unlike the old `.map(...).join('\n')` path this never
// materializes a second full copy of a long request. A small overlap preserves matches that
// happen to straddle adjacent message boundaries. Once the authoritative Core_Ruleset block
// closes, later chat history cannot change the handshake/config, so scanning stops early.
function inspectPromptMessages(messages, getText = textOfMessage) {
  const rows = Array.isArray(messages) ? messages : [];
  const config = { protagonist: '', secondaryName: '', secondaryKeyword: '' };
  let active = false;
  let carry = '';
  let scannedMessages = 0;
  let scannedChars = 0;

  const captureConfig = (text) => {
    const value = String(text || '');
    if (!config.secondaryName && /Supporting character/i.test(value)) {
      const m = value.match(/^\s*([^\n|{}][^|\n]*?)\s*\|\s*Supporting character\b/im);
      if (m) config.secondaryName = m[1].trim();
    }
    if (!config.protagonist && /Protagonist/i.test(value)) {
      const m = value.match(/^\s*([^\n|{}][^|\n]*?)\s*\|\s*Protagonist\b/im);
      if (m) config.protagonist = m[1].trim();
    }
    if (!config.secondaryKeyword && /Keyword\s*:/i.test(value)) {
      const m = value.match(/(?:Activation\s+)?Keyword:\s*"([^"\n]*)"/i);
      if (m) config.secondaryKeyword = m[1];
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const raw = getText(rows[i]);
    if (!raw) continue;
    const text = typeof raw === 'string' ? raw : String(raw || '');
    scannedMessages += 1;
    scannedChars += text.length;

    // Test the message in place. Only a tiny head+tail bridge is allocated for the rare case
    // where a token/line was split by the host across two adjacent messages.
    const boundary = carry ? `${carry}\n${text.slice(0, 512)}` : '';
    if (!active) {
      active = HANDSHAKE_RE.test(text) || (!!boundary && HANDSHAKE_RE.test(boundary));
    }
    if (active) {
      captureConfig(text);
      if (boundary) captureConfig(boundary);
      if (/<\/Core_Ruleset>/i.test(text) || (!!boundary && /<\/Core_Ruleset>/i.test(boundary))) break;
    }

    // 512 characters is far larger than every handshake/config token we parse, while staying tiny.
    carry = text.slice(-512);
  }

  return {
    __simcorePromptProbe: true,
    active,
    config,
    stats: { scannedMessages, scannedChars, totalMessages: rows.length },
  };
}
function stripControlTags(content) {
  CONTROL_TAG_RE.lastIndex = 0;
  return String(content || '').replace(CONTROL_TAG_RE, '').replace(/[ \t]+\n/g, '\n');
}

function regexCount(text, re) {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const rx = new RegExp(re.source, flags);
  return (String(text || '').match(rx) || []).length;
}

// Strict scanner: a Knowledge block may not nest and may not cross a new canonical response header.
// This prevents a stray <Knowledge> opener from consuming an entire later duplicated response.
function scanKnowledgeBlocks(content) {
  const text = String(content || '');
  const tokenRe = /<\/?Knowledge>/gi;
  const responseHeaderRe = /^[ \t]*#[ \t]+응답[^\r\n]*$/mi;
  const blocks = [];
  let currentStart = -1;
  let currentInvalid = false;
  let openCount = 0;
  let closeCount = 0;
  let malformed = false;
  let m;
  while ((m = tokenRe.exec(text))) {
    const isClose = /^<\//.test(m[0]);
    if (!isClose) {
      openCount += 1;
      if (currentStart >= 0) {
        currentInvalid = true;
        malformed = true;
      } else {
        currentStart = m.index;
        currentInvalid = false;
      }
      continue;
    }
    closeCount += 1;
    if (currentStart < 0) {
      malformed = true;
      continue;
    }
    const end = tokenRe.lastIndex;
    const raw = text.slice(currentStart, end);
    const inner = raw.replace(/^<Knowledge>/i, '').replace(/<\/Knowledge>$/i, '');
    if (responseHeaderRe.test(inner)) {
      currentInvalid = true;
      malformed = true;
    }
    if (!currentInvalid) blocks.push({ start: currentStart, end, text: raw });
    currentStart = -1;
    currentInvalid = false;
  }
  if (currentStart >= 0) malformed = true;
  if (openCount !== closeCount) malformed = true;
  return { blocks, openCount, closeCount, malformed };
}

module.exports = {
  STATE_VERSION,
  CORE_STATE_VERSION,
  HANDSHAKE_RE,
  CONTROL_TAG_RE,
  KNOWLEDGE_RE,
  clone,
  fingerprintText,
  initialState,
  reconcileState,
  textOfMessage,
  latestUserIndex,
  latestUserText,
  inspectPromptMessages,
  stripControlTags,
  regexCount,
  scanKnowledgeBlocks,
};
});

SimCore.define("time", function (require, module, exports) {
const CLOCK_REPAIR_VERSION = 2;
const NARRATIVE_CLOCK_VERSION = 2;

function explicitWorldYear(userText) {
  const s = String(userText || '');
  const iso = s.match(/(?:⏱️\[)?((?:19|20|21)\d{2})-\d{1,2}-\d{1,2}/);
  if (iso) return Number(iso[1]);
  const ko = s.match(/((?:19|20|21)\d{2})년\s*\d{1,2}월/);
  return ko ? Number(ko[1]) : null;
}

const BROADCAST_TIMESTAMP_RE = /⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\]/i;
const ZERO_HOUR_TIMESTAMP_RE = /(⏱️\[(?:19|20|21)\d{2}-\d{2}-\d{2}\s+\([^)]+\)\s+)00:(\d{2})\s+(AM|PM)\]/gi;
const NARRATIVE_RESPONSE_HEADER_RE = /^[ \t]*#[ \t]+응답[ \t]*$/mi;
const NARRATIVE_TIMESTAMP_LINE_RE = /^[ \t]*(⏱️\[((?:19|20|21)\d{2})-(\d{2})-(\d{2})\s+\(([^)]+)\)\s+(\d{1,2}):(\d{2})\s+(AM|PM)\])[ \t]*$/gmi;
const NARRATIVE_TIMESTAMP_LINE_MARKER_RE = /^[ \t]*⏱️\[[^\r\n]*$/gmi;

function canonicalizeTimestampSyntax(content) {
  const text = String(content || '');
  let count = 0;
  const normalized = text.replace(ZERO_HOUR_TIMESTAMP_RE, (_m, prefix, minute, ampm) => {
    count += 1;
    return `${prefix}12:${minute} ${String(ampm || '').toUpperCase()}]`;
  });
  return { content: normalized, changed: count > 0, count };
}

function parseTimestamp(content) {
  const m = String(content || '').match(BROADCAST_TIMESTAMP_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour12 = Number(m[5]);
  const minute = Number(m[6]);
  const ampm = String(m[7] || '').toUpperCase();
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;
  let hour24 = hour12 % 12;
  if (ampm === 'PM') hour24 += 12;
  const ms = Date.UTC(year, month - 1, day, hour24, minute, 0, 0);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day
      || d.getUTCHours() !== hour24 || d.getUTCMinutes() !== minute) return null;
  return {
    raw: m[0],
    year, month, day, dayLabel: m[4], hour12, minute, ampm,
    minuteKey: Math.floor(ms / 60000),
  };
}

function timestampYear(content) {
  const parsed = parseTimestamp(content);
  return parsed ? parsed.year : null;
}

function compareTimestamps(a, b) {
  const pa = parseTimestamp(a);
  const pb = parseTimestamp(b);
  if (!pa || !pb) return null;
  return pa.minuteKey === pb.minuteKey ? 0 : (pa.minuteKey > pb.minuteKey ? 1 : -1);
}

function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility) {
  const narrativeRaw = typeof narrativeTimestamp === 'string' && narrativeTimestamp.trim() ? narrativeTimestamp.trim() : null;
  const base = eligibility && typeof eligibility === 'object' ? eligibility : { eligible: false, reason: 'not-eligible' };
  if (!base.eligible) {
    return Object.freeze({
      disposition: 'INELIGIBLE',
      source: base.source || 'NONE',
      reason: base.reason || 'not-eligible',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const terminal = parseTimestamp(base.floorTimestamp);
  if (!terminal) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'invalid-b-end-terminal',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const stored = parseTimestamp(base.storedBroadcastAirtime);
  if (!stored) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'missing-or-invalid-stored-b-end-airtime',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }
  if (stored.minuteKey !== terminal.minuteKey) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'terminal-stored-airtime-mismatch',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const narrative = narrativeRaw ? parseTimestamp(narrativeRaw) : null;
  if (!narrative || terminal.minuteKey > narrative.minuteKey) {
    return Object.freeze({
      disposition: 'APPLIED',
      source: base.source || 'B_END_TERMINAL',
      reason: narrative ? 'b-end-terminal-after-narrative' : 'narrative-missing',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrative ? narrative.raw : narrativeRaw,
      effectiveFloor: terminal.raw,
    });
  }

  return Object.freeze({
    disposition: 'ALREADY_SATISFIED',
    source: base.source || 'B_END_TERMINAL',
    reason: terminal.minuteKey === narrative.minuteKey ? 'narrative-equals-terminal' : 'narrative-after-terminal',
    terminalTimestamp: terminal.raw,
    narrativeTimestamp: narrative.raw,
    effectiveFloor: narrative.raw,
  });
}

function elapsedMinutes(start, current) {
  const a = parseTimestamp(start);
  const b = parseTimestamp(current);
  if (!a || !b) return null;
  return b.minuteKey - a.minuteKey;
}

function validDateMs(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || y < 1900 || y > 2199) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return ms;
}

function pad2(value) { return String(Math.max(0, Number(value) || 0)).padStart(2, '0'); }
function dateString(year, month, day) { return `${Number(year)}-${pad2(month)}-${pad2(day)}`; }
function weekdayLabel(year, month, day) {
  const ms = validDateMs(year, month, day);
  return ms == null ? null : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getUTCDay()];
}

function resolveCalendarTransition(userText, previousTimestamp, fallbackYear = null) {
  const head = String(userText || '').trim().slice(0, 420);
  const m = head.match(/^(?:한편\s+)?(?:그리고\s+)?(?:(?:((?:19|20|21)\d{2})년)\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:\([^)]+\)|(?:월|화|수|목|금|토|일)요일))?\s*(?:이|가)?\s*(?:되고|되어|되면서|되었다|됐다)(?:\s|$)/i);
  if (!m) return { eligible: false, reason: 'INELIGIBLE', targetDate: null };

  const explicitYear = m[1] ? Number(m[1]) : null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const previous = parseTimestamp(previousTimestamp);
  const fallback = Number(fallbackYear);
  const anchorYear = explicitYear || previous?.year || (Number.isFinite(fallback) ? fallback : null);
  if (!anchorYear) return { eligible: false, reason: 'UNRESOLVED_YEAR', targetDate: null, month, day };

  let resolvedYear = null;
  if (explicitYear) {
    const candidate = validDateMs(explicitYear, month, day);
    if (candidate == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, year: explicitYear, month, day };
    const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
    if (previousDay != null && candidate < previousDay) {
      return { eligible: false, reason: 'EXPLICIT_BACKWARD', targetDate: null, year: explicitYear, month, day };
    }
    resolvedYear = explicitYear;
  } else {
    const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
    for (let y = anchorYear; y <= anchorYear + 8; y++) {
      const candidate = validDateMs(y, month, day);
      if (candidate == null) continue;
      if (previousDay != null && candidate < previousDay) continue;
      resolvedYear = y;
      break;
    }
    if (resolvedYear == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, month, day };
  }

  const targetDate = dateString(resolvedYear, month, day);
  const rollover = !explicitYear && resolvedYear > anchorYear;
  return {
    eligible: true,
    reason: explicitYear ? 'EXPLICIT_YEAR' : (rollover ? 'YEAR_ROLLOVER' : 'SAME_YEAR'),
    year: resolvedYear,
    month,
    day,
    targetDate,
    weekday: weekdayLabel(resolvedYear, month, day),
    previousDate: previous ? dateString(previous.year, previous.month, previous.day) : null,
    anchorYear,
    yearRollover: rollover,
    singleYearRollover: rollover && resolvedYear === anchorYear + 1,
  };
}

function formatTimestampForDate(parsed, year, month, day) {
  if (!parsed || validDateMs(year, month, day) == null) return null;
  const weekday = weekdayLabel(year, month, day);
  if (!weekday) return null;
  return `⏱️[${dateString(year, month, day)} (${weekday}) ${parsed.hour12}:${pad2(parsed.minute)} ${parsed.ampm}]`;
}

function enforceNarrativeCalendarTarget(content, target) {
  const text = String(content || '');
  if (!target?.eligible || !target?.targetDate) {
    return { content: text, changed: false, reason: 'ineligible', observedTimestamp: null, outputTimestamp: null, dateChanged: false, weekdayChanged: false };
  }
  const parsed = parseTimestamp(text);
  if (!parsed) {
    return { content: text, changed: false, reason: 'missing-or-invalid', observedTimestamp: null, outputTimestamp: null, dateChanged: false, weekdayChanged: false };
  }
  const expected = formatTimestampForDate(parsed, target.year, target.month, target.day);
  if (!expected) {
    return { content: text, changed: false, reason: 'invalid-target', observedTimestamp: parsed.raw, outputTimestamp: parsed.raw, dateChanged: false, weekdayChanged: false };
  }
  const observedDate = dateString(parsed.year, parsed.month, parsed.day);
  const dateChanged = observedDate !== target.targetDate;
  const weekdayChanged = String(parsed.dayLabel || '') !== String(target.weekday || '');
  const changed = expected !== parsed.raw;
  return {
    content: changed ? text.replace(parsed.raw, expected) : text,
    changed,
    reason: changed ? (dateChanged ? 'date-repaired' : 'weekday-repaired') : 'pass',
    observedTimestamp: parsed.raw,
    outputTimestamp: expected,
    dateChanged,
    weekdayChanged,
  };
}

function repairNarrativeYearRolloverSequence(content, target) {
  const text = String(content || '');
  if (!target?.eligible || !target?.singleYearRollover) return { content: text, changed: false, count: 0, reason: 'ineligible' };
  let previous = null;
  let index = 0;
  let count = 0;
  const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
  const repaired = text.replace(lineRe, (whole, raw) => {
    const parsed = parseTimestamp(raw);
    if (!parsed) { index += 1; return whole; }
    let outputRaw = raw;
    let outputParsed = parsed;
    if (index > 0 && previous && parsed.minuteKey < previous.minuteKey && parsed.year === target.year - 1) {
      const candidateRaw = formatTimestampForDate(parsed, target.year, parsed.month, parsed.day);
      const candidate = candidateRaw ? parseTimestamp(candidateRaw) : null;
      if (candidate && candidate.minuteKey >= previous.minuteKey) {
        outputRaw = candidateRaw;
        outputParsed = candidate;
        count += 1;
      }
    }
    previous = outputParsed;
    index += 1;
    return outputRaw === raw ? whole : whole.replace(raw, outputRaw);
  });
  return { content: repaired, changed: count > 0, count, reason: count > 0 ? 'year-rollover-repaired' : 'pass' };
}

function narrativeEnvelopeText(content) {
  const text = String(content || '');
  const header = text.match(NARRATIVE_RESPONSE_HEADER_RE);
  return header && Number.isInteger(header.index) ? text.slice(header.index) : text;
}

function narrativeTimestampSequence(content) {
  const text = narrativeEnvelopeText(content);
  const markers = text.match(new RegExp(NARRATIVE_TIMESTAMP_LINE_MARKER_RE.source, NARRATIVE_TIMESTAMP_LINE_MARKER_RE.flags)) || [];
  const parsed = [];
  const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
  let m;
  while ((m = lineRe.exec(text))) {
    const ts = parseTimestamp(m[1]);
    if (ts) parsed.push(ts);
  }

  if (!parsed.length) {
    const fallback = parseTimestamp(text);
    if (!fallback) {
      return {
        frameTimestamp: null,
        candidate: null,
        sequenceCount: 0,
        sceneCount: 0,
        markerCount: markers.length,
        tailStatus: 'MISSING',
        tailPromoted: false,
      };
    }
    return {
      frameTimestamp: fallback.raw,
      candidate: fallback.raw,
      sequenceCount: 1,
      sceneCount: 0,
      markerCount: markers.length || 1,
      tailStatus: 'FRAME_ONLY_FALLBACK',
      tailPromoted: false,
    };
  }

  const frameTimestamp = parsed[0].raw;
  const sceneCount = Math.max(0, parsed.length - 1);
  if (markers.length !== parsed.length) {
    return {
      frameTimestamp,
      candidate: frameTimestamp,
      sequenceCount: parsed.length,
      sceneCount,
      markerCount: markers.length,
      tailStatus: 'SKIPPED_MALFORMED',
      tailPromoted: false,
    };
  }

  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].minuteKey < parsed[i - 1].minuteKey) {
      return {
        frameTimestamp,
        candidate: frameTimestamp,
        sequenceCount: parsed.length,
        sceneCount,
        markerCount: markers.length,
        tailStatus: 'SKIPPED_NON_MONOTONIC',
        tailPromoted: false,
      };
    }
  }

  const candidate = parsed[parsed.length - 1].raw;
  return {
    frameTimestamp,
    candidate,
    sequenceCount: parsed.length,
    sceneCount,
    markerCount: markers.length,
    tailStatus: sceneCount > 0 ? 'MONOTONIC' : 'FRAME_ONLY',
    tailPromoted: sceneCount > 0 && candidate !== frameTimestamp,
  };
}

function resetBroadcastAirtime(state) {
  state.broadcastAirtime = null;
  state.broadcastAirtimeStart = null;
}

function commitBroadcastAirtime(state, pending, content) {
  if (!/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'not-broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const isEnd = String(pending?.mode || '') === 'B_END';
  const terminal = isEnd ? narrativeTimestampSequence(content) : null;
  const terminalExplicit = !!(terminal
    && terminal.sceneCount > 0
    && terminal.tailStatus === 'MONOTONIC'
    && terminal.candidate);
  const current = terminalExplicit ? terminal.candidate : parsed.raw;
  const previous = pending?.broadcastAirtimePrevious || state.broadcastAirtime || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return {
      changed: false,
      reason: 'backward',
      timestamp: current,
      previous,
      frameTimestamp: parsed.raw,
      sequenceCount: Number(terminal?.sequenceCount || 0),
      sceneCount: Number(terminal?.sceneCount || 0),
      tailStatus: terminal?.tailStatus || 'n/a',
      terminalExplicit,
    };
  }
  const changed = state.broadcastAirtime !== current;
  if (!state.broadcastAirtimeStart || pending?.broadcastAirtimeIsNew) state.broadcastAirtimeStart = current;
  state.broadcastAirtime = current;
  return {
    changed,
    reason: 'committed',
    timestamp: current,
    previous,
    frameTimestamp: parsed.raw,
    sequenceCount: Number(terminal?.sequenceCount || 0),
    sceneCount: Number(terminal?.sceneCount || 0),
    tailStatus: terminal?.tailStatus || (isEnd ? 'FRAME_ONLY' : 'n/a'),
    terminalExplicit,
  };
}

function applyWorldYear(state, year) {
  if (year == null || year === '') return false;
  const y = Number(year);
  if (!Number.isFinite(y)) return false;
  const prev = state.worldYear;
  if (prev == null) {
    state.worldYear = y;
    return true;
  }
  if (y > prev) {
    state.koreanAgeOffset += y - prev;
    state.worldYear = y;
    return true;
  }
  return false;
}

// Phase 1 is intentionally relational, not a full Korean calendar parser.
// Only a clear opening current-time transition activates the forward guard.
function narrativeProgressionHint(userText) {
  const head = String(userText || '').trim().slice(0, 420);
  if (!head) return { active: false, reason: 'none' };
  const lead = '(?:한편\\s+)?(?:그리고\\s+)?';
  const weekday = '(?:월|화|수|목|금|토|일)요일';
  const weekWord = '(?:\\d{1,2}주차|첫째\\s*주|둘째\\s*주|셋째\\s*주|넷째\\s*주|다섯째\\s*주|마지막\\s*주)';
  const calendar = `(?:\\d{4}년\\s*)?\\d{1,2}월(?:\\s*${weekWord})?(?:\\s*${weekday})?`;
  const namedWeek = `(?:(?:그|이번|다음)\\s*주)(?:\\s*${weekday})?`;
  const dayOnly = `(?:${weekday}|오늘|내일|모레|다음\\s*날|이튿날)`;
  const transition = new RegExp(`^${lead}(?:${calendar}|${namedWeek}|${dayOnly})\\s*(?:이|가)?\\s*(?:되고|되어|되면서|되었다|됐다)(?:\\s|$)`, 'i');
  if (transition.test(head)) return { active: true, reason: 'calendar-transition' };

  const relative = new RegExp(`^${lead}(?:(?:며칠|\\d+\\s*(?:일|주|개월|달|년))\\s*(?:뒤|후)|다음\\s*(?:달|주))(?:(?:이|가)?\\s*(?:되고|되어|지나|흘러))?(?:\\s|$)`, 'i');
  if (relative.test(head)) return { active: true, reason: 'relative-forward' };
  return { active: false, reason: 'none' };
}

function enforceNarrativeCurrentTimeFloor(content, previous) {
  const text = String(content || '');
  const parsed = parseTimestamp(text);
  if (!parsed) return { content: text, changed: false, reason: 'missing-or-invalid', observed: null, floor: previous || null };
  if (!previous) return { content: text, changed: false, reason: 'no-floor', observed: parsed.raw, floor: null };
  const cmp = compareTimestamps(parsed.raw, previous);
  if (cmp == null || cmp >= 0) {
    return { content: text, changed: false, reason: cmp === 0 ? 'same' : 'forward', observed: parsed.raw, floor: previous };
  }
  // The first canonical timestamp is current narrative time. Clamp only that token;
  // later embedded/source-event timestamps are intentionally left untouched.
  return {
    content: text.replace(parsed.raw, previous),
    changed: true,
    reason: 'clamped-backward',
    observed: parsed.raw,
    floor: previous,
  };
}

function commitNarrativeTimestamp(state, pending, content) {
  if (/^B_/.test(String(pending?.mode || ''))) {
    return {
      changed: false, reason: 'broadcast', timestamp: null, previous: null,
      frameTimestamp: null, sequenceCount: 0, sceneCount: 0, markerCount: 0,
      tailStatus: 'INELIGIBLE_BROADCAST', tailPromoted: false,
    };
  }
  const sequence = narrativeTimestampSequence(content);
  const current = sequence.candidate || sequence.frameTimestamp || null;
  if (!current) return { changed: false, reason: 'missing-or-invalid', timestamp: null, previous: null, ...sequence };
  const previous = pending?.narrativeTimestampPrevious || state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous, ...sequence };
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return { changed, reason: 'committed', timestamp: current, previous, ...sequence };
}

function syncNarrativeTimestamp(state, content, mode) {
  if (/^B_/.test(String(mode || ''))) return false;
  const sequence = narrativeTimestampSequence(content);
  const current = sequence.candidate || sequence.frameTimestamp || null;
  if (!current) return false;
  const previous = state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return false;
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return changed;
}

module.exports = {
  CLOCK_REPAIR_VERSION,
  NARRATIVE_CLOCK_VERSION,
  BROADCAST_TIMESTAMP_RE,
  ZERO_HOUR_TIMESTAMP_RE,
  canonicalizeTimestampSyntax,
  explicitWorldYear,
  parseTimestamp,
  timestampYear,
  compareTimestamps,
  resolvePostBEndCurrentTimeFloor,
  elapsedMinutes,
  resolveCalendarTransition,
  enforceNarrativeCalendarTarget,
  repairNarrativeYearRolloverSequence,
  narrativeTimestampSequence,
  resetBroadcastAirtime,
  commitBroadcastAirtime,
  narrativeProgressionHint,
  enforceNarrativeCurrentTimeFloor,
  commitNarrativeTimestamp,
  syncNarrativeTimestamp,
  applyWorldYear,
};
});

SimCore.define("lifecycle", function (require, module, exports) {
const kernel = require('./kernel');
const time = require('./time');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');

function classifyMode(state, input) {
  const text = String(input || '');
  const hasContinue = /\[방송\s*중\]/.test(text);
  const hasEnd = /\[방송\s*종료\]/.test(text);
  const hasStart = /\[방송\s*시작\]/.test(text);
  const hasCommunity = text.includes('[커뮤니티]');
  const wasLocked = !!state.broadcastLocked;
  let mode;

  if (state.broadcastLocked) {
    mode = hasContinue ? 'B_CONTINUE' : (hasEnd ? 'B_END' : 'B_CONTINUE');
  } else if (hasStart && hasEnd) {
    mode = 'B_END';
    state.broadcastLocked = true;
    state.episodeNo += 1;
  } else if (hasStart) {
    mode = 'B_START';
    state.broadcastLocked = true;
    state.episodeNo += 1;
  } else if (hasCommunity) {
    mode = 'C';
  } else {
    mode = 'A';
  }
  return { mode, wasLocked, hasContinue, hasEnd, hasStart, hasCommunity };
}

const SUMMARY_SCOPE_NONE = 'NONE';
const SUMMARY_SCOPE_ANNUAL_ONLY = 'ANNUAL_ONLY';
const SUMMARY_SCOPE_CUMULATIVE_YOY = 'CUMULATIVE_YOY';

function summaryYearMentions(input) {
  const years = [];
  const seen = new Set();
  const re = /(?:19|20|21)\d{2}/g;
  let m;
  while ((m = re.exec(String(input || '')))) {
    const year = Number(m[0]);
    if (!seen.has(year)) {
      seen.add(year);
      years.push(year);
    }
  }
  return years;
}

function summaryHasExplicitFullYearWindow(input, targetYear) {
  const text = String(input || '');
  const year = Number(targetYear);
  if (!Number.isInteger(year)) return false;
  const y = String(year);
  const dotted = new RegExp(`${y}\\s*\\.\\s*0?1\\s*\\.\\s*0?1\\s*\\.\\s*(?:~|〜|～|부터)\\s*12\\s*\\.\\s*31\\s*\\.?`);
  const korean = new RegExp(`${y}\\s*년\\s*0?1\\s*월\\s*0?1\\s*일\\s*(?:~|〜|～|부터)\\s*(?:${y}\\s*년\\s*)?12\\s*월\\s*31\\s*일`);
  return dotted.test(text) || korean.test(text);
}

function classifySummaryScope(input, mode = 'A') {
  const none = Object.freeze({
    scope: SUMMARY_SCOPE_NONE,
    targetYear: null,
    comparisonYear: null,
    authority: 'NONE',
    reason: 'INELIGIBLE',
  });
  if (String(mode || '') !== 'C') return none;

  const text = String(input || '');
  const years = summaryYearMentions(text);
  if (!years.length) return none;

  const targetYear = Math.max(...years);
  const comparisonYear = targetYear - 1;
  const hasPreviousYear = years.includes(comparisonYear);
  const explicitYoySignal = /(?:전년|전년도|작년)\s*대비|기준점|기준으로|증가(?:량|율|폭|수)|전년(?:도)?\s*말|비교/.test(text);
  if (hasPreviousYear && explicitYoySignal) {
    return Object.freeze({
      scope: SUMMARY_SCOPE_CUMULATIVE_YOY,
      targetYear,
      comparisonYear,
      authority: 'YEAR_END_BASELINE_COMPARE',
      reason: 'EXPLICIT_PREVIOUS_YEAR_BASELINE',
    });
  }

  const multiYearRange = /(?:19|20|21)\d{2}\s*(?:~|〜|～|–|—|-)\s*(?:19|20|21)\d{2}/.test(text);
  if (multiYearRange) return none;

  const annualSignal = /(?:성과\s*총정리|활동\s*성과|플랫폼별\s*성과|연말\s*결산|연말결산|한\s*해|연간\s*(?:활동|성과|결산)|수상\s*성과|총정리)/.test(text);
  if (!annualSignal) return none;

  return Object.freeze({
    scope: SUMMARY_SCOPE_ANNUAL_ONLY,
    targetYear,
    comparisonYear: null,
    authority: 'TARGET_YEAR',
    reason: summaryHasExplicitFullYearWindow(text, targetYear) ? 'BOUNDED_SINGLE_YEAR' : 'SINGLE_YEAR_SUMMARY',
  });
}

function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage, previousOutputFacts = null, sendIndex = -1) {
  if (String(mode || '') !== 'C') return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'not-c' });
  if (String(previousMode || '') !== 'B_END') return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'not-direct-post-b-end-c' });
  if (state?.broadcastLocked) return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'broadcast-still-locked' });
  const currentSendIndex = Number(sendIndex);
  if (!Number.isInteger(currentSendIndex) || currentSendIndex < 2) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'invalid-current-send-index' });
  }
  const priorFamily = String(requestLineage?.lastRequestMode || '');
  const priorIndex = Number(requestLineage?.lastRequestIndex);
  if (priorFamily !== 'B' || !Number.isInteger(priorIndex) || priorIndex !== currentSendIndex - 2) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'previous-request-not-direct-b' });
  }
  const facts = previousOutputFacts && typeof previousOutputFacts === 'object' ? previousOutputFacts : null;
  if (!facts?.available) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: facts?.reason || 'previous-b-end-output-unavailable' });
  }
  if (Number(facts.outIndex) !== currentSendIndex - 1) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: null, source: 'NONE', reason: 'previous-output-not-direct' });
  }
  if (!facts.closureComplete) {
    return Object.freeze({ eligible: false, floorTimestamp: facts.terminalTimestamp || null, storedBroadcastAirtime: state?.broadcastAirtime || null, source: 'NONE', reason: 'previous-b-end-closure-incomplete' });
  }
  const floorTimestamp = typeof facts.terminalTimestamp === 'string' && facts.terminalTimestamp.trim() ? facts.terminalTimestamp.trim() : null;
  if (!floorTimestamp) {
    return Object.freeze({ eligible: false, floorTimestamp: null, storedBroadcastAirtime: state?.broadcastAirtime || null, source: 'NONE', reason: 'missing-b-end-terminal' });
  }
  const storedBroadcastAirtime = typeof state?.broadcastAirtime === 'string' && state.broadcastAirtime.trim() ? state.broadcastAirtime.trim() : null;
  return Object.freeze({
    eligible: true,
    floorTimestamp,
    storedBroadcastAirtime,
    source: 'B_END_TERMINAL',
    reason: 'eligible-direct-complete-post-b-end-c',
  });
}

function prepareTurn(baseState, userText, promptProbe, sendIndex, previousOutputFacts = null) {
  const state = kernel.reconcileState(kernel.clone(baseState));
  const probe = promptProbe && typeof promptProbe === 'object' && promptProbe.__simcorePromptProbe
    ? promptProbe
    : { active: false, config: {} };
  const active = !!probe.active;
  const config = probe.config || { protagonist: '', secondaryName: '', secondaryKeyword: '' };

  if (!active) {
    state.pending = { active: false, sendIndex };
    return state;
  }

  const input = String(userText || '');
  const c = classifyMode(state, input);
  const summaryScope = classifySummaryScope(input, c.mode);
  const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);
  if (broadcastAirtimeIsNew) time.resetBroadcastAirtime(state);
  const broadcastAirtimePrevious = /^B_/.test(c.mode) ? (state.broadcastAirtime || null) : null;
  const broadcastAirtimeStart = /^B_/.test(c.mode) ? (state.broadcastAirtimeStart || null) : null;
  const secondaryConfigured = !!(config.secondaryName && config.secondaryKeyword);
  const secondaryActive = secondaryConfigured && input.includes(config.secondaryKeyword);
  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);
  const previousMode = state.lastMode || 'A';
  const postBEndClockEligibility = derivePostBEndClockEligibility(
    c.mode,
    previousMode,
    state,
    state.requestLineage,
    previousOutputFacts,
    sendIndex,
  );
  const postBEndClockHandoff = time.resolvePostBEndCurrentTimeFloor(narrativeTimestampPrevious, postBEndClockEligibility);
  const narrativeCurrentTimeFloor = postBEndClockHandoff.effectiveFloor || narrativeTimestampPrevious || null;
  const narrativeCalendarTarget = /^B_/.test(c.mode)
    ? { eligible: false, reason: 'BROADCAST', targetDate: null }
    : time.resolveCalendarTransition(input, narrativeCurrentTimeFloor, state.worldYear);
  const narrativeProgression = /^B_/.test(c.mode)
    ? { active: false, reason: 'broadcast' }
    : (narrativeCalendarTarget.eligible ? { active: true, reason: 'calendar-resolved' } : time.narrativeProgressionHint(input));
  const narrativeClockGuard = !!((narrativeProgression.active || postBEndClockHandoff.disposition === 'APPLIED') && narrativeCurrentTimeFloor);
  const templateRecurrence = recurrence.observe(state, input, c.mode);
  const requestLineage = lineage.observe(state, input, c.mode, sendIndex);
  const communitySourceHandoff = handoff.observe(state, input, c.mode, requestLineage, templateRecurrence);

  // Explicit current-date transitions advance world year before generation without inventing time-of-day.
  time.applyWorldYear(state, narrativeCalendarTarget.eligible ? narrativeCalendarTarget.year : time.explicitWorldYear(input));

  state.lastMode = c.mode;
  state.pending = {
    active: true,
    sendIndex,
    mode: c.mode,
    summaryScope: summaryScope.scope,
    summaryTargetYear: summaryScope.targetYear,
    summaryComparisonYear: summaryScope.comparisonYear,
    summaryAuthority: summaryScope.authority,
    summaryScopeReason: summaryScope.reason,
    userText: input.slice(0, 16000),
    wasLocked: c.wasLocked,
    hasContinue: c.hasContinue,
    hasEnd: c.hasEnd,
    hasStart: c.hasStart,
    broadcastAirtimeIsNew,
    broadcastAirtimePrevious,
    broadcastAirtimeStart,
    secondaryConfigured,
    secondaryActive,
    secondaryName: config.secondaryName,
    secondaryKeyword: config.secondaryKeyword,
    narrativeProgressionActive: !!narrativeProgression.active,
    narrativeProgressionReason: narrativeProgression.reason || 'none',
    narrativeTimestampPrevious,
    narrativeCurrentTimeFloor,
    narrativeClockGuard,
    narrativeCalendarTarget,
    postBEndClockEligible: !!postBEndClockEligibility.eligible,
    postBEndClockDisposition: postBEndClockHandoff.disposition || 'INELIGIBLE',
    postBEndClockFloor: postBEndClockHandoff.terminalTimestamp || postBEndClockEligibility.floorTimestamp || null,
    postBEndClockReason: postBEndClockHandoff.reason || postBEndClockEligibility.reason || 'unknown',
    currentTimeAuthority: postBEndClockHandoff.disposition === 'APPLIED' ? 'POST_B_END_FLOOR' : 'NARRATIVE',
    templateRecurrenceEligible: !!templateRecurrence.eligible,
    templateRecurrenceRepeated: !!templateRecurrence.repeated,
    templateRecurrenceHash: templateRecurrence.hash == null ? null : Number(templateRecurrence.hash),
    templateRecurrenceModeFamily: templateRecurrence.modeFamily || recurrence.modeFamily(c.mode),
    templateRecurrenceChars: Number(templateRecurrence.normalizedChars || 0),
    templateRegistrySize: Number(templateRecurrence.registrySize || 0),
    requestLineageSourceKind: requestLineage.sourceKind || 'UNSEEDED',
    requestLineageRootMode: requestLineage.rootMode || null,
    requestLineageRootIndex: Number(requestLineage.rootIndex ?? -1),
    requestLineageParentMode: requestLineage.parentMode || null,
    requestLineageParentIndex: Number(requestLineage.parentIndex ?? -1),
    requestLineageDepth: Number(requestLineage.depth || 0),
    requestLineageInlineSource: !!requestLineage.inlineSource,
    communitySourceHandoffEligible: !!communitySourceHandoff.eligible,
    communitySourceHandoffSeen: !!communitySourceHandoff.seen,
    communitySourceHandoffNewSource: !!communitySourceHandoff.newSource,
    communitySourceHandoffParentComparable: !!communitySourceHandoff.parentComparable,
    communitySourceHandoffParentShift: !!communitySourceHandoff.parentShift,
    communitySourceHandoffHash: communitySourceHandoff.hash == null ? null : Number(communitySourceHandoff.hash),
    communitySourceHandoffChars: Number(communitySourceHandoff.normalizedChars || 0),
    communitySourceHandoffRootMode: communitySourceHandoff.rootMode || null,
    communitySourceHandoffRootIndex: Number(communitySourceHandoff.rootIndex ?? -1),
    communitySourceHandoffParentMode: communitySourceHandoff.parentMode || null,
    communitySourceHandoffParentIndex: Number(communitySourceHandoff.parentIndex ?? -1),
    communitySourceHandoffDepth: Number(communitySourceHandoff.depth ?? -1),
    communitySourceHandoffPriorRootMode: communitySourceHandoff.priorRootMode || null,
    communitySourceHandoffPriorRootIndex: Number(communitySourceHandoff.priorRootIndex ?? -1),
    communitySourceHandoffPriorParentMode: communitySourceHandoff.priorParentMode || null,
    communitySourceHandoffPriorParentIndex: Number(communitySourceHandoff.priorParentIndex ?? -1),
    communitySourceHandoffPriorDepth: Number(communitySourceHandoff.priorDepth ?? -1),
    communitySourceHandoffRegistrySize: Number(communitySourceHandoff.registrySize || 0),
    communitySourceHandoffReason: communitySourceHandoff.reason || 'ineligible',
  };
  return state;
}

function expectedCommunityBlocks(mode) {
  return mode === 'B_END' ? 2
    : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
}

module.exports = { classifyMode, classifySummaryScope, derivePostBEndClockEligibility, prepareTurn, expectedCommunityBlocks };
});

SimCore.define("reaction", function (require, module, exports) {
const community = require('./community');

const REACTION_RE = /\[(공감|RT|좋아요|추천|Upvote|포텐)\s+([\d,]+(?:\.\d+)?\s*(?:천|만|억|K|M|B)?)\]/gi;
const REACTION_AT_END_RE = /\[(공감|RT|좋아요|추천|Upvote|포텐)\s+([\d,]+(?:\.\d+)?\s*(?:천|만|억|K|M|B)?)\]\s*$/i;

function inspectCommentReactionLine(line) {
  const text = String(line || '');
  const matcher = new RegExp(REACTION_RE.source, 'gi');
  let tagCount = 0;
  let lastTagEnd = -1;
  let match = null;
  while ((match = matcher.exec(text)) !== null) {
    tagCount += 1;
    lastTagEnd = matcher.lastIndex;
    if (match[0] === '') matcher.lastIndex += 1;
  }

  const finalTagValid = REACTION_AT_END_RE.test(text);
  const ok = tagCount === 1 && finalTagValid;
  let failureReason = 'NONE';
  if (!ok) {
    if (tagCount === 0) failureReason = 'MISSING';
    else if (tagCount > 1) failureReason = 'MULTIPLE';
    else failureReason = 'FINAL_TAIL';
  }

  let tailKind = tagCount === 0 ? 'NO_TAG' : 'NONE';
  let trailingChars = 0;
  if (lastTagEnd >= 0 && lastTagEnd < text.length) {
    const tail = text.slice(lastTagEnd);
    trailingChars = Array.from(tail).length;
    if (/^\s+$/.test(tail)) tailKind = 'WHITESPACE';
    else if (/^[\u200B-\u200F\u202A-\u202E\u2060-\u206F]+$/.test(tail)) tailKind = 'FORMAT_ONLY';
    else tailKind = 'VISIBLE_OR_UNKNOWN';
  }

  return {
    ok,
    tagCount,
    finalTagValid,
    failureReason,
    tailKind,
    trailingChars,
  };
}

function parseReactionNumber(raw) {
  const compact = String(raw || '').trim().replace(/,/g, '').replace(/\s+/g, '');
  const m = compact.match(/^(\d+(?:\.\d+)?)(천|만|억|K|M|B)?$/i);
  if (!m) return NaN;
  const base = Number(m[1]);
  if (!Number.isFinite(base)) return NaN;
  const suffix = (m[2] || '').toUpperCase();
  const multiplier = suffix === '천' ? 1e3
    : suffix === '만' ? 1e4
    : suffix === '억' ? 1e8
    : suffix === 'K' ? 1e3
    : suffix === 'M' ? 1e6
    : suffix === 'B' ? 1e9
    : 1;
  const n = Math.round(base * multiplier);
  return Number.isFinite(n) ? Math.max(0, n) : NaN;
}


function strictlyAboveFloor(n, floor) {
  return Math.max(floor + 1, Math.round(Number(n) || 0));
}

// v0.61 normalizer contract:
// - Every newly displayed reaction count in a platform section must be > that platform family's historical max.
// - If generatedMin > historicalMax, pass through untouched.
// - If only the lower tail is stale while generatedMax is already useful, affine-remap [min,max] -> [floor+1,max].
// - If the whole generated section is stale, rescale upward. Never use the legacy constant additive shift.
function normalizeSectionValues(values, floor) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min > floor) return { mode: 'pass', values: values.slice() };

  if (max > floor + 1 && max > min) {
    const targetMin = floor + 1;
    const srcSpan = max - min;
    const dstSpan = max - targetMin;
    const mapped = values.map((v) => strictlyAboveFloor(targetMin + ((v - min) / srcSpan) * dstSpan, floor));
    return { mode: 'affine_remap', values: mapped };
  }

  if (min > 0) {
    const factor = (floor + 1) / min;
    const mapped = values.map((v) => strictlyAboveFloor(v * factor, floor));
    return { mode: 'stale_scale_fallback', values: mapped };
  }

  const span = max - min;
  if (span > 0) {
    const targetSpan = Math.max(span, floor + 1);
    const mapped = values.map((v) => strictlyAboveFloor((floor + 1) + ((v - min) / span) * targetSpan, floor));
    return { mode: 'stale_scale_fallback', values: mapped };
  }

  return { mode: 'stale_scale_flat', values: values.map(() => floor + 1) };
}

function normalizeReactionNumbers(content, state) {
  const prior = community.normalizePlatformMaxMap(state.community.platformMax);
  const observed = { ...prior };
  // v0.61.4 contract: each platform family owns its own historical floor.
  // The same platformMax map is shared across every mode, so B <-> C never resets a family's history.
  // Different platform families never inherit one another's max, even when they belong to the same group.
  const normalizationEvents = [];
  const text = String(content || '').replace(community.COMMUNITY_RE, (block) => {
    const sections = community.splitCommunity(block);
    const normalized = sections.map((section) => {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) return section;
      const floor = Math.max(0, Math.round(Number(prior[info.key]) || 0));
      const parts = community.sectionCommunityParts(section);
      const scopeStart = parts.commentsStart >= 0 ? parts.commentsStart : 0;
      const prefix = section.slice(0, scopeStart);
      const reactionScope = section.slice(scopeStart);
      const matches = [...reactionScope.matchAll(new RegExp(REACTION_RE.source, 'gi'))];
      if (!matches.length) return section;
      const parsed = matches.map((m) => parseReactionNumber(m[2]));
      if (parsed.some((n) => !Number.isFinite(n))) return section;

      const r = normalizeSectionValues(parsed, floor);
      let idx = 0;
      let localMax = floor;
      const nextScope = reactionScope.replace(new RegExp(REACTION_RE.source, 'gi'), (_, label, raw) => {
        const n = r.values[idx++];
        localMax = Math.max(localMax, n);
        if (r.mode === 'pass') return `[${label} ${String(raw).trim()}]`;
        return `[${label} ${n.toLocaleString('en-US')}]`;
      });

      if (r.mode !== 'pass') {
        normalizationEvents.push({
          platform: info.key,
          historicalFamilyMax: floor,
          generatedMin: Math.min(...parsed),
          generatedMax: Math.max(...parsed),
          normalizedMin: Math.min(...r.values),
          normalizedMax: Math.max(...r.values),
          mode: r.mode,
        });
      }
      observed[info.key] = Math.max(Number(observed[info.key] || 0), localMax);
      return prefix + nextScope;
    });
    return `<COMMUNITY>${normalized.join('\n\n---\n\n')}\n</COMMUNITY>`;
  });
  state.community.platformMax = observed;
  state.community.lastNormalization = normalizationEvents.slice(-12);
  return text;
}

function recordReactionMaxima(content, state) {
  const maxima = community.normalizePlatformMaxMap(state.community.platformMax);
  for (const block of community.communityBlocks(content)) {
    for (const section of community.splitCommunity(block)) {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) continue;
      let max = Math.max(0, Math.round(Number(maxima[info.key]) || 0));
      const parts = community.sectionCommunityParts(section);
      const reactionScope = parts.commentsStart >= 0 ? parts.comments : section;
      let m;
      const re = new RegExp(REACTION_RE.source, 'gi');
      while ((m = re.exec(reactionScope))) {
        const n = parseReactionNumber(m[2]);
        if (Number.isFinite(n) && n > max) max = n;
      }
      maxima[info.key] = max;
    }
  }
  state.community.platformMax = maxima;
  state.community.lastNormalization = [];
}

module.exports = {
  REACTION_RE,
  REACTION_AT_END_RE,
  inspectCommentReactionLine,
  parseReactionNumber,
  normalizeSectionValues,
  normalizeReactionNumbers,
  recordReactionMaxima,
};
});

SimCore.define("frame", function (require, module, exports) {
const VOLUME_LINE_RE = /^[ \t]*##[ \t]+볼륨[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
const CHAPTER_LINE_RE = /^[ \t]*###[ \t]+챕터[ \t]+(\d+)[ \t]*[:：][ \t]*([^\r\n]*)$/mi;
const CHATINDEX_LINE_RE = /^[ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*(\d+)[^\r\n]*∮[ \t]*$/mi;
const VOLUME_NUMBER_RE = /^([ \t]*##[ \t]+볼륨[ \t]+)\d+([ \t]*[:：][^\r\n]*)$/mi;
const CHAPTER_NUMBER_RE = /^([ \t]*###[ \t]+챕터[ \t]+)\d+([ \t]*[:：][ \t]*[^\r\n]*)$/mi;
const CHATINDEX_NUMBER_RE = /^([ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*)\d+([^\r\n]*∮[ \t]*)$/mi;

function headerState(raw, re) {
  const m = String(raw || '').match(re);
  return m ? { value: Number(m[1]), header: String(m[0] || '').trim() } : { value: null, header: null };
}

function normalizeChapterTitle(raw) {
  let text = String(raw || '');
  try { text = text.normalize('NFKC'); } catch { /* older JS runtime */ }
  return text.replace(/\s+/g, ' ').trim();
}

function chapterState(raw) {
  const m = String(raw || '').match(CHAPTER_LINE_RE);
  return m
    ? { value: Number(m[1]), header: String(m[0] || '').trim(), title: normalizeChapterTitle(m[2]) }
    : { value: null, header: null, title: '' };
}

function parseFrame(raw) {
  const text = String(raw || '');
  const volume = headerState(text, VOLUME_LINE_RE);
  const chapter = chapterState(text);
  const chatindex = headerState(text, CHATINDEX_LINE_RE);
  return {
    volume: Number.isFinite(volume.value) ? volume.value : null,
    volumeHeader: volume.header,
    chapter: Number.isFinite(chapter.value) ? chapter.value : null,
    chapterHeader: chapter.header,
    chapterTitle: chapter.title,
    chatindex: Number.isFinite(chatindex.value) ? chatindex.value : null,
    chatindexHeader: chatindex.header,
  };
}

function assistantRole(message) { return message?.role === 'assistant' || message?.role === 'char'; }

function capturePreviousFrame(messages, sendIndex, textOfMessage) {
  const rows = Array.isArray(messages) ? messages : [];
  const parsedSend = Number(sendIndex);
  const before = Number.isInteger(parsedSend) && parsedSend >= 0 ? Math.min(parsedSend, rows.length) : rows.length;
  for (let i = before - 1; i >= 0; i--) {
    if (!assistantRole(rows[i])) continue;
    const raw = typeof textOfMessage === 'function'
      ? textOfMessage(rows[i])
      : (rows[i]?.content ?? rows[i]?.data ?? rows[i]?.text ?? '');
    const frame = parseFrame(raw);
    if ([frame.volume, frame.chapter, frame.chatindex].some(Number.isFinite)) return { ...frame, sourceAssistantIndex: i };
    return null;
  }
  return null;
}

function numericFrame(frame) {
  return {
    volume: Number.isFinite(frame?.volume) ? Number(frame.volume) : null,
    chapter: Number.isFinite(frame?.chapter) ? Number(frame.chapter) : null,
    chatindex: Number.isFinite(frame?.chatindex) ? Number(frame.chatindex) : null,
  };
}

function replaceHeader(text, re, header) { return header ? String(text || '').replace(re, header) : String(text || ''); }
function rewriteNumber(text, re, value) {
  if (!Number.isFinite(Number(value))) return String(text || '');
  return String(text || '').replace(re, (_m, prefix, suffix) => `${prefix}${Number(value)}${suffix}`);
}
function rewriteVolumeNumber(text, value) { return rewriteNumber(text, VOLUME_NUMBER_RE, value); }
function rewriteChapterNumber(text, value) { return rewriteNumber(text, CHAPTER_NUMBER_RE, value); }
function rewriteChatindexNumber(text, value) { return rewriteNumber(text, CHATINDEX_NUMBER_RE, value); }

function enforceContinuity(content, floor) {
  let text = String(content || '');
  const observed = parseFrame(text);
  const previous = floor && typeof floor === 'object' ? floor : null;
  const repairs = [];
  const expected = numericFrame(observed);
  let volumeSignal = 'NO_BASELINE';
  let chapterSignal = 'NO_BASELINE';

  if (previous) {
    const volumeComparable = Number.isFinite(previous.volume) && Number.isFinite(observed.volume);
    if (volumeComparable) {
      if (observed.volume < previous.volume) {
        volumeSignal = 'BACKWARD';
        expected.volume = previous.volume;
        if (previous.volumeHeader && observed.volumeHeader) {
          text = replaceHeader(text, VOLUME_LINE_RE, previous.volumeHeader);
          repairs.push('VOLUME_BACKWARD');
        }
        if (previous.chapterHeader && observed.chapterHeader) {
          text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
          repairs.push('CHAPTER_WITH_VOLUME_BACKWARD');
          expected.chapter = previous.chapter;
        }
      } else if (observed.volume === previous.volume) {
        volumeSignal = 'SAME';
        expected.volume = previous.volume;
      } else {
        volumeSignal = 'ADVANCED';
        expected.volume = previous.volume + 1;
        if (observed.volume !== expected.volume) {
          text = rewriteVolumeNumber(text, expected.volume);
          repairs.push('VOLUME_JUMP');
        }
      }
    }

    if (Number.isFinite(previous.chapter) && Number.isFinite(observed.chapter)) {
      if (volumeSignal === 'ADVANCED') {
        chapterSignal = 'RESET_AFTER_VOLUME_ADVANCE';
        expected.chapter = 1;
        if (observed.chapter !== 1) {
          text = rewriteChapterNumber(text, 1);
          repairs.push('CHAPTER_RESET');
        }
      } else if (volumeSignal === 'SAME') {
        const comparableTitles = !!(previous.chapterTitle && observed.chapterTitle);
        if (comparableTitles && previous.chapterTitle === observed.chapterTitle) {
          chapterSignal = 'SAME_TITLE_HOLD';
          expected.chapter = previous.chapter;
          if (observed.chapter !== expected.chapter) {
            text = rewriteChapterNumber(text, expected.chapter);
            repairs.push('CHAPTER_TITLE_HOLD');
          }
        } else if (comparableTitles && previous.chapterTitle !== observed.chapterTitle) {
          chapterSignal = 'TITLE_CHANGED_ADVANCE';
          expected.chapter = previous.chapter + 1;
          if (observed.chapter !== expected.chapter) {
            text = rewriteChapterNumber(text, expected.chapter);
            repairs.push('CHAPTER_TITLE_ADVANCE');
          }
        } else if (observed.chapter < previous.chapter) {
          chapterSignal = 'BACKWARD';
          expected.chapter = previous.chapter;
          if (previous.chapterHeader && observed.chapterHeader) {
            text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
            repairs.push('CHAPTER_BACKWARD');
          }
        } else {
          chapterSignal = 'UNRESOLVED_TITLE';
        }
      } else if (volumeSignal === 'BACKWARD') {
        chapterSignal = 'HELD_WITH_VOLUME';
        expected.chapter = previous.chapter;
      } else if (observed.chapter < previous.chapter) {
        chapterSignal = 'BACKWARD';
        expected.chapter = previous.chapter;
        if (previous.chapterHeader && observed.chapterHeader) {
          text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
          repairs.push('CHAPTER_BACKWARD');
        }
      }
    }

    if (Number.isFinite(previous.chatindex) && Number.isFinite(observed.chatindex)) {
      expected.chatindex = previous.chatindex + 1;
      if (observed.chatindex !== expected.chatindex) {
        text = rewriteChatindexNumber(text, expected.chatindex);
        repairs.push(observed.chatindex === previous.chatindex
          ? 'CHATINDEX_SAME'
          : (observed.chatindex < expected.chatindex ? 'CHATINDEX_BACKWARD' : 'CHATINDEX_JUMP'));
      }
    }
  }

  const output = parseFrame(text);
  return {
    content: text,
    probe: {
      applied: repairs.length > 0,
      regression: repairs.length ? repairs.join('+') : 'NONE',
      sequenceStatus: previous ? (repairs.length ? 'REPAIRED' : 'PASS') : 'BASELINE',
      volumeSignal,
      chapterSignal,
      repairs,
      previous: numericFrame(previous),
      observed: numericFrame(observed),
      expected,
      output: numericFrame(output),
    },
  };
}

module.exports = { parseFrame, capturePreviousFrame, enforceContinuity, rewriteVolumeNumber, rewriteChapterNumber, rewriteChatindexNumber };
});
SimCore.define("structure", function (require, module, exports) {
const kernel = require('./kernel');
const community = require('./community');
const reaction = require('./reaction');
const lifecycle = require('./lifecycle');
const time = require('./time');

const RESPONSE_HEADER_RE = /^\s*#\s+응답\s*$/mi;
const VOLUME_HEADER_RE = /^\s*##\s+볼륨\s+\d+\s*[:：]\s*\S.*$/mi;
const CHAPTER_HEADER_RE = /^\s*###\s+챕터\s+\d+\s*[:：]\s*\S.*$/mi;
const CHATINDEX_HEADER_RE = /^\s*####\s+Chatindex\s*[:：]\s*\S.*∮\s*$/mi;
const TIMESTAMP_RE = /⏱️\[\d{4}-\d{2}-\d{2}\s+\([^)]+\)\s+\d{1,2}:\d{2}\s+(?:AM|PM)\]/i;
const RESPONSE_HEADER_MARKER_RE = /^[ \t]*#[ \t]+응답[^\r\n]*$/mi;
const VOLUME_HEADER_MARKER_RE = /^[ \t]*##[ \t]+볼륨[^\r\n]*$/mi;
const CHAPTER_HEADER_MARKER_RE = /^[ \t]*###[ \t]+챕터[^\r\n]*$/mi;
const CHATINDEX_HEADER_MARKER_RE = /^[ \t]*####[ \t]+Chatindex[^\r\n]*$/mi;
const TIMESTAMP_MARKER_RE = /⏱️\[/i;

function firstMatch(text, re) {
  const m = String(text || '').match(re);
  if (!m || !Number.isInteger(m.index)) return null;
  return { index: m.index, end: m.index + m[0].length, text: m[0] };
}

function responseEnvelopeScope(content) {
  const raw = String(content || '');
  const responseInRaw = firstMatch(raw, RESPONSE_HEADER_MARKER_RE);
  if (!responseInRaw) {
    return {
      envelope: raw,
      responseStart: -1,
      frameOk: false,
      orderOk: false,
      timestampMarkerFound: false,
      timestampValid: false,
      timestamp: null,
    };
  }

  const envelope = raw.slice(responseInRaw.index);
  const response = firstMatch(envelope, RESPONSE_HEADER_MARKER_RE);
  const volume = firstMatch(envelope, VOLUME_HEADER_MARKER_RE);
  const chapter = firstMatch(envelope, CHAPTER_HEADER_MARKER_RE);
  const chatindex = firstMatch(envelope, CHATINDEX_HEADER_MARKER_RE);

  let timestampMarker = null;
  let timestamp = null;
  if (chatindex) {
    const afterChatindex = envelope.slice(chatindex.end);
    const marker = firstMatch(afterChatindex, TIMESTAMP_MARKER_RE);
    if (marker) {
      timestampMarker = {
        index: chatindex.end + marker.index,
        end: chatindex.end + marker.end,
        text: marker.text,
      };
      const fromMarker = envelope.slice(timestampMarker.index);
      const parsed = firstMatch(fromMarker, TIMESTAMP_RE);
      if (parsed && parsed.index === 0) {
        timestamp = {
          index: timestampMarker.index,
          end: timestampMarker.index + parsed.end,
          text: parsed.text,
        };
      }
    }
  }

  const responseCount = kernel.regexCount(envelope, RESPONSE_HEADER_MARKER_RE);
  const volumeCount = kernel.regexCount(envelope, VOLUME_HEADER_MARKER_RE);
  const chapterCount = kernel.regexCount(envelope, CHAPTER_HEADER_MARKER_RE);
  const chatindexCount = kernel.regexCount(envelope, CHATINDEX_HEADER_MARKER_RE);
  const responseValidCount = kernel.regexCount(envelope, RESPONSE_HEADER_RE);
  const volumeValidCount = kernel.regexCount(envelope, VOLUME_HEADER_RE);
  const chapterValidCount = kernel.regexCount(envelope, CHAPTER_HEADER_RE);
  const chatindexValidCount = kernel.regexCount(envelope, CHATINDEX_HEADER_RE);

  const ordered = !!(response && volume && chapter && chatindex && timestamp
    && response.index === 0
    && response.end <= volume.index
    && volume.end <= chapter.index
    && chapter.end <= chatindex.index
    && chatindex.end <= timestamp.index);
  const cleanGaps = !!(ordered
    && !envelope.slice(response.end, volume.index).trim()
    && !envelope.slice(volume.end, chapter.index).trim()
    && !envelope.slice(chapter.end, chatindex.index).trim()
    && !envelope.slice(chatindex.end, timestamp.index).trim());
  const orderOk = ordered && cleanGaps;
  const headerCountsOk = responseCount === 1 && volumeCount === 1 && chapterCount === 1 && chatindexCount === 1;
  const headerFormatsOk = responseValidCount === 1 && volumeValidCount === 1
    && chapterValidCount === 1 && chatindexValidCount === 1;
  const frameOk = headerCountsOk && headerFormatsOk && !!timestamp && orderOk;

  return {
    envelope,
    responseStart: responseInRaw.index,
    frameOk,
    orderOk,
    timestampMarkerFound: !!timestampMarker,
    timestampValid: !!timestamp,
    timestamp: timestamp?.text || null,
  };
}

function validateHostFrameItem(text, issues, label, markerRe, validRe) {
  const markerCount = kernel.regexCount(text, markerRe);
  const validCount = kernel.regexCount(text, validRe);
  if (markerCount === 0) {
    issues.push(`공통 ${label} 누락`);
    return;
  }
  if (markerCount > 1) issues.push(`공통 ${label} 중복 ${markerCount}개`);
  if (validCount !== markerCount) issues.push(`공통 ${label} 형식 오류`);
}

function validateFrameEnvelope(scope, issues) {
  const text = scope.envelope;
  validateHostFrameItem(text, issues, '# 응답 헤더', RESPONSE_HEADER_MARKER_RE, RESPONSE_HEADER_RE);
  validateHostFrameItem(text, issues, '볼륨 헤더', VOLUME_HEADER_MARKER_RE, VOLUME_HEADER_RE);
  validateHostFrameItem(text, issues, '챕터 헤더', CHAPTER_HEADER_MARKER_RE, CHAPTER_HEADER_RE);
  validateHostFrameItem(text, issues, 'Chatindex 헤더', CHATINDEX_HEADER_MARKER_RE, CHATINDEX_HEADER_RE);
  if (!scope.timestampMarkerFound) issues.push('공통 timestamp 누락');
  else if (!scope.timestampValid) issues.push('공통 timestamp 형식 오류');
  if (scope.timestampValid && !scope.orderOk) issues.push('공통 frame 순서 오류');
}

function responseEnvelopeIntegrity(content, pending) {
  const scope = responseEnvelopeScope(content);
  const text = String(scope.envelope || '').trim();
  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);
  const knowledge = kernel.scanKnowledgeBlocks(text);
  const blocks = community.communityBlocks(text);
  const k = knowledge.blocks.length === 1 && !knowledge.malformed ? knowledge.blocks[0] : null;
  const frameOk = scope.frameOk;
  const communityOk = blocks.length === expected;
  const knowledgeOk = !!k && !text.slice(k.end).trim();
  return { safe: frameOk && communityOk && knowledgeOk, frameOk, communityOk, knowledgeOk, blocks, knowledge, scope };
}

function stateCommitSafety(content, pending, envelopeResolved = true) {
  const scope = responseEnvelopeScope(content);
  const text = String(scope.envelope || '');
  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);
  const blocks = community.communityBlocks(text);
  const responseCount = kernel.regexCount(text, RESPONSE_HEADER_MARKER_RE);
  const communitySafe = envelopeResolved && scope.frameOk && responseCount === 1 && blocks.length === expected;
  return {
    communitySafe,
    expectedBlocks: expected,
    observedBlocks: blocks.length,
    reason: communitySafe ? '' : `state quarantine: response=${responseCount}, COMMUNITY=${blocks.length}/${expected}`,
  };
}

function validateStructure(content, pending) {
  if (!pending?.active) return [];
  const issues = [];
  const scope = responseEnvelopeScope(content);
  const text = String(scope.envelope || '');
  const blocks = community.communityBlocks(text);
  const expected = lifecycle.expectedCommunityBlocks(pending.mode);
  if (blocks.length !== expected) issues.push(`COMMUNITY 블록 ${blocks.length}개 (필요 ${expected}개)`);

  validateFrameEnvelope(scope, issues);

  if (/^B_/.test(String(pending.mode || '')) && pending.broadcastAirtimePrevious) {
    const currentBroadcastTs = time.parseTimestamp(text);
    const previousBroadcastTs = time.parseTimestamp(pending.broadcastAirtimePrevious);
    if (currentBroadcastTs && previousBroadcastTs && currentBroadcastTs.minuteKey < previousBroadcastTs.minuteKey) {
      issues.push(`Mode B 방송 송출 시각 역행: ${currentBroadcastTs.raw} < ${previousBroadcastTs.raw}`);
    }
  }
  if (!/^B_/.test(String(pending.mode || '')) && pending.narrativeClockGuard && pending.narrativeTimestampPrevious) {
    const currentNarrativeTs = time.parseTimestamp(text);
    const previousNarrativeTs = time.parseTimestamp(pending.narrativeTimestampPrevious);
    if (currentNarrativeTs && previousNarrativeTs && currentNarrativeTs.minuteKey < previousNarrativeTs.minuteKey) {
      issues.push(`Narrative 현재 시각 역행: ${currentNarrativeTs.raw} < ${previousNarrativeTs.raw}`);
    }
  }

  const knowledgeScan = kernel.scanKnowledgeBlocks(text);
  const knowledgeBlocks = knowledgeScan.blocks.map((x) => x.text);
  const knowledgeOpenCount = knowledgeScan.openCount;
  const knowledgeCloseCount = knowledgeScan.closeCount;
  if (knowledgeBlocks.length === 0) issues.push('<Knowledge> 블록 누락');
  else if (knowledgeBlocks.length > 1) issues.push(`<Knowledge> 블록 중복 ${knowledgeBlocks.length}개`);
  if (knowledgeScan.malformed || knowledgeOpenCount !== 1 || knowledgeCloseCount !== 1 || knowledgeBlocks.length !== 1) {
    issues.push(`<Knowledge> 태그 구조 오류 (open ${knowledgeOpenCount}, close ${knowledgeCloseCount}, strict-complete ${knowledgeBlocks.length})`);
  }

  kernel.CONTROL_TAG_RE.lastIndex = 0;
  if (kernel.CONTROL_TAG_RE.test(text)) issues.push('응답에 방송 제어 태그가 있음');
  kernel.CONTROL_TAG_RE.lastIndex = 0;

  const groupsByBlock = [];
  blocks.forEach((block, bi) => {
    const sections = community.splitCommunity(block);
    if (sections.length !== 3) issues.push(`COMMUNITY ${bi + 1}: 플랫폼 섹션 ${sections.length}개 (필요 3개)`);
    const separators = (block.match(/^\s*---\s*$/gm) || []).length;
    if (separators !== 2) issues.push(`COMMUNITY ${bi + 1}: 구분선 ${separators}개`);
    const groups = [];

    sections.forEach((section, si) => {
      const info = community.platformInfo(community.sectionHeader(section));
      if (!info.group) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 알 수 없는 플랫폼`);
      else groups.push(info.group);

      const parts = community.sectionCommunityParts(section);
      if (!parts.titleMatch) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 제목 누락`);
      if (parts.markerCount !== 1) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: [베댓] ${parts.markerCount}개 (필요 1개)`);
      if (!parts.body.length) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 게시글 본문 누락`);

      const commentScope = parts.commentsStart >= 0 ? parts.comments : section;
      const tops = (commentScope.match(/^\s*-\s+/gm) || []).length;
      const replies = (commentScope.match(/^\s*ㄴ\s+/gm) || []).length;
      if (tops !== 4) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 상위 댓글 ${tops}개 (필요 4개)`);
      if (replies !== 1) issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 대댓글 ${replies}개 (필요 1개)`);

      const commentUnits = community.commentUnits(commentScope);
      let reactionLineErrors = 0;
      const reactionFailureCounts = {
        missing: 0,
        multiple: 0,
        finalTail: 0,
        tailFormatOnly: 0,
        tailVisibleOrUnknown: 0,
        tailOther: 0,
        trailingChars: 0,
      };
      for (const unit of commentUnits) {
        const inspection = reaction.inspectCommentReactionLine(unit.text);
        if (inspection.ok) continue;
        reactionLineErrors += 1;
        if (inspection.failureReason === 'MISSING') reactionFailureCounts.missing += 1;
        else if (inspection.failureReason === 'MULTIPLE') reactionFailureCounts.multiple += 1;
        else if (inspection.failureReason === 'FINAL_TAIL') {
          reactionFailureCounts.finalTail += 1;
          reactionFailureCounts.trailingChars += Number(inspection.trailingChars || 0);
          if (inspection.tailKind === 'FORMAT_ONLY') reactionFailureCounts.tailFormatOnly += 1;
          else if (inspection.tailKind === 'VISIBLE_OR_UNKNOWN') reactionFailureCounts.tailVisibleOrUnknown += 1;
          else reactionFailureCounts.tailOther += 1;
        }
      }
      if (reactionLineErrors) {
        issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 댓글 반응 태그 ${reactionLineErrors}줄 오류 (각 댓글/대댓글 끝에 정확히 1개 필요) · missing ${reactionFailureCounts.missing} · multiple ${reactionFailureCounts.multiple} · final-tail ${reactionFailureCounts.finalTail} · tail-format ${reactionFailureCounts.tailFormatOnly} · tail-visible ${reactionFailureCounts.tailVisibleOrUnknown} · tail-other ${reactionFailureCounts.tailOther} · tail-chars ${reactionFailureCounts.trailingChars}`);
      }
    });

    groupsByBlock.push(groups);
    const distinctGroups = [...new Set(groups)];
    if (sections.length === 3 && (groups.length !== 3 || distinctGroups.length !== 3)) {
      const shownGroups = groups.length ? groups.join(', ') : '인식 없음';
      issues.push(`COMMUNITY ${bi + 1}: 플랫폼 그룹 ${distinctGroups.length}개 (필요 서로 다른 3개; 감지: ${shownGroups})`);
    }
  });

  // B_END strengthened contract: Scene 3 distinct + Episode 3 distinct + no group reuse across blocks.
  if (pending.mode === 'B_END' && blocks.length === 2) {
    const allGroups = groupsByBlock.flat();
    const distinct = [...new Set(allGroups)];
    if (allGroups.length !== 6 || distinct.length !== 6) {
      issues.push(`B_END: Scene+Episode 플랫폼 그룹 ${distinct.length}개 (필요 서로 다른 6개; 감지: ${allGroups.join(', ') || '인식 없음'})`);
    }
  }

  // <Knowledge> must be the final complete block of every active response.
  // When COMMUNITY exists, the single Knowledge block must come after the final COMMUNITY with no other output after it.
  if (knowledgeBlocks.length === 1 && !knowledgeScan.malformed) {
    const knowledgeBlock = knowledgeBlocks[0];
    const knowledgeEntry = knowledgeScan.blocks[0];
    const knowledgeIndex = knowledgeEntry.start;
    const afterKnowledge = text.slice(knowledgeEntry.end).trim();
    if (afterKnowledge) issues.push('<Knowledge> 뒤에 추가 텍스트가 있음 (Knowledge는 응답 맨 끝이어야 함)');

    if (blocks.length) {
      const lastCommunity = blocks[blocks.length - 1];
      const lastCommunityIndex = text.lastIndexOf(lastCommunity);
      const lastCommunityEnd = lastCommunityIndex + lastCommunity.length;
      if (knowledgeIndex < lastCommunityEnd) {
        issues.push('<Knowledge> 위치 오류 (마지막 COMMUNITY 뒤에 와야 함)');
      } else {
        const between = text.slice(lastCommunityEnd, knowledgeIndex).trim();
        if (between) issues.push('마지막 COMMUNITY와 <Knowledge> 사이에 추가 텍스트가 있음');
      }
    }
  }
  if (pending.mode === 'B_END' && blocks.length === 2) {
    const betweenStart = text.indexOf(blocks[0]) + blocks[0].length;
    const betweenEnd = text.indexOf(blocks[1], betweenStart);
    if (text.slice(betweenStart, betweenEnd).trim()) issues.push('장면/에피소드 COMMUNITY 사이에 다른 내용이 있음');
  }

  if (pending.mode === 'C' && blocks.length) {
    const prefix = text.slice(0, text.indexOf(blocks[0])).replace(kernel.KNOWLEDGE_RE, '');
    const extras = prefix.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).filter((line) => {
      if (/^#\s+응답\s*$/i.test(line)) return false;
      if (/^(?:#{1,6}\s*)?(?:볼륨|volume|챕터|chapter|chat\s*index|chatindex)(?:\s|:|$)/i.test(line)) return false;
      if (/^(?:---+|===+|§[^§]+§)$/.test(line)) return false;
      if (TIMESTAMP_RE.test(line)) return false;
      return true;
    });
    if (extras.length) issues.push('Mode C에 서사·행동·대사로 보이는 본문이 있음');
  }

  if ((pending.mode === 'B_START' || pending.mode === 'B_CONTINUE')
      && /(?:방송(?:은|이|을)?\s*(?:끝|종료)|엔딩\s*크레딧|막을\s*내리)/.test(text)) {
    issues.push('열린 방송 장면에 종결 표현이 있음');
  }
  if (/^B_/.test(pending.mode)
      && /(?:마음속으로|속으로\s+생각|내심|누구에게도\s+말하지\s+않은)/.test(text)) {
    issues.push('방송 화면으로 확인할 수 없는 내면 확정 표현');
  }

  if (pending.secondaryConfigured && !pending.secondaryActive && pending.secondaryName) {
    const escaped = pending.secondaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped).test(text)) issues.push(`비활성 보조 캐릭터 "${pending.secondaryName}" 노출`);
  }
  if (/(?:만\s*\d+\s*세|만\s*나이|국제\s*나이|international\s+age|western\s+age)/i.test(text)) {
    issues.push('금지된 국제/만 나이 표현');
  }
  return issues;
}

module.exports = { TIMESTAMP_RE, responseEnvelopeScope, responseEnvelopeIntegrity, stateCommitSafety, validateStructure };
});

SimCore.define("output-compat", function (require, module, exports) {
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const community = require('./community');
const reaction = require('./reaction');
const structure = require('./structure');

// Host/model preamble compatibility is classified once, then Recovery applies the
// resulting prefix policy without inferring or retaining the preamble body.
function classifyPreamble(rawPrefix, candidateCount = 1, resolved = false) {
  const prefixText = String(rawPrefix || '');
  const trimmed = prefixText.trim();
  let prefixKind = 'NONE';
  let prefixPolicy = 'NONE';
  let thoughtsShape = 'NONE';

  if (prefixText.length && !trimmed) {
    prefixKind = 'WHITESPACE_ONLY';
    prefixPolicy = 'IGNORE_WHITESPACE';
  } else if (trimmed) {
    let completeThoughts = false;
    const open = trimmed.match(/^<Thoughts>/i);
    if (open) {
      const close = trimmed.match(/<\/Thoughts>$/i);
      if (close) {
        const body = trimmed.slice(open[0].length, trimmed.length - close[0].length);
        completeThoughts = !/<\/?Thoughts>/i.test(body);
      }
    }

    if (completeThoughts) {
      prefixKind = 'THOUGHTS_COMPAT';
      prefixPolicy = 'SILENT_COMPAT';
      thoughtsShape = 'COMPLETE';
    } else if (/^<Thoughts\b[^>]*>/i.test(trimmed)) {
      prefixKind = 'THOUGHTS_COMPAT';
      prefixPolicy = resolved ? 'SAFE_ENVELOPE_COMPAT' : 'WARNING';
      thoughtsShape = 'PARTIAL';
    } else {
      prefixKind = 'UNKNOWN_TEXT';
      prefixPolicy = 'WARNING';
    }
  }

  const count = Math.max(0, Number(candidateCount || 0));
  let kind = prefixKind;
  let policy = prefixPolicy;
  if (count === 0) {
    kind = 'UNRESOLVED';
    policy = 'FAIL_OPEN';
  } else if (count > 1) {
    kind = 'DUPLICATE_ENVELOPE';
    policy = resolved ? 'SELECT_SAFE_CANDIDATE' : 'FAIL_OPEN';
  }

  return { kind, policy, prefixKind, prefixPolicy, thoughtsShape };
}

function preambleIssue(action) {
  return `응답 envelope 앞 비정상 preamble ${action}`;
}

function preambleDiagnostic(action) {
  return `Thoughts 호환 preamble ${action}`;
}

function applyPreamblePolicy(classification, action, issues, diagnostics) {
  const c = classification || {};
  if (c.prefixKind === 'NONE' || c.prefixKind === 'WHITESPACE_ONLY') return;
  if (c.prefixKind === 'THOUGHTS_COMPAT') {
    if (c.prefixPolicy === 'SILENT_COMPAT') return;
    if (c.prefixPolicy === 'SAFE_ENVELOPE_COMPAT') {
      diagnostics.push(preambleDiagnostic(action));
      return;
    }
    issues.push(preambleIssue(action));
    return;
  }
  if (c.prefixKind === 'UNKNOWN_TEXT') issues.push(preambleIssue(action));
}

function buildPreambleProvenance(raw, matches, selectedIndex = -1, resolved = false, classification = null) {
  const text = String(raw || '');
  const candidates = Array.isArray(matches) ? matches : [];
  const firstOffset = candidates.length && Number.isInteger(candidates[0]?.index) ? Number(candidates[0].index) : -1;
  const selectedOffset = selectedIndex >= 0 && Number.isInteger(candidates[selectedIndex]?.index)
    ? Number(candidates[selectedIndex].index)
    : firstOffset;
  const rawPrefix = firstOffset >= 0 ? text.slice(0, firstOffset) : text;
  const classified = classification || classifyPreamble(rawPrefix, candidates.length, resolved);
  let action = 'NONE';

  if (!candidates.length) action = 'UNRESOLVED';
  else if (candidates.length > 1) action = resolved ? 'SELECTED' : 'UNRESOLVED';
  else if (!rawPrefix.length) action = 'NONE';
  else if (!rawPrefix.trim()) action = 'IGNORED';
  else action = resolved ? 'STRIPPED' : 'UNRESOLVED';

  return {
    kind: classified.kind,
    chars: rawPrefix.length,
    lines: rawPrefix.length ? rawPrefix.split(/\r?\n/).length : 0,
    action,
    policy: classified.policy,
    envelopeOffset: selectedOffset >= 0 ? selectedOffset : null,
    candidateCount: candidates.length,
    selectedCandidate: selectedIndex >= 0 ? selectedIndex + 1 : null,
  };
}

function buildBoundaryEnvelopeCandidates(candidateText) {
  const raw = String(candidateText || '');
  const out = [];
  let current = raw;
  let removed = '';
  for (let i = 0; i < 2; i++) {
    const last = current.slice(-1);
    if (last !== '\n' && last !== '\r') break;
    removed = last + removed;
    current = current.slice(0, -1);
    if (!current.startsWith('# 응답') || current.length < 128) break;
    const kind = removed === '\n' ? 'TRAILING_LF'
      : (removed === '\r\n' ? 'TRAILING_CRLF'
        : (removed === '\n\n' ? 'TRAILING_LF_LF'
          : (removed === '\r\r' ? 'TRAILING_CR_CR' : 'TRAILING_CR_LF')));
    out.push(Object.freeze({
      fingerprint: kernel.fingerprintText(current),
      chars: current.length,
      deltaChars: current.length - raw.length,
      kind,
    }));
  }
  return Object.freeze(out);
}

function buildSafeEnvelopeBoundaryConfirmation(content, envelope, issues, stateCommit) {
  const preamble = envelope?.preambleProvenance || null;
  if (!envelope?.resolved
      || preamble?.kind !== 'THOUGHTS_COMPAT'
      || preamble?.action !== 'STRIPPED'
      || preamble?.policy !== 'SAFE_ENVELOPE_COMPAT'
      || Number(preamble?.candidateCount || 0) !== 1
      || (Array.isArray(issues) && issues.length)
      || stateCommit?.communitySafe !== true) return null;

  const raw = String(content || '');
  if (!raw.startsWith('# 응답') || raw.length < 128) return null;
  const canonicalFingerprint = kernel.fingerprintText(raw);
  const canonicalMatch = /^(\d+):/.exec(canonicalFingerprint);
  const canonicalChars = canonicalMatch ? Number(canonicalMatch[1]) : 0;
  const boundaries = [];
  const addBoundary = (start, kind) => {
    if (!Number.isInteger(start) || start < 2 || raw.slice(start - 2, start) !== '\n\n') return;
    const variant = raw.slice(0, start - 1) + raw.slice(start);
    const fingerprint = kernel.fingerprintText(variant);
    const match = /^(\d+):/.exec(fingerprint);
    const chars = match ? Number(match[1]) : 0;
    if (chars !== canonicalChars - 1) return;
    boundaries.push(Object.freeze({ fingerprint, chars, deltaChars: -1, kind }));
  };

  const communityRe = /<COMMUNITY(?:\s[^>]*)?>/gi;
  let communityIndex = 0;
  let match;
  while ((match = communityRe.exec(raw))) {
    const start = Number(match.index);
    const before = raw.slice(0, Math.max(0, start - 2)).trimEnd();
    addBoundary(start, communityIndex > 0 || before.endsWith('</COMMUNITY>') ? 'COMMUNITY_TO_COMMUNITY' : 'BASE_TO_COMMUNITY');
    communityIndex += 1;
  }
  const knowledge = raw.indexOf('<Knowledge>');
  if (knowledge >= 0) {
    const before = raw.slice(0, Math.max(0, knowledge - 2)).trimEnd();
    addBoundary(knowledge, before.endsWith('</COMMUNITY>') ? 'COMMUNITY_TO_KNOWLEDGE' : 'BASE_TO_KNOWLEDGE');
  }
  if (!boundaries.length) return null;

  return Object.freeze({
    status: 'PENDING',
    source: 'CANONICAL_BOUNDARY',
    confirmation: 'FRESH_EXACT',
    canonicalFingerprint,
    canonicalChars,
    boundaryCandidates: Object.freeze(boundaries),
    persistentMutation: 'NONE',
  });
}

function buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates) {
  const rows = Array.isArray(matches) ? matches : [];
  const list = Array.isArray(candidates) ? candidates : [];
  if (rows.length !== 1 || list.length !== 1) return null;
  const classification = classifyPreamble(rawPrefix, rows.length, false);
  if (classification.prefixKind !== 'THOUGHTS_COMPAT') return null;
  const candidate = list[0];
  const candidateText = String(candidate?.text || '');
  if (!candidateText.startsWith('# 응답') || candidateText.length < 128) return null;
  if (!candidate?.integrity?.frameOk || !candidate?.integrity?.knowledgeOk) return null;
  return Object.freeze({
    status: 'PENDING',
    source: 'HOST_RAW_SUFFIX',
    confirmation: 'FRESH_EXACT',
    candidateFingerprint: kernel.fingerprintText(candidateText),
    candidateChars: candidateText.length,
    boundaryCandidates: buildBoundaryEnvelopeCandidates(candidateText),
    envelopeOffset: Number(rows[0]?.index || 0),
    persistentMutation: 'NONE',
  });
}

// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.
function canonicalizeResponseEnvelope(content, pending) {
  const raw = String(content || '');
  if (!pending?.active) return { content: raw, repaired: false, issues: [], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: true, preambleProvenance: null };

  const markerRe = /^[ \t]*#[ \t]+응답[^\r\n]*$/gmi;
  const matches = [...raw.matchAll(markerRe)];
  if (!matches.length) {
    const preambleProvenance = buildPreambleProvenance(raw, [], -1, false);
    return { content: raw.trim(), repaired: false, issues: ['응답 envelope: # 응답 시작점 없음'], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: false, preambleProvenance };
  }

  const rawPrefix = raw.slice(0, matches[0].index);
  const prefix = rawPrefix.trim();
  const candidates = matches.map((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const text = raw.slice(m.index, end).trim();
    const integrity = structure.responseEnvelopeIntegrity(text, pending);
    let score = 0;
    if (integrity.frameOk) score += 20;
    if (integrity.communityOk) score += 20;
    if (integrity.knowledgeOk) score += 30;
    if (integrity.safe) score += 50;
    if (integrity.blocks.length === lifecycle.expectedCommunityBlocks(pending.mode)) {
      for (const block of integrity.blocks) {
        const sections = community.splitCommunity(block);
        if (sections.length === 3) score += 2;
        const groups = sections.map((section) => community.platformInfo(community.sectionHeader(section)).group).filter(Boolean);
        if (groups.length === 3 && new Set(groups).size === 3) score += 2;
      }
    }
    if (/<\/?Thoughts?>/i.test(text)) score -= 10;
    return { index: i, text, integrity, score };
  });

  const safe = candidates.filter((x) => x.integrity.safe).sort((a, b) => b.score - a.score || b.index - a.index);
  if (!safe.length) {
    const issues = [];
    const diagnostics = [];
    if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 - 안전한 후보를 확정하지 못해 자동 병합하지 않음`);
    const resolved = matches.length === 1 && !prefix;
    const classification = classifyPreamble(rawPrefix, matches.length, resolved);
    if (prefix) applyPreamblePolicy(classification, '감지', issues, diagnostics);
    const preambleProvenance = buildPreambleProvenance(raw, matches, -1, resolved, classification);
    const freshConfirmation = buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates);
    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved, preambleProvenance, freshConfirmation };
  }

  const selected = safe[0];
  const repaired = matches.length > 1 || !!prefix;
  const issues = [];
  const diagnostics = [];
  if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 → 완전한 후보 ${selected.index + 1}번만 유지`);
  const classification = classifyPreamble(rawPrefix, matches.length, true);
  if (prefix) applyPreamblePolicy(classification, '제거', issues, diagnostics);
  const preambleProvenance = buildPreambleProvenance(raw, matches, selected.index, true, classification);
  return { content: selected.text, repaired, issues, diagnostics, candidateCount: matches.length, selectedIndex: selected.index, resolved: true, preambleProvenance };
}

// Deterministic opaque-block tail repair.
function normalizeTailPlacement(content, pending) {
  const text = String(content || '');
  if (!pending?.active) return text;

  const knowledgeScan = kernel.scanKnowledgeBlocks(text);
  const knowledge = knowledgeScan.blocks.map((x) => x.text);
  const blocks = community.communityBlocks(text);
  const expected = lifecycle.expectedCommunityBlocks(pending.mode);

  let base = text;
  if (/^B_/.test(String(pending.mode || '')) && blocks.length === expected && blocks.length > 0) {
    for (const block of blocks) base = base.replace(block, '');
  }
  if (knowledge.length === 1 && !knowledgeScan.malformed) base = base.replace(knowledge[0], '');

  base = base.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  const tail = [];
  if (/^B_/.test(String(pending.mode || '')) && blocks.length === expected && blocks.length > 0) tail.push(...blocks);
  if (knowledge.length === 1 && !knowledgeScan.malformed) tail.push(knowledge[0]);
  if (!tail.length) return base.trim();
  return `${base}${base ? '\n\n' : ''}${tail.join('\n\n')}`.trim();
}

function prepareOutput(content, pending) {
  let text = kernel.stripControlTags(content);
  const envelope = canonicalizeResponseEnvelope(text, pending);
  text = normalizeTailPlacement(envelope.content, pending);
  return { content: text, envelope };
}


function buildFreshObservationPlan(freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {
  const fresh = freshEnvelopeConfirmation && typeof freshEnvelopeConfirmation === 'object'
    ? freshEnvelopeConfirmation : null;
  const safe = safeEnvelopeBoundaryConfirmation && typeof safeEnvelopeBoundaryConfirmation === 'object'
    ? safeEnvelopeBoundaryConfirmation : null;
  const candidates = [];
  const meanings = {};
  const add = (kind, fingerprint, metadata = null) => {
    const fp = String(fingerprint || '');
    if (!fp) return null;
    const id = `C${candidates.length}`;
    candidates.push(Object.freeze({ candidateId: id, fingerprint: fp }));
    meanings[id] = Object.freeze({ kind, ...(metadata || {}) });
    return id;
  };

  const freshEligible = fresh?.status === 'PENDING' && fresh?.confirmation === 'FRESH_EXACT';
  if (freshEligible) {
    add('FRESH_PRIMARY', fresh.candidateFingerprint, {
      source: String(fresh.source || 'HOST_RAW_SUFFIX'),
      candidateChars: Number(fresh.candidateChars || 0),
    });
    const boundaries = Array.isArray(fresh.boundaryCandidates) ? fresh.boundaryCandidates : [];
    for (const row of boundaries) {
      add('FRESH_BOUNDARY', row?.fingerprint, {
        source: String(fresh.source || 'HOST_RAW_SUFFIX'),
        chars: Number(row?.chars || 0),
        deltaChars: Number(row?.deltaChars || 0),
        boundaryKind: String(row?.kind || 'CRLF_ONLY'),
      });
    }
  }

  const safeEligible = safe?.status === 'PENDING' && safe?.confirmation === 'FRESH_EXACT';
  if (safeEligible) {
    const boundaries = Array.isArray(safe.boundaryCandidates) ? safe.boundaryCandidates : [];
    for (const row of boundaries) {
      add('SAFE_BOUNDARY', row?.fingerprint, {
        source: String(safe.source || 'CANONICAL_BOUNDARY'),
        chars: Number(row?.chars || 0),
        deltaChars: Number(row?.deltaChars || 0),
        boundaryKind: String(row?.kind || 'STRUCTURAL_LF'),
      });
    }
  }

  return Object.freeze({
    schema: 1,
    observation: Object.freeze({
      schema: 1,
      candidates: Object.freeze(candidates),
    }),
    meanings: Object.freeze(meanings),
    telemetrySeed: Object.freeze({
      freshEnvelopeCandidateChars: fresh ? Number(fresh.candidateChars || 0) : 0,
      safeEnvelopeCanonicalChars: safe ? Number(safe.canonicalChars || 0) : 0,
      freshConfirmationPresent: !!fresh,
      safeConfirmationPresent: !!safe,
    }),
  });
}

function interpretFreshObservation(plan, receipt) {
  const p = plan && Number(plan.schema) === 1 ? plan : buildFreshObservationPlan();
  const r = receipt && Number(receipt.schema) === 1 ? receipt : null;
  if (!r) {
    return Object.freeze({
      acceptedCanonicalEquivalent: false,
      fingerprintMatch: 'MISMATCH',
      freshEnvelopeRecovery: p.telemetrySeed.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: p.telemetrySeed.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE',
    });
  }

  const baseMatch = String(r.baseMatch || 'MISMATCH');
  if (baseMatch === 'CANONICAL' || baseMatch === 'HOST_RAW') {
    return Object.freeze({
      acceptedCanonicalEquivalent: false,
      fingerprintMatch: baseMatch,
      freshEnvelopeRecovery: 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE',
    });
  }

  const matchedIds = Array.isArray(r.matchedCandidateIds) ? r.matchedCandidateIds.map(String) : [];
  const matched = matchedIds
    .map((id) => ({ id, meaning: p.meanings?.[id] || null }))
    .filter((row) => row.meaning);
  const primary = matched.filter((row) => row.meaning.kind === 'FRESH_PRIMARY');
  const freshBoundary = matched.filter((row) => row.meaning.kind === 'FRESH_BOUNDARY');
  const safeBoundary = matched.filter((row) => row.meaning.kind === 'SAFE_BOUNDARY');

  // Preserve v0.65 priority: primary Fresh candidate, then Fresh boundary, then one unique Safe boundary.
  let accepted = null;
  if (primary.length === 1) accepted = primary[0];
  else if (primary.length === 0 && freshBoundary.length === 1) accepted = freshBoundary[0];
  else if (primary.length === 0 && freshBoundary.length === 0 && safeBoundary.length === 1) accepted = safeBoundary[0];

  const kind = accepted?.meaning?.kind || null;
  const freshAccepted = kind === 'FRESH_PRIMARY' || kind === 'FRESH_BOUNDARY';
  const safeAccepted = kind === 'SAFE_BOUNDARY';
  const policy = kind === 'FRESH_PRIMARY'
    ? 'FRESH_CONFIRMED_SUFFIX'
    : (kind === 'FRESH_BOUNDARY'
      ? 'BOUNDARY_CONFIRMED_SUFFIX'
      : (kind === 'SAFE_BOUNDARY' ? 'SAFE_BOUNDARY_CONFIRMED' : 'MISMATCH'));
  const freshMeta = freshAccepted ? accepted.meaning : null;
  const safeMeta = safeAccepted ? accepted.meaning : null;

  return Object.freeze({
    acceptedCanonicalEquivalent: !!accepted,
    acceptedCandidateId: accepted?.id || null,
    fingerprintMatch: policy,
    freshEnvelopeRecovery: freshAccepted
      ? 'RECOVERED'
      : (p.telemetrySeed.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE'),
    freshEnvelopeSource: freshAccepted ? String(freshMeta.source || 'HOST_RAW_SUFFIX') : null,
    freshEnvelopePolicy: freshAccepted ? (kind === 'FRESH_BOUNDARY' ? 'BOUNDARY_CONFIRMED_SUFFIX' : 'FRESH_CONFIRMED_SUFFIX') : null,
    freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
    freshEnvelopeBoundaryChars: kind === 'FRESH_BOUNDARY' ? Number(freshMeta.chars || 0) : 0,
    freshEnvelopeBoundaryDelta: kind === 'FRESH_BOUNDARY' ? Number(freshMeta.deltaChars || 0) : 0,
    freshEnvelopeBoundaryKind: kind === 'FRESH_BOUNDARY' ? String(freshMeta.boundaryKind || 'CRLF_ONLY') : null,
    freshEnvelopePersistent: 'NONE',
    safeEnvelopeReconcile: safeAccepted
      ? 'CONFIRMED'
      : (p.telemetrySeed.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE'),
    safeEnvelopeSource: safeAccepted ? String(safeMeta.source || 'CANONICAL_BOUNDARY') : null,
    safeEnvelopePolicy: safeAccepted ? 'SAFE_BOUNDARY_CONFIRMED' : null,
    safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
    safeEnvelopeBoundaryChars: safeAccepted ? Number(safeMeta.chars || 0) : 0,
    safeEnvelopeBoundaryDelta: safeAccepted ? Number(safeMeta.deltaChars || 0) : 0,
    safeEnvelopeBoundaryKind: safeAccepted ? String(safeMeta.boundaryKind || 'STRUCTURAL_LF') : null,
    safeEnvelopePersistent: 'NONE',
  });
}
module.exports = {
  classifyPreamble,
  buildSafeEnvelopeBoundaryConfirmation,
  canonicalizeResponseEnvelope,
  normalizeTailPlacement,
  prepareOutput,
  buildFreshObservationPlan,
  interpretFreshObservation,
};
});

SimCore.define("bootstrap-migration", function (require, module, exports) {
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const community = require('./community');
const reaction = require('./reaction');
const outputCompat = require('./output-compat');
const prepareOutput = outputCompat.prepareOutput;

function bootstrapFromHistory(baseState, messages, endIndex = -1) {
  const state = kernel.reconcileState(kernel.clone(baseState || kernel.initialState()));
  if (state.historyBootstrapped) return { state, changed: false, stats: state.historyBootstrapStats };

  state.broadcastLocked = false;
  time.resetBroadcastAirtime(state);
  state.episodeNo = 0;
  state.community = { activationCount: 0, platformMax: {}, lastNormalization: [], classifierVersion: community.COMMUNITY_CLASSIFIER_VERSION };
  state.worldYear = null;
  state.koreanAgeOffset = 0;
  state.narrativeTimestamp = null;
  state.lastMode = 'A';
  state.pending = null;

  const msgs = Array.isArray(messages) ? messages : [];
  const stop = endIndex >= 0 ? Math.min(endIndex, msgs.length - 1) : msgs.length - 1;
  let pending = null;
  let sawCore = false;
  let communityBlocksSeen = 0;
  let completedEpisodes = 0;
  let lastAssistantIndex = -1;

  for (let i = 0; i <= stop; i++) {
    const m = msgs[i] || {};
    const role = m.role;
    const text = kernel.textOfMessage(m);
    if (role === 'user') {
      const c = lifecycle.classifyMode(state, text);
      if (c.hasContinue || c.hasEnd || c.hasStart || c.hasCommunity) sawCore = true;
      const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);
      if (broadcastAirtimeIsNew) time.resetBroadcastAirtime(state);
      time.applyWorldYear(state, time.explicitWorldYear(text));
      pending = {
        mode: c.mode,
        userIndex: i,
        broadcastAirtimeIsNew,
        broadcastAirtimePrevious: /^B_/.test(c.mode) ? (state.broadcastAirtime || null) : null,
        broadcastAirtimeStart: /^B_/.test(c.mode) ? (state.broadcastAirtimeStart || null) : null,
      };
      continue;
    }
    if (role !== 'char' && role !== 'assistant') continue;
    lastAssistantIndex = i;
    if (!pending) pending = { mode: state.broadcastLocked ? 'B_CONTINUE' : 'A', userIndex: i - 1 };

    const prepared = prepareOutput(text, { active: true, mode: pending.mode });
    const cleaned = prepared.envelope.resolved ? prepared.content : kernel.stripControlTags(text);
    const blocks = community.communityBlocks(cleaned);
    if (blocks.length) sawCore = true;
    reaction.recordReactionMaxima(cleaned, state);
    state.community.activationCount += blocks.length;
    communityBlocksSeen += blocks.length;

    if (/^B_/.test(String(pending.mode || ''))) time.commitBroadcastAirtime(state, pending, cleaned);
    else time.syncNarrativeTimestamp(state, cleaned, pending.mode);
    if (pending.mode === 'B_END') {
      if (state.episodeNo === 0) state.episodeNo = 1;
      state.broadcastLocked = false;
      completedEpisodes += 1;
    }
    time.applyWorldYear(state, time.timestampYear(cleaned));
    state.lastMode = pending.mode;
    pending = null;
  }

  state.pending = null;
  state.historyBootstrapped = true;
  state.historyBootstrappedAt = lastAssistantIndex;
  state.historyBootstrapStats = {
    scannedThrough: stop,
    sawCore,
    episodeNo: state.episodeNo,
    completedEpisodes,
    communityBlocks: communityBlocksSeen,
    platformCount: Object.keys(state.community.platformMax).length,
  };
  return { state, changed: true, stats: state.historyBootstrapStats };
}

function repairLegacyAgeClock(state, anchors, latestYear) {
  if (Number(state.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION) return false;
  const rows = Array.isArray(anchors) ? anchors : [];
  let bestInvariant = null;
  for (const row of rows) {
    const y = Number(row?.year);
    const o = Number(row?.offset);
    if (!Number.isFinite(y) || !Number.isFinite(o)) continue;
    const inv = o - y;
    if (bestInvariant == null || inv > bestInvariant) bestInvariant = inv;
  }
  const ly = Number(latestYear);
  const sy = Number(state.worldYear);
  const targetYear = Number.isFinite(ly)
    ? Math.max(Number.isFinite(sy) ? sy : ly, ly)
    : (Number.isFinite(sy) ? sy : null);
  if (targetYear == null || bestInvariant == null) return false;

  let changed = false;
  const expectedOffset = Math.max(0, Math.round(targetYear + bestInvariant));
  if (expectedOffset > Number(state.koreanAgeOffset || 0)) {
    state.koreanAgeOffset = expectedOffset;
    changed = true;
  }
  if (state.worldYear == null || targetYear > Number(state.worldYear)) {
    state.worldYear = targetYear;
    changed = true;
  }
  state.clockRepairVersion = time.CLOCK_REPAIR_VERSION;
  return changed;
}

async function repairLegacyClockState(store, outIndex, content, state) {
  if (Number(state?.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION) return false;
  const anchors = await store.clockAnchorsAtOrBelow(outIndex);
  return repairLegacyAgeClock(state, anchors, time.timestampYear(kernel.stripControlTags(content)));
}

async function repairLatestGlobalFloorContamination(store, current, outIndex, rawState) {
  const rawCommunity = rawState?.community;
  const global = Math.max(0, Math.round(Number(rawCommunity?.globalReactionMax) || 0));
  const events = Array.isArray(rawCommunity?.lastNormalization) ? rawCommunity.lastNormalization : [];
  if (!global || !events.length || !Number.isInteger(outIndex) || outIndex <= 0) return { changed: false, state: current };

  const preRaw = await store.load('pre', outIndex - 1);
  if (!preRaw) return { changed: false, state: current };
  const pre = kernel.reconcileState(kernel.clone(preRaw));
  const next = kernel.reconcileState(kernel.clone(current));
  let changed = false;
  for (const ev of events) {
    const key = String(ev?.platform || '');
    if (!key) continue;
    const eventHistorical = Math.max(0, Math.round(Number(ev?.historicalMax ?? ev?.historicalFamilyMax) || 0));
    const priorFamily = Math.max(0, Math.round(Number(pre.community?.platformMax?.[key]) || 0));
    const currentFamily = Math.max(0, Math.round(Number(next.community?.platformMax?.[key]) || 0));
    if (eventHistorical > priorFamily && currentFamily > priorFamily) {
      next.community.platformMax[key] = priorFamily;
      changed = true;
    }
  }
  if (changed) {
    next.community.lastNormalization = [];
    next.globalFloorRepairVersion = 1;
    await store.save('out', outIndex, next);
  }
  return { changed, state: next };
}

module.exports = {
  bootstrapFromHistory,
  repairLegacyAgeClock,
  repairLegacyClockState,
  repairLatestGlobalFloorContamination,
};
});

SimCore.define("recovery", function (require, module, exports) {
const outputCompat = require('./output-compat');
const bootstrapMigration = require('./bootstrap-migration');

module.exports = {
  classifyPreamble: outputCompat.classifyPreamble,
  buildSafeEnvelopeBoundaryConfirmation: outputCompat.buildSafeEnvelopeBoundaryConfirmation,
  canonicalizeResponseEnvelope: outputCompat.canonicalizeResponseEnvelope,
  normalizeTailPlacement: outputCompat.normalizeTailPlacement,
  prepareOutput: outputCompat.prepareOutput,
  bootstrapFromHistory: bootstrapMigration.bootstrapFromHistory,
  repairLegacyAgeClock: bootstrapMigration.repairLegacyAgeClock,
  repairLegacyClockState: bootstrapMigration.repairLegacyClockState,
  repairLatestGlobalFloorContamination: bootstrapMigration.repairLatestGlobalFloorContamination,
};
});

SimCore.define("prompt", function (require, module, exports) {
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const recurrence = require('./recurrence');

const PROMPT_COMPILER_VERSION = 3;

function compileStableContract() {
  return [
    '[SIMCORE CORE STATE — AUTHORITATIVE]',
    'required_frame=응답,볼륨,챕터,Chatindex,timestamp',
    'response_envelope=exactly_one_no_restart',
    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',
    'reference_sources=character_card+currently_exposed_lore_if_present',
    'character_world_facts_use_reference_sources=1',
    'knowledge_required=1',
    'knowledge_position=final_output_block',
    'required_knowledge_block=exactly_one_complete_<Knowledge>...</Knowledge>',
    'community_format_contract_condition=community_blocks_expected>0',
    'community_comment_shape=4_top_level+1_nested_reply_exactly',
    'reaction_required=each_comment_and_reply',
    'reaction_floor_scope=per_platform_family',
    'reaction_history_shared_across_modes=1',
  ];
}

function compileSlowState(s, p) {
  const lines = [
    `korean_age_offset=+${s.koreanAgeOffset}`,
  ];
  if (Number(s.koreanAgeOffset || 0) > 0) {
    lines.push(`current_korean_age=character_reference_age+${s.koreanAgeOffset};past_event_age_not_current=1`);
  }
  lines.push(`world_year=${s.worldYear ?? 'unknown'}`);
  lines.push(`secondary_configured=${p.secondaryConfigured ? 1 : 0}`);
  lines.push(`secondary_active=${p.secondaryActive ? 1 : 0}`);
  lines.push(`episode_no=${s.episodeNo}`);
  return lines;
}

function compileModeState(s, p, communityExpected) {
  return [
    `mode=${p.mode}`,
    `broadcast_locked=${s.broadcastLocked ? 1 : 0}`,
    `community_blocks_expected=${communityExpected}`,
  ];
}

function broadcastEndAuthority(s, p) {
  const mode = String(p?.mode || '');
  if (mode === 'B_END') {
    return Object.freeze({ session: 'ENDING', authority: 'ALLOWED', reason: 'explicit-b-end' });
  }
  if (s?.broadcastLocked) {
    return Object.freeze({
      session: 'OPEN',
      authority: 'DENIED',
      reason: /^B_/.test(mode) ? 'active-broadcast' : 'inherited-open-broadcast',
    });
  }
  return Object.freeze({ session: 'CLOSED', authority: 'NOT_APPLICABLE', reason: 'no-open-broadcast' });
}

function compileConditionalGuidance(s, p, communityExpected) {
  const lines = [];
  const endAuthority = broadcastEndAuthority(s, p);
  if (endAuthority.authority === 'DENIED') {
    lines.push('broadcast_session_state=OPEN');
    lines.push('broadcast_end_authority=DENIED');
    lines.push('episode_end_authority=DENIED');
    lines.push('broadcast_end_requires_explicit_B_END_lifecycle=1');
    lines.push('do_not_narrate_or_imply_broadcast_or_episode_end=1');
    lines.push('scene_segment_mission_vote_or_player_departure_completion_does_not_authorize_episode_end=1');
    lines.push('broadcast_end_boundary_applies_to=broadcast_prose+COMMUNITY+Knowledge');
  } else if (endAuthority.authority === 'ALLOWED') {
    lines.push('broadcast_session_state=ENDING');
    lines.push('broadcast_end_authority=ALLOWED');
    lines.push('episode_end_authority=ALLOWED');
    lines.push('broadcast_end_basis=explicit_B_END_lifecycle');
  }
  if (p.mode === 'C') lines.push('mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1');
  const currentTimelineAnchor = p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious || null;
  if (!/^B_/.test(String(p.mode || '')) && currentTimelineAnchor) {
    lines.push(`current_timeline_anchor=${currentTimelineAnchor}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
  if (p.mode === 'C' && (p.postBEndClockDisposition === 'APPLIED' || p.postBEndClockDisposition === 'ALREADY_SATISFIED')) {
    lines.push(`post_b_end_current_time_floor=${p.postBEndClockFloor || currentTimelineAnchor}`);
    lines.push(`post_b_end_clock_handoff=${p.postBEndClockDisposition}`);
    lines.push('post_b_end_floor_is_current_frame_minimum_only=1;broadcast_airtime_is_not_depicted_event_time=1');
    lines.push('explicit_user_requested_past_scene_or_flashback_may_predate_post_b_end_floor=1');
  }
  if (!/^B_/.test(String(p.mode || ''))) {
    lines.push('narrative_tail_time_contract=1;current_scene_time_advancement_requires_canonical_timestamp_line=1');
    lines.push('terminal_current_time_must_be_explicit_when_changed_from_frame=1;do_not_leave_current_time_advancement_only_in_prose=1');
    lines.push('user_stated_later_current_or_end_time_must_be_rendered_as_current_canonical_timestamp=1');
  }
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
    lines.push('timestamp_semantics=current_narrative_time');
    lines.push('embedded_preview_flashback_or_event_time_does_not_replace_current_timestamp=1');
    lines.push(`narrative_progression_hint=${p.narrativeProgressionReason || 'forward'}`);
    if (p.narrativeCalendarTarget?.eligible && p.narrativeCalendarTarget?.targetDate) {
      lines.push(`narrative_calendar_target=${p.narrativeCalendarTarget.targetDate}`);
      lines.push(`narrative_calendar_weekday=${p.narrativeCalendarTarget.weekday || 'unknown'}`);
      lines.push('narrative_calendar_target_is_current_date=1;time_of_day_unspecified_by_calendar_target=1');
    }
    if (p.narrativeClockGuard && (p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious)) {
      lines.push(`narrative_timestamp_previous=${p.narrativeTimestampPrevious || 'n/a'}`);
      lines.push(`narrative_current_time_floor=${p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious}`);
      lines.push('narrative_timestamp_must_not_precede_current_time_floor=1');
    }
  }
  if (/^B_/.test(String(p.mode || ''))) {
    lines.push('mode_b_timestamp_semantics=broadcast_airtime');
    lines.push('mode_b_timestamp_is_not=depicted_scene_or_event_time');
    lines.push('broadcast_airtime_progression=advance_only_by_elapsed_program_runtime');
    lines.push('depicted_scene_time_may_jump_hours_or_days_without_copying_that_jump_to_broadcast_airtime=1');
    lines.push(`broadcast_airtime_previous=${p.broadcastAirtimePrevious || 'unknown'}`);
    lines.push(`broadcast_airtime_start=${p.broadcastAirtimeStart || 'unknown'}`);
    if (p.broadcastAirtimePrevious) lines.push('broadcast_airtime_must_not_precede_previous=1');
    const elapsed = time.elapsedMinutes(p.broadcastAirtimeStart, p.broadcastAirtimePrevious);
    if (elapsed != null && elapsed >= 0) lines.push(`broadcast_airtime_elapsed_program_minutes=${elapsed}`);
    if (p.mode === 'B_END') {
      lines.push('broadcast_end_closure_contract=1;broadcast_end_always_emit_terminal_canonical_timestamp_line=1');
      lines.push('broadcast_terminal_timestamp_means_final_current_broadcast_airtime=1;do_not_leave_broadcast_end_time_only_in_prose=1');
    }
  }
  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
  if (p.summaryScope === 'ANNUAL_ONLY' && Number.isInteger(Number(p.summaryTargetYear))) {
    lines.push('summary_scope=ANNUAL_ONLY');
    lines.push(`summary_target_year=${Number(p.summaryTargetYear)}`);
    lines.push('summary_temporal_authority=TARGET_YEAR_ONLY');
    lines.push('target_year_achievement_authority=1;prior_year_achievement_as_target_year_achievement=forbidden');
    lines.push('historical_context_allowed=1;historical_context_must_be_labeled=1');
    lines.push('ongoing_role_prior_start_date_allowed_as_metadata=1;ongoing_role_target_year_activity_is_authoritative=1');
    lines.push('year_end_cumulative_snapshot_allowed=1;year_end_cumulative_snapshot_must_be_labeled=1');
    lines.push('do_not_replace_missing_target_year_achievement_with_older_achievement=1;requested_category_coverage_required=1');
  } else if (p.summaryScope === 'CUMULATIVE_YOY'
      && Number.isInteger(Number(p.summaryTargetYear))
      && Number.isInteger(Number(p.summaryComparisonYear))) {
    lines.push('summary_scope=CUMULATIVE_YOY');
    lines.push(`summary_target_year=${Number(p.summaryTargetYear)}`);
    lines.push(`summary_comparison_year=${Number(p.summaryComparisonYear)}`);
    lines.push('summary_temporal_authority=YEAR_END_BASELINE_COMPARE');
    lines.push('for_each_requested_metric_require=previous_value,current_value,absolute_delta,percentage_delta');
    lines.push('comparison_baseline_must_equal_requested_previous_year_end=1;older_historical_value_cannot_replace_comparison_baseline=1');
    lines.push('same_metric_baseline_consistency_required=1');
    lines.push('lifetime_origin_value_allowed_as_secondary_context=1;lifetime_growth_cannot_replace_requested_yoy_growth=1');
  }
  if (p.summaryScope && p.summaryScope !== 'NONE') {
    lines.push('summary_scope_authority_over_recurrence_factual_content=1;recurrence_is_structure_style_guidance_only=1');
    lines.push('reevaluate_summary_facts_from_current_target_scope=1');
  }
  if (p.mode === 'C' && p.communitySourceHandoffEligible) {
    const sourceRootMode = p.communitySourceHandoffRootMode || 'unknown';
    const sourceRootIndex = Number.isInteger(Number(p.communitySourceHandoffRootIndex)) && Number(p.communitySourceHandoffRootIndex) >= 0
      ? Number(p.communitySourceHandoffRootIndex)
      : 'unknown';
    lines.push('short_community_request_context_is_current_lineage=1');
    lines.push('short_community_source_selector=current_lineage_root_turn');
    lines.push(`short_community_source_root_mode=${sourceRootMode}`);
    lines.push(`short_community_source_root_index=${sourceRootIndex}`);
    lines.push('short_community_source_is_authoritative=1');
    lines.push('current_root_evidence=CURRENT_ROOT_EVIDENCE_when_present;root_explicit_facts_highest_authority=1');
    lines.push('current_source_evidence=CURRENT_SOURCE_EVIDENCE_when_present;rendered_context_only_when_conflicting_with_root=1');
    lines.push('event_fact_precedence=CURRENT_ROOT_EVIDENCE>current_lineage_root>CURRENT_SOURCE_EVIDENCE>prior_similar_history');
    lines.push('do_not_substitute_prior_similar_source_or_prior_community_answer=1');
    lines.push('source_event_identity_and_facts=current_root_first;do_not_import_prior_similar_event_details=1');
    lines.push('abstract_generalization_from_current_root_allowed=1;stable_character_world_background_allowed_as_context_not_event_evidence=1;reaction_opinion_joke_tone_emphasis_free=1');
    lines.push('specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support;CURRENT_SOURCE_EVIDENCE_may_support_only_nonconflicting_rendered_details=1;outside_root_specifics_omit=1');
    lines.push('outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1');
    if (p.communitySourceHandoffNewSource) {
      lines.push(`short_community_request_reused_with_new_source=${sourceRootMode}`);
      lines.push('derive_reaction_from_current_source_not_prior_answer=1');
    }
  }
  if (communityExpected > 0) {
    lines.push('platform_groups_required=3_distinct');
    lines.push('platform_group_reuse_forbidden=1');
    if (/^B_/.test(p.mode)) lines.push('community_placement=after_broadcast_prose');
    if (p.mode === 'B_END') {
      lines.push('b_end_output_order=broadcast_prose_then_scene_community_then_episode_community');
      lines.push('b_end_communities_must_be_contiguous_at_end=1');
      lines.push('b_end_platform_groups_required=6_distinct_across_blocks');
      lines.push('b_end_cross_block_group_reuse_forbidden=1');
      lines.push('b_end_block_shape=2_community_blocks_x_3_platform_sections_each');
      lines.push('b_end_one_community_block_with_6_platform_sections_is_invalid=1');
    }
    lines.push('knowledge_after_last_community=1');
  }
  return lines;
}

function stableRecordJson(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const ordered = {};
  for (const key of Object.keys(source).sort()) ordered[key] = source[key];
  return JSON.stringify(ordered);
}

function compileHotState(s, communityExpected) {
  return communityExpected > 0
    ? [`reaction_max=${stableRecordJson(s.community.platformMax)}`]
    : [];
}

function compileFooter(communityExpected) {
  return [
    `final_required_blocks=COMMUNITY:${communityExpected},Knowledge:1_last`,
    '[/SIMCORE CORE STATE]',
  ];
}

function compileRuntimePromptParts(state) {
  const s = kernel.reconcileState(state);
  const p = s.pending;
  if (!p?.active) {
    return Object.freeze({
      text: '',
      identityTiers: Object.freeze({ stable: '', slow: '', volatile: '' }),
      endAuthority: Object.freeze({ session: 'CLOSED', authority: 'NOT_APPLICABLE', reason: 'inactive' }),
    });
  }
  const communityExpected = lifecycle.expectedCommunityBlocks(p.mode);
  const stableLines = compileStableContract();
  const slowLines = compileSlowState(s, p);
  const modeLines = compileModeState(s, p, communityExpected);
  const conditionalLines = compileConditionalGuidance(s, p, communityExpected);
  const hotLines = compileHotState(s, communityExpected);
  const footerLines = compileFooter(communityExpected);
  const volatileLines = [modeLines, conditionalLines, hotLines, footerLines].flat();
  const text = [stableLines, slowLines, modeLines, conditionalLines, hotLines, footerLines].flat().join('\n');
  return Object.freeze({
    text,
    identityTiers: Object.freeze({
      stable: stableLines.join('\n'),
      slow: slowLines.join('\n'),
      volatile: volatileLines.join('\n'),
    }),
    endAuthority: broadcastEndAuthority(s, p),
  });
}

function compileRuntimePrompt(state) {
  return compileRuntimePromptParts(state).text;
}

function renderRuntimePrompt(state) {
  return compileRuntimePrompt(state);
}

module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };
});

SimCore.define("edit-reconcile", function (require, module, exports) {
const kernel = require('./kernel');
const time = require('./time');
const outputCompat = require('./output-compat');
const bootstrapMigration = require('./bootstrap-migration');
const outputFinalize = require('./output-finalize');

function reconcileNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function reconcileElapsed(start) { return Math.max(0, reconcileNow() - start); }

async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null) {

    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.path = 'unknown';
      detail.fingerprintMs = 0;
      detail.compatibilityMs = 0;
      detail.compatibilitySource = '';
      detail.savedOutLoadMs = 0;
      detail.sendLoadMs = 0;
      detail.prepareMs = 0;
      detail.finalizeMs = 0;
      detail.clockRepairMs = 0;
      detail.stateSyncMs = 0;
      detail.outSerializeMs = 0;
      detail.outSetMs = 0;
      detail.outPruneMs = 0;
      detail.didSave = false;
    }
    if (!Number.isInteger(outIndex) || outIndex < 0) {
      if (detail) detail.path = 'no-output';
      return { changed: false, reason: 'no-output' };
    }

    let t = reconcileNow();
    const actualFingerprint = kernel.fingerprintText(content);
    if (detail) detail.fingerprintMs = reconcileElapsed(t);

    // Stable fast paths: PocketRisu may retain either the canonical handler result or the raw
    // model output passed into the handler. Both are generation-time fingerprints, so neither
    // representation is a manual edit. A true edit matches neither and falls through to snapshots.
    if (session.current?.outputFingerprint
        && session.current.outputFingerprint === actualFingerprint
        && session.trustedOutputFingerprint === actualFingerprint) {
      const airtimeSeeded = session.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = session.seedNarrativeTimestampFromVisible(content);
      const seeded = airtimeSeeded || narrativeSeeded;
      if (detail) { detail.path = airtimeSeeded ? 'same-fast+airtime-seed' : (narrativeSeeded ? 'same-fast+narrative-seed' : 'same-fast'); detail.compatibilitySource = 'canonical'; }
      return { changed: false, reason: seeded ? (airtimeSeeded ? 'same-fast+airtime-seed' : 'same-fast+narrative-seed') : 'same-fast' };
    }
    if (session.current?.hostOutputFingerprint
        && session.current.hostOutputFingerprint === actualFingerprint
        && session.trustedHostOutputFingerprint === actualFingerprint) {
      const airtimeSeeded = session.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = session.seedNarrativeTimestampFromVisible(content);
      const seeded = airtimeSeeded || narrativeSeeded;
      if (detail) { detail.path = airtimeSeeded ? 'same-host-fast+airtime-seed' : (narrativeSeeded ? 'same-host-fast+narrative-seed' : 'same-host-fast'); detail.compatibilitySource = 'host-raw'; }
      return { changed: false, reason: seeded ? (airtimeSeeded ? 'same-host-fast+airtime-seed' : 'same-host-fast+narrative-seed') : 'same-host-fast' };
    }

    t = reconcileNow();
    const savedOut = await session.store.load('out', outIndex);
    if (detail) detail.savedOutLoadMs = reconcileElapsed(t);
    if (!savedOut) {
      if (detail) detail.path = 'no-snapshot';
      return { changed: false, reason: 'no-snapshot' };
    }

    // Reload-safe direct match against either representation already persisted by v0.62.9+.
    // Keep legacy clock/state migration semantics intact: only skip the old recovery branch when
    // this snapshot is already on the current repaired state contract.
    const savedFastSafe = Number(savedOut.stateVersion || 0) >= kernel.STATE_VERSION
      && Number(savedOut.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION;
    if (savedFastSafe && (savedOut.outputFingerprint === actualFingerprint || savedOut.hostOutputFingerprint === actualFingerprint)) {
      t = reconcileNow();
      const same = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += reconcileElapsed(t);
      session.current = same;
      session.currentOutputIndex = outIndex;
      session.trustedOutputFingerprint = same.outputFingerprint || null;
      session.trustedHostOutputFingerprint = same.hostOutputFingerprint || null;
      session.loadedFromLegacySnapshot = false;
      const airtimeSeeded = session.seedBroadcastAirtimeFromVisible(content);
      const narrativeSeeded = session.seedNarrativeTimestampFromVisible(content);
      const hostMatch = savedOut.hostOutputFingerprint === actualFingerprint;
      if (detail) {
        detail.path = airtimeSeeded
          ? (hostMatch ? 'same-host-snapshot+airtime-seed' : 'same-snapshot+airtime-seed')
          : (narrativeSeeded ? (hostMatch ? 'same-host-snapshot+narrative-seed' : 'same-snapshot+narrative-seed') : (hostMatch ? 'same-host-snapshot' : 'same-snapshot'));
        detail.compatibilitySource = hostMatch ? 'host-raw' : 'canonical';
      }
      return { changed: false, reason: detail?.path || (hostMatch ? 'same-host-snapshot' : 'same-snapshot') };
    }

    t = reconcileNow();
    const sendForEnvelope = await session.store.load('send', outIndex - 1);
    if (detail) detail.sendLoadMs = reconcileElapsed(t);
    if (sendForEnvelope?.pending?.active) {
      t = reconcileNow();
      const prepared = outputCompat.prepareOutput(content, sendForEnvelope.pending);
      if (detail) detail.prepareMs += reconcileElapsed(t);

      // Legacy migration/compatibility check: deterministically replay the normal finalize step
      // in memory. If the raw PocketRisu representation resolves to the fingerprint already
      // committed for this output, it was not a user edit. Do not rewrite snapshots or prune.
      if (prepared.envelope.resolved && savedOut.outputFingerprint) {
        t = reconcileNow();
        const compatibilityResult = outputFinalize.finalizePreparedOutput(sendForEnvelope, prepared, outIndex);
        const compatibleFingerprint = kernel.fingerprintText(compatibilityResult.content);
        if (detail) detail.compatibilityMs += reconcileElapsed(t);
        if (compatibleFingerprint === savedOut.outputFingerprint) {
          const same = kernel.reconcileState(savedOut);
          same.hostOutputFingerprint = actualFingerprint;
          // Preserve legacy clock-repair semantics even though the output itself is proven equivalent.
          t = reconcileNow();
          const clockRepaired = await bootstrapMigration.repairLegacyClockState(session.store, outIndex, compatibilityResult.content, same);
          if (detail) detail.clockRepairMs += reconcileElapsed(t);
          session.current = same;
          session.currentOutputIndex = outIndex;
          session.trustedOutputFingerprint = same.outputFingerprint || null;
          session.trustedHostOutputFingerprint = actualFingerprint;
          session.loadedFromLegacySnapshot = false;
          if (detail) {
            detail.path = clockRepaired ? 'host-compatible-clock-repaired' : 'host-compatible';
            detail.compatibilitySource = 'replayed-canonical';
          }
          return { changed: !!clockRepaired, reason: clockRepaired ? 'host-compatible-clock-repaired' : 'host-compatible' };
        }
      }

      if (prepared.envelope.repaired && prepared.envelope.resolved) {
        t = reconcileNow();
        const repairedResult = outputFinalize.finalizePreparedOutput(sendForEnvelope, prepared, outIndex, { normalizeReactions: false });
        if (detail) detail.finalizeMs += reconcileElapsed(t);
        t = reconcileNow();
        await bootstrapMigration.repairLegacyClockState(session.store, outIndex, prepared.content, repairedResult.state);
        if (detail) detail.clockRepairMs += reconcileElapsed(t);
        t = reconcileNow();
        repairedResult.state.outputFingerprint = kernel.fingerprintText(repairedResult.content);
        repairedResult.state.hostOutputFingerprint = actualFingerprint;
        repairedResult.state.envelopeRepairVersion = 1;
        repairedResult.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
        if (detail) detail.stateSyncMs += reconcileElapsed(t);
        const saveMetric = {};
        await session.store.save('out', outIndex, repairedResult.state, detail ? { metric: saveMetric } : {});
        if (detail) {
          detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
          detail.outSetMs += Number(saveMetric.setMs || 0);
          detail.outPruneMs += Number(saveMetric.pruneMs || 0);
          detail.didSave = true;
          detail.path = 'duplicate-envelope-state-repaired';
        }
        session.current = repairedResult.state;
        session.currentOutputIndex = outIndex;
        session.trustedOutputFingerprint = repairedResult.state.outputFingerprint || null;
        session.trustedHostOutputFingerprint = actualFingerprint;
        session.loadedFromLegacySnapshot = false;
        return { changed: true, reason: 'duplicate-envelope-state-repaired', mode: repairedResult.mode, revision: repairedResult.state.manualEditRevision };
      }
    }

    if (!savedOut.outputFingerprint) {
      t = reconcileNow();
      const baseline = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += reconcileElapsed(t);
      t = reconcileNow();
      const repaired = await bootstrapMigration.repairLegacyClockState(session.store, outIndex, content, baseline);
      if (detail) detail.clockRepairMs += reconcileElapsed(t);
      t = reconcileNow();
      const clockChanged = time.applyWorldYear(baseline, time.timestampYear(kernel.stripControlTags(content)));
      const narrativeClockChanged = time.syncNarrativeTimestamp(baseline, kernel.stripControlTags(content), baseline.lastMode);
      baseline.outputFingerprint = actualFingerprint;
      baseline.hostOutputFingerprint = actualFingerprint;
      if (detail) detail.stateSyncMs += reconcileElapsed(t);
      const saveMetric = {};
      await session.store.save('out', outIndex, baseline, detail ? { metric: saveMetric } : {});
      if (detail) {
        detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
        detail.outSetMs += Number(saveMetric.setMs || 0);
        detail.outPruneMs += Number(saveMetric.pruneMs || 0);
        detail.didSave = true;
        detail.path = repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'baseline-created');
      }
      session.current = baseline;
      session.currentOutputIndex = outIndex;
      session.trustedOutputFingerprint = baseline.outputFingerprint || null;
      session.trustedHostOutputFingerprint = baseline.hostOutputFingerprint || null;
      session.loadedFromLegacySnapshot = false;
      return { changed: repaired || clockChanged || narrativeClockChanged, reason: repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'baseline-created') };
    }

    if (savedOut.outputFingerprint === actualFingerprint) {
      t = reconcileNow();
      const same = kernel.reconcileState(savedOut);
      if (detail) detail.stateSyncMs += reconcileElapsed(t);
      t = reconcileNow();
      const repaired = await bootstrapMigration.repairLegacyClockState(session.store, outIndex, content, same);
      if (detail) detail.clockRepairMs += reconcileElapsed(t);
      t = reconcileNow();
      const clockChanged = time.applyWorldYear(same, time.timestampYear(kernel.stripControlTags(content)));
      const narrativeClockChanged = time.syncNarrativeTimestamp(same, kernel.stripControlTags(content), same.lastMode);
      if (detail) detail.stateSyncMs += reconcileElapsed(t);
      if (repaired || clockChanged || narrativeClockChanged) {
        const saveMetric = {};
        await session.store.save('out', outIndex, same, detail ? { metric: saveMetric } : {});
        if (detail) {
          detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
          detail.outSetMs += Number(saveMetric.setMs || 0);
          detail.outPruneMs += Number(saveMetric.pruneMs || 0);
          detail.didSave = true;
        }
      }
      if (detail) detail.path = repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'same');
      session.current = same;
      session.currentOutputIndex = outIndex;
      session.trustedOutputFingerprint = same.outputFingerprint || null;
      session.trustedHostOutputFingerprint = same.hostOutputFingerprint || null;
      session.loadedFromLegacySnapshot = false;
      return { changed: repaired || clockChanged || narrativeClockChanged, reason: repaired ? 'clock-repaired' : ((clockChanged || narrativeClockChanged) ? 'clock-synced' : 'same') };
    }

    if (!sendForEnvelope) {
      if (detail) detail.path = 'no-send-snapshot';
      return { changed: false, reason: 'no-send-snapshot' };
    }
    t = reconcileNow();
    const prepared = outputCompat.prepareOutput(content, sendForEnvelope.pending);
    if (detail) detail.prepareMs += reconcileElapsed(t);
    t = reconcileNow();
    const result = outputFinalize.finalizePreparedOutput(sendForEnvelope, prepared, outIndex, { normalizeReactions: false });
    if (detail) detail.finalizeMs += reconcileElapsed(t);
    t = reconcileNow();
    await bootstrapMigration.repairLegacyClockState(session.store, outIndex, result.content, result.state);
    if (detail) detail.clockRepairMs += reconcileElapsed(t);
    t = reconcileNow();
    result.state.outputFingerprint = kernel.fingerprintText(result.content);
    result.state.hostOutputFingerprint = actualFingerprint;
    result.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
    if (detail) detail.stateSyncMs += reconcileElapsed(t);
    const saveMetric = {};
    await session.store.save('out', outIndex, result.state, detail ? { metric: saveMetric } : {});
    if (detail) {
      detail.outSerializeMs += Number(saveMetric.serializeMs || 0);
      detail.outSetMs += Number(saveMetric.setMs || 0);
      detail.outPruneMs += Number(saveMetric.pruneMs || 0);
      detail.didSave = true;
      detail.path = 'manual-edit-rebuilt';
    }
    session.current = result.state;
    session.currentOutputIndex = outIndex;
    session.trustedOutputFingerprint = result.state.outputFingerprint || null;
    session.trustedHostOutputFingerprint = actualFingerprint;
    session.loadedFromLegacySnapshot = false;
    return { changed: true, mode: result.mode || result.state.lastMode, revision: result.state.manualEditRevision };
  
}

async function reconcileVisiblePreviousAssistant(cs, chat, perfDetail = null, deps = {}) {
  const { coreRules, textMessageContent, representationRegistry, representationRules, coreLocationKey, SIMCORE_LOG_PREFIX, reconcileSession } = deps;

    const msgs = chat?.message || [];
    let lastAssistant = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === 'char' || msgs[i]?.role === 'assistant') { lastAssistant = i; break; }
    }
    if (lastAssistant < 0) {
      if (perfDetail) perfDetail.path = 'no-assistant';
      return;
    }
    const visibleContent = textMessageContent(msgs[lastAssistant]);
    const visibleFingerprint = coreRules.fingerprintText(visibleContent);
    const priorProvenance = representationRegistry.latest(lastAssistant, coreLocationKey);
    const relation = representationRules.inspectCarryover(visibleFingerprint, priorProvenance);
    const { priorCanonical, priorFresh, priorHostRaw, priorMatch, priorRepresentation, currentMatch } = relation;
    if (perfDetail) {
      perfDetail.editPriorRepresentation = priorRepresentation;
      perfDetail.editPriorMatch = priorMatch || 'n/a';
      perfDetail.editPriorCanonical = priorCanonical || 'n/a';
      perfDetail.editPriorFresh = priorFresh || 'n/a';
      perfDetail.editCurrentFingerprint = visibleFingerprint || 'n/a';
      perfDetail.editCurrentMatch = currentMatch;
      perfDetail.editDeltaCanonical = relation.deltaCanonical;
      perfDetail.editDeltaFresh = relation.deltaFresh;
      perfDetail.editOrigin = 'PENDING';
      perfDetail.editDeltaShape = 'UNCLASSIFIED';
    }
    // v0.63.55: the Deferred Mirror already observed the host-visible previous assistant.
    // If that exact Fresh representation carries into the next request, it is a proven
    // representation alias for this slot/location, not a third unknown body. Keep the
    // canonical state untouched and skip the expensive snapshot/manual-edit rebuild.
    const representationFastEligible = !!(
      priorProvenance
      && priorRepresentation === 'OUTPUT_MISMATCH'
      && currentMatch === 'FRESH_CHAT'
      && !!priorCanonical
      && !!priorFresh
      && priorCanonical !== priorFresh
      && visibleFingerprint === priorFresh
      && Number(cs.currentOutputIndex) === lastAssistant
      && String(cs.current?.outputFingerprint || '') === priorCanonical
      && String(cs.trustedOutputFingerprint || '') === priorCanonical
    );
    let r;
    if (representationFastEligible) {
      if (perfDetail) {
        perfDetail.path = 'representation-fast-reconciled';
        perfDetail.compatibilitySource = 'fresh-exact-carryover';
      }
      r = {
        changed: false,
        reason: 'representation-fast-reconciled',
        representationFastReconciled: true,
      };
    } else {
      r = await reconcileSession(lastAssistant, visibleContent, perfDetail);
    }
    if (perfDetail) {
      let editOrigin = 'NONE';
      let deltaShape = relation.deltaShape;
      if (r.representationFastReconciled) {
        editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';
      } else if (r.changed) {
        if (!priorProvenance) editOrigin = 'UNKNOWN';
        else if (priorRepresentation === 'OUTPUT_MISMATCH' && currentMatch === 'FRESH_CHAT') editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';
        else if (priorRepresentation === 'EXACT') editOrigin = 'USER_EDIT_CANDIDATE';
        else editOrigin = 'AMBIGUOUS_CHANGE';
      }
      perfDetail.editOrigin = editOrigin;
      perfDetail.editDeltaShape = deltaShape;
    }
    if (r.changed) console.log(SIMCORE_LOG_PREFIX + ' manual edit reconciled:', lastAssistant, r.mode, r.revision);
  
}

module.exports = { reconcileSessionEditedOutput, reconcileVisiblePreviousAssistant };
});

SimCore.define("output-finalize", function (require, module, exports) {
const kernel = require('./kernel');
const time = require('./time');
const frame = require('./frame');
const reaction = require('./reaction');
const structure = require('./structure');

function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {
  const state = kernel.reconcileState(kernel.clone(baseState));
  const p = state.pending;
  if (!p?.active) {
    state.pending = null;
    return { state, content: String(prepared?.content || ''), active: false, envelopeIssues: [], stateCommit: { communitySafe: false } };
  }

  let finalText = String(prepared?.content || '');
  const frameGuard = frame.enforceContinuity(finalText, p.frameFloor || null);
  finalText = frameGuard.content;
  const timestampCanonicalization = time.canonicalizeTimestampSyntax(finalText);
  finalText = timestampCanonicalization.content;
  const envelope = prepared?.envelope || { resolved: true, issues: [], diagnostics: [], repaired: false };
  const commit = structure.stateCommitSafety(finalText, p, envelope.resolved);
  state.community.lastNormalization = [];
  if (commit.communitySafe) {
    if (opts.normalizeReactions === false) reaction.recordReactionMaxima(finalText, state);
    else finalText = reaction.normalizeReactionNumbers(finalText, state);
    state.community.activationCount += commit.expectedBlocks;
  } else {
    state.lastOutputQuarantine = {
      outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      reason: commit.reason,
      observedBlocks: commit.observedBlocks,
      expectedBlocks: commit.expectedBlocks,
    };
  }

  let calendarRepair = null;
  let sceneRolloverRepair = null;
  let narrativeFloor = null;
  if (!/^B_/.test(String(p.mode || ''))) {
    calendarRepair = time.enforceNarrativeCalendarTarget(finalText, p.narrativeCalendarTarget || null);
    finalText = calendarRepair.content;
    sceneRolloverRepair = time.repairNarrativeYearRolloverSequence(finalText, p.narrativeCalendarTarget || null);
    finalText = sceneRolloverRepair.content;
    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(
      finalText,
      p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious || state.narrativeTimestamp || null,
    );
    finalText = narrativeFloor.content;
  }
  time.applyWorldYear(state, time.timestampYear(finalText));
  let narrativeClockProbe = null;
  if (!/^B_/.test(String(p.mode || ''))) {
    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);
    time.applyWorldYear(state, time.timestampYear(narrativeCommit.timestamp));
    const previousNarrative = narrativeCommit.previous || p.narrativeTimestampPrevious || null;
    const narrativeCmp = narrativeCommit.timestamp && previousNarrative
      ? time.compareTimestamps(narrativeCommit.timestamp, previousNarrative)
      : null;
    let narrativeCommitStatus = 'UNKNOWN';
    if (narrativeFloor?.changed) narrativeCommitStatus = 'FLOOR CLAMPED';
    else if (narrativeCommit.reason === 'backward') narrativeCommitStatus = 'REJECTED BACKWARD';
    else if (narrativeCommit.reason === 'missing-or-invalid') narrativeCommitStatus = 'MISSING TIMESTAMP';
    else if (narrativeCommit.reason === 'committed' && !previousNarrative) narrativeCommitStatus = 'SEEDED';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp < 0) narrativeCommitStatus = 'BACKWARD OBSERVED';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp === 0) narrativeCommitStatus = 'SAME';
    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp > 0) narrativeCommitStatus = 'ADVANCED';
    else if (narrativeCommit.reason === 'committed') narrativeCommitStatus = narrativeCommit.changed ? 'COMMITTED' : 'SAME';
    narrativeClockProbe = {
      sendIndex: Number.isInteger(Number(p.sendIndex)) ? Number(p.sendIndex) : -1,
      outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      mode: p.mode || null,
      guardActive: !!p.narrativeClockGuard,
      trigger: p.narrativeProgressionReason || 'none',
      calendarEligible: !!p.narrativeCalendarTarget?.eligible,
      calendarReason: p.narrativeCalendarTarget?.reason || 'INELIGIBLE',
      calendarPreviousDate: p.narrativeCalendarTarget?.previousDate || null,
      calendarTargetDate: p.narrativeCalendarTarget?.targetDate || null,
      calendarWeekday: p.narrativeCalendarTarget?.weekday || null,
      calendarObservedTimestamp: calendarRepair?.observedTimestamp || null,
      calendarOutputTimestamp: calendarRepair?.outputTimestamp || null,
      calendarFrameChanged: !!calendarRepair?.changed,
      calendarDateChanged: !!calendarRepair?.dateChanged,
      calendarWeekdayChanged: !!calendarRepair?.weekdayChanged,
      sceneRolloverCount: Number(sceneRolloverRepair?.count || 0),
      previousAnchor: previousNarrative,
      observedTimestamp: narrativeFloor?.observed || narrativeCommit.frameTimestamp || narrativeCommit.timestamp || null,
      frameTimestamp: narrativeCommit.frameTimestamp || narrativeFloor?.observed || narrativeCommit.timestamp || null,
      outputTimestamp: narrativeCommit.timestamp || null,
      sceneCount: Number(narrativeCommit.sceneCount || 0),
      sequenceCount: Number(narrativeCommit.sequenceCount || 0),
      tailStatus: narrativeCommit.tailStatus || 'n/a',
      tailPromoted: !!narrativeCommit.tailPromoted,
      floorApplied: !!narrativeFloor?.changed,
      floorTimestamp: narrativeFloor?.floor || null,
      commitStatus: narrativeCommitStatus,
      commitReason: narrativeFloor?.changed ? 'clamped-backward' : (narrativeCommit.reason || 'unknown'),
      at: Date.now(),
    };
    if (narrativeFloor?.changed) {
      state.lastNarrativeClockWarning = {
        previous: narrativeFloor.floor || previousNarrative || null,
        rejected: narrativeFloor.observed || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
        reason: 'current-time-floor',
        action: 'clamped',
      };
    } else if (narrativeCommit.reason === 'backward') {
      state.lastNarrativeClockWarning = {
        previous: narrativeCommit.previous || null,
        rejected: narrativeCommit.timestamp || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
        reason: p.narrativeProgressionReason || 'forward',
        action: 'rejected',
      };
    } else {
      delete state.lastNarrativeClockWarning;
    }
  }
  if (/^B_/.test(String(p.mode || ''))) {
    const airtimeCommit = time.commitBroadcastAirtime(state, p, finalText);
    if (airtimeCommit.reason === 'backward') {
      state.lastBroadcastAirtimeWarning = {
        previous: airtimeCommit.previous || null,
        rejected: airtimeCommit.timestamp || null,
        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,
      };
    } else {
      delete state.lastBroadcastAirtimeWarning;
    }
  }
  if (p.mode === 'B_END') state.broadcastLocked = false;
  state.lastMode = p.mode;
  state.pending = null;
  return {
    state,
    content: finalText,
    active: true,
    mode: p.mode,
    envelopeIssues: envelope.issues || [],
    envelopeDiagnostics: envelope.diagnostics || [],
    envelopeRepaired: !!envelope.repaired,
    stateCommit: commit,
    frameGuardProbe: frameGuard.probe,
    narrativeClockProbe,
    timestampCanonicalization,
  };
}

module.exports = { finalizePreparedOutput };
});

SimCore.define("session", function (require, module, exports) {
const { SnapshotStore } = require('./store');
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const frame = require('./frame');
const community = require('./community');
const reaction = require('./reaction');
const structure = require('./structure');
const outputCompat = require('./output-compat');
const bootstrapMigration = require('./bootstrap-migration');
const outputFinalize = require('./output-finalize');
const editReconcile = require('./edit-reconcile');
const recurrence = require('./recurrence');
const prompt = require('./prompt');

function sessionNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function sessionElapsed(start) { return Math.max(0, sessionNow() - start); }

const renderRuntimePrompt = prompt.renderRuntimePrompt;
const compileRuntimePromptParts = prompt.compileRuntimePromptParts;

function inspectPreviousBEndOutput(historyMessages, sendIndex) {
  const rows = Array.isArray(historyMessages) ? historyMessages : [];
  const currentSendIndex = Number(sendIndex);
  const outIndex = Number.isInteger(currentSendIndex) ? currentSendIndex - 1 : -1;
  const unavailable = (reason) => Object.freeze({
    available: false,
    outIndex,
    closureComplete: false,
    terminalExplicit: false,
    terminalTimestamp: null,
    structureClean: false,
    issueCount: 0,
    reason,
  });
  if (!Number.isInteger(currentSendIndex) || currentSendIndex < 1 || outIndex < 0 || outIndex >= rows.length) {
    return unavailable('previous-output-index-unavailable');
  }
  const row = rows[outIndex];
  if (row?.role !== 'assistant' && row?.role !== 'char') return unavailable('previous-output-not-assistant');
  const raw = kernel.textOfMessage(row);
  if (!raw) return unavailable('previous-output-empty');
  const canonicalized = time.canonicalizeTimestampSyntax(raw);
  const content = canonicalized.content;
  const pending = Object.freeze({ active: true, mode: 'B_END' });
  const integrity = structure.responseEnvelopeIntegrity(content, pending);
  const issues = structure.validateStructure(content, pending);
  const terminal = time.narrativeTimestampSequence(content);
  const terminalExplicit = !!(terminal
    && terminal.sceneCount > 0
    && terminal.tailStatus === 'MONOTONIC'
    && terminal.candidate);
  const structureClean = !!integrity?.safe && issues.length === 0;
  const closureComplete = terminalExplicit && structureClean;
  return Object.freeze({
    available: true,
    outIndex,
    closureComplete,
    terminalExplicit,
    terminalTimestamp: terminalExplicit ? terminal.candidate : null,
    structureClean,
    issueCount: issues.length,
    reason: closureComplete ? 'complete' : (!terminalExplicit ? 'terminal-invalid' : 'structure-not-clean'),
  });
}

class CoreRulesetSession {
  constructor(backend, opts = {}) {
    this.store = new SnapshotStore(backend, opts.prefix || `sim:core:${opts.chatId || 'chat'}`, opts.keepN || 80);
    this.current = null;
    this.initSource = 'fresh';
    this.needsHistoryBootstrap = true;
    this.loadedFromLegacySnapshot = false;
    this.trustedOutputFingerprint = null;
    this.trustedHostOutputFingerprint = null;
    this.currentOutputIndex = -1;
    this.lastPreparedSendIndex = -1;
    this.communityAliasRepairStats = null;
    this.templateRecurrenceBootstrapStats = null;
    this.narrativeClockMigrationStats = null;
  }

  async migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex = -1) {
    const state = kernel.reconcileState(this.current || kernel.initialState());
    const fromVersion = Math.max(1, Number(state.narrativeClockVersion || 1));
    if (fromVersion >= time.NARRATIVE_CLOCK_VERSION) {
      this.current = state;
      return { changed: false, skipped: true, fromVersion, toVersion: fromVersion };
    }

    const before = state.narrativeTimestamp || null;
    let candidate = null;
    let source = 'none';
    const sendIndex = Number.isInteger(Number(latestOutIndex)) && Number(latestOutIndex) > 0
      ? Number(latestOutIndex) - 1
      : -1;
    if (sendIndex >= 0) {
      const turn = await this.store.loadTurn(sendIndex);
      const choices = [
        ['send', turn?.send?.narrativeTimestamp || null],
        ['pre', turn?.pre?.narrativeTimestamp || null],
      ];
      for (const [label, ts] of choices) {
        if (!time.parseTimestamp(ts)) continue;
        if (!candidate) { candidate = ts; source = label; continue; }
        const cmp = time.compareTimestamps(ts, candidate);
        if (cmp != null && cmp > 0) { candidate = ts; source = label; }
      }
    }

    let changed = false;
    if (candidate) {
      const cmp = before ? time.compareTimestamps(candidate, before) : 1;
      if (!before || (cmp != null && cmp > 0)) {
        state.narrativeTimestamp = candidate;
        changed = true;
      }
    }
    state.narrativeClockVersion = time.NARRATIVE_CLOCK_VERSION;
    this.current = state;
    this.narrativeClockMigrationStats = {
      changed,
      fromVersion,
      toVersion: time.NARRATIVE_CLOCK_VERSION,
      sendIndex,
      before,
      candidate,
      after: state.narrativeTimestamp || null,
      source,
    };
    return this.narrativeClockMigrationStats;
  }

  async init(latestOutIndex = -1, mirrorRaw = null, latestOutputFingerprint = null) {
    let parsedMirror = null;
    if (mirrorRaw) {
      try { parsedMirror = typeof mirrorRaw === 'string' ? JSON.parse(mirrorRaw) : mirrorRaw; } catch { parsedMirror = null; }
    }

    const mirrorFingerprint = parsedMirror?.outputFingerprint || null;
    const mirrorHostFingerprint = parsedMirror?.hostOutputFingerprint || null;
    const mirrorFingerprintMatches = !!latestOutputFingerprint
      && (mirrorFingerprint === latestOutputFingerprint || mirrorHostFingerprint === latestOutputFingerprint);
    const mirrorFastSafe = latestOutIndex >= 0
      && parsedMirror && typeof parsedMirror === 'object'
      && Number(parsedMirror.stateVersion || 0) >= kernel.STATE_VERSION
      && Number(parsedMirror.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION
      && !parsedMirror.pending?.active
      && mirrorFingerprintMatches;

    if (mirrorFastSafe) {
      this.loadedFromLegacySnapshot = false;
      this.current = kernel.reconcileState(parsedMirror);
      if (!this.current.historyBootstrapped) {
        this.current.historyBootstrapped = true;
        this.current.historyBootstrapStats = { source: 'verified-mirror' };
      }
      this.initSource = 'mirror-fast';
      this.needsHistoryBootstrap = false;
      this.currentOutputIndex = latestOutIndex;
      this.trustedOutputFingerprint = mirrorFingerprint;
      this.trustedHostOutputFingerprint = mirrorHostFingerprint;
      await this.migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex);
      return this.current;
    }

    if (latestOutIndex >= 0) {
      const found = await this.store.latestAtOrBelow('out', latestOutIndex);
      if (found) {
        const rawFound = found.state && typeof found.state === 'object' ? kernel.clone(found.state) : found.state;
        this.loadedFromLegacySnapshot = Number(rawFound?.stateVersion || 0) < kernel.STATE_VERSION;
        this.current = kernel.reconcileState(found.state);
        const globalRepair = await bootstrapMigration.repairLatestGlobalFloorContamination(this.store, this.current, found.index, rawFound);
        this.current = globalRepair.state;
        if (!this.current.historyBootstrapped) {
          this.current.historyBootstrapped = true;
          this.current.historyBootstrappedAt = found.index;
          this.current.historyBootstrapStats = { source: 'existing-snapshot', scannedThrough: found.index };
        }
        this.initSource = 'snapshot';
        this.needsHistoryBootstrap = false;
        this.currentOutputIndex = found.index;
        this.trustedOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.outputFingerprint || null) : null;
        this.trustedHostOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.hostOutputFingerprint || null) : null;
        await this.migrateNarrativeCurrentTimeFloorIfNeeded(found.index);
        return this.current;
      }
    }
    if (parsedMirror) {
      try {
        this.loadedFromLegacySnapshot = Number(parsedMirror?.stateVersion || 0) < kernel.STATE_VERSION;
        this.current = kernel.reconcileState(parsedMirror);
        if (!this.current.historyBootstrapped) {
          this.current.historyBootstrapped = true;
          this.current.historyBootstrapStats = { source: 'existing-mirror' };
        }
        this.initSource = 'mirror';
        this.needsHistoryBootstrap = false;
        this.currentOutputIndex = Number.isInteger(latestOutIndex) ? latestOutIndex : -1;
        this.trustedOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.outputFingerprint || null) : null;
        this.trustedHostOutputFingerprint = (!this.loadedFromLegacySnapshot
          && Number(this.current.clockRepairVersion || 0) >= time.CLOCK_REPAIR_VERSION)
          ? (this.current.hostOutputFingerprint || null) : null;
        await this.migrateNarrativeCurrentTimeFloorIfNeeded(latestOutIndex);
        return this.current;
      } catch { /* broken mirror -> fresh */ }
    }
    this.current = kernel.initialState();
    this.initSource = 'fresh';
    this.needsHistoryBootstrap = true;
    this.loadedFromLegacySnapshot = false;
    this.trustedOutputFingerprint = null;
    this.trustedHostOutputFingerprint = null;
    this.currentOutputIndex = -1;
    this.lastPreparedSendIndex = -1;
    return this.current;
  }

  async bootstrapHistoryIfNeeded(messages, lastCompletedOutIndex = -1) {
    if (!this.needsHistoryBootstrap || this.current?.historyBootstrapped) {
      return { changed: false, stats: this.current?.historyBootstrapStats || null };
    }
    const r = bootstrapMigration.bootstrapFromHistory(this.current || kernel.initialState(), messages, lastCompletedOutIndex);
    this.current = r.state;
    this.needsHistoryBootstrap = false;
    if (lastCompletedOutIndex >= 0) {
      const msg = Array.isArray(messages) ? messages[lastCompletedOutIndex] : null;
      this.current.outputFingerprint = kernel.fingerprintText(kernel.textOfMessage(msg));
      this.current.hostOutputFingerprint = this.current.outputFingerprint;
      await this.store.save('out', lastCompletedOutIndex, this.current);
      this.trustedOutputFingerprint = this.current.outputFingerprint || null;
      this.trustedHostOutputFingerprint = this.current.hostOutputFingerprint || null;
      this.currentOutputIndex = lastCompletedOutIndex;
    }
    return r;
  }

  migrateCommunityClassifierIfNeeded(messages, lastCompletedOutIndex = -1) {
    const state = kernel.reconcileState(this.current || kernel.initialState());
    const currentVersion = Math.max(0, Number(state.community?.classifierVersion || 0));
    if (currentVersion >= community.COMMUNITY_CLASSIFIER_VERSION) {
      this.current = state;
      return { changed: false, skipped: true, version: currentVersion };
    }

    const before = community.normalizePlatformMaxMap(state.community.platformMax);
    state.community.platformMax = { ...before };
    const msgs = Array.isArray(messages) ? messages : [];
    const stop = Number.isInteger(lastCompletedOutIndex) && lastCompletedOutIndex >= 0
      ? Math.min(lastCompletedOutIndex, msgs.length - 1)
      : msgs.length - 1;
    let assistantScanned = 0;
    let messagesVisited = 0;
    let aliasSections = 0;
    let scannedChars = 0;

    for (let i = stop; i >= 0 && assistantScanned < community.ALIAS_BACKFILL_ASSISTANT_LIMIT && messagesVisited < community.ALIAS_BACKFILL_MESSAGE_LIMIT; i--) {
      messagesVisited += 1;
      const m = msgs[i] || {};
      if (m.role !== 'char' && m.role !== 'assistant') continue;
      assistantScanned += 1;
      const text = kernel.textOfMessage(m);
      scannedChars += text.length;
      for (const block of community.communityBlocks(text)) {
        for (const section of community.splitCommunity(block)) {
          const info = community.platformInfo(community.sectionHeader(section));
          if (info.source !== 'alias-parent-local') continue;
          aliasSections += 1;
          const parts = community.sectionCommunityParts(section);
          const reactionScope = parts.commentsStart >= 0 ? parts.comments : section;
          const re = new RegExp(reaction.REACTION_RE.source, 'gi');
          let m;
          let localMax = Math.max(0, Number(state.community.platformMax[info.key] || 0));
          while ((m = re.exec(reactionScope))) {
            const n = reaction.parseReactionNumber(m[2]);
            if (Number.isFinite(n)) localMax = Math.max(localMax, n);
          }
          state.community.platformMax[info.key] = localMax;
        }
      }
    }

    state.community.classifierVersion = community.COMMUNITY_CLASSIFIER_VERSION;
    const after = community.normalizePlatformMaxMap(state.community.platformMax);
    state.community.platformMax = after;
    const changedFamilies = Object.keys(after).filter((k) => Number(after[k] || 0) > Number(before[k] || 0));
    this.current = state;
    this.communityAliasRepairStats = {
      version: community.COMMUNITY_CLASSIFIER_VERSION,
      assistantScanned,
      messagesVisited,
      aliasSections,
      scannedChars,
      changedFamilies,
    };
    return {
      changed: changedFamilies.length > 0,
      skipped: false,
      version: community.COMMUNITY_CLASSIFIER_VERSION,
      assistantScanned,
      messagesVisited,
      aliasSections,
      scannedChars,
      changedFamilies,
    };
  }

  async onSend(sendIndex, userText, promptProbe, perfDetail = null, historyMessages = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.preLoadMs = 0;
      detail.turnSerializeMs = 0;
      detail.turnSetMs = 0;
      detail.turnPayloadChars = 0;
      detail.lifecycleMs = 0;
      detail.runtimeRenderMs = 0;
      detail.mustRestorePre = false;
      detail.existingPre = false;
      detail.previousOutputIndex = this.currentOutputIndex;
      detail.restoreReason = 'forward';
      detail.templateBootstrapMs = 0;
      detail.templateBootstrap = null;
      detail.templateRecurrenceEligible = false;
      detail.templateRecurrenceRepeated = false;
      detail.templateRegistrySize = 0;
    }

    const previousOutputIndex = this.currentOutputIndex;
    const mustRestorePre = sendIndex <= previousOutputIndex || sendIndex === this.lastPreparedSendIndex;
    if (detail) {
      detail.mustRestorePre = mustRestorePre;
      detail.previousOutputIndex = previousOutputIndex;
      detail.restoreReason = !mustRestorePre
        ? 'forward'
        : (sendIndex < previousOutputIndex ? 'rewind' : (sendIndex === previousOutputIndex ? 'same-index' : 'repeat-send'));
    }
    let t = sessionNow();
    const existingPre = mustRestorePre ? await this.store.load('pre', sendIndex) : null;
    if (detail) { detail.preLoadMs = sessionElapsed(t); detail.existingPre = !!existingPre; }
    const base = existingPre || this.current || kernel.initialState();
    if (detail) detail.previousMode = base?.lastMode || null;

    if (promptProbe?.active && recurrence.needsBootstrap(base)) {
      t = sessionNow();
      const boot = recurrence.bootstrapState(base, historyMessages, sendIndex, kernel.textOfMessage);
      this.templateRecurrenceBootstrapStats = boot.stats;
      if (detail) {
        detail.templateBootstrapMs = sessionElapsed(t);
        detail.templateBootstrap = boot.stats;
      }
    }

    t = sessionNow();
    const previousOutputFacts = base?.lastMode === 'B_END'
      ? inspectPreviousBEndOutput(historyMessages, sendIndex)
      : null;
    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex, previousOutputFacts);
    if (state.pending?.active) {
      state.pending.frameFloor = frame.capturePreviousFrame(historyMessages, sendIndex, kernel.textOfMessage);
    }
    if (detail) {
      detail.lifecycleMs = sessionElapsed(t);
      detail.templateRecurrenceEligible = !!state.pending?.templateRecurrenceEligible;
      detail.templateRecurrenceRepeated = !!state.pending?.templateRecurrenceRepeated;
      detail.templateRegistrySize = Number(state.pending?.templateRegistrySize || 0);
    }

    const turnMetric = {};
    await this.store.saveTurn(sendIndex, existingPre || base, state, { prune: false, metric: turnMetric });
    if (detail) {
      detail.turnSerializeMs = Number(turnMetric.serializeMs || 0);
      detail.turnSetMs = Number(turnMetric.setMs || 0);
      detail.turnPayloadChars = Number(turnMetric.payloadChars || 0);
    }

    this.current = state;
    this.lastPreparedSendIndex = sendIndex;
    t = sessionNow();
    const promptCompiled = compileRuntimePromptParts(state);
    const promptBlock = promptCompiled.text;
    if (detail) detail.runtimeRenderMs = sessionElapsed(t);
    return {
      state,
      promptBlock,
      promptIdentityTiers: promptCompiled.identityTiers,
      broadcastEndAuthority: promptCompiled.endAuthority,
      active: !!state.pending?.active,
    };
  }

  resolveOutputIndex(fallbackOutIndex = -1) {
    const sendIndex = Number(this.current?.pending?.sendIndex);
    if (this.current?.pending?.active && Number.isInteger(sendIndex) && sendIndex >= 0) return sendIndex + 1;
    return Number.isInteger(fallbackOutIndex) && fallbackOutIndex >= 0 ? fallbackOutIndex : -1;
  }

  async stateForOutput(outIndex, perfDetail = null) {
    const effectiveOutIndex = this.resolveOutputIndex(outIndex);
    const expectedSendIndex = effectiveOutIndex - 1;
    const currentSendIndex = Number(this.current?.pending?.sendIndex);
    const memoryFastSafe = !!this.current?.pending?.active
      && Number.isInteger(currentSendIndex)
      && currentSendIndex === expectedSendIndex
      && this.lastPreparedSendIndex === currentSendIndex;

    if (memoryFastSafe) {
      if (perfDetail) perfDetail.stateLoadSource = 'memory-fast';
      return kernel.reconcileState(this.current);
    }

    if (perfDetail) perfDetail.stateLoadSource = 'storage-fallback';
    return kernel.reconcileState((await this.store.load('send', expectedSendIndex)) || this.current || kernel.initialState());
  }

  async processOutput(outIndex, content, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.stateLoadMs = 0;
      detail.stateLoadSource = 'unknown';
      detail.prepareMs = 0;
      detail.validateMs = 0;
      detail.finalizeMs = 0;
      detail.outSerializeMs = 0;
      detail.outSetMs = 0;
      detail.outPruneMs = 0;
      detail.pruneDeferred = false;
      detail.inputChars = String(content || '').length;
      detail.outputChars = 0;
    }

    outIndex = this.resolveOutputIndex(outIndex);
    let t = sessionNow();
    const base = await this.stateForOutput(outIndex, detail); // memory fast path; storage remains recovery fallback
    if (detail) detail.stateLoadMs = sessionElapsed(t);
    if (!base.pending?.active) {
      const plain = String(content || '');
      if (detail) detail.outputChars = plain.length;
      return { state: base, content: plain, active: false, issues: [] };
    }

    t = sessionNow();
    const prepared = outputCompat.prepareOutput(content, base.pending); // exactly one strip/envelope/tail pass
    if (detail) detail.prepareMs = sessionElapsed(t);

    t = sessionNow();
    const issues = [...(prepared.envelope.issues || []), ...structure.validateStructure(prepared.content, base.pending)];
    if (detail) detail.validateMs = sessionElapsed(t);

    t = sessionNow();
    const result = outputFinalize.finalizePreparedOutput(base, prepared, outIndex);
    const safeEnvelopeBoundaryConfirmation = outputCompat.buildSafeEnvelopeBoundaryConfirmation(
      result.content, prepared.envelope, issues, result.stateCommit,
    );
    // PocketRisu can persist either the raw handler input or the canonical handler result.
    // Keep both fingerprints so the next request does not mistake host representation for a manual edit.
    result.state.outputFingerprint = kernel.fingerprintText(result.content);
    result.state.hostOutputFingerprint = kernel.fingerprintText(content);
    if (detail) {
      detail.finalizeMs = sessionElapsed(t);
      detail.outputChars = String(result.content || '').length;
    }

    const outMetric = {};
    await this.store.save('out', outIndex, result.state, detail ? { prune: false, metric: outMetric } : { prune: false });
    if (detail) {
      detail.outSerializeMs = Number(outMetric.serializeMs || 0);
      detail.outSetMs = Number(outMetric.setMs || 0);
      detail.outPruneMs = 0;
    }
    this.current = result.state;
    this.currentOutputIndex = outIndex;
    this.trustedOutputFingerprint = result.state.outputFingerprint || null;
    this.trustedHostOutputFingerprint = result.state.hostOutputFingerprint || null;
    if (detail) detail.pruneDeferred = this.store.scheduleDeferredPrune(outIndex);
    else this.store.scheduleDeferredPrune(outIndex);
    result.issues = issues;
    result.envelopeDiagnostics = prepared.envelope.diagnostics || [];
    result.preambleProvenance = prepared.envelope.preambleProvenance || null;
    result.freshEnvelopeConfirmation = prepared.envelope.freshConfirmation || null;
    result.safeEnvelopeBoundaryConfirmation = safeEnvelopeBoundaryConfirmation || null;
    return result;
  }

  // Compatibility alias for internal/tests; same one-pass pipeline.
  async onOutput(outIndex, content, perfDetail = null) { return this.processOutput(outIndex, content, perfDetail); }

  seedBroadcastAirtimeFromVisible(content) {
    if (!this.current?.broadcastLocked || this.current.broadcastAirtime) return false;
    if (!/^B_/.test(String(this.current.lastMode || ''))) return false;
    const parsed = time.parseTimestamp(content);
    if (!parsed) return false;
    this.current.broadcastAirtime = parsed.raw;
    if (!this.current.broadcastAirtimeStart) this.current.broadcastAirtimeStart = parsed.raw;
    return true;
  }

  seedNarrativeTimestampFromVisible(content) {
    if (!this.current || this.current.narrativeTimestamp) return false;
    if (/^B_/.test(String(this.current.lastMode || ''))) return false;
    const sequence = time.narrativeTimestampSequence(content);
    const parsed = time.parseTimestamp(sequence.candidate || sequence.frameTimestamp || '');
    if (!parsed) return false;
    this.current.narrativeTimestamp = parsed.raw;
    time.applyWorldYear(this.current, parsed.year);
    return true;
  }

  async reconcileEditedOutput(outIndex, content, perfDetail = null) {
    return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail);
  }

  storageDiagnostics() { return this.store.keyScanStats(); }
  communityAliasDiagnostics() { return this.communityAliasRepairStats; }
  templateRecurrenceDiagnostics() { return this.templateRecurrenceBootstrapStats; }
  portableState() { return JSON.stringify(kernel.reconcileState(kernel.clone(this.current || kernel.initialState()))); }
}

module.exports = {
  CoreRulesetSession,
  inspectPreviousBEndOutput,
  latestUserIndex: kernel.latestUserIndex,
  latestUserText: kernel.latestUserText,
  renderRuntimePrompt,
  inspectPromptMessages: kernel.inspectPromptMessages,
  fingerprintText: kernel.fingerprintText,
  validateStructure: structure.validateStructure,
  communityBlocks: community.communityBlocks,
  prepareTurn: lifecycle.prepareTurn,
};
});

SimCore.define("ops", function (require, module, exports) {
function perfNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function perfMs(start) { return Math.max(0, perfNow() - start); }
function normalizationIssues(state) {
  return (state?.community?.lastNormalization || []).map((x) =>
    `Reaction normalization ${x.platform}: ${x.mode} (${Number(x.generatedMin).toLocaleString('en-US')}..${Number(x.generatedMax).toLocaleString('en-US')} → ${Number(x.normalizedMin).toLocaleString('en-US')}..${Number(x.normalizedMax).toLocaleString('en-US')}, family historical ${Number(x.historicalFamilyMax ?? x.historicalMax ?? 0).toLocaleString('en-US')})`
  );
}
module.exports = { perfNow, perfMs, normalizationIssues };
});

SimCore.define("runtime-contracts", function (require, module, exports) {
const cache = Object.freeze({
  requestOrder: 'FROZEN',
  runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER',
  runtimePromptPolicy: 'OBSERVE_ONLY',
  providerCache: 'UNVERIFIED',
});
const ownership = Object.freeze({
  host: 'runtime-host',
  session: 'runtime-session',
  cache: 'runtime-cache',
  topology: 'runtime-topology',
  mirror: 'runtime-mirror',
  hooks: 'runtime-hooks',
  probe: 'runtime-probe',
});
module.exports = { cache, ownership };
});

SimCore.define("runtime-host", function (require, module, exports) {
function createHostAdapter(Risuai) {
  return Object.freeze({
    async currentIndices() {
      const [chaIdx, chatIdx] = await Promise.all([
        Risuai.getCurrentCharacterIndex(),
        Risuai.getCurrentChatIndex(),
      ]);
      return { chaIdx, chatIdx };
    },
    getChat(chaIdx, chatIdx) { return Risuai.getChatFromIndex(chaIdx, chatIdx); },
    getCharacter() { return Risuai.getCharacter(); },
    setChat(chaIdx, chatIdx, chat) { return Risuai.setChatToIndex(chaIdx, chatIdx, chat); },
    storageBackend() {
      return {
        get: (k) => Risuai.pluginStorage.getItem(k),
        set: (k, v) => Risuai.pluginStorage.setItem(k, v),
        remove: (k) => Risuai.pluginStorage.removeItem(k),
        keys: () => Risuai.pluginStorage.keys(),
      };
    },
  });
}
module.exports = { createHostAdapter };
});

SimCore.define("runtime-cache", function (require, module, exports) {
function promptChangeReason(previousLine, currentLine) {
  const text = `${String(previousLine || '')}\n${String(currentLine || '')}`;
  if (/^reaction_max=/m.test(text)) return 'reaction_max';
  if (/broadcast_airtime_|broadcast_locked=|mode_b_/m.test(text)) return 'broadcast-time';
  if (/narrative_|timestamp_semantics=/m.test(text)) return 'narrative-time';
  if (/^(?:mode=|episode_no=)/m.test(text)) return 'mode/lifecycle';
  if (/community_blocks_expected=|platform_groups_required=|b_end_|final_required_blocks=/m.test(text)) return 'community';
  if (/request_template_|prior_answer_|reevaluate_current_event|do_not_mechanically_reuse/m.test(text)) return 'recurrence';
  if (/short_community_|derive_reaction_from_current_source/m.test(text)) return 'handoff/lineage';
  if (/korean_age_offset=|current_korean_age=|world_year=/m.test(text)) return 'age/world-year';
  return 'other';
}

function cacheHash(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function runtimeLineTier(line) {
  const value = String(line || '');
  if (/^(?:korean_age_offset|current_korean_age|world_year|secondary_configured|secondary_active|episode_no)=/.test(value)) return 'slow';
  if (/^(?:mode_c_|embedded_preview_|current_root_evidence=|current_source_evidence=|event_fact_precedence=|source_event_identity_and_facts=|abstract_generalization_from_current_root_allowed=|specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support|outside_root_specific_event_evidence_only_if_|platform_group_reuse_forbidden=|community_placement=|knowledge_after_last_community=)/.test(value)) return 'volatile';
  if (promptChangeReason('', value) !== 'other') return 'volatile';
  return 'stable';
}

function runtimeIdentity(text, previous = null, compilerTiers = null) {
  const value = String(text == null ? '' : text);
  const compilerProvided = !!compilerTiers && typeof compilerTiers === 'object';
  let segments;
  if (compilerProvided) {
    segments = {
      stable: String(compilerTiers.stable || ''),
      slow: String(compilerTiers.slow || ''),
      volatile: String(compilerTiers.volatile || ''),
    };
  } else {
    const buckets = { stable: [], slow: [], volatile: [] };
    for (const line of (value ? value.split('\n') : [])) buckets[runtimeLineTier(line)].push(line);
    segments = {
      stable: buckets.stable.join('\n'),
      slow: buckets.slow.join('\n'),
      volatile: buckets.volatile.join('\n'),
    };
  }
  const build = (name, joined) => {
    const chars = joined.length;
    const hash = cacheHash(joined);
    const prior = previous?.[name];
    const status = !prior ? 'BASELINE' : (Number(prior.chars) === chars && String(prior.hash || '') === hash ? 'SAME' : 'CHANGED');
    return Object.freeze({ chars, hash, status });
  };
  return Object.freeze({
    source: compilerProvided ? 'COMPILER_TIERS' : 'LINE_CLASSIFIER_FALLBACK',
    stable: build('stable', segments.stable),
    slow: build('slow', segments.slow),
    volatile: build('volatile', segments.volatile),
    full: build('full', value),
  });
}

function buildRuntimePromptCacheProbe(previousText, currentText) {
  const current = String(currentText || '');
  const previous = previousText == null ? null : String(previousText);
  const currentLines = current ? current.split('\n') : [];
  if (previous == null) {
    return {
      baseline: true,
      stable: false,
      previousChars: 0,
      currentChars: current.length,
      stablePrefixChars: 0,
      stablePrefixPercent: null,
      stablePrefixLines: 0,
      firstChangedLine: null,
      changedLineSlots: 0,
      reason: 'baseline',
    };
  }

  let prefixChars = 0;
  const charLimit = Math.min(previous.length, current.length);
  while (prefixChars < charLimit && previous.charCodeAt(prefixChars) === current.charCodeAt(prefixChars)) prefixChars += 1;

  const previousLines = previous ? previous.split('\n') : [];
  let prefixLines = 0;
  const lineLimit = Math.min(previousLines.length, currentLines.length);
  while (prefixLines < lineLimit && previousLines[prefixLines] === currentLines[prefixLines]) prefixLines += 1;

  const stable = previous === current;
  const denominator = Math.max(previous.length, current.length, 1);
  const firstChangedLine = stable ? null : prefixLines + 1;
  const changedLineSlots = stable ? 0 : Math.max(previousLines.length, currentLines.length) - prefixLines;
  const previousChangedLine = stable ? '' : (previousLines[prefixLines] || '');
  const currentChangedLine = stable ? '' : (currentLines[prefixLines] || '');

  return {
    baseline: false,
    stable,
    previousChars: previous.length,
    currentChars: current.length,
    stablePrefixChars: prefixChars,
    stablePrefixPercent: stable ? 100 : (prefixChars / denominator) * 100,
    stablePrefixLines: prefixLines,
    firstChangedLine,
    changedLineSlots,
    reason: stable ? 'stable' : promptChangeReason(previousChangedLine, currentChangedLine),
  };
}

function cacheSketch(text) {
  const value = String(text == null ? '' : text);
  const prefixHashes = new Array(value.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    prefixHashes[i] = h >>> 0;
  }
  const lines = value ? value.split('\n') : [];
  const lineHashes = lines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });
  const lineReasons = lines.map((line) => promptChangeReason('', line));
  return Object.freeze({ version: 1, chars: value.length, prefixHashes, lineHashes, lineReasons });
}

function buildRuntimePromptCacheProbeFromSketch(sketch, currentText) {
  const current = String(currentText || '');
  if (!sketch || Number(sketch.version) !== 1 || !Array.isArray(sketch.prefixHashes)) {
    return buildRuntimePromptCacheProbe(null, current);
  }
  const previousChars = Math.max(0, Number(sketch.chars || 0));
  const limit = Math.min(previousChars, current.length, sketch.prefixHashes.length);
  let h = 0x811c9dc5;
  let prefixChars = 0;
  for (let i = 0; i < limit; i++) {
    h ^= current.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    if ((h >>> 0) !== Number(sketch.prefixHashes[i])) break;
    prefixChars = i + 1;
  }
  const stable = previousChars === current.length && prefixChars === current.length;
  const denominator = Math.max(previousChars, current.length, 1);
  const currentLines = current ? current.split('\n') : [];
  const currentLineHashes = currentLines.map((line) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < line.length; i++) {
      x ^= line.charCodeAt(i);
      x = Math.imul(x, 0x01000193);
    }
    return x >>> 0;
  });
  const previousLineHashes = Array.isArray(sketch.lineHashes) ? sketch.lineHashes : [];
  let prefixLines = 0;
  const lineLimit = Math.min(previousLineHashes.length, currentLineHashes.length);
  while (prefixLines < lineLimit && Number(previousLineHashes[prefixLines]) === Number(currentLineHashes[prefixLines])) prefixLines += 1;
  let changedLineSlots = 0;
  const maxLines = Math.max(previousLineHashes.length, currentLineHashes.length);
  for (let i = 0; i < maxLines; i++) {
    if (Number(previousLineHashes[i]) !== Number(currentLineHashes[i])) changedLineSlots += 1;
  }
  const firstChangedLine = stable ? null : prefixLines + 1;
  const previousReason = Array.isArray(sketch.lineReasons) ? sketch.lineReasons[prefixLines] : null;
  const currentReason = currentLines[prefixLines] == null ? null : promptChangeReason('', currentLines[prefixLines]);
  return {
    baseline: false,
    stable,
    previousChars,
    currentChars: current.length,
    stablePrefixChars: prefixChars,
    stablePrefixPercent: stable ? 100 : (prefixChars / denominator) * 100,
    stablePrefixLines: prefixLines,
    firstChangedLine,
    changedLineSlots,
    reason: stable ? 'stable' : (currentReason || previousReason || 'other'),
    continuitySource: 'HANDOFF_SKETCH',
  };
}

function createRuntimePromptCacheTracker(contract = null) {
  let previousText = null;
  let previousKey = null;
  let previousSketch = null;
  let previousIdentity = null;
  return Object.freeze({
    observe(key, currentText, extra = null) {
      const currentKey = String(key || '');
      let probe;
      if (previousKey === currentKey && previousText != null) probe = buildRuntimePromptCacheProbe(previousText, currentText);
      else if (previousKey === currentKey && previousSketch) probe = buildRuntimePromptCacheProbeFromSketch(previousSketch, currentText);
      else probe = buildRuntimePromptCacheProbe(null, currentText);
      const identity = runtimeIdentity(
        currentText,
        previousKey === currentKey ? previousIdentity : null,
        extra?.identityTiers || null,
      );
      probe = Object.freeze({
        ...probe,
        identity,
        requestOrder: contract?.requestOrder || 'FROZEN',
        placement: contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER',
        providerCache: contract?.providerCache || 'UNVERIFIED',
        key: currentKey,
        sendIndex: Number.isInteger(Number(extra?.sendIndex)) ? Number(extra.sendIndex) : -1,
        mode: String(extra?.mode || ''),
        at: Number.isFinite(Number(extra?.at)) ? Number(extra.at) : Date.now(),
      });
      previousText = String(currentText || '');
      previousSketch = cacheSketch(previousText);
      previousIdentity = identity;
      previousKey = currentKey;
      return probe;
    },
    exportState() {
      if (!previousKey || !previousSketch) return null;
      return {
        version: 1,
        key: previousKey,
        sketch: previousSketch,
        identity: previousIdentity,
        identityMode: previousIdentity?.source || null,
      };
    },
    importState(state) {
      if (!state || Number(state.version) !== 1 || typeof state.key !== 'string' || !state.key || !state.sketch) return false;
      previousKey = state.key;
      previousText = null;
      previousSketch = state.sketch;
      previousIdentity = state.identityMode === 'COMPILER_TIERS' && state.identity?.source === 'COMPILER_TIERS'
        ? state.identity
        : null;
      return true;
    },
    reset() {
      previousText = null;
      previousKey = null;
      previousSketch = null;
      previousIdentity = null;
    },
  });
}
module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };
});

SimCore.define("runtime-topology", function (require, module, exports) {
function exactHash(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const HOST_PREFIX_BLOCK_CHARS = 512;

function comparableMessageText(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  try { return JSON.stringify(content == null ? '' : content); }
  catch (_) { return String(content == null ? '' : content); }
}

function buildSystem0Sketch(message) {
  if (String(message?.role || '') !== 'system') return null;
  const text = comparableMessageText(message);
  const headBlocks = [];
  const tailBlocks = [];
  for (let start = 0; start < text.length; start += HOST_PREFIX_BLOCK_CHARS) {
    headBlocks.push(exactHash(text.slice(start, Math.min(text.length, start + HOST_PREFIX_BLOCK_CHARS))));
  }
  for (let end = text.length; end > 0; end -= HOST_PREFIX_BLOCK_CHARS) {
    tailBlocks.push(exactHash(text.slice(Math.max(0, end - HOST_PREFIX_BLOCK_CHARS), end)));
  }
  return Object.freeze({
    version: 1,
    chars: text.length,
    blockChars: HOST_PREFIX_BLOCK_CHARS,
    headBlocks: Object.freeze(headBlocks),
    tailBlocks: Object.freeze(tailBlocks),
  });
}

function cloneSystem0Sketch(sketch) {
  if (!sketch || Number(sketch.version) !== 1) return null;
  return {
    version: 1,
    chars: Number(sketch.chars || 0),
    blockChars: Number(sketch.blockChars || HOST_PREFIX_BLOCK_CHARS),
    headBlocks: Array.isArray(sketch.headBlocks) ? sketch.headBlocks.map(String) : [],
    tailBlocks: Array.isArray(sketch.tailBlocks) ? sketch.tailBlocks.map(String) : [],
  };
}

function buildHostPrefixProbe(previousSketch, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId, baseline) {
  const familyChanged = !!previousFamilyId && !!currentFamilyId && String(previousFamilyId) !== String(currentFamilyId);
  const base = {
    previousSignature: compactSignature(previousSignature),
    currentSignature: compactSignature(currentSignature),
    previousFamilyId: previousFamilyId || null,
    currentFamilyId: currentFamilyId || null,
    familyChanged,
    blockChars: Number(currentSketch?.blockChars || previousSketch?.blockChars || HOST_PREFIX_BLOCK_CHARS),
    retainedBodies: false,
  };
  if (!currentSketch) return Object.freeze({ ...base, status: 'UNAVAILABLE', shape: 'NO_SYSTEM0', confidence: 'NONE', deltaChars: 0, commonHeadChars: 0, commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  if (baseline || !previousSketch) return Object.freeze({ ...base, status: 'BASELINE', shape: 'BASELINE', confidence: 'NONE', deltaChars: 0, commonHeadChars: 0, commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  if (sameSignature(previousSignature, currentSignature)) {
    return Object.freeze({ ...base, status: 'STABLE', shape: 'NONE', confidence: 'HIGH', deltaChars: 0, commonHeadChars: Number(currentSketch.chars || 0), commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  }

  const block = Math.max(1, Number(currentSketch.blockChars || previousSketch.blockChars || HOST_PREFIX_BLOCK_CHARS));
  const previousChars = Math.max(0, Number(previousSketch.chars || 0));
  const currentChars = Math.max(0, Number(currentSketch.chars || 0));
  const minChars = Math.min(previousChars, currentChars);
  const previousHead = Array.isArray(previousSketch.headBlocks) ? previousSketch.headBlocks : [];
  const currentHead = Array.isArray(currentSketch.headBlocks) ? currentSketch.headBlocks : [];
  const previousTail = Array.isArray(previousSketch.tailBlocks) ? previousSketch.tailBlocks : [];
  const currentTail = Array.isArray(currentSketch.tailBlocks) ? currentSketch.tailBlocks : [];

  let headBlocks = 0;
  const headLimit = Math.min(previousHead.length, currentHead.length);
  while (headBlocks < headLimit && String(previousHead[headBlocks]) === String(currentHead[headBlocks])) headBlocks += 1;
  let tailBlocks = 0;
  const tailLimit = Math.min(previousTail.length, currentTail.length);
  while (tailBlocks < tailLimit && String(previousTail[tailBlocks]) === String(currentTail[tailBlocks])) tailBlocks += 1;

  const commonHeadChars = Math.min(minChars, headBlocks * block);
  const commonTailChars = Math.min(Math.max(0, minChars - commonHeadChars), tailBlocks * block);
  const previousChangedChars = Math.max(0, previousChars - commonHeadChars - commonTailChars);
  const currentChangedChars = Math.max(0, currentChars - commonHeadChars - commonTailChars);
  const deltaChars = currentChars - previousChars;
  const coverage = minChars > 0 ? (commonHeadChars + commonTailChars) / minChars : 0;
  const status = coverage >= 0.75 ? 'DELTA_LOCALIZED' : 'WIDESPREAD';
  const spanDelta = currentChangedChars - previousChangedChars;
  let shape = status === 'DELTA_LOCALIZED' ? 'LOCALIZED_CHANGE' : 'WIDESPREAD_CHANGE';
  if (status === 'DELTA_LOCALIZED' && deltaChars > 0 && previousChangedChars <= block * 2 && Math.abs(spanDelta - deltaChars) <= block * 2) shape = 'INSERTION_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars < 0 && currentChangedChars <= block * 2 && Math.abs(spanDelta - deltaChars) <= block * 2) shape = 'REMOVAL_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars === 0) shape = 'REPLACEMENT_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars !== 0) shape = 'SIZE_SHIFT_LOCALIZED';
  const confidence = status === 'DELTA_LOCALIZED' && commonHeadChars >= block * 2 && commonTailChars >= block * 2
    ? 'HIGH'
    : (status === 'DELTA_LOCALIZED' ? 'MEDIUM' : 'LOW');
  return Object.freeze({ ...base, status, shape, confidence, deltaChars, commonHeadChars, commonTailChars, previousChangedChars, currentChangedChars });
}

function outputCompatibleFingerprint(message) {
  const content = message?.content;
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else {
    try { text = JSON.stringify(content == null ? '' : content); }
    catch (_) { text = String(content == null ? '' : content); }
  }
  text = String(text || '')
    .replace(/⟦simcore:\d+⟧/g, '')
    .replace(/\r\n/g, '\n')
    .trimEnd();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${text.length}:${(h >>> 0).toString(16)}`;
}

function messageSignature(message) {
  const role = String(message?.role || '');
  const content = message?.content;
  let text = '';
  let kind = 'text';
  if (typeof content === 'string') {
    text = content;
  } else {
    kind = Array.isArray(content) ? 'array' : typeof content;
    try { text = JSON.stringify(content == null ? '' : content); }
    catch (_) { text = String(content == null ? '' : content); }
  }
  return Object.freeze({ role, kind, chars: text.length, hash: exactHash(text) });
}

function sameSignature(a, b) {
  return !!a && !!b && a.role === b.role && a.kind === b.kind && a.chars === b.chars && a.hash === b.hash;
}

function compactSignature(sig) {
  return sig ? `${sig.role || '?'}/${sig.kind || '?'} ${Number(sig.chars || 0)}:${String(sig.hash || 'n/a')}` : 'END';
}

function mutationShape(priorSignatures, currentSignatures, index) {
  if (!Number.isInteger(index) || index < 0) return 'NONE';
  const previous = priorSignatures?.[index] || null;
  const current = currentSignatures?.[index] || null;
  if (!previous && current) return 'LIKELY_INSERTION';
  if (previous && !current) return 'LIKELY_REMOVAL';
  if (previous && current && sameSignature(priorSignatures?.[index + 1], current)) return 'LIKELY_REMOVAL';
  if (previous && current && sameSignature(previous, currentSignatures?.[index + 1])) return 'LIKELY_INSERTION';
  if (previous && current && (previous.role !== current.role || previous.kind !== current.kind)) return 'ROLE_OR_KIND_CHANGED';
  return 'SAME_SLOT_CHANGED';
}

function relativePosition(index, firstChangeIndex, baseline, stable) {
  if (!Number.isInteger(index) || index < 0) return 'ABSENT';
  if (baseline) return 'BASELINE';
  if (stable || firstChangeIndex == null) return 'WITHIN_COMMON_PREFIX';
  if (index < firstChangeIndex) return 'WITHIN_COMMON_PREFIX';
  if (index === firstChangeIndex) return 'AT_PREFIX_BREAK';
  return 'AFTER_PREFIX_BREAK';
}

function signatureKey(sig) {
  return `${sig.role}|${sig.kind}|${sig.chars}|${sig.hash}`;
}

function requestFingerprint(signatures) {
  return exactHash(signatures.map(signatureKey).join('\u001f'));
}

function familyFingerprint(signatures) {
  const leading = [];
  for (const sig of signatures) {
    if (sig.role !== 'system') break;
    leading.push(signatureKey(sig));
  }
  return exactHash((leading.length ? leading : signatures.slice(0, Math.min(2, signatures.length)).map(signatureKey)).join('\u001f'));
}

function leadingSystemCount(signatures) {
  let count = 0;
  while (count < signatures.length && signatures[count]?.role === 'system') count += 1;
  return count;
}

function breakAttribution(firstChangeIndex, currentUserIndex, runtimeIndex, leadingSystemMessages, priorLeadingSystemMessages, baseline, stable) {
  if (baseline) return Object.freeze({ owner: 'BASELINE', zone: 'BASELINE' });
  if (stable || firstChangeIndex == null) return Object.freeze({ owner: 'NONE', zone: 'NONE' });
  const index = Number(firstChangeIndex);
  const owner = index < runtimeIndex ? 'PRE_SIMCORE' : (index === runtimeIndex ? 'SIMCORE_RUNTIME' : 'POST_SIMCORE');
  const sharedLeadingSystem = Math.min(Number(leadingSystemMessages || 0), Number(priorLeadingSystemMessages ?? leadingSystemMessages ?? 0));
  let zone;
  if (index < sharedLeadingSystem) zone = 'HOST_PREFIX';
  else if (index < currentUserIndex) zone = 'CHAT_HISTORY';
  else if (index === currentUserIndex) zone = 'CURRENT_USER';
  else if (index === runtimeIndex) zone = 'SIMCORE_RUNTIME';
  else zone = 'POST_CURRENT_USER';
  return Object.freeze({ owner, zone });
}

function clonePrevious(previous) {
  if (!previous || !Array.isArray(previous.signatures)) return null;
  return {
    at: Number(previous.at || 0),
    signatures: previous.signatures.map((sig) => ({ role: String(sig.role || ''), kind: String(sig.kind || ''), chars: Number(sig.chars || 0), hash: String(sig.hash || '') })),
    totalChars: Number(previous.totalChars || 0),
    currentUserIndex: Number(previous.currentUserIndex ?? -1),
    runtimeIndex: Number(previous.runtimeIndex ?? -1),
    leadingSystemMessages: Number(previous.leadingSystemMessages || 0),
    system0Sketch: cloneSystem0Sketch(previous.system0Sketch),
  };
}

function createRequestTopologyTracker() {
  let previousKey = null;
  let previous = null;
  return Object.freeze({
    observe(key, messages, extra = null) {
      const currentKey = String(key || '');
      const list = Array.isArray(messages) ? messages : [];
      const signatures = new Array(list.length);
      let totalChars = 0;
      let currentUserIndex = -1;
      for (let i = 0; i < list.length; i++) {
        const sig = messageSignature(list[i]);
        signatures[i] = sig;
        totalChars += sig.chars;
        if (sig.role === 'user') currentUserIndex = i;
      }
      const runtimeIndex = Number.isInteger(Number(extra?.runtimeIndex)) ? Number(extra.runtimeIndex) : (list.length ? list.length - 1 : -1);
      const leadingSystemMessages = leadingSystemCount(signatures);
      const currentSystem0Sketch = leadingSystemMessages > 0 ? buildSystem0Sketch(list[0]) : null;
      const at = Number.isFinite(Number(extra?.at)) ? Number(extra.at) : Date.now();
      const locationKey = String(extra?.locationKey || '');
      const prior = previousKey === currentKey ? previous : null;
      const baseline = !prior;
      let commonMessages = 0;
      let commonChars = 0;
      let firstChangeIndex = null;
      let previousRole = null;
      let currentRole = null;
      if (prior) {
        const limit = Math.min(prior.signatures.length, signatures.length);
        while (commonMessages < limit && sameSignature(prior.signatures[commonMessages], signatures[commonMessages])) {
          commonChars += signatures[commonMessages].chars;
          commonMessages += 1;
        }
        if (commonMessages < limit || prior.signatures.length !== signatures.length) {
          firstChangeIndex = commonMessages;
          previousRole = prior.signatures[firstChangeIndex]?.role || 'END';
          currentRole = signatures[firstChangeIndex]?.role || 'END';
        }
      }
      const previousBreak = firstChangeIndex == null ? null : (prior?.signatures?.[firstChangeIndex] || null);
      const currentBreak = firstChangeIndex == null ? null : (signatures[firstChangeIndex] || null);
      const mutation = firstChangeIndex == null ? 'NONE' : mutationShape(prior?.signatures || [], signatures, firstChangeIndex);
      const currentBreakFingerprint = currentBreak ? outputCompatibleFingerprint(list[firstChangeIndex]) : null;
      const stable = !!prior && firstChangeIndex == null;
      const cadenceMs = prior ? Math.max(0, at - prior.at) : null;
      const ratio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (commonChars / totalChars) * 100)) : 100);
      const attribution = breakAttribution(firstChangeIndex, currentUserIndex, runtimeIndex, leadingSystemMessages, prior?.leadingSystemMessages, baseline, stable);
      const exposureChars = baseline ? null : Math.max(0, totalChars - commonChars);
      const exposureRatio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (exposureChars / totalChars) * 100)) : 0);
      const currentFamilyId = familyFingerprint(signatures);
      const previousFamilyId = prior ? familyFingerprint(prior.signatures) : null;
      const hostPrefixProbe = buildHostPrefixProbe(
        prior?.system0Sketch || null,
        currentSystem0Sketch,
        prior?.signatures?.[0] || null,
        signatures[0] || null,
        previousFamilyId,
        currentFamilyId,
        baseline,
      );
      const probe = Object.freeze({
        baseline, stable, at, cadenceMs,
        messages: signatures.length, previousMessages: prior?.signatures?.length ?? null,
        totalChars, previousChars: prior?.totalChars ?? null,
        commonMessages, commonChars, commonRatio: ratio, firstChangeIndex, previousRole, currentRole,
        previousBreakSignature: compactSignature(previousBreak), currentBreakSignature: compactSignature(currentBreak),
        mutationShape: mutation, currentBreakFingerprint, locationKey,
        currentUserIndex, runtimeIndex, leadingSystemMessages,
        breakOwner: attribution.owner, breakZone: attribution.zone,
        exposureChars, exposureRatio,
        currentUserPosition: relativePosition(currentUserIndex, firstChangeIndex, baseline, stable),
        runtimePosition: relativePosition(runtimeIndex, firstChangeIndex, baseline, stable),
        retainedBodies: false, signatureKind: 'role+kind+chars+fnv1a32',
        currentUserSignature: currentUserIndex >= 0 ? signatureKey(signatures[currentUserIndex]) : 'none',
        requestFingerprint: requestFingerprint(signatures),
        familyId: currentFamilyId,
        previousFamilyId, hostPrefixProbe,
      });
      previousKey = currentKey;
      previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex, leadingSystemMessages, system0Sketch: currentSystem0Sketch };
      return probe;
    },
    exportState() {
      if (!previousKey || !previous) return null;
      return { version: 2, key: previousKey, previous: clonePrevious(previous) };
    },
    importState(state) {
      if (!state || ![1, 2].includes(Number(state.version)) || typeof state.key !== 'string' || !state.key) return false;
      const restored = clonePrevious(state.previous);
      if (!restored) return false;
      previousKey = state.key;
      previous = restored;
      return true;
    },
    reset() { previousKey = null; previous = null; },
  });
}

module.exports = { exactHash, messageSignature, leadingSystemCount, breakAttribution, createRequestTopologyTracker };
});

SimCore.define("runtime-cache-candidates", function (require, module, exports) {
const WINDOW = 3;
const EMA_ALPHA = 0.35;

function freshState(key, familyId) {
  return {
    version: 2,
    key, familyId,
    attempts: 0, distinct: 0,
    lastDistinctToken: null,
    status: 'BASELINE',
    window: [],
    stableFloorChars: null,
    stableFloorMessages: null,
    movingFrontierChars: 0,
    movingFrontierMessages: 0,
    frontierStreak: 0,
    divergenceCount: 0,
    regressionStreak: 0,
    cadenceEmaMs: null,
    lastAt: null,
  };
}

function cloneState(state) {
  if (!state) return null;
  return {
    version: 2,
    key: String(state.key || ''), familyId: String(state.familyId || ''),
    attempts: Number(state.attempts || 0), distinct: Number(state.distinct || 0),
    lastDistinctToken: state.lastDistinctToken == null ? null : String(state.lastDistinctToken),
    status: String(state.status || 'BASELINE'),
    window: Array.isArray(state.window) ? state.window.slice(-WINDOW).map((x) => ({ chars: Number(x.chars || 0), messages: Number(x.messages || 0) })) : [],
    stableFloorChars: state.stableFloorChars == null ? null : Number(state.stableFloorChars),
    stableFloorMessages: state.stableFloorMessages == null ? null : Number(state.stableFloorMessages),
    movingFrontierChars: Number(state.movingFrontierChars || 0),
    movingFrontierMessages: Number(state.movingFrontierMessages || 0),
    frontierStreak: Number(state.frontierStreak || 0),
    divergenceCount: Number(state.divergenceCount || 0),
    regressionStreak: Number(state.regressionStreak || 0),
    cadenceEmaMs: state.cadenceEmaMs == null ? null : Number(state.cadenceEmaMs),
    lastAt: state.lastAt == null ? null : Number(state.lastAt),
  };
}

function summarize(state, familyReset, distinctObservation) {
  return Object.freeze({
    status: state.status,
    familyId: state.familyId,
    familyReset: !!familyReset,
    attempts: state.attempts,
    distinct: state.distinct,
    distinctObservation: !!distinctObservation,
    lastObservation: distinctObservation ? 'DISTINCT' : 'RETRY',
    window: WINDOW,
    stableFloorChars: state.stableFloorChars,
    stableFloorMessages: state.stableFloorMessages,
    movingFrontierChars: state.movingFrontierChars,
    movingFrontierMessages: state.movingFrontierMessages,
    frontierStreak: state.frontierStreak,
    divergenceCount: state.divergenceCount,
    regressionStreak: state.regressionStreak,
    cadenceEmaMs: state.cadenceEmaMs,
  });
}

function createCacheCandidateTracker() {
  let state = null;
  return Object.freeze({
    observe(key, topology, extra = null) {
      const currentKey = String(key || '');
      const familyId = String(topology?.familyId || 'none');
      let familyReset = false;
      if (!state || state.key !== currentKey || state.familyId !== familyId) {
        familyReset = !!state;
        state = freshState(currentKey, familyId);
      }
      state.attempts += 1;
      const sendIndex = Number.isInteger(Number(extra?.sendIndex)) ? Number(extra.sendIndex) : -1;
      const userSignature = String(topology?.currentUserSignature || 'none');
      const distinctToken = `${sendIndex}:${userSignature}`;
      const distinctObservation = state.lastDistinctToken !== distinctToken;
      if (!distinctObservation) return summarize(state, familyReset, false);

      const at = Number.isFinite(Number(extra?.at)) ? Number(extra.at) : (Number.isFinite(Number(topology?.at)) ? Number(topology.at) : Date.now());
      const distinctCadence = state.lastAt == null ? null : Math.max(0, at - state.lastAt);
      state.lastDistinctToken = distinctToken;
      state.distinct += 1;
      if (distinctCadence != null) {
        state.cadenceEmaMs = state.cadenceEmaMs == null
          ? distinctCadence
          : (EMA_ALPHA * distinctCadence) + ((1 - EMA_ALPHA) * state.cadenceEmaMs);
      }

      if (topology?.baseline || familyReset) {
        state.status = 'BASELINE';
        state.lastAt = at;
        return summarize(state, familyReset, true);
      }

      const chars = Math.max(0, Number(topology?.commonChars || 0));
      const messages = Math.max(0, Number(topology?.commonMessages || 0));
      const priorFrontier = state.movingFrontierChars;
      const priorFloor = state.stableFloorChars;
      const wasEstablished = state.status === 'ESTABLISHED' || state.status === 'REGRESSED' || state.status === 'VOLATILE';
      if (wasEstablished && priorFloor != null && chars < priorFloor) {
        state.regressionStreak += 1;
        state.divergenceCount += 1;
      } else {
        state.regressionStreak = 0;
      }
      state.window.push({ chars, messages });
      if (state.window.length > WINDOW) state.window.shift();
      state.movingFrontierChars = chars;
      state.movingFrontierMessages = messages;
      state.frontierStreak = priorFrontier > 0 && chars >= priorFrontier ? state.frontierStreak + 1 : 1;
      if (state.distinct < 3) {
        state.status = 'OBSERVING';
      } else if (state.regressionStreak >= 2) {
        state.status = 'VOLATILE';
      } else if (state.regressionStreak === 1) {
        state.status = 'REGRESSED';
      } else {
        state.status = 'ESTABLISHED';
        state.stableFloorChars = Math.min(...state.window.map((x) => x.chars));
        state.stableFloorMessages = Math.min(...state.window.map((x) => x.messages));
      }
      state.lastAt = at;
      return summarize(state, familyReset, true);
    },
    exportState() { return state ? { version: 2, state: cloneState(state) } : null; },
    importState(saved) {
      if (!saved || Number(saved.version) !== 2) return false;
      const restored = cloneState(saved.state);
      if (!restored || !restored.key || !restored.familyId) return false;
      state = restored;
      return true;
    },
    reset() { state = null; },
  });
}
module.exports = { createCacheCandidateTracker };
});

SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';
const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';
const HOST_COMPAT_VERSION = '0.66.0';
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_SESSION_CHARS = 16384;
const MAX_SERIALIZED_CHARS = 16384;
let lastWriteProbe = null;
let lastClaimProbe = null;
let lastSurfaceProbe = null;
let lastHostProbe = Object.freeze({ api: 'UNOBSERVED', store: 'UNOBSERVED', clear: 'UNKNOWN', boot: 'UNOBSERVED', acquireAttempts: 0, readAttempts: 0 });
let hostStorePromise = null;
let hostReadAttempted = false;
let hostClaimResult = null;

function capture(input) {
  const locationKey = String(input?.locationKey || '');
  if (!locationKey) return null;
  return Object.freeze({
    schema: 1,
    sourceVersion: String(input?.sourceVersion || ''),
    locationKey,
    capturedAt: Number(input?.capturedAt || Date.now()),
    runtimePromptCache: input?.runtimePromptCache || null,
    requestTopology: input?.requestTopology || null,
    cacheCandidates: input?.cacheCandidates || null,
  });
}

function inspectSessionSurface(root, label) {
  if (!root) return Object.freeze({ label, status: 'ROOT_ABSENT', storage: null });
  let storage = null;
  try { storage = root.sessionStorage; }
  catch (_) { return Object.freeze({ label, status: 'ACCESS_ERROR', storage: null }); }
  if (storage == null) return Object.freeze({ label, status: 'STORAGE_ABSENT', storage: null });
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return Object.freeze({ label, status: 'METHODS_INCOMPLETE', storage: null });
  }
  return Object.freeze({ label, status: 'USABLE', storage });
}

function resolveSessionCandidates(root, windowLike) {
  const windowSurface = inspectSessionSurface(windowLike, 'WINDOW');
  const globalSurface = inspectSessionSurface(root, 'GLOBAL_THIS');
  const windowUsable = windowSurface.status === 'USABLE';
  const globalUsable = globalSurface.status === 'USABLE';
  let relation = 'NONE';
  let first = null;
  let second = null;
  if (windowUsable && globalUsable) {
    if (windowSurface.storage === globalSurface.storage) {
      relation = 'SAME_OBJECT';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
    } else {
      relation = 'DISTINCT_OBJECTS';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
      second = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
    }
  } else if (windowUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
  } else if (globalUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
  }
  const surface = Object.freeze({ window: windowSurface.status, globalThis: globalSurface.status, relation });
  lastSurfaceProbe = surface;
  return Object.freeze({ surface, first, second });
}

function surfaceDiagnostics() {
  return lastSurfaceProbe || Object.freeze({ window: 'UNOBSERVED', globalThis: 'UNOBSERVED', relation: 'NONE' });
}

function serializeCapsule(capsule) {
  if (!capsule) return Object.freeze({ status: 'EMPTY', encoded: null, chars: 0 });
  try {
    const encoded = JSON.stringify(capsule);
    const chars = encoded.length;
    return Object.freeze({ status: chars > MAX_SERIALIZED_CHARS ? 'OVERSIZE' : 'OK', encoded, chars });
  } catch (_) {
    return Object.freeze({ status: 'FAILED', encoded: null, chars: 0 });
  }
}

function publishPrepared(root, windowLike, capsule, prepared) {
  let memory = 'UNAVAILABLE';
  let session = 'UNAVAILABLE';
  let sessionRoot = 'NONE';
  let fallbackFrom = null;
  let attempted = '';
  if (root) {
    try { root[KEY] = capsule; memory = 'WRITTEN'; }
    catch (_) { memory = 'FAILED'; }
  }

  const resolved = resolveSessionCandidates(root, windowLike);
  const first = resolved.first;
  const second = resolved.second;
  if (prepared.status === 'OVERSIZE') {
    session = first ? 'OVERSIZE' : 'UNAVAILABLE';
    if (first) { try { first.storage.removeItem(SESSION_KEY); } catch (_) {} }
    if (second) { try { second.storage.removeItem(SESSION_KEY); } catch (_) {} }
  } else if (prepared.status === 'FAILED') {
    session = first ? 'FAILED' : 'UNAVAILABLE';
  } else if (prepared.status === 'OK' && first) {
    attempted = first.label;
    try {
      first.storage.setItem(SESSION_KEY, prepared.encoded);
      session = 'WRITTEN';
      sessionRoot = first.label;
    } catch (_) {
      session = 'FAILED';
      fallbackFrom = `${first.label}_FAILED`;
      if (second) {
        attempted = `${first.label},${second.label}`;
        try {
          second.storage.setItem(SESSION_KEY, prepared.encoded);
          session = 'WRITTEN';
          sessionRoot = second.label;
        } catch (_) { session = 'FAILED'; }
      }
    }
  }
  return Object.freeze({ memory, session, sessionRoot, fallbackFrom, attempted, serializedChars: prepared.chars, serialization: prepared.status, surface: resolved.surface });
}

function publish(root, windowLike, capsule) {
  if (!capsule) return false;
  const prepared = capsule?.__simcorePreparedSerialized || serializeCapsule(capsule);
  const base = publishPrepared(root, windowLike, capsule, prepared);
  lastWriteProbe = Object.freeze({ ...base, hostLocal: 'UNOBSERVED', hostElapsedMs: 0, retainedBodies: false });
  return base.memory === 'WRITTEN' || base.session === 'WRITTEN';
}

function updateHostProbe(patch) {
  lastHostProbe = Object.freeze({ ...lastHostProbe, ...patch });
  if (lastClaimProbe) lastClaimProbe = Object.freeze({ ...lastClaimProbe, hostLocal: lastHostProbe.boot });
  return lastHostProbe;
}

async function getHostLocalTelemetryStoreOnce(hostApi) {
  if (hostStorePromise) return hostStorePromise;
  hostStorePromise = (async () => {
    updateHostProbe({ acquireAttempts: 1 });
    if (!hostApi || typeof hostApi.getLocalPluginStorage !== 'function') {
      updateHostProbe({ api: 'ABSENT', store: 'API_ABSENT', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'API_ABSENT', store: null, clear: 'UNKNOWN' });
    }
    updateHostProbe({ api: 'PRESENT' });
    let store = null;
    try { store = await hostApi.getLocalPluginStorage(); }
    catch (_) {
      updateHostProbe({ store: 'ACQUIRE_FAILED', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'ACQUIRE_FAILED', store: null, clear: 'UNKNOWN' });
    }
    if (!store || typeof store.getItem !== 'function' || typeof store.setItem !== 'function') {
      updateHostProbe({ store: 'METHODS_INCOMPLETE', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'METHODS_INCOMPLETE', store: null, clear: 'UNKNOWN' });
    }
    const clear = typeof store.removeItem === 'function' ? 'REMOVE' : 'EMPTY_WRITE';
    updateHostProbe({ store: 'USABLE', clear });
    return Object.freeze({ status: 'USABLE', store, clear });
  })();
  return hostStorePromise;
}

async function publishWithHostLocal(root, windowLike, hostApi, capsule) {
  if (!capsule) return false;
  const prepared = capsule?.__simcorePreparedSerialized || serializeCapsule(capsule);
  const base = publishPrepared(root, windowLike, capsule, prepared);
  let hostLocal = 'UNAVAILABLE';
  let hostElapsedMs = 0;
  if (base.session === 'WRITTEN') {
    hostLocal = 'NOT_NEEDED';
  } else if (prepared.status === 'OVERSIZE') {
    hostLocal = 'OVERSIZE';
  } else if (prepared.status === 'OK') {
    const startedAt = Date.now();
    const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
    if (acquired.status === 'USABLE') {
      try {
        await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
        hostLocal = 'WRITTEN';
      } catch (_) { hostLocal = 'FAILED'; }
    } else {
      hostLocal = 'UNAVAILABLE';
    }
    hostElapsedMs = Math.max(0, Date.now() - startedAt);
  }
  lastWriteProbe = Object.freeze({
    ...base,
    hostLocal,
    hostElapsedMs,
    host: lastHostProbe,
    retainedBodies: false,
  });
  return base.memory === 'WRITTEN' || base.session === 'WRITTEN' || hostLocal === 'WRITTEN';
}

function takeMemory(root) {
  if (!root) return { status: 'unavailable', capsule: null };
  try {
    const capsule = root[KEY] || null;
    try { delete root[KEY]; } catch (_) { root[KEY] = undefined; }
    return { status: capsule ? 'available' : 'empty', capsule };
  } catch (_) { return { status: 'failed', capsule: null }; }
}

function takeSessionCandidate(candidate) {
  if (!candidate) return null;
  let raw = null;
  try { raw = candidate.storage.getItem(SESSION_KEY); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'failed', capsule: null, serializedChars: 0 }); }
  if (raw == null) return Object.freeze({ root: candidate.label, status: 'empty', capsule: null, serializedChars: 0 });
  try { candidate.storage.removeItem(SESSION_KEY); } catch (_) {}
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SESSION_CHARS) return Object.freeze({ root: candidate.label, status: 'oversize', capsule: null, serializedChars });
  try { return Object.freeze({ root: candidate.label, status: 'available', capsule: JSON.parse(String(raw)), serializedChars }); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'malformed', capsule: null, serializedChars }); }
}

function claim(root, windowLike) {
  const memory = takeMemory(root);
  const resolved = resolveSessionCandidates(root, windowLike);
  const first = takeSessionCandidate(resolved.first);
  const second = takeSessionCandidate(resolved.second);
  const firstStatus = first?.status || 'unavailable';
  const secondStatus = second?.status || 'unavailable';
  const summaryStatus = first?.status === 'available' ? 'available' : (second?.status === 'available' ? 'available' : (first?.status || second?.status || 'unavailable'));
  lastClaimProbe = Object.freeze({
    memory: memory.status,
    session: summaryStatus,
    sessionRoots: Object.freeze({ first: first ? `${first.root}:${firstStatus}` : null, second: second ? `${second.root}:${secondStatus}` : null }),
    sessionChars: Number(first?.serializedChars || 0) + Number(second?.serializedChars || 0),
    surface: resolved.surface,
    hostLocal: lastHostProbe.boot,
    memoryValidation: 'PENDING',
    sessionValidation: 'PENDING',
    hostValidation: 'PENDING',
    selected: 'NONE',
    selectedRoot: 'NONE',
    retainedBodies: false,
  });
  return Object.freeze({
    claimSchema: 1,
    memory: memory.capsule,
    session: first?.capsule || null,
    sessionStatus: firstStatus,
    sessionRoot: first?.root || null,
    sessionCandidates: second ? Object.freeze([first, second]) : (first ? Object.freeze([first]) : Object.freeze([])),
  });
}

function hostExportShape(value) {
  return value == null || (typeof value === 'object' && !Array.isArray(value));
}

function classifyConsumedHostCapsule(capsule, now) {
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) return 'MALFORMED';
  if (Number(capsule.schema) !== 1) return 'INCOMPATIBLE';
  if (String(capsule.sourceVersion || '') !== HOST_COMPAT_VERSION) return 'INCOMPATIBLE';
  const capturedAt = Number(capsule.capturedAt || 0);
  const ageMs = Math.max(0, Number(now) - capturedAt);
  if (!Number.isFinite(capturedAt) || capturedAt <= 0 || !Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return 'STALE';
  if (!hostExportShape(capsule.runtimePromptCache) || !hostExportShape(capsule.requestTopology) || !hostExportShape(capsule.cacheCandidates)) return 'MALFORMED';
  return 'CONSUMED';
}

async function claimHostLocalOnce(hostApi, locationKey, now = Date.now()) {
  if (hostReadAttempted) return hostClaimResult;
  hostReadAttempted = true;
  updateHostProbe({ readAttempts: 1 });
  const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
  if (acquired.status !== 'USABLE') {
    hostClaimResult = Object.freeze({ status: 'UNAVAILABLE', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'UNAVAILABLE' });
    return hostClaimResult;
  }
  let raw = null;
  try { raw = await acquired.store.getItem(HOST_LOCAL_KEY); }
  catch (_) {
    hostClaimResult = Object.freeze({ status: 'READ_FAILED', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'READ_FAILED' });
    return hostClaimResult;
  }
  if (raw == null || String(raw) === '') {
    hostClaimResult = Object.freeze({ status: 'EMPTY', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'EMPTY' });
    return hostClaimResult;
  }
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SERIALIZED_CHARS) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  let capsule = null;
  try { capsule = JSON.parse(String(raw)); }
  catch (_) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  if (String(capsule.locationKey || '') !== String(locationKey || '')) {
    hostClaimResult = Object.freeze({ status: 'FOREIGN_LOCATION', capsule: null, serializedChars });
    updateHostProbe({ boot: 'FOREIGN_LOCATION' });
    return hostClaimResult;
  }
  try {
    if (typeof acquired.store.removeItem === 'function') await acquired.store.removeItem(HOST_LOCAL_KEY);
    else await acquired.store.setItem(HOST_LOCAL_KEY, '');
  } catch (_) {
    hostClaimResult = Object.freeze({ status: 'CONSUME_FAILED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'CONSUME_FAILED' });
    return hostClaimResult;
  }
  const status = classifyConsumedHostCapsule(capsule, now);
  hostClaimResult = Object.freeze({ status, capsule: status === 'CONSUMED' ? capsule : null, serializedChars });
  updateHostProbe({ boot: status });
  return hostClaimResult;
}

function validateCapsule(capsule, locationKey, now) {
  if (!capsule) return { accepted: false, reason: 'no-compatible-handoff', capsule: null };
  if (Number(capsule.schema) !== 1) return { accepted: false, reason: 'schema-mismatch', capsule: null };
  if (String(capsule.locationKey || '') !== String(locationKey || '')) return { accepted: false, reason: 'location-mismatch', capsule: null };
  const ageMs = Math.max(0, Number(now) - Number(capsule.capturedAt || 0));
  if (!Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return { accepted: false, reason: 'expired', ageMs, capsule: null };
  return { accepted: true, reason: 'adopted', ageMs, capsule };
}

function validationClass(result) {
  if (result?.accepted) return 'exact';
  if (result?.reason === 'expired') return 'stale';
  if (result?.reason === 'no-compatible-handoff') return 'empty';
  return 'mismatch';
}

function sessionReason(entry, validation) {
  if (entry?.status === 'malformed') return 'session-malformed';
  if (entry?.status === 'oversize') return 'session-oversize';
  if (entry?.status === 'failed') return 'session-failed';
  return validation?.reason || 'no-compatible-handoff';
}

function hostReason(hostClaim, validation) {
  if (!hostClaim) return 'no-compatible-handoff';
  if (hostClaim.status !== 'CONSUMED') return `host-local-${String(hostClaim.status || 'unavailable').toLowerCase()}`;
  return validation?.reason || 'no-compatible-handoff';
}

function validate(claimed, locationKey, now = Date.now(), hostClaim = null) {
  if (!claimed || Number(claimed.claimSchema) !== 1) {
    const legacy = validateCapsule(claimed, locationKey, now);
    return { ...legacy, transport: legacy.accepted ? 'memory' : null, fallbackFrom: null, sessionRoot: null };
  }
  const memory = validateCapsule(claimed.memory, locationKey, now);
  const candidates = Array.isArray(claimed.sessionCandidates)
    ? claimed.sessionCandidates
    : [claimed.session ? { root: claimed.sessionRoot || 'WINDOW', status: claimed.sessionStatus || 'available', capsule: claimed.session } : null].filter(Boolean);
  const firstEntry = candidates[0] || null;
  const secondEntry = candidates[1] || null;
  const firstValidation = validateCapsule(firstEntry?.capsule || null, locationKey, now);
  const secondValidation = validateCapsule(secondEntry?.capsule || null, locationKey, now);
  const hostValidation = validateCapsule(hostClaim?.status === 'CONSUMED' ? hostClaim.capsule : null, locationKey, now);

  if (memory.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: 'exact', sessionValidation: (firstEntry || secondEntry) ? 'standby' : 'empty', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'memory', selectedRoot: 'NONE' });
    return { ...memory, transport: 'memory', fallbackFrom: null, sessionRoot: null };
  }
  if (firstValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: firstEntry.root });
    return { ...firstValidation, transport: 'session', fallbackFrom: memory.reason, sessionRoot: firstEntry.root };
  }
  if (secondValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: secondEntry.root });
    return { ...secondValidation, transport: 'session', fallbackFrom: sessionReason(firstEntry, firstValidation), sessionRoot: secondEntry.root };
  }
  if (hostValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: 'exact', selected: 'host-local', selectedRoot: 'NONE' });
    return { ...hostValidation, transport: 'host-local', fallbackFrom: secondEntry ? sessionReason(secondEntry, secondValidation) : (firstEntry ? sessionReason(firstEntry, firstValidation) : memory.reason), sessionRoot: null };
  }
  const firstReason = sessionReason(firstEntry, firstValidation);
  const secondReason = sessionReason(secondEntry, secondValidation);
  const hostFailure = hostReason(hostClaim, hostValidation);
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: hostClaim ? validationClass(hostValidation) : 'empty', selected: 'NONE', selectedRoot: 'NONE' });
  const primary = claimed.memory
    ? memory
    : (firstEntry ? { ...firstValidation, reason: firstReason }
      : (secondEntry ? { ...secondValidation, reason: secondReason }
        : { ...hostValidation, reason: hostFailure }));
  return { ...primary, transport: null, fallbackFrom: claimed.memory ? (hostClaim ? hostFailure : (secondEntry ? secondReason : firstReason)) : null, sessionRoot: null };
}

function diagnostics() {
  return Object.freeze({
    write: lastWriteProbe,
    claim: lastClaimProbe,
    surface: surfaceDiagnostics(),
    host: lastHostProbe,
    sessionKey: SESSION_KEY,
    hostLocalKey: HOST_LOCAL_KEY,
    maxSessionChars: MAX_SESSION_CHARS,
    maxSerializedChars: MAX_SERIALIZED_CHARS,
  });
}
module.exports = { capture, publish, publishWithHostLocal, claim, claimHostLocalOnce, validate, diagnostics };
});

SimCore.define("runtime-session", function (require, module, exports) {
function createSessionRuntime(deps) {
  const { coreRules, host, perfNow, perfMs, textMessageContent, readState, writeState } = deps;
  async function loadCoreForChat(chaIdx, chatIdx, chatArg = null, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.path = 'UNKNOWN';
      detail.chatFallbackMs = 0;
      detail.characterLoadMs = 0;
      detail.initScanMs = 0;
      detail.initMs = 0;
    }
    let { coreSession, coreKey, coreLocationKey } = readState();
    let t = perfNow();
    const chat = chatArg || await host.getChat(chaIdx, chatIdx);
    if (detail) detail.chatFallbackMs = chatArg ? 0 : perfMs(t);
    if (!chat) {
      if (detail) detail.path = 'NO_CHAT';
      writeState({ coreSession: null, coreKey: null, coreLocationKey: null });
      return null;
    }

    const locationKey = `${chaIdx}:${chatIdx}:${chat.id ?? ''}`;
    if (coreSession && coreLocationKey === locationKey) {
      if (detail) detail.path = 'LOCATION_REUSE';
      return coreSession;
    }

    t = perfNow();
    const char = await host.getCharacter();
    if (detail) detail.characterLoadMs = perfMs(t);
    if (!char) {
      if (detail) detail.path = 'NO_CHARACTER';
      writeState({ coreSession: null, coreKey: null, coreLocationKey: null });
      return null;
    }
    const charId = char.chaId ?? char.name;
    const chatId = chat.id ?? `${charId}:${chatIdx}`;
    const key = `${charId}:${chatId}`;
    if (coreSession && coreKey === key) {
      writeState({ coreSession, coreKey, coreLocationKey: locationKey });
      if (detail) detail.path = 'KEY_REUSE';
      return coreSession;
    }

    coreSession = new coreRules.CoreRulesetSession(host.storageBackend(), {
      chatId,
      prefix: `sim:core:${key}`,
      keepN: 80,
    });
    coreKey = key;
    coreLocationKey = locationKey;
    writeState({ coreSession, coreKey, coreLocationKey });

    if (detail) detail.path = 'COLD_INIT';
    t = perfNow();
    const msgs = chat.message || [];
    let lastAssistant = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === 'char' || msgs[i]?.role === 'assistant') { lastAssistant = i; break; }
    }
    const latestOutputFingerprint = lastAssistant >= 0
      ? coreRules.fingerprintText(textMessageContent(msgs[lastAssistant]))
      : null;
    if (detail) detail.initScanMs = perfMs(t);
    t = perfNow();
    await coreSession.init(lastAssistant, chat.scriptstate?.['$simcore_core_state'] || null, latestOutputFingerprint);
    if (detail) detail.initMs = perfMs(t);
    return coreSession;
  }
  return Object.freeze({ loadCoreForChat });
}
module.exports = { createSessionRuntime };
});

SimCore.define("representation", function (require, module, exports) {
function fingerprintChars(value) {
  const match = String(value || '').match(/^(\d+):/);
  return match ? Number(match[1]) : null;
}

function priorRepresentation(row) {
  if (!row) return 'UNAVAILABLE';
  const match = String(row.fingerprintMatch || '');
  if (row.acceptedCanonicalEquivalent === true || match === 'CANONICAL') return 'EXACT';
  if (match === 'HOST_RAW') return 'HOST_RAW_MATCH';
  return 'OUTPUT_MISMATCH';
}

function currentMatch(visibleFingerprint, row) {
  const visible = String(visibleFingerprint || '');
  if (!visible || !row) return 'NONE';
  if (visible === String(row.freshFingerprint || '')) return 'FRESH_CHAT';
  if (visible === String(row.canonicalFingerprint || '')) return 'CANONICAL';
  if (visible === String(row.hostRawFingerprint || '')) return 'HOST_RAW';
  return 'NONE';
}

function deltaShape(match) {
  if (match === 'FRESH_CHAT') return 'FRESH_EXACT_CARRYOVER';
  if (match === 'CANONICAL') return 'CANONICAL_EXACT_CARRYOVER';
  if (match === 'HOST_RAW') return 'HOST_RAW_EXACT_CARRYOVER';
  return 'NEW_VISIBLE_REPRESENTATION';
}

function inspectCarryover(visibleFingerprint, row) {
  const priorCanonical = String(row?.canonicalFingerprint || '');
  const priorFresh = String(row?.freshFingerprint || '');
  const priorHostRaw = String(row?.hostRawFingerprint || '');
  const priorMatch = String(row?.fingerprintMatch || '');
  const prior = priorRepresentation(row);
  const current = currentMatch(visibleFingerprint, row);
  const currentChars = fingerprintChars(visibleFingerprint);
  const canonicalChars = fingerprintChars(priorCanonical);
  const freshChars = fingerprintChars(priorFresh);
  return Object.freeze({
    priorCanonical, priorFresh, priorHostRaw, priorMatch,
    priorRepresentation: prior,
    currentMatch: current,
    deltaCanonical: currentChars != null && canonicalChars != null ? currentChars - canonicalChars : null,
    deltaFresh: currentChars != null && freshChars != null ? currentChars - freshChars : null,
    deltaShape: deltaShape(current),
  });
}

function createRegistry(limit = 16) {
  const maxRows = Math.max(1, Number(limit) || 16);
  const ledger = [];
  function remember(probe) {
    if (!probe || !probe.freshFingerprintFull) return;
    const entry = Object.freeze({
      outIndex: Number(probe.outIndex),
      locationKey: String(probe.locationKey || ''),
      status: String(probe.status || 'n/a'),
      fingerprintMatch: String(probe.fingerprintMatch || 'n/a'),
      acceptedCanonicalEquivalent: probe.acceptedCanonicalEquivalent === true,
      canonicalFingerprint: String(probe.canonicalFingerprintFull || ''),
      hostRawFingerprint: String(probe.hostRawFingerprintFull || ''),
      freshFingerprint: String(probe.freshFingerprintFull || ''),
      at: Number(probe.finishedAt || Date.now()),
    });
    for (let i = ledger.length - 1; i >= 0; i--) {
      if (ledger[i].locationKey === entry.locationKey && ledger[i].outIndex === entry.outIndex) ledger.splice(i, 1);
    }
    ledger.push(entry);
    if (ledger.length > maxRows) ledger.splice(0, ledger.length - maxRows);
  }
  function rows() { return ledger.slice(); }
  function latest(outIndex, locationKey = '') {
    const expectedIndex = Number(outIndex);
    const expectedLocation = String(locationKey || '');
    for (let i = ledger.length - 1; i >= 0; i--) {
      const row = ledger[i];
      if (Number(row?.outIndex) !== expectedIndex) continue;
      if (expectedLocation && String(row?.locationKey || '') !== expectedLocation) continue;
      return row;
    }
    return null;
  }
  function clear() { ledger.length = 0; }
  return Object.freeze({ remember, rows, latest, clear });
}

module.exports = { createRegistry, inspectCarryover, fingerprintChars };
});

SimCore.define("runtime-mirror", function (require, module, exports) {
const outputCompat = require('./output-compat');
function createMirrorRuntime(deps) {
  const { coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch, rememberRepresentation } = deps;
  let sequence = 0;
  const latestByLocation = new Map();
  let lastProbe = null;

  function capture(chaIdx, chatIdx, chat, outIndex, state = null) {
    const coreSession = getCoreSession();
    if (!coreSession) return null;
    const committed = state && typeof state === 'object' ? state : coreSession.current;
    if (!committed) return null;
    return {
      outIndex: Number(outIndex),
      locationKey: diagnosticLocationKey(chaIdx, chatIdx, chat),
      portableState: coreSession.portableState(),
      mode: committed.lastMode || 'A',
      broadcastLocked: committed.broadcastLocked ? '1' : '0',
      communityCount: String(committed.community?.activationCount || 0),
      ageOffset: String(committed.koreanAgeOffset || 0),
      outputFingerprint: committed.outputFingerprint || null,
      hostOutputFingerprint: committed.hostOutputFingerprint || null,
    };
  }

  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, observationPlan = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.chatLoadMs = 0;
      detail.prepareMs = 0;
      detail.setChatMs = 0;
      detail.status = 'PENDING';
    }
    const coreSession = getCoreSession();
    const snapshot = mirrorSnapshot || capture(chaIdx, chatIdx, chatArg, coreSession?.currentOutputIndex, coreSession?.current);
    if (!snapshot) { if (detail) detail.status = 'NO_SNAPSHOT'; return false; }
    const guard = typeof shouldApply === 'function' ? shouldApply : () => true;
    if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
    try {
      let t = perfNow();
      const chat = chatArg || await host.getChat(chaIdx, chatIdx);
      if (detail) detail.chatLoadMs = perfMs(t);
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
      if (!chat) { if (detail) detail.status = 'NO_CHAT'; return false; }
      if (diagnosticLocationKey(chaIdx, chatIdx, chat) !== String(snapshot.locationKey || '')) {
        if (detail) detail.status = 'LOCATION_MISMATCH';
        return false;
      }

      const expectedOutIndex = Number(snapshot.outIndex);
      if (Number.isInteger(expectedOutIndex) && expectedOutIndex >= 0) {
        const message = Array.isArray(chat.message) ? chat.message[expectedOutIndex] : null;
        if (!message || (message.role !== 'char' && message.role !== 'assistant')) {
          if (detail) detail.status = 'OUTPUT_NOT_READY';
          return false;
        }
        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));
        const canonical = String(snapshot.outputFingerprint || '');
        const hostRaw = String(snapshot.hostOutputFingerprint || '');
        const baseMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        const candidates = Array.isArray(observationPlan?.observation?.candidates)
          ? observationPlan.observation.candidates : [];
        const matchedCandidateIds = [];
        for (const row of candidates) {
          if (actualFingerprint === String(row?.fingerprint || '')) matchedCandidateIds.push(String(row?.candidateId || ''));
        }
        const receipt = Object.freeze({
          schema: 1,
          outIndex: expectedOutIndex,
          locationKey: String(snapshot.locationKey || ''),
          freshFingerprint: String(actualFingerprint || ''),
          baseMatch,
          matchedCandidateIds: Object.freeze(matchedCandidateIds),
          candidateMatchCount: matchedCandidateIds.length,
        });
        let interpretation;
        try {
          interpretation = outputCompat.interpretFreshObservation(observationPlan, receipt);
        } catch (_) {
          interpretation = null;
        }
        const acceptedCanonicalEquivalent = interpretation?.acceptedCanonicalEquivalent === true;
        const fingerprintMatch = String(interpretation?.fingerprintMatch || baseMatch || 'MISMATCH');

        if (detail) {
          detail.canonicalFingerprint = (acceptedCanonicalEquivalent ? actualFingerprint : canonical).slice(0, 12);
          detail.hostRawFingerprint = hostRaw.slice(0, 12);
          detail.freshFingerprint = String(actualFingerprint || '').slice(0, 12);
          detail.canonicalFingerprintFull = acceptedCanonicalEquivalent ? String(actualFingerprint || '') : canonical;
          detail.hostRawFingerprintFull = hostRaw;
          detail.freshFingerprintFull = String(actualFingerprint || '');
          detail.fingerprintMatch = fingerprintMatch;
          detail.acceptedCanonicalEquivalent = acceptedCanonicalEquivalent;
          detail.observationBaseMatch = baseMatch;
          detail.observationCandidateMatches = matchedCandidateIds.length;
          detail.freshEnvelopeRecovery = interpretation?.freshEnvelopeRecovery || (observationPlan?.telemetrySeed?.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = interpretation?.freshEnvelopeSource || null;
          detail.freshEnvelopePolicy = interpretation?.freshEnvelopePolicy || null;
          detail.freshEnvelopeCandidateChars = Number(interpretation?.freshEnvelopeCandidateChars || observationPlan?.telemetrySeed?.freshEnvelopeCandidateChars || 0);
          detail.freshEnvelopeBoundaryChars = Number(interpretation?.freshEnvelopeBoundaryChars || 0);
          detail.freshEnvelopeBoundaryDelta = Number(interpretation?.freshEnvelopeBoundaryDelta || 0);
          detail.freshEnvelopeBoundaryKind = interpretation?.freshEnvelopeBoundaryKind || null;
          detail.freshEnvelopePersistent = 'NONE';
          detail.safeEnvelopeReconcile = interpretation?.safeEnvelopeReconcile || (observationPlan?.telemetrySeed?.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE');
          detail.safeEnvelopeSource = interpretation?.safeEnvelopeSource || null;
          detail.safeEnvelopePolicy = interpretation?.safeEnvelopePolicy || null;
          detail.safeEnvelopeCanonicalChars = Number(interpretation?.safeEnvelopeCanonicalChars || observationPlan?.telemetrySeed?.safeEnvelopeCanonicalChars || 0);
          detail.safeEnvelopeBoundaryChars = Number(interpretation?.safeEnvelopeBoundaryChars || 0);
          detail.safeEnvelopeBoundaryDelta = Number(interpretation?.safeEnvelopeBoundaryDelta || 0);
          detail.safeEnvelopeBoundaryKind = interpretation?.safeEnvelopeBoundaryKind || null;
          detail.safeEnvelopePersistent = 'NONE';
        }

        if (baseMatch === 'MISMATCH' && !acceptedCanonicalEquivalent) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }
        // Interpretation cannot authorize stale work. Re-check before any trusted-identity mutation.
        if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
        if (acceptedCanonicalEquivalent) {
          snapshot.outputFingerprint = actualFingerprint;
          const liveSession = getCoreSession();
          if (!liveSession?.current
              || Number(liveSession.currentOutputIndex) !== expectedOutIndex
              || String(snapshot.locationKey || '') !== diagnosticLocationKey(chaIdx, chatIdx, chat)) {
            if (detail) detail.status = 'SESSION_IDENTITY_MISMATCH';
            return false;
          }
          liveSession.current.outputFingerprint = actualFingerprint;
          liveSession.trustedOutputFingerprint = actualFingerprint;
          snapshot.portableState = liveSession.portableState();
        }
      }
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }

      t = perfNow();
      chat.scriptstate = chat.scriptstate || {};
      chat.scriptstate['$simcore_core_state'] = snapshot.portableState;
      chat.scriptstate['$simcore_core_mode'] = snapshot.mode || 'A';
      chat.scriptstate['$simcore_core_broadcast_locked'] = snapshot.broadcastLocked || '0';
      chat.scriptstate['$simcore_core_community_count'] = snapshot.communityCount || '0';
      chat.scriptstate['$simcore_core_age_offset'] = snapshot.ageOffset || '0';
      delete chat.scriptstate['$simcore_core_reaction_global_max'];
      if (detail) detail.prepareMs = perfMs(t);
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }

      t = perfNow();
      await host.setChat(chaIdx, chatIdx, chat);
      if (detail) { detail.setChatMs = perfMs(t); detail.status = 'COMMITTED'; }
      return true;
    } catch (e) {
      if (detail) { detail.status = 'ERROR'; detail.errorName = e?.name || 'Error'; }
      console.log(SIMCORE_LOG_PREFIX + ' state mirror failed:', e.message);
      return false;
    }
  }

  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
    if (!snapshot) return false;
    const observationPlan = outputCompat.buildFreshObservationPlan(
      freshEnvelopeConfirmation,
      safeEnvelopeBoundaryConfirmation,
    );
    const epoch = getRuntimeEpoch();
    const locationKey = String(snapshot.locationKey || '');
    const currentSequence = ++sequence;
    latestByLocation.set(locationKey, currentSequence);
    const probe = {
      outIndex: Number(outIndex), locationKey, sequence: currentSequence, status: 'SCHEDULED',
      scheduledAt: Date.now(), startedAt: null, finishedAt: null,
      chatLoadMs: 0, prepareMs: 0, setChatMs: 0, totalMs: 0,
      canonicalFingerprint: String(snapshot.outputFingerprint || '').slice(0, 12),
      hostRawFingerprint: String(snapshot.hostOutputFingerprint || '').slice(0, 12),
      freshFingerprint: null, fingerprintMatch: 'PENDING',
      canonicalFingerprintFull: String(snapshot.outputFingerprint || ''),
      hostRawFingerprintFull: String(snapshot.hostOutputFingerprint || ''),
      freshFingerprintFull: null,
      freshEnvelopeRecovery: freshEnvelopeConfirmation ? 'PENDING' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(observationPlan?.telemetrySeed?.freshEnvelopeCandidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(observationPlan?.telemetrySeed?.safeEnvelopeCanonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE',
      acceptedCanonicalEquivalent: false,
      observationBaseMatch: 'PENDING',
      observationCandidateMatches: 0,
    };
    lastProbe = probe;
    const shouldApply = () => runtimeIsCurrent(epoch) && latestByLocation.get(locationKey) === currentSequence;

    const runDeferredMirror = async () => {
      if (!shouldApply()) {
        probe.status = runtimeIsCurrent(epoch) ? 'SUPERSEDED' : 'STALE_DROPPED';
        probe.finishedAt = Date.now();
        return;
      }
      probe.startedAt = Date.now();
      const detail = {};
      const started = perfNow();
      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, observationPlan);
      probe.totalMs = perfMs(started);
      probe.chatLoadMs = Number(detail.chatLoadMs || 0);
      probe.prepareMs = Number(detail.prepareMs || 0);
      probe.setChatMs = Number(detail.setChatMs || 0);
      probe.canonicalFingerprint = detail.canonicalFingerprint ?? probe.canonicalFingerprint;
      probe.hostRawFingerprint = detail.hostRawFingerprint ?? probe.hostRawFingerprint;
      probe.freshFingerprint = detail.freshFingerprint ?? probe.freshFingerprint;
      probe.canonicalFingerprintFull = detail.canonicalFingerprintFull ?? probe.canonicalFingerprintFull;
      probe.hostRawFingerprintFull = detail.hostRawFingerprintFull ?? probe.hostRawFingerprintFull;
      probe.freshFingerprintFull = detail.freshFingerprintFull ?? probe.freshFingerprintFull;
      probe.fingerprintMatch = detail.fingerprintMatch ?? probe.fingerprintMatch;
      probe.freshEnvelopeRecovery = detail.freshEnvelopeRecovery ?? probe.freshEnvelopeRecovery;
      probe.freshEnvelopeSource = detail.freshEnvelopeSource ?? probe.freshEnvelopeSource;
      probe.freshEnvelopePolicy = detail.freshEnvelopePolicy ?? probe.freshEnvelopePolicy;
      probe.freshEnvelopeCandidateChars = detail.freshEnvelopeCandidateChars ?? probe.freshEnvelopeCandidateChars;
      probe.freshEnvelopeBoundaryChars = detail.freshEnvelopeBoundaryChars ?? probe.freshEnvelopeBoundaryChars;
      probe.freshEnvelopeBoundaryDelta = detail.freshEnvelopeBoundaryDelta ?? probe.freshEnvelopeBoundaryDelta;
      probe.freshEnvelopeBoundaryKind = detail.freshEnvelopeBoundaryKind ?? probe.freshEnvelopeBoundaryKind;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;
      probe.safeEnvelopeReconcile = detail.safeEnvelopeReconcile ?? probe.safeEnvelopeReconcile;
      probe.safeEnvelopeSource = detail.safeEnvelopeSource ?? probe.safeEnvelopeSource;
      probe.safeEnvelopePolicy = detail.safeEnvelopePolicy ?? probe.safeEnvelopePolicy;
      probe.safeEnvelopeCanonicalChars = detail.safeEnvelopeCanonicalChars ?? probe.safeEnvelopeCanonicalChars;
      probe.safeEnvelopeBoundaryChars = detail.safeEnvelopeBoundaryChars ?? probe.safeEnvelopeBoundaryChars;
      probe.safeEnvelopeBoundaryDelta = detail.safeEnvelopeBoundaryDelta ?? probe.safeEnvelopeBoundaryDelta;
      probe.safeEnvelopeBoundaryKind = detail.safeEnvelopeBoundaryKind ?? probe.safeEnvelopeBoundaryKind;
      probe.safeEnvelopePersistent = detail.safeEnvelopePersistent ?? probe.safeEnvelopePersistent;
      probe.acceptedCanonicalEquivalent = detail.acceptedCanonicalEquivalent === true;
      probe.observationBaseMatch = detail.observationBaseMatch ?? probe.observationBaseMatch;
      probe.observationCandidateMatches = detail.observationCandidateMatches ?? probe.observationCandidateMatches;
      if (!runtimeIsCurrent(epoch)) probe.status = 'STALE_DROPPED';
      else if (latestByLocation.get(locationKey) !== currentSequence) probe.status = 'SUPERSEDED';
      else probe.status = detail.status || (ok ? 'COMMITTED' : 'SKIPPED');
      probe.finishedAt = Date.now();
      rememberRepresentation(probe);
    };

    if (typeof setTimeout === 'function') {
      const timer = setTimeout(() => { void runDeferredMirror(); }, 0);
      if (timer && typeof timer.unref === 'function') timer.unref();
    } else {
      void runDeferredMirror();
    }
    return true;
  }

  function clear() {
    latestByLocation.clear();
    lastProbe = null;
  }

  return Object.freeze({ schedule, lastProbe: () => lastProbe, clear });
}
module.exports = { createMirrorRuntime };
});

SimCore.define("runtime-hooks", function (require, module, exports) {
async function addBefore(Risuai, handler) { return Risuai.addRisuReplacer('beforeRequest', handler); }
async function addOutput(Risuai, handler) { return Risuai.addRisuScriptHandler('output', handler); }
async function remove(Risuai, beforeHandler, outputHandler) {
  try { await Risuai.removeRisuReplacer('beforeRequest', beforeHandler); } catch (_) {}
  try { await Risuai.removeRisuScriptHandler('output', outputHandler); } catch (_) {}
}
module.exports = { addBefore, addOutput, remove };
});

SimCore.define("runtime-probe", function (require, module, exports) {
function cachePosture(probe, contract) {
  if (!probe) return `${contract?.requestOrder || 'FROZEN'} · runtime ${contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER'} · runtime-prefix n/a · provider cache ${contract?.providerCache || 'UNVERIFIED'}`;
  const prefix = probe.baseline ? 'BASELINE' : `${Number(probe.stablePrefixPercent || 0).toFixed(1)}%`;
  return `${probe.requestOrder || contract?.requestOrder || 'FROZEN'} · runtime ${probe.placement || contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER'} · runtime-prefix ${prefix} · provider cache ${probe.providerCache || contract?.providerCache || 'UNVERIFIED'}`;
}
function cadence(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return 'BASELINE';
  const value = Math.max(0, Number(ms));
  if (value < 1000) return `${value.toFixed(0)} ms`;
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`;
  const minutes = Math.floor(value / 60000);
  const seconds = (value - minutes * 60000) / 1000;
  return `${minutes}m ${seconds.toFixed(1)}s`;
}
function topology(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return `BASELINE · messages ${Number(probe.messages || 0)} · chars ${Number(probe.totalChars || 0).toLocaleString('en-US')}`;
  const first = probe.firstChangeIndex == null ? 'none' : `@${Number(probe.firstChangeIndex)} ${probe.previousRole || '?'}→${probe.currentRole || '?'}`;
  return `${probe.stable ? 'STABLE' : 'COMMON_PREFIX'} · messages ${Number(probe.commonMessages || 0)}/${Number(probe.messages || 0)} · chars ${Number(probe.commonChars || 0).toLocaleString('en-US')}/${Number(probe.totalChars || 0).toLocaleString('en-US')} · ratio ${Number(probe.commonRatio || 0).toFixed(1)}% · first change ${first}`;
}
function cacheIntegrity(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  return probe.stable ? 'STABLE' : 'DEGRADED';
}
function breakInfo(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  if (probe.stable) return 'NONE';
  const first = probe.firstChangeIndex == null ? 'n/a' : `@${Number(probe.firstChangeIndex)} ${probe.previousRole || '?'}→${probe.currentRole || '?'}`;
  return `${probe.breakOwner || 'UNKNOWN'} · ${probe.breakZone || 'UNKNOWN'} · ${first}`;
}
function historyMutation(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  if (probe.stable || probe.firstChangeIndex == null) return 'NONE';
  return `@${Number(probe.firstChangeIndex)} · ${probe.mutationShape || 'UNKNOWN'} · prev ${probe.previousBreakSignature || 'END'} → current ${probe.currentBreakSignature || 'END'}`;
}
function cacheEffect(probe, movementProbe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE · provider UNVERIFIED';
  const commonMessages = Number(probe.commonMessages || 0);
  const messages = Number(probe.messages || 0);
  const commonChars = Number(probe.commonChars || 0);
  const totalChars = Number(probe.totalChars || 0);
  const ratio = Number(probe.commonRatio || 0);
  let status = 'REUSE_WINDOW_STABLE';
  if (probe.stable) {
    status = 'REUSE_WINDOW_STABLE';
  } else if (commonMessages <= 0 || commonChars <= 0) {
    status = 'PREFIX_COLLAPSE';
  } else if (movementProbe?.status === 'MOVED') {
    const dm = Number(movementProbe.deltaMessages || 0);
    const dc = Number(movementProbe.deltaChars || 0);
    if (dm > 0 || (dm === 0 && dc > 0)) status = 'REUSE_WINDOW_GROWING';
    else if (dm < 0 || (dm === 0 && dc < 0)) status = 'REUSE_WINDOW_SHRINKING';
  }
  const frontier = probe.firstChangeIndex == null ? 'none' : `@${Number(probe.firstChangeIndex)}`;
  let movement = movementProbe?.status || 'n/a';
  if (movementProbe?.status === 'MOVED') {
    const dm = Number(movementProbe.deltaMessages || 0);
    const dc = Number(movementProbe.deltaChars || 0);
    movement = `${dm >= 0 ? '+' : ''}${dm} msgs / ${dc >= 0 ? '+' : ''}${dc.toLocaleString('en-US')} chars`;
  }
  const breakKind = probe.stable ? 'NONE' : `${probe.breakOwner || 'UNKNOWN'} · ${probe.breakZone || 'UNKNOWN'}`;
  return `${status} · common ${commonMessages}/${messages} msgs · ${commonChars.toLocaleString('en-US')}/${totalChars.toLocaleString('en-US')} chars · ratio ${ratio.toFixed(1)}% · frontier ${frontier} · movement ${movement} · break ${breakKind} · provider UNVERIFIED`;
}
function hostPrefixAttribution(probe) {
  const hp = probe?.hostPrefixProbe;
  if (!hp) return 'n/a';
  if (hp.status === 'BASELINE') return `BASELINE · system0 ${hp.currentSignature || 'n/a'} · block ${Number(hp.blockChars || 0)}c · raw bodies NOT RETAINED`;
  if (hp.status === 'UNAVAILABLE') return 'UNAVAILABLE · system @0 absent · raw bodies NOT RETAINED';
  return `${hp.status || 'n/a'} · shape ${hp.shape || 'n/a'} · confidence ${hp.confidence || 'NONE'} · block ${Number(hp.blockChars || 0)}c · raw bodies NOT RETAINED`;
}
function hostPrefixDelta(probe) {
  const hp = probe?.hostPrefixProbe;
  if (!hp) return 'n/a';
  const familyCurrent = hp.currentFamilyId ? String(hp.currentFamilyId).slice(0, 8) : 'n/a';
  const familyPrevious = hp.previousFamilyId ? String(hp.previousFamilyId).slice(0, 8) : 'n/a';
  const family = hp.previousFamilyId
    ? `${familyPrevious}→${familyCurrent} · ${hp.familyChanged ? 'RESET_CORRELATED' : 'SAME_FAMILY'}`
    : `${familyCurrent} · BASELINE`;
  if (hp.status === 'BASELINE') return `system0 ${hp.currentSignature || 'n/a'} · family ${family}`;
  if (hp.status === 'UNAVAILABLE') return `system0 unavailable · family ${family}`;
  const delta = Number(hp.deltaChars || 0);
  return `prev ${hp.previousSignature || 'n/a'} → current ${hp.currentSignature || 'n/a'} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · head ≥${Number(hp.commonHeadChars || 0).toLocaleString('en-US')} · tail ≥${Number(hp.commonTailChars || 0).toLocaleString('en-US')} · changed prev ≤${Number(hp.previousChangedChars || 0).toLocaleString('en-US')} · current ≤${Number(hp.currentChangedChars || 0).toLocaleString('en-US')} · family ${family}`;
}
function historyAlignment(probe) {
  if (!probe) return 'n/a';
  if (probe.alignmentStatus === 'OBSERVE_ONLY') return `OBSERVE_ONLY · target assistant/text 21:4a852496 · candidates ${Number(probe.candidates || 0)} · request mutation NONE`;
  const offset = probe.spineOffset == null ? 'n/a' : `${Number(probe.spineOffset) >= 0 ? '+' : ''}${Number(probe.spineOffset)}`;
  const roleMatches = `${Number(probe.roleMatches || 0)}/${Number(probe.roleExpected || 0)}`;
  return `${probe.alignmentStatus || 'n/a'} · request spine ${Number(probe.requestSpine || 0)} · host spine ${Number(probe.hostSpine || 0)} · endpoint ${probe.endpointSource || 'n/a'} · role matches ${roleMatches} · targets ${Number(probe.mappedTargets || 0)}/${Number(probe.candidates || 0)} · offset ${offset} · body equality ${probe.bodyEquality || 'n/a'}`;
}
function historyStabilization(probe) {
  if (!probe) return 'n/a';
  const range = probe.firstIndex == null ? 'n/a' : (probe.firstIndex === probe.lastIndex ? `@${Number(probe.firstIndex)}` : `@${Number(probe.firstIndex)}..@${Number(probe.lastIndex)}`);
  const delta = Number(probe.addedChars || 0);
  return `${probe.status || 'n/a'} · slots ${Number(probe.applied || 0)}/${Number(probe.candidates || 0)} · range ${range} · source ${probe.source || 'n/a'} · mapped ${Number(probe.mappedTargets || 0)}/${Number(probe.candidates || 0)} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · persistent ${probe.persistentMutation || 'NONE'} · cost ${Number(probe.costMs || 0).toFixed(1)} ms`;
}
function representationCorrelation(probe) {
  if (!probe) return 'n/a';
  return `${probe.matchSummary || 'NONE'} · ledger ${Number(probe.ledgerSize || 0)}`;
}
function mutationAttribution(probe) {
  if (!probe) return 'n/a';
  return `${probe.status || 'n/a'} · ${probe.confidence || 'NONE'}`;
}
function reconcileFrontier(probe) {
  if (!probe) return 'n/a';
  if (probe.status === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  const index = Number.isInteger(Number(probe.index)) ? `@${Number(probe.index)}` : '@n/a';
  const window = Number.isInteger(Number(probe.windowStart)) && Number.isInteger(Number(probe.windowEnd))
    ? `@${Number(probe.windowStart)}..@${Number(probe.windowEnd)}`
    : 'n/a';
  return `${index} · PRE ${probe.preSignature || 'n/a'} · POST ${probe.postSignature || 'n/a'} · FINAL ${probe.finalSignature || 'n/a'} · window ${window}`;
}
function rebuildAttribution(probe) {
  if (!probe) return 'n/a';
  return `${probe.status || 'n/a'} · ${probe.confidence || 'NONE'} · edit ${probe.editPath || 'n/a'}`;
}
function repeatedBreak(probe) {
  if (!probe) return 'n/a';
  if (probe.status === 'NONE') return 'NONE';
  return `${probe.signature || 'n/a'} · seen ${Number(probe.count || 0)} · first @${Number(probe.firstIndex ?? -1)} · latest @${Number(probe.latestIndex ?? -1)}`;
}
function frontierMovement(probe) {
  if (!probe) return 'n/a';
  if (probe.status !== 'MOVED') return probe.status || 'n/a';
  const dm = Number(probe.deltaMessages || 0);
  const dc = Number(probe.deltaChars || 0);
  return `@${Number(probe.previousIndex)}→@${Number(probe.currentIndex)} · Δmessages ${dm >= 0 ? '+' : ''}${dm} · Δchars ${dc >= 0 ? '+' : ''}${dc.toLocaleString('en-US')}`;
}
function exposure(probe) {
  if (!probe || probe.baseline) return 'BASELINE';
  return `${Number(probe.exposureChars || 0).toLocaleString('en-US')}/${Number(probe.totalChars || 0).toLocaleString('en-US')} chars · ${Number(probe.exposureRatio || 0).toFixed(1)}% · local proxy only`;
}
function runtimeIdentity(probe) {
  const id = probe?.identity;
  if (!id) return 'n/a';
  const part = (name) => {
    const x = id[name];
    return `${name} ${x?.status || 'n/a'} ${String(x?.hash || 'n/a').slice(0, 8)} ${Number(x?.chars || 0)}c`;
  };
  return `${id.source || 'UNKNOWN'} · ${part('stable')} · ${part('slow')} · ${part('volatile')} · ${part('full')}`;
}
function simcoreContribution(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  if (probe.stable) return 'NO_BREAK';
  return probe.breakOwner === 'SIMCORE_RUNTIME' ? 'FIRST_BREAK' : 'NOT_FIRST_BREAK';
}

function trajectory(probe) {
  if (!probe) return 'n/a';
  const family = probe.familyId ? String(probe.familyId).slice(0, 8) : 'n/a';
  const floor = probe.stableFloorChars == null ? 'n/a' : `${Number(probe.stableFloorMessages || 0)} msgs / ${Number(probe.stableFloorChars || 0).toLocaleString('en-US')} chars`;
  const frontier = probe.distinct <= 1 ? 'n/a' : `${Number(probe.movingFrontierMessages || 0)} msgs / ${Number(probe.movingFrontierChars || 0).toLocaleString('en-US')} chars`;
  const ema = probe.cadenceEmaMs == null ? 'BASELINE' : cadence(probe.cadenceEmaMs);
  return `${probe.status || 'n/a'} · family ${family}${probe.familyReset ? ' · FAMILY_RESET' : ''} · distinct ${Number(probe.distinct || 0)} · attempts ${Number(probe.attempts || 0)} · last ${probe.lastObservation || 'n/a'} · floor ${floor} · frontier ${frontier} · streak ${Number(probe.frontierStreak || 0)} · divergence ${Number(probe.divergenceCount || 0)} · cadence EMA ${ema}`;
}

function continuity(probe) {
  if (!probe) return 'FRESH · no compatible handoff';
  if (!probe.accepted) return `FRESH · ${probe.reason || 'no-compatible-handoff'}`;
  return `ADOPTED · via ${probe.transport || 'memory'}${probe.transport === 'session' && probe.sessionRoot ? ` · root ${probe.sessionRoot}` : ''} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}${probe.handoffPrecision ? ` · handoff prompt ${probe.handoffPrecision.prompt || 'FRESH'} · topology ${probe.handoffPrecision.topology || 'FRESH'}` : ''}`;
}
function fingerprintChars(value) {
  const match = /^(\d+):/.exec(String(value || ''));
  return match ? Number(match[1]) : null;
}
function representation(probe) {
  if (!probe) return 'n/a';
  const canonical = fingerprintChars(probe.canonicalFingerprint);
  const fresh = fingerprintChars(probe.freshFingerprint);
  if (canonical == null || fresh == null) return 'n/a';
  const delta = fresh - canonical;
  const relation = ['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(String(probe.fingerprintMatch || '')) ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');
  return `CANONICAL↔FRESH Δchars ${delta >= 0 ? '+' : ''}${delta} · ${relation} · raw bodies NOT RETAINED`;
}
module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, cacheEffect, hostPrefixAttribution, hostPrefixDelta, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };
});

// v0.64.11 bounded handoff adapters: rich observer state remains owned by the existing modules.
(() => {
  const PROMPT_LINES = 64;
  const TOPO_SIGS = 64;
  const SYS_EDGES = 8;
  const KEY_MAX = 512;
  const PROMPT_BUDGET = 4096;
  const TOPO_BUDGET = 6144;
  const TRAJ_BUDGET = 2048;
  const WHOLE_BUDGET = 16384;
  const fnv = (value) => {
    const text = String(value == null ? '' : value);
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const msgText = (m) => {
    const c = m?.content;
    if (typeof c === 'string') return c;
    try { return JSON.stringify(c == null ? '' : c); } catch (_) { return String(c == null ? '' : c); }
  };
  const relative = (index, first, baseline, stable, floor) => {
    if (!Number.isInteger(index) || index < 0) return 'ABSENT';
    if (baseline) return 'BASELINE';
    if (floor) return 'WITHIN_OR_AFTER_BOUNDED_PREFIX';
    if (stable || first == null) return 'WITHIN_COMMON_PREFIX';
    if (index < first) return 'WITHIN_COMMON_PREFIX';
    if (index === first) return 'AT_PREFIX_BREAK';
    return 'AFTER_PREFIX_BREAK';
  };
  const compactSystem0 = (message) => {
    if (String(message?.role || '') !== 'system') return null;
    const text = msgText(message);
    const block = 512;
    const totalBlocks = Math.ceil(text.length / block);
    const headBlocks = [];
    const tailBlocks = [];
    for (let i = 0; i < Math.min(SYS_EDGES, totalBlocks); i++) headBlocks.push(fnv(text.slice(i * block, Math.min(text.length, (i + 1) * block))));
    for (let i = 0; i < Math.min(SYS_EDGES, totalBlocks); i++) {
      const end = text.length - (i * block);
      tailBlocks.push(fnv(text.slice(Math.max(0, end - block), end)));
    }
    return Object.freeze({ version: 2, chars: text.length, blockChars: block, totalBlocks, headBlocks: Object.freeze(headBlocks), tailBlocks: Object.freeze(tailBlocks) });
  };
  const compactPrompt = (key, text, identity) => {
    const value = String(text || '');
    const lines = value ? value.split('\n') : [''];
    const summaries = lines.slice(0, PROMPT_LINES).map((line) => Object.freeze([line.length, fnv(line)]));
    return Object.freeze({
      version: 2, handoffDisposition: key && key.length <= KEY_MAX ? 'OK' : 'IDENTITY_UNREPRESENTABLE', key,
      sketch: Object.freeze({ version: 2, chars: value.length, fullHash: fnv(value), lineCount: lines.length, retainedLineCount: summaries.length, lines: Object.freeze(summaries) }),
      identity: identity || null, identityMode: identity?.source || null,
      precision: lines.length <= PROMPT_LINES ? 'LINE_BOUND' : 'PREFIX_FLOOR',
    });
  };
  const promptFromHandoff = (saved, current, base) => {
    const sketch = saved?.sketch;
    const value = String(current || '');
    if (!sketch || Number(sketch.version) !== 2) return base;
    const stable = Number(sketch.chars || 0) === value.length && String(sketch.fullHash || '') === fnv(value);
    if (stable) return Object.freeze({ ...base, baseline: false, stable: true, previousChars: Number(sketch.chars || 0), currentChars: value.length, stablePrefixChars: value.length, stablePrefixPercent: 100, stablePrefixLines: Number(sketch.lineCount || 0), firstChangedLine: null, changedLineSlots: 0, reason: 'stable', continuitySource: 'HANDOFF_COMPACT_V2', precision: 'EXACT_IDENTITY' });
    const prior = Array.isArray(sketch.lines) ? sketch.lines : [];
    const now = value ? value.split('\n') : [''];
    let equalLines = 0, chars = 0, mismatch = false;
    const lim = Math.min(prior.length, now.length);
    while (equalLines < lim) {
      const row = prior[equalLines], line = now[equalLines];
      if (!Array.isArray(row) || Number(row[0]) !== line.length || String(row[1] || '') !== fnv(line)) { mismatch = true; break; }
      chars += line.length;
      if (equalLines < Number(sketch.lineCount || 0) - 1 && equalLines < now.length - 1) chars += 1;
      equalLines += 1;
    }
    const precision = mismatch ? 'LINE_BOUND' : 'PREFIX_FLOOR';
    return Object.freeze({ ...base, baseline: false, stable: false, previousChars: Number(sketch.chars || 0), currentChars: value.length, stablePrefixChars: chars, stablePrefixPercent: (chars / Math.max(Number(sketch.chars || 0), value.length, 1)) * 100, stablePrefixLines: equalLines, firstChangedLine: mismatch ? equalLines + 1 : null, firstChangedLineStatus: mismatch ? 'KNOWN_LINE' : 'UNRESOLVED_AFTER_RETAINED_PREFIX', changedLineSlots: null, reason: 'other', continuitySource: 'HANDOFF_COMPACT_V2', precision });
  };

  const cacheRules = SimCore.require('runtime-cache');
  const createPrompt = cacheRules.createRuntimePromptCacheTracker;
  cacheRules.createRuntimePromptCacheTracker = (contract = null) => {
    const inner = createPrompt(contract);
    let compact = null;
    let imported = null;
    return Object.freeze({
      ...inner,
      observe(key, currentText, extra = null) {
        const base = inner.observe(key, currentText, extra);
        const probe = imported && imported.key === String(key || '') ? promptFromHandoff(imported, currentText, base) : base;
        imported = null;
        compact = compactPrompt(String(key || ''), currentText, probe.identity || base.identity || null);
        return probe;
      },
      exportHandoffState() { return compact || Object.freeze({ handoffDisposition: 'INELIGIBLE' }); },
      importHandoffState(state) {
        if (!state || Number(state.version) !== 2 || state.handoffDisposition !== 'OK' || typeof state.key !== 'string' || !state.key || state.key.length > KEY_MAX || !state.sketch) return false;
        imported = state;
        return true;
      },
    });
  };

  const topoRules = SimCore.require('runtime-topology');
  const createTopo = topoRules.createRequestTopologyTracker;
  topoRules.createRequestTopologyTracker = () => {
    const inner = createTopo();
    let compact = null;
    let imported = null;
    const makeCompact = (key, messages, probe) => {
      const list = Array.isArray(messages) ? messages : [];
      const sigs = list.slice(0, TOPO_SIGS).map((m) => topoRules.messageSignature(m));
      const valid = sigs.every((s) => s && String(s.role || '').length <= 24 && String(s.kind || '').length <= 24 && /^[0-9a-f]{8}$/i.test(String(s.hash || '')));
      const tuples = sigs.map((s) => Object.freeze([String(s.role || ''), String(s.kind || ''), Number(s.chars || 0), String(s.hash || '')]));
      return Object.freeze({
        version: 3, handoffDisposition: key && key.length <= KEY_MAX && valid ? 'OK' : 'IDENTITY_UNREPRESENTABLE', key,
        precision: list.length <= TOPO_SIGS ? 'COMPLETE_PREFIX' : 'PREFIX_FLOOR',
        previous: Object.freeze({ at: Number(probe?.at || Date.now()), totalMessages: list.length, totalChars: Number(probe?.totalChars || 0), currentUserIndex: Number(probe?.currentUserIndex ?? -1), runtimeIndex: Number(probe?.runtimeIndex ?? -1), leadingSystemMessages: Number(probe?.leadingSystemMessages || 0), requestFingerprint: String(probe?.requestFingerprint || ''), familyId: String(probe?.familyId || ''), signatures: Object.freeze(tuples), system0Sketch: compactSystem0(list[0]) }),
      });
    };
    const fromImported = (saved, messages, base) => {
      const prior = saved?.previous;
      if (!prior || !Array.isArray(prior.signatures)) return base;
      const list = Array.isArray(messages) ? messages : [];
      const current = list.map((m) => topoRules.messageSignature(m));
      const previous = prior.signatures.map((r) => ({ role: String(r?.[0] || ''), kind: String(r?.[1] || ''), chars: Number(r?.[2] || 0), hash: String(r?.[3] || '') }));
      const same = (a,b) => !!a && !!b && a.role === b.role && a.kind === b.kind && a.chars === b.chars && a.hash === b.hash;
      let commonMessages = 0, commonChars = 0;
      const lim = Math.min(previous.length, current.length);
      while (commonMessages < lim && same(previous[commonMessages], current[commonMessages])) { commonChars += current[commonMessages].chars; commonMessages += 1; }
      const totalPrevious = Math.max(previous.length, Number(prior.totalMessages || 0));
      const mismatch = commonMessages < lim;
      const floor = !mismatch && totalPrevious > previous.length;
      const first = mismatch || (!floor && totalPrevious !== current.length) ? commonMessages : null;
      const stable = !floor && first == null && totalPrevious === current.length;
      const attribution = floor ? { owner: 'UNRESOLVED', zone: 'UNRESOLVED_AFTER_RETAINED_PREFIX' } : topoRules.breakAttribution(first, Number(base.currentUserIndex), Number(base.runtimeIndex), Number(base.leadingSystemMessages), Number(prior.leadingSystemMessages || 0), false, stable);
      let hostPrefixProbe = base.hostPrefixProbe;
      const prior0 = prior.signatures[0];
      const current0 = current[0];
      if (prior.system0Sketch && prior0 && current0 && !(String(prior0[0]) === current0.role && String(prior0[1]) === current0.kind && Number(prior0[2]) === current0.chars && String(prior0[3]) === current0.hash)) {
        const nowSketch = compactSystem0(list[0]);
        const oldSketch = prior.system0Sketch;
        let head = 0, tail = 0;
        while (head < Math.min(oldSketch.headBlocks?.length || 0, nowSketch?.headBlocks?.length || 0) && String(oldSketch.headBlocks[head]) === String(nowSketch.headBlocks[head])) head += 1;
        while (tail < Math.min(oldSketch.tailBlocks?.length || 0, nowSketch?.tailBlocks?.length || 0) && String(oldSketch.tailBlocks[tail]) === String(nowSketch.tailBlocks[tail])) tail += 1;
        const block = 512, minChars = Math.min(Number(oldSketch.chars || 0), Number(nowSketch?.chars || 0));
        const hchars = Math.min(minChars, head * block), tchars = Math.min(Math.max(0, minChars - hchars), tail * block);
        const edgesMatch = head === (oldSketch.headBlocks?.length || 0) && tail === (oldSketch.tailBlocks?.length || 0);
        hostPrefixProbe = Object.freeze({ ...base.hostPrefixProbe, status: edgesMatch ? 'INTERIOR_CHANGED_UNLOCALIZED' : 'DELTA_LOCALIZED', shape: edgesMatch ? 'INTERIOR_CHANGED_UNLOCALIZED' : 'BOUNDED_EDGE_CHANGE', confidence: 'BOUNDED', precision: 'BOUNDED', commonHeadChars: hchars, commonTailChars: tchars, previousChangedChars: Math.max(0, Number(oldSketch.chars || 0) - hchars - tchars), currentChangedChars: Math.max(0, Number(nowSketch?.chars || 0) - hchars - tchars), deltaChars: Number(nowSketch?.chars || 0) - Number(oldSketch.chars || 0) });
      }
      const precision = floor ? 'PREFIX_FLOOR' : 'COMPLETE_PREFIX';
      return Object.freeze({ ...base, baseline: false, stable, previousMessages: totalPrevious, previousChars: Number(prior.totalChars || 0), commonMessages, commonChars, commonRatio: Number(base.totalChars || 0) > 0 ? Math.max(0, Math.min(100, (commonChars / Number(base.totalChars || 1)) * 100)) : 100, firstChangeIndex: first, firstChangeStatus: floor ? 'UNRESOLVED_AFTER_RETAINED_PREFIX' : (first == null ? 'NONE' : 'KNOWN'), previousRole: first == null ? null : (previous[first]?.role || 'END'), currentRole: first == null ? null : (current[first]?.role || 'END'), mutationShape: floor ? 'UNRESOLVED_AFTER_RETAINED_PREFIX' : (first == null ? 'NONE' : 'SAME_SLOT_CHANGED'), precision, breakOwner: attribution.owner, breakZone: attribution.zone, currentUserPosition: relative(Number(base.currentUserIndex), first, false, stable, floor), runtimePosition: relative(Number(base.runtimeIndex), first, false, stable, floor), previousFamilyId: String(prior.familyId || ''), hostPrefixProbe });
    };
    return Object.freeze({
      ...inner,
      observe(key, messages, extra = null) {
        const base = inner.observe(key, messages, extra);
        const probe = imported && imported.key === String(key || '') ? fromImported(imported, messages, base) : base;
        imported = null;
        compact = makeCompact(String(key || ''), messages, probe);
        return probe;
      },
      exportHandoffState() { return compact || Object.freeze({ handoffDisposition: 'INELIGIBLE' }); },
      importHandoffState(state) {
        if (!state || Number(state.version) !== 3 || state.handoffDisposition !== 'OK' || typeof state.key !== 'string' || !state.key || state.key.length > KEY_MAX || !state.previous) return false;
        imported = state;
        return true;
      },
    });
  };

  const candidateRules = SimCore.require('runtime-cache-candidates');
  const createCandidates = candidateRules.createCacheCandidateTracker;
  candidateRules.createCacheCandidateTracker = () => {
    const inner = createCandidates();
    return Object.freeze({
      ...inner,
      observe(key, topology, extra = null) {
        if (topology?.precision === 'PREFIX_FLOOR') {
          const state = inner.exportState()?.state || null;
          if (state && String(state.key || '') === String(key || '') && String(state.familyId || '') === String(topology?.familyId || 'none')) {
            return Object.freeze({ status: state.status, familyId: state.familyId, familyReset: false, attempts: Number(state.attempts || 0), distinct: Number(state.distinct || 0), distinctObservation: false, lastObservation: 'SKIPPED_BOUNDED_REOBSERVE', window: 3, stableFloorChars: state.stableFloorChars, stableFloorMessages: state.stableFloorMessages, movingFrontierChars: Number(state.movingFrontierChars || 0), movingFrontierMessages: Number(state.movingFrontierMessages || 0), frontierStreak: Number(state.frontierStreak || 0), divergenceCount: Number(state.divergenceCount || 0), regressionStreak: Number(state.regressionStreak || 0), cadenceEmaMs: state.cadenceEmaMs, boundedReobserveSkipped: true });
          }
        }
        return inner.observe(key, topology, extra);
      },
    });
  };

  const telemetry = SimCore.require('runtime-telemetry');
  let compaction = null;
  const baseDiagnostics = telemetry.diagnostics;
  const measure = (name, value, budget) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || String(value.handoffDisposition || 'OK') !== 'OK') return Object.freeze({ name, disposition: String(value?.handoffDisposition || 'INELIGIBLE'), chars: 0, budget });
    try { const chars = JSON.stringify(value).length; return Object.freeze({ name, disposition: chars > budget ? 'COMPONENT_OVERSIZE' : 'OK', chars, budget }); }
    catch (_) { return Object.freeze({ name, disposition: 'FAILED', chars: 0, budget }); }
  };
  telemetry.captureCompact = (input) => {
    const prompt = measure('prompt', input?.runtimePromptCache, PROMPT_BUDGET);
    const topology = measure('topology', input?.requestTopology, TOPO_BUDGET);
    const trajectory = measure('trajectory', input?.cacheCandidates, TRAJ_BUDGET);
    const components = Object.freeze({ prompt, topology, trajectory });
    const failed = [prompt, topology, trajectory].find((x) => x.disposition !== 'OK');
    const precision = Object.freeze({ prompt: String(input?.runtimePromptCache?.precision || 'FRESH'), topology: String(input?.requestTopology?.precision || 'FRESH') });
    const locationKey = String(input?.locationKey || '');
    if (!locationKey || failed) {
      compaction = Object.freeze({ format: 'COMPACT_V2', status: 'COMPACTION_FAILED', reason: !locationKey ? 'IDENTITY_UNREPRESENTABLE' : failed.disposition, wholeChars: 0, maxChars: WHOLE_BUDGET, components, precision });
      return null;
    }
    const capsule = { schema: 1, sourceVersion: String(input?.sourceVersion || ''), locationKey, capturedAt: Number(input?.capturedAt || Date.now()), runtimePromptCache: input.runtimePromptCache, requestTopology: input.requestTopology, cacheCandidates: input.cacheCandidates, handoff: Object.freeze({ format: 'COMPACT_V2', precision }) };
    let encoded;
    try { encoded = JSON.stringify(capsule); } catch (_) { encoded = null; }
    const chars = encoded == null ? 0 : encoded.length;
    if (encoded == null || chars > WHOLE_BUDGET) {
      compaction = Object.freeze({ format: 'COMPACT_V2', status: 'COMPACTION_FAILED', reason: encoded == null ? 'FAILED' : 'WHOLE_CAPSULE_OVERSIZE', wholeChars: chars, maxChars: WHOLE_BUDGET, components, precision });
      return null;
    }
    Object.defineProperty(capsule, '__simcorePreparedSerialized', { value: Object.freeze({ status: 'OK', encoded, chars }), enumerable: false, configurable: false, writable: false });
    Object.freeze(capsule);
    compaction = Object.freeze({ format: 'COMPACT_V2', status: 'OK', reason: 'OK', wholeChars: chars, maxChars: WHOLE_BUDGET, components, precision });
    return capsule;
  };
  telemetry.diagnostics = () => Object.freeze({ ...baseDiagnostics(), compaction, componentBudgets: Object.freeze({ prompt: PROMPT_BUDGET, topology: TOPO_BUDGET, trajectory: TRAJ_BUDGET, reserve: 2048 }) });
})();

(async () => {
  const kernel = SimCore.require('kernel');
  const time = SimCore.require('time');
  const coreRules = SimCore.require('session');
  const recurrenceRules = SimCore.require('recurrence');
  const evidenceRules = SimCore.require('evidence');
  const ops = SimCore.require('ops');
  const runtimeContracts = SimCore.require('runtime-contracts');
  const runtimeHostRules = SimCore.require('runtime-host');
  const runtimeCacheRules = SimCore.require('runtime-cache');
  const runtimeTopologyRules = SimCore.require('runtime-topology');
  const runtimeCacheCandidateRules = SimCore.require('runtime-cache-candidates');
  const runtimeTelemetryRules = SimCore.require('runtime-telemetry');
  const runtimeSessionRules = SimCore.require('runtime-session');
  const representationRules = SimCore.require('representation');
  const editReconcileRules = SimCore.require('edit-reconcile');
  const runtimeMirrorRules = SimCore.require('runtime-mirror');
  const runtimeHooks = SimCore.require('runtime-hooks');
  const runtimeProbeRules = SimCore.require('runtime-probe');
  let coreSession = null;
  let coreKey = null;
  let coreLocationKey = null;
  let lastCore = { active: false, mode: null, issues: [], diagnostics: [] };
  let lastPerf = null;
  let lastOutputPerf = null;
  const diagnosticRuntimeBootAt = Date.now();
  const diagnosticRuntimeGeneration = `${diagnosticRuntimeBootAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const diagnosticActivity = { requestHooks: 0, outputHooks: 0, requestSlow50: 0, outputSlow50: 0, requestMaxMs: 0, outputMaxMs: 0 };
  let runtimeDisposed = false;
  let runtimeEpoch = 1;
  let staleRuntimeDrops = 0;
  const simcoreUiParts = [];
  let lastHistoryRestore = null;
  let lastFrameGuardProbe = null;
  let lastEvidenceMappingProbe = null;
  let lastEvidenceFenceProbe = null;
  let lastNarrativeClockProbe = null;
  let lastTemplateRecurrenceProbe = null;
  let lastRequestLineageProbe = null;
  let lastCommunitySourceHandoffProbe = null;
  let lastRuntimePromptBudget = null;
  let lastRuntimePromptCacheProbe = null;
  let lastRequestTopologyProbe = null;
  let lastHistoryMutationAttributionProbe = null;
  let lastReconcileFrontierProbe = null;
  let lastRepeatedBreakProbe = null;
  let lastFrontierMovementProbe = null;
  let lastHistoryStabilizationProbe = null;
  const repeatedBreakLedger = [];
  const KNOWN_COMPACT_ASSISTANT_CHARS = 21;
  const KNOWN_COMPACT_ASSISTANT_HASH = '4a852496';
  const HISTORY_STABILIZATION_MAX_SLOTS = 12;
  const HISTORY_STABILIZATION_MIN_RAW_CHARS = 128;
  const HISTORY_STABILIZATION_MAX_RAW_CHARS = 100000;
  const HISTORY_ALIGNMENT_REQUEST_SPINE_LIMIT = 48;
  const HISTORY_ALIGNMENT_RAW_SPINE_LIMIT = 64;
  const HISTORY_ALIGNMENT_ENDPOINT = 'SEND_INDEX';
  const RECONCILE_WINDOW_BEHIND = 1;
  const RECONCILE_WINDOW_AHEAD = 4;
  const REPEATED_BREAK_LEDGER_LIMIT = 16;
  let lastCacheTrajectoryProbe = null;
  let lastCacheCandidateCostMs = null;
  let lastTelemetryContinuityProbe = null;
  let lastTimestampCanonicalization = null;
  let lastPreambleProvenance = null;
  let lastDiagnosticRequestProbe = null;
  let lastDiagnosticCopyProbe = null;
  let lastTelemetryCheckpointProbe = null;

  const { perfNow, perfMs } = ops;
  const host = runtimeHostRules.createHostAdapter(Risuai);
  const runtimePromptCache = runtimeCacheRules.createRuntimePromptCacheTracker(runtimeContracts.cache);
  const requestTopology = runtimeTopologyRules.createRequestTopologyTracker();
  const cacheCandidates = runtimeCacheCandidateRules.createCacheCandidateTracker();
  let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis, typeof window !== 'undefined' ? window : null);
  let telemetryAdoptionAttempted = false;

  async function checkpointRuntimeTelemetry(trigger) {
    const normalizedTrigger = trigger === 'UNLOAD' ? 'UNLOAD' : 'OUTPUT_COMMIT';
    try {
      const locationKey = String(coreKey || coreLocationKey || '');
      if (!locationKey) return null;
      const startedAt = perfNow();
      const capsule = runtimeTelemetryRules.captureCompact({
        sourceVersion: SIMCORE_RUNTIME_VERSION,
        locationKey,
        capturedAt: Date.now(),
        runtimePromptCache: runtimePromptCache.exportHandoffState(),
        requestTopology: requestTopology.exportHandoffState(),
        cacheCandidates: cacheCandidates.exportState(),
      });
      if (!capsule) {
        const compact = runtimeTelemetryRules.diagnostics().compaction || null;
        const probe = Object.freeze({ trigger: normalizedTrigger, memory: 'COMPACTION_FAILED', session: 'NOT_ATTEMPTED', sessionRoot: 'NONE', fallbackFrom: null, attempted: '', surface: runtimeTelemetryRules.diagnostics().surface || null, hostLocal: 'NOT_ATTEMPTED', hostElapsedMs: 0, host: runtimeTelemetryRules.diagnostics().host || null, serialization: 'COMPACTION_FAILED', serializedChars: Number(compact?.wholeChars || 0), compaction: compact, elapsedMs: perfMs(startedAt), retainedBodies: false });
        lastTelemetryCheckpointProbe = probe;
        return probe;
      }
      await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);
      const write = runtimeTelemetryRules.diagnostics().write || null;
      const probe = Object.freeze({
        trigger: normalizedTrigger,
        memory: write?.memory || 'UNAVAILABLE',
        session: write?.session || 'UNAVAILABLE',
        sessionRoot: write?.sessionRoot || 'NONE',
        fallbackFrom: write?.fallbackFrom || null,
        attempted: write?.attempted || '',
        surface: write?.surface || runtimeTelemetryRules.diagnostics().surface || null,
        hostLocal: write?.hostLocal || 'UNAVAILABLE',
        hostElapsedMs: Number(write?.hostElapsedMs || 0),
        host: runtimeTelemetryRules.diagnostics().host || null,
        serialization: write?.serialization || 'UNKNOWN',
        serializedChars: Number(write?.serializedChars || 0),
        compaction: runtimeTelemetryRules.diagnostics().compaction || null,
        elapsedMs: perfMs(startedAt),
        retainedBodies: false,
      });
      lastTelemetryCheckpointProbe = probe;
      return probe;
    } catch (_) {
      const probe = Object.freeze({
        trigger: normalizedTrigger,
        memory: 'FAILED',
        session: 'FAILED',
        sessionRoot: 'NONE',
        fallbackFrom: null,
        attempted: '',
        surface: runtimeTelemetryRules.diagnostics().surface || null,
        hostLocal: 'FAILED',
        hostElapsedMs: 0,
        host: runtimeTelemetryRules.diagnostics().host || null,
        serialization: 'FAILED',
        serializedChars: 0,
        elapsedMs: 0,
        retainedBodies: false,
      });
      lastTelemetryCheckpointProbe = probe;
      return probe;
    }
  }

  const runtimeSession = runtimeSessionRules.createSessionRuntime({
    coreRules, host, perfNow, perfMs, textMessageContent,
    readState: () => ({ coreSession, coreKey, coreLocationKey }),
    writeState: (next) => {
      coreSession = next.coreSession;
      coreKey = next.coreKey;
      coreLocationKey = next.coreLocationKey;
    },
  });
  const representationRegistry = representationRules.createRegistry(16);
  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({
    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,
    getCoreSession: () => coreSession,
    runtimeIsCurrent,
    getRuntimeEpoch: () => runtimeEpoch,
    rememberRepresentation: (probe) => representationRegistry.remember(probe),
  });

  function runtimeIsCurrent(epoch = runtimeEpoch) {
    return !runtimeDisposed && Number(epoch) === Number(runtimeEpoch);
  }

  function dropStaleRuntime() {
    staleRuntimeDrops += 1;
    return false;
  }

  function textMessageContent(m) {
    if (!m) return '';
    const v = m.content ?? m.data ?? m.text ?? '';
    return typeof v === 'string' ? v : String(v || '');
  }

  function diagnosticLocationKey(chaIdx, chatIdx, chat) {
    return `${chaIdx}:${chatIdx}:${chat?.id ?? ''}`;
  }

  function sameRequestSignature(a, b) {
    return !!a && !!b
      && String(a.role || '') === String(b.role || '')
      && String(a.kind || '') === String(b.kind || '')
      && Number(a.chars || 0) === Number(b.chars || 0)
      && String(a.hash || '') === String(b.hash || '');
  }

  function compactRequestSignature(sig) {
    return sig ? `${sig.role || '?'}/${sig.kind || '?'} ${Number(sig.chars || 0)}:${String(sig.hash || 'n/a')}` : 'END';
  }

  function captureFrontierWindow(messages, center) {
    const list = Array.isArray(messages) ? messages : [];
    const pivot = Number(center);
    if (!Number.isInteger(pivot) || pivot < 0 || !list.length) return null;
    const start = Math.max(0, pivot - RECONCILE_WINDOW_BEHIND);
    const end = Math.min(list.length - 1, pivot + RECONCILE_WINDOW_AHEAD);
    const rows = [];
    for (let i = start; i <= end; i += 1) {
      rows.push({ index: i, signature: runtimeTopologyRules.messageSignature(list[i]) });
    }
    return { start, end, rows };
  }

  function windowSignature(window, index) {
    if (!window || !Array.isArray(window.rows)) return null;
    const row = window.rows.find((item) => Number(item?.index) === Number(index));
    return row?.signature || null;
  }

  function prepareReconcileFrontierDraft(messages, previousProbe) {
    if (!previousProbe || previousProbe.baseline || previousProbe.stable) return null;
    if (previousProbe.breakZone !== 'CHAT_HISTORY') return null;
    const seedIndex = Number(previousProbe.firstChangeIndex);
    if (!Number.isInteger(seedIndex) || seedIndex < 0) return null;
    const pre = captureFrontierWindow(messages, seedIndex);
    return pre ? { seedIndex, pre, post: null, editPath: 'n/a' } : null;
  }

  function finalizeReconcileFrontier(draft, messages, currentProbe) {
    if (!currentProbe || currentProbe.baseline || currentProbe.stable || currentProbe.breakZone !== 'CHAT_HISTORY') {
      return Object.freeze({ status: 'NOT_APPLICABLE', confidence: 'NONE', index: null, editPath: draft?.editPath || 'n/a' });
    }
    const index = Number(currentProbe.firstChangeIndex);
    if (!Number.isInteger(index) || index < 0) {
      return Object.freeze({ status: 'NOT_APPLICABLE', confidence: 'NONE', index: null, editPath: draft?.editPath || 'n/a' });
    }
    const start = Number(draft?.pre?.start);
    const end = Number(draft?.pre?.end);
    if (!draft?.pre || !draft?.post) {
      return Object.freeze({ status: 'NO_PRIOR_FRONTIER_WINDOW', confidence: 'LOW', index, windowStart: Number.isFinite(start) ? start : null, windowEnd: Number.isFinite(end) ? end : null, editPath: draft?.editPath || 'n/a' });
    }
    if (index < start || index > end) {
      return Object.freeze({ status: 'OUT_OF_WINDOW', confidence: 'LOW', index, windowStart: start, windowEnd: end, editPath: draft.editPath || 'n/a' });
    }
    const pre = windowSignature(draft.pre, index);
    const post = windowSignature(draft.post, index);
    const list = Array.isArray(messages) ? messages : [];
    const finalSig = index < list.length ? runtimeTopologyRules.messageSignature(list[index]) : null;
    const base = {
      index, windowStart: start, windowEnd: end, editPath: draft.editPath || 'n/a',
      preSignature: compactRequestSignature(pre),
      postSignature: compactRequestSignature(post),
      finalSignature: compactRequestSignature(finalSig),
    };
    if (!pre || !post || !finalSig) return Object.freeze({ ...base, status: 'INCOMPLETE_WINDOW', confidence: 'LOW' });
    const prePost = sameRequestSignature(pre, post);
    const postFinal = sameRequestSignature(post, finalSig);
    const preFinal = sameRequestSignature(pre, finalSig);
    if (prePost && postFinal) return Object.freeze({ ...base, status: 'PREEXISTING_REQUEST_MUTATION', confidence: 'HIGH' });
    if (!prePost && postFinal) return Object.freeze({ ...base, status: 'RECONCILE_MUTATED_REQUEST', confidence: 'HIGH' });
    if (prePost && !postFinal) return Object.freeze({ ...base, status: 'POST_RECONCILE_REQUEST_MUTATION', confidence: 'HIGH' });
    if (preFinal && !prePost) return Object.freeze({ ...base, status: 'RECONCILE_TRANSIENT_MUTATION', confidence: 'MEDIUM' });
    return Object.freeze({ ...base, status: 'MULTISTAGE_REQUEST_MUTATION', confidence: 'MEDIUM' });
  }

  function buildFrontierMovement(previousProbe, currentProbe) {
    if (!previousProbe || !currentProbe || previousProbe.baseline || currentProbe.baseline) return Object.freeze({ status: 'BASELINE' });
    if (String(previousProbe.locationKey || '') !== String(currentProbe.locationKey || '')) return Object.freeze({ status: 'LOCATION_RESET' });
    if (previousProbe.stable || currentProbe.stable) return Object.freeze({ status: 'NOT_APPLICABLE' });
    const previousIndex = Number(previousProbe.firstChangeIndex);
    const currentIndex = Number(currentProbe.firstChangeIndex);
    if (!Number.isInteger(previousIndex) || !Number.isInteger(currentIndex)) return Object.freeze({ status: 'NOT_APPLICABLE' });
    return Object.freeze({
      status: 'MOVED', previousIndex, currentIndex,
      deltaMessages: currentIndex - previousIndex,
      deltaChars: Number(currentProbe.commonChars || 0) - Number(previousProbe.commonChars || 0),
    });
  }

  function observeRepeatedBreak(probe) {
    if (!probe || probe.baseline || probe.stable || probe.breakZone !== 'CHAT_HISTORY') return Object.freeze({ status: 'NONE' });
    const signature = String(probe.previousBreakSignature || '');
    const index = Number(probe.firstChangeIndex);
    const locationKey = String(probe.locationKey || '');
    if (!signature || signature === 'END' || !Number.isInteger(index)) return Object.freeze({ status: 'NONE' });
    if (repeatedBreakLedger.length && String(repeatedBreakLedger[0]?.locationKey || '') !== locationKey) repeatedBreakLedger.length = 0;
    let row = repeatedBreakLedger.find((item) => item.signature === signature);
    if (!row) {
      row = { locationKey, signature, count: 0, firstIndex: index, latestIndex: index };
      repeatedBreakLedger.push(row);
      if (repeatedBreakLedger.length > REPEATED_BREAK_LEDGER_LIMIT) repeatedBreakLedger.shift();
    }
    row.count += 1;
    row.latestIndex = index;
    return Object.freeze({ status: 'TRACKED', signature: row.signature, count: row.count, firstIndex: row.firstIndex, latestIndex: row.latestIndex, ledgerSize: repeatedBreakLedger.length });
  }

  function stabilizationConversationRole(message) {
    const role = String(message?.role || '').toLowerCase();
    if (role === 'user') return 'user';
    if (role === 'assistant' || role === 'char') return 'assistant';
    return null;
  }

  function stabilizationComparableText(message) {
    return String(textMessageContent(message) || '').replace(/\r\n/g, '\n').trim();
  }

  function isKnownCompactAssistant(message) {
    const sig = runtimeTopologyRules.messageSignature(message);
    return sig?.role === 'assistant'
      && sig?.kind === 'text'
      && Number(sig?.chars) === KNOWN_COMPACT_ASSISTANT_CHARS
      && String(sig?.hash || '') === KNOWN_COMPACT_ASSISTANT_HASH;
  }

  function stabilizationResult(status, detail = null, started = null) {
    const d = detail && typeof detail === 'object' ? detail : {};
    return Object.freeze({
      status: String(status || 'n/a'),
      source: String(d.source || 'HOST_RAW_ALIGNED_SUFFIX'),
      candidates: Number(d.candidates || 0),
      applied: Number(d.applied || 0),
      firstIndex: Number.isInteger(Number(d.firstIndex)) ? Number(d.firstIndex) : null,
      lastIndex: Number.isInteger(Number(d.lastIndex)) ? Number(d.lastIndex) : null,
      alignmentStatus: String(d.alignmentStatus || 'n/a'),
      requestSpine: Number(d.requestSpine || 0),
      hostSpine: Number(d.hostSpine || 0),
      endpointSource: String(d.endpointSource || 'n/a'),
      roleMatches: Number(d.roleMatches || 0),
      roleExpected: Number(d.roleExpected || 0),
      mappedTargets: Number(d.mappedTargets || 0),
      bodyEquality: String(d.bodyEquality || 'NOT_REQUIRED'),
      spineOffset: Number.isInteger(Number(d.spineOffset)) ? Number(d.spineOffset) : null,
      addedChars: Number(d.addedChars || 0),
      persistentMutation: 'NONE',
      costMs: started == null ? Number(d.costMs || 0) : perfMs(started),
    });
  }

  function stabilizationCanonicalAssistantText(message) {
    const rawText = String(textMessageContent(message) || '').replace(/\r\n/g, '\n').trim();
    if (!rawText) return '';
    const match = /(?:^|\n)# 응답(?:\n|$)/.exec(rawText);
    if (!match) return '';
    const start = Number(match.index || 0) + (match[0].startsWith('\n') ? 1 : 0);
    return rawText.slice(start).trim();
  }

  function buildStabilizationSpine(messages, endIndex, limit) {
    const source = Array.isArray(messages) ? messages : [];
    const out = [];
    const end = Math.min(Number(endIndex), source.length - 1);
    for (let i = end; i >= 0 && out.length < Math.max(1, Number(limit) || 1); i -= 1) {
      const role = stabilizationConversationRole(source[i]);
      if (!role) continue;
      const rawComparable = role === 'assistant' ? stabilizationCanonicalAssistantText(source[i]) : '';
      out.push(Object.freeze({
        index: i,
        role,
        text: stabilizationComparableText(source[i]),
        assistantComparable: rawComparable || stabilizationComparableText(source[i]),
        compact: role === 'assistant' && isKnownCompactAssistant(source[i]),
      }));
    }
    return out.reverse();
  }

  function stabilizeHistoryProjection(messages, rawMessages, sendIndex) {
    const started = perfNow();
    const request = Array.isArray(messages) ? messages : [];
    const targetPositions = [];
    for (let i = 0; i < request.length; i += 1) {
      if (isKnownCompactAssistant(request[i])) targetPositions.push(i);
    }
    return stabilizationResult('OBSERVE_ONLY', {
      source: 'REQUEST_SIGNATURE_OBSERVER',
      candidates: targetPositions.length,
      applied: 0,
      firstIndex: targetPositions.length ? targetPositions[0] : null,
      lastIndex: targetPositions.length ? targetPositions[targetPositions.length - 1] : null,
      alignmentStatus: 'OBSERVE_ONLY',
      requestSpine: 0,
      hostSpine: 0,
      endpointSource: 'NOT_USED',
      roleMatches: 0,
      roleExpected: 0,
      mappedTargets: 0,
      bodyEquality: 'NOT_USED',
      spineOffset: null,
      addedChars: 0,
      persistentMutation: 'NONE',
    }, started);
  }

  function correlateHistoryMutation(topologyProbe, ledger) {
    if (!topologyProbe || topologyProbe.baseline || topologyProbe.stable) {
      return Object.freeze({ status: 'NONE', confidence: 'NONE', ledgerSize: Array.isArray(ledger) ? ledger.length : 0, matchSummary: 'NONE' });
    }
    if (topologyProbe.breakZone !== 'CHAT_HISTORY' || !topologyProbe.currentBreakFingerprint) {
      return Object.freeze({ status: 'NOT_APPLICABLE', confidence: 'NONE', ledgerSize: Array.isArray(ledger) ? ledger.length : 0, matchSummary: 'NONE' });
    }
    const target = String(topologyProbe.currentBreakFingerprint || '');
    const locationKey = String(topologyProbe.locationKey || '');
    const rows = Array.isArray(ledger) ? ledger : [];
    const matches = [];
    for (const row of rows) {
      if (locationKey && String(row?.locationKey || '') !== locationKey) continue;
      if (target && target === String(row?.canonicalFingerprint || '')) matches.push({ kind: 'CANONICAL', row });
      if (target && target === String(row?.hostRawFingerprint || '')) matches.push({ kind: 'HOST_RAW', row });
      if (target && target === String(row?.freshFingerprint || '')) matches.push({ kind: 'FRESH_CHAT', row });
    }
    if (!matches.length) {
      return Object.freeze({ status: 'NO_PROVENANCE_MATCH', confidence: 'LOW', ledgerSize: rows.length, matchSummary: 'NO_MATCH' });
    }
    const kinds = Array.from(new Set(matches.map((m) => m.kind)));
    const divergentFresh = matches.filter((m) => m.kind === 'FRESH_CHAT' && String(m.row?.fingerprintMatch || '') === 'MISMATCH');
    const uniqueOut = Array.from(new Set(matches.map((m) => Number(m.row?.outIndex)).filter(Number.isFinite)));
    const summary = matches.slice(-4).map((m) => `${m.kind}@${Number(m.row?.outIndex)}`).join(',');
    if (divergentFresh.length && kinds.length === 1 && kinds[0] === 'FRESH_CHAT') {
      return Object.freeze({ status: 'FRESH_MISMATCH_HISTORY_MATCH', confidence: 'HIGH', ledgerSize: rows.length, matchSummary: summary || 'FRESH_CHAT', matchedOutIndex: uniqueOut.length === 1 ? uniqueOut[0] : null });
    }
    if (kinds.length > 1 || uniqueOut.length > 1) {
      return Object.freeze({ status: 'AMBIGUOUS_HISTORY_MATCH', confidence: 'MEDIUM', ledgerSize: rows.length, matchSummary: summary || kinds.join('+') });
    }
    return Object.freeze({ status: 'KNOWN_OUTPUT_REPRESENTATION', confidence: 'HIGH', ledgerSize: rows.length, matchSummary: summary || kinds.join('+'), matchedOutIndex: uniqueOut.length === 1 ? uniqueOut[0] : null });
  }

  function diagnosticRequestProbeFresh(probe, currentKey, currentUserIndex) {
    const index = Number(currentUserIndex);
    return !!probe
      && !!String(currentKey || '')
      && Number.isInteger(index) && index >= 0
      && String(probe.locationKey || '') === String(currentKey || '')
      && Number(probe.sendIndex) === index;
  }

  function diagnosticRuntimeMode(probeFresh, probe) {
    return probeFresh && probe?.status === 'ACTIVE' && probe?.mode ? String(probe.mode) : null;
  }

  function markDiagnosticRequestProbe(sendIndex, patch) {
    if (!lastDiagnosticRequestProbe) return;
    const expected = Number(sendIndex);
    if (Number.isInteger(expected) && expected >= 0
        && Number(lastDiagnosticRequestProbe.sendIndex) !== expected) return;
    Object.assign(lastDiagnosticRequestProbe, patch || {});
  }

  async function reconcileManualEdit(cs, chat, perfDetail = null) {
    return editReconcileRules.reconcileVisiblePreviousAssistant(cs, chat, perfDetail, {
      coreRules, textMessageContent, representationRegistry, representationRules,
      coreLocationKey, SIMCORE_LOG_PREFIX,
      reconcileSession: (outIndex, content, detail) => cs.reconcileEditedOutput(outIndex, content, detail),
    });
  }

  async function prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf = null) {
    let reconcileFrontierDraft = null;
    let t = perfNow();
    const sessionDetail = perf ? {} : null;
    const cs = await runtimeSession.loadCoreForChat(chaIdx, chatIdx, chat, sessionDetail);
    if (perf) {
      perf.sessionLoadMs = perfMs(t);
      perf.sessionDetail = sessionDetail;
    }
    if (!cs) {
      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'session-load' });
      return { active: false };
    }
    if (!runtimeIsCurrent()) {
      dropStaleRuntime();
      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'runtime-unloaded' });
      return { active: false };
    }

    t = perfNow();
    const promptProbe = coreRules.inspectPromptMessages(messages, textMessageContent);
    markDiagnosticRequestProbe(sendIndex, {
      locationKey: String(coreLocationKey || diagnosticLocationKey(chaIdx, chatIdx, chat)),
      handshake: promptProbe.active ? 'FOUND' : 'NOT FOUND',
      promptProbeActive: !!promptProbe.active,
      status: 'INSPECTED',
      handshakeAt: Date.now(),
    });
    if (perf) {
      perf.promptScanMs = perfMs(t);
      perf.promptScannedMessages = promptProbe.stats?.scannedMessages || 0;
      perf.promptTotalMessages = promptProbe.stats?.totalMessages || 0;
      perf.promptScannedChars = promptProbe.stats?.scannedChars || 0;
    }

    t = perfNow();
    if (promptProbe.active && cs.needsHistoryBootstrap) {
      const hist = chat?.message || [];
      let lastAssistant = -1;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i]?.role === 'char' || hist[i]?.role === 'assistant') { lastAssistant = i; break; }
      }
      // No completed assistant yet: bootstrap from an empty history so the current first user input
      // is not classified once here and then a second time in onSend. State mirroring is deliberately
      // deferred until output so no whole-chat write blocks model dispatch.
      await cs.bootstrapHistoryIfNeeded(lastAssistant >= 0 ? hist : [], lastAssistant);
    }
    if (perf) perf.bootstrapMs = perfMs(t);

    reconcileFrontierDraft = prepareReconcileFrontierDraft(messages, lastRequestTopologyProbe);
    t = perfNow();
    const editDetail = perf ? {} : null;
    await reconcileManualEdit(cs, chat, editDetail);
    if (reconcileFrontierDraft) {
      reconcileFrontierDraft.post = captureFrontierWindow(messages, reconcileFrontierDraft.seedIndex);
      reconcileFrontierDraft.editPath = String(editDetail?.path || 'n/a');
    }
    if (perf) {
      perf.editReconcileMs = perfMs(t);
      perf.editDetail = editDetail;
    }

    t = perfNow();
    const histForAlias = chat?.message || [];
    let aliasLastAssistant = -1;
    for (let i = histForAlias.length - 1; i >= 0; i--) {
      if (histForAlias[i]?.role === 'char' || histForAlias[i]?.role === 'assistant') { aliasLastAssistant = i; break; }
    }
    const aliasRepair = cs.migrateCommunityClassifierIfNeeded(histForAlias, aliasLastAssistant);
    if (perf) {
      perf.aliasRepairMs = perfMs(t);
      perf.aliasRepair = aliasRepair;
    }

    if (!runtimeIsCurrent()) {
      dropStaleRuntime();
      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'runtime-unloaded' });
      return { active: false };
    }

    t = perfNow();
    const userText = coreRules.latestUserText(chat);
    const snapshotDetail = perf ? {} : null;
    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail, chat?.message || []);
    markDiagnosticRequestProbe(sendIndex, {
      status: result.active ? 'ACTIVE' : 'INACTIVE',
      active: !!result.active,
      mode: result.active ? (result.state?.pending?.mode || null) : null,
      preparedAt: Date.now(),
    });
    if (perf) {
      perf.onSendMs = perfMs(t);
      perf.snapshotDetail = snapshotDetail;
    }
    if (snapshotDetail?.mustRestorePre && snapshotDetail?.existingPre) {
      lastHistoryRestore = {
        sendIndex,
        previousOutputIndex: Number(snapshotDetail.previousOutputIndex),
        reason: snapshotDetail.restoreReason || 'restore',
        at: Date.now(),
      };
    }

    const postOnSendStart = perfNow();
    if (result.active && result.promptBlock) {
      lastHistoryStabilizationProbe = stabilizeHistoryProjection(messages, chat?.message || [], sendIndex);
      const runtimeBudgetText = String(result.promptBlock || '');
      const runtimeBudgetLines = runtimeBudgetText ? runtimeBudgetText.split('\n') : [];
      const runtimeBudgetReactionLine = runtimeBudgetLines.find((line) => line.startsWith('reaction_max=')) || '';
      const runtimeBudgetMode = result.state.pending?.mode || null;
      lastRuntimePromptBudget = {
        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,
        mode: runtimeBudgetMode,
        chars: runtimeBudgetText.length,
        lines: runtimeBudgetLines.length,
        reactionMaxChars: runtimeBudgetReactionLine.length,
        referenceLines: runtimeBudgetLines.filter((line) => line === 'reference_sources=character_card+currently_exposed_lore_if_present' || line === 'character_world_facts_use_reference_sources=1').length,
        ageAnchor: runtimeBudgetLines.some((line) => line.startsWith('current_korean_age=')),
        broadcast: /^B_/.test(String(runtimeBudgetMode || '')),
        community: runtimeBudgetLines.some((line) => line.startsWith('platform_groups_required=')),
        narrativeProgression: runtimeBudgetLines.some((line) => line === 'timestamp_semantics=current_narrative_time'),
        recurrence: runtimeBudgetLines.some((line) => line === 'request_template_recurs_from_prior_history=1'),
        handoff: runtimeBudgetLines.some((line) => line.startsWith('short_community_request_reused_with_new_source=')),
        lineageAnchor: runtimeBudgetLines.some((line) => line === 'short_community_request_context_is_current_lineage=1'),
        sourceAnchor: runtimeBudgetLines.some((line) => line === 'short_community_source_is_authoritative=1'),
        broadcastSessionState: result.broadcastEndAuthority?.session || 'CLOSED',
        broadcastEndAuthority: result.broadcastEndAuthority?.authority || 'NOT_APPLICABLE',
        broadcastEndReason: result.broadcastEndAuthority?.reason || 'unknown',
        at: Date.now(),
      };
      const evidenceResult = lastRuntimePromptBudget.sourceAnchor
        ? evidenceRules.inspectAndFence(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)
        : null;
      lastEvidenceMappingProbe = evidenceResult?.mapping || null;
      lastEvidenceFenceProbe = evidenceResult || null;
      const runtimePromptKey = String(coreKey || coreLocationKey || '');
      if (!telemetryAdoptionAttempted) {
        telemetryAdoptionAttempted = true;
        const hostLocalClaim = await runtimeTelemetryRules.claimHostLocalOnce(Risuai, runtimePromptKey, Date.now());
        const adoption = runtimeTelemetryRules.validate(pendingTelemetryHandoff, runtimePromptKey, Date.now(), hostLocalClaim);
        let restoredRuntimePrefix = false;
        let restoredTopology = false;
        let restoredTrajectory = false;
        if (adoption.accepted && adoption.capsule) {
          restoredRuntimePrefix = runtimePromptCache.importHandoffState(adoption.capsule.runtimePromptCache);
          restoredTopology = requestTopology.importHandoffState(adoption.capsule.requestTopology);
          restoredTrajectory = cacheCandidates.importState(adoption.capsule.cacheCandidates);
        }
        lastTelemetryContinuityProbe = Object.freeze({
          accepted: !!adoption.accepted, reason: adoption.reason || 'no-compatible-handoff',
          sourceVersion: adoption.capsule?.sourceVersion || null, ageMs: adoption.ageMs ?? null,
          transport: adoption.transport || null, fallbackFrom: adoption.fallbackFrom || null, sessionRoot: adoption.sessionRoot || null,
          claim: runtimeTelemetryRules.diagnostics().claim,
          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,
          handoffPrecision: adoption.capsule?.handoff?.precision || null,
        });
        pendingTelemetryHandoff = null;
      }
      lastRuntimePromptCacheProbe = runtimePromptCache.observe(runtimePromptKey, runtimeBudgetText, {
        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,
        mode: runtimeBudgetMode,
        identityTiers: result.promptIdentityTiers || null,
        at: Date.now(),
      });
      messages.push({ role: 'system', content: result.promptBlock });
      const topologyStarted = perfNow();
      const previousTopologyProbe = lastRequestTopologyProbe;
      lastRequestTopologyProbe = requestTopology.observe(runtimePromptKey, messages, {
        runtimeIndex: messages.length - 1,
        at: Number(lastRuntimePromptCacheProbe?.at || Date.now()),
        locationKey: diagnosticLocationKey(chaIdx, chatIdx, chat),
      });
      lastReconcileFrontierProbe = finalizeReconcileFrontier(reconcileFrontierDraft, messages, lastRequestTopologyProbe);
      lastFrontierMovementProbe = buildFrontierMovement(previousTopologyProbe, lastRequestTopologyProbe);
      lastRepeatedBreakProbe = observeRepeatedBreak(lastRequestTopologyProbe);
      lastHistoryMutationAttributionProbe = correlateHistoryMutation(lastRequestTopologyProbe, representationRegistry.rows());
      if (perf) perf.cacheTopologyMs = perfMs(topologyStarted);
      const candidateStarted = perfNow();
      lastCacheTrajectoryProbe = cacheCandidates.observe(runtimePromptKey, lastRequestTopologyProbe, {
        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,
        at: Number(lastRequestTopologyProbe?.at || Date.now()),
      });
      lastCacheCandidateCostMs = perfMs(candidateStarted);
      const pendingProbe = result.state.pending || null;
      if (pendingProbe && !/^B_/.test(String(pendingProbe.mode || ''))) {
        lastNarrativeClockProbe = {
          phase: 'pending',
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          outIndex: -1,
          previousMode: snapshotDetail?.previousMode || null,
          mode: pendingProbe.mode || null,
          guardActive: !!pendingProbe.narrativeClockGuard,
          trigger: pendingProbe.narrativeProgressionReason || 'none',
          previousAnchor: pendingProbe.narrativeTimestampPrevious || null,
          effectiveFloor: pendingProbe.narrativeCurrentTimeFloor || pendingProbe.narrativeTimestampPrevious || null,
          postBEndClockDisposition: pendingProbe.postBEndClockDisposition || 'INELIGIBLE',
          postBEndClockFloor: pendingProbe.postBEndClockFloor || null,
          postBEndClockReason: pendingProbe.postBEndClockReason || 'unknown',
          currentTimeAuthority: pendingProbe.currentTimeAuthority || 'NARRATIVE',
          outputTimestamp: null,
          commitStatus: 'PENDING',
          commitReason: 'pending',
          at: Date.now(),
        };
      }
      if (pendingProbe) {
        lastTemplateRecurrenceProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          mode: pendingProbe.mode || null,
          modeFamily: pendingProbe.templateRecurrenceModeFamily || null,
          hash: pendingProbe.templateRecurrenceHash == null ? null : Number(pendingProbe.templateRecurrenceHash),
          eligible: !!pendingProbe.templateRecurrenceEligible,
          repeated: !!pendingProbe.templateRecurrenceRepeated,
          normalizedChars: Number(pendingProbe.templateRecurrenceChars || 0),
          registrySize: Number(pendingProbe.templateRegistrySize || 0),
          summaryScope: pendingProbe.summaryScope || 'NONE',
          summaryTargetYear: pendingProbe.summaryTargetYear == null ? null : Number(pendingProbe.summaryTargetYear),
          summaryComparisonYear: pendingProbe.summaryComparisonYear == null ? null : Number(pendingProbe.summaryComparisonYear),
          summaryAuthority: pendingProbe.summaryAuthority || 'NONE',
          summaryScopeReason: pendingProbe.summaryScopeReason || 'INELIGIBLE',
          bootstrap: snapshotDetail?.templateBootstrap || null,
          at: Date.now(),
        };
      } else {
        lastTemplateRecurrenceProbe = null;
      }
      if (pendingProbe) {
        const l = result.state.requestLineage || {};
        lastRequestLineageProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          currentMode: pendingProbe.mode || null,
          transitionFrom: l.transitionFrom || null,
          sourceKind: l.sourceKind || 'UNSEEDED',
          rootMode: l.rootMode || null,
          rootIndex: Number(l.rootIndex ?? -1),
          parentMode: l.parentMode || null,
          parentIndex: Number(l.parentIndex ?? -1),
          depth: Number(l.depth || 0),
          inlineSource: !!l.inlineSource,
          recentSources: Array.isArray(l.recentSources) ? l.recentSources.slice(-4) : [],
          at: Date.now(),
        };
      } else {
        lastRequestLineageProbe = null;
      }
      if (pendingProbe) {
        lastCommunitySourceHandoffProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          eligible: !!pendingProbe.communitySourceHandoffEligible,
          seen: !!pendingProbe.communitySourceHandoffSeen,
          newSource: !!pendingProbe.communitySourceHandoffNewSource,
          parentComparable: !!pendingProbe.communitySourceHandoffParentComparable,
          parentShift: !!pendingProbe.communitySourceHandoffParentShift,
          normalizedChars: Number(pendingProbe.communitySourceHandoffChars || 0),
          rootMode: pendingProbe.communitySourceHandoffRootMode || null,
          rootIndex: Number(pendingProbe.communitySourceHandoffRootIndex ?? -1),
          parentMode: pendingProbe.communitySourceHandoffParentMode || null,
          parentIndex: Number(pendingProbe.communitySourceHandoffParentIndex ?? -1),
          depth: Number(pendingProbe.communitySourceHandoffDepth ?? -1),
          priorRootMode: pendingProbe.communitySourceHandoffPriorRootMode || null,
          priorRootIndex: Number(pendingProbe.communitySourceHandoffPriorRootIndex ?? -1),
          priorParentMode: pendingProbe.communitySourceHandoffPriorParentMode || null,
          priorParentIndex: Number(pendingProbe.communitySourceHandoffPriorParentIndex ?? -1),
          priorDepth: Number(pendingProbe.communitySourceHandoffPriorDepth ?? -1),
          registrySize: Number(pendingProbe.communitySourceHandoffRegistrySize || 0),
          reason: pendingProbe.communitySourceHandoffReason || 'ineligible',
          at: Date.now(),
        };
      } else {
        lastCommunitySourceHandoffProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };
    } else {
      lastRuntimePromptBudget = null;
      lastRuntimePromptCacheProbe = null;
      lastRequestTopologyProbe = null;
      lastHistoryMutationAttributionProbe = null;
      lastReconcileFrontierProbe = null;
      lastRepeatedBreakProbe = null;
      lastFrontierMovementProbe = null;
      lastHistoryStabilizationProbe = null;
      repeatedBreakLedger.length = 0;
      lastCacheTrajectoryProbe = null;
      lastCacheCandidateCostMs = null;
      runtimePromptCache.reset();
      requestTopology.reset();
      cacheCandidates.reset();
      lastEvidenceMappingProbe = null;
      lastEvidenceFenceProbe = null;
      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };
    }
    if (perf) perf.postOnSendMs = perfMs(postOnSendStart);
    // v0.62: do not call setChatToIndex on the request-critical path. The authoritative
    // pre/send snapshots are already persisted; scriptstate mirror is refreshed after output.
    return result;
  }

  async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
    let t = perfNow();
    const cs = await runtimeSession.loadCoreForChat(chaIdx, chatIdx, chat);
    if (perf) perf.sessionLoadMs = perfMs(t);
    if (!cs) return content;
    if (!runtimeIsCurrent()) { dropStaleRuntime(); return content; }
    const outIndex = cs.resolveOutputIndex(fallbackOutIndex);

    const outputDetail = perf ? {} : null;
    if (!runtimeIsCurrent()) { dropStaleRuntime(); return content; }
    t = perfNow();
    const result = await cs.processOutput(outIndex, content, outputDetail);
    if (perf) {
      perf.sessionProcessMs = perfMs(t);
      perf.outputDetail = outputDetail;
    }
    if (!result.active) {
      markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'BYPASSED', outputAt: Date.now() });
      return content;
    }
    if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {
      await checkpointRuntimeTelemetry('OUTPUT_COMMIT');
    }
    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });

    const issues = result.issues || [];
    const diagnostics = result.envelopeDiagnostics || [];
    if (issues.length) console.log(SIMCORE_LOG_PREFIX + ' structure warnings:', issues.join(' / '));
    if (diagnostics.length) console.log(SIMCORE_LOG_PREFIX + ' compatibility diagnostics:', diagnostics.join(' / '));
    lastTimestampCanonicalization = result.timestampCanonicalization || null;
    lastPreambleProvenance = result.preambleProvenance || null;

    const mirrorScheduled = runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state, result.freshEnvelopeConfirmation, result.safeEnvelopeBoundaryConfirmation);
    if (perf) {
      perf.mirrorMs = 0;
      perf.mirrorDetail = { deferred: true, scheduled: mirrorScheduled };
    }

    t = perfNow();
    const normalizationIssues = ops.normalizationIssues(result.state);
    if (normalizationIssues.length) console.log(SIMCORE_LOG_PREFIX + ' reaction normalization:', normalizationIssues.join(' / '));
    lastFrameGuardProbe = result.frameGuardProbe || null;
    if (result.narrativeClockProbe) {
      const priorProbe = lastNarrativeClockProbe && lastNarrativeClockProbe.sendIndex === result.narrativeClockProbe.sendIndex
        ? lastNarrativeClockProbe
        : null;
      lastNarrativeClockProbe = {
        ...result.narrativeClockProbe,
        phase: 'output',
        previousMode: priorProbe?.previousMode || null,
        effectiveFloor: priorProbe?.effectiveFloor || result.narrativeClockProbe.previous || null,
        postBEndClockDisposition: priorProbe?.postBEndClockDisposition || 'INELIGIBLE',
        postBEndClockFloor: priorProbe?.postBEndClockFloor || null,
        postBEndClockReason: priorProbe?.postBEndClockReason || 'unknown',
        currentTimeAuthority: priorProbe?.currentTimeAuthority || 'NARRATIVE',
      };
    }
    const quarantineIssues = result.stateCommit?.communitySafe === false ? [result.stateCommit.reason] : [];
    lastCore = {
      active: true,
      mode: result.mode || result.state?.lastMode || null,
      issues: [...issues, ...quarantineIssues, ...normalizationIssues],
      diagnostics,
    };
    if (perf) perf.diagnosticsMs = perfMs(t);
    return result.content;
  }

  const beforeRequestHandler = async (messages, type) => {
    if (type !== 'model') return messages;
    const hookEpoch = runtimeEpoch;
    if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return messages; }
    diagnosticActivity.requestHooks += 1;
    const requestHookAt = Date.now();
    lastDiagnosticRequestProbe = {
      locationKey: '', sendIndex: -1, requestType: String(type || ''), hookSeen: true,
      handshake: 'UNKNOWN', promptProbeActive: null, status: 'SEEN', active: null, mode: null,
      outIndex: -1, outputStatus: 'PENDING', errorStage: null, at: requestHookAt,
      handshakeAt: null, preparedAt: null, requestDoneAt: null, outputSeenAt: null, outputAt: null,
      runtimeGeneration: diagnosticRuntimeGeneration,
    };
    let requestSendIndex = -1;
    const totalStart = perfNow();
    const perf = {
      totalMs: 0, indicesMs: 0, chatLoadMs: 0, sessionLoadMs: 0, sessionDetail: null, promptScanMs: 0,
      bootstrapMs: 0, editReconcileMs: 0, editDetail: null, aliasRepairMs: 0, aliasRepair: null, onSendMs: 0, snapshotDetail: null, postOnSendMs: 0,
      sendIndex: -1, locationKey: '',
      promptScannedMessages: 0, promptTotalMessages: Array.isArray(messages) ? messages.length : 0, promptScannedChars: 0,
    };
    try {
      let t = perfNow();
      const { chaIdx, chatIdx } = await host.currentIndices();
      perf.indicesMs = perfMs(t);
      if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return messages; }

      t = perfNow();
      const chat = await host.getChat(chaIdx, chatIdx);
      perf.chatLoadMs = perfMs(t);
      if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return messages; }

      const detectedUserIndex = coreRules.latestUserIndex(chat);
      const sendIndex = detectedUserIndex >= 0
        ? detectedUserIndex
        : Math.max(0, (chat?.message?.length ?? 1) - 1);
      requestSendIndex = sendIndex;
      const requestLocationKey = diagnosticLocationKey(chaIdx, chatIdx, chat);
      Object.assign(lastDiagnosticRequestProbe, {
        locationKey: requestLocationKey,
        sendIndex,
      });
      perf.sendIndex = sendIndex;
      perf.locationKey = requestLocationKey;
      await prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf);
    } catch (e) {
      markDiagnosticRequestProbe(requestSendIndex, { status: 'ERROR', active: false, mode: null, errorStage: 'beforeRequest', errorName: e?.name || 'Error' });
      console.log(SIMCORE_LOG_PREFIX + ' beforeRequest error:', e.message);
    } finally {
      perf.totalMs = perfMs(totalStart);
      lastPerf = perf;
      diagnosticActivity.requestMaxMs = Math.max(diagnosticActivity.requestMaxMs, Number(perf.totalMs || 0));
      if (Number(perf.totalMs || 0) >= 50) diagnosticActivity.requestSlow50 += 1;
      markDiagnosticRequestProbe(requestSendIndex, { requestDoneAt: Date.now(), requestTotalMs: Number(perf.totalMs || 0) });
    }
    return messages;
  };
  await runtimeHooks.addBefore(Risuai, beforeRequestHandler);

  const outputHandler = async (content) => {
    const hookEpoch = runtimeEpoch;
    if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return content; }
    diagnosticActivity.outputHooks += 1;
    const outputHookAt = Date.now();
    if (lastDiagnosticRequestProbe) lastDiagnosticRequestProbe.outputSeenAt = outputHookAt;
    const totalStart = perfNow();
    const perf = {
      totalMs: 0, indicesMs: 0, chatLoadMs: 0, sessionLoadMs: 0, sessionProcessMs: 0,
      mirrorMs: 0, diagnosticsMs: 0, outputDetail: null, mirrorDetail: null,
    };
    try {
      let t = perfNow();
      const { chaIdx, chatIdx } = await host.currentIndices();
      perf.indicesMs = perfMs(t);
      if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return content; }

      t = perfNow();
      const chat = await host.getChat(chaIdx, chatIdx);
      perf.chatLoadMs = perfMs(t);
      if (!runtimeIsCurrent(hookEpoch)) { dropStaleRuntime(); return content; }

      const fallbackOutIndex = chat?.message?.length ?? 0;
      return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);
    } catch (e) {
      if (lastDiagnosticRequestProbe) Object.assign(lastDiagnosticRequestProbe, { outputStatus: 'ERROR', outputErrorStage: 'output', outputErrorName: e?.name || 'Error' });
      console.log(SIMCORE_LOG_PREFIX + ' output error:', e.message);
      return content;
    } finally {
      perf.totalMs = perfMs(totalStart);
      lastOutputPerf = perf;
      diagnosticActivity.outputMaxMs = Math.max(diagnosticActivity.outputMaxMs, Number(perf.totalMs || 0));
      if (Number(perf.totalMs || 0) >= 50) diagnosticActivity.outputSlow50 += 1;
      if (lastDiagnosticRequestProbe) lastDiagnosticRequestProbe.outputTotalMs = Number(perf.totalMs || 0);
    }
  };
  await runtimeHooks.addOutput(Risuai, outputHandler);

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
  }

  function diagnosticAssistantRole(m) {
    return m?.role === 'char' || m?.role === 'assistant';
  }

  function diagnosticLastAssistantIndex(messages) {
    const rows = Array.isArray(messages) ? messages : [];
    for (let i = rows.length - 1; i >= 0; i--) if (diagnosticAssistantRole(rows[i])) return i;
    return -1;
  }

  function diagnosticUserBefore(messages, beforeIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const start = Math.min(rows.length - 1, Math.max(-1, Number(beforeIndex) - 1));
    for (let i = start; i >= 0; i--) if (rows[i]?.role === 'user') return i;
    return -1;
  }

  function diagnosticAssistantAfterUser(messages, userIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const start = Number.isInteger(Number(userIndex)) ? Number(userIndex) + 1 : rows.length;
    for (let i = start; i < rows.length; i++) {
      if (rows[i]?.role === 'user') break;
      if (diagnosticAssistantRole(rows[i])) return i;
    }
    return -1;
  }

  function diagnosticRawMessage(messages, index) {
    const rows = Array.isArray(messages) ? messages : [];
    return Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < rows.length
      ? textMessageContent(rows[Number(index)])
      : '';
  }




  function diagnosticProbeFresh(currentUserIndex) {
    const currentKey = String(coreLocationKey || '');
    return diagnosticRequestProbeFresh(lastDiagnosticRequestProbe, currentKey, currentUserIndex);
  }

  function diagnosticFrameState(raw) {
    const text = String(raw || '');
    const volume = text.match(/^\s*##\s+볼륨\s+(\d+)\s*[:：]/mi);
    const chapter = text.match(/^\s*###\s+챕터\s+(\d+)\s*[:：]/mi);
    const chatindex = text.match(/^\s*####\s+Chatindex\s*[:：]\s*(\d+)\s*∮/mi);
    return {
      volume: volume ? Number(volume[1]) : null,
      chapter: chapter ? Number(chapter[1]) : null,
      chatindex: chatindex ? Number(chatindex[1]) : null,
    };
  }

  function diagnosticStepLabel(previous, current) {
    if (!Number.isFinite(previous) || !Number.isFinite(current)) return 'n/a';
    if (current > previous) return 'ADVANCED';
    if (current < previous) return 'REGRESSED';
    return 'SAME';
  }

  function diagnosticFrameContinuity(messages, currentUserIndex, latestAssistantIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const before = currentUserIndex >= 0 ? currentUserIndex : latestAssistantIndex;
    let previousAssistantIndex = -1;
    for (let i = before - 1; i >= 0; i--) {
      if (diagnosticAssistantRole(rows[i])) { previousAssistantIndex = i; break; }
    }
    const previous = diagnosticFrameState(diagnosticRawMessage(rows, previousAssistantIndex));
    const current = diagnosticFrameState(diagnosticRawMessage(rows, latestAssistantIndex));
    const volumeStep = diagnosticStepLabel(previous.volume, current.volume);
    let chapterStep = diagnosticStepLabel(previous.chapter, current.chapter);
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume > previous.volume
        && Number.isFinite(previous.chapter) && Number.isFinite(current.chapter) && current.chapter < previous.chapter) {
      chapterStep = 'RESET_AFTER_VOLUME_ADVANCE';
    }
    const chatindexStep = diagnosticStepLabel(previous.chatindex, current.chatindex);
    const regressions = [];
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume < previous.volume) regressions.push('VOLUME');
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume === previous.volume
        && Number.isFinite(previous.chapter) && Number.isFinite(current.chapter) && current.chapter < previous.chapter) regressions.push('CHAPTER');
    if (Number.isFinite(previous.chatindex) && Number.isFinite(current.chatindex) && current.chatindex < previous.chatindex) regressions.push('CHATINDEX');
    const value = (v) => Number.isFinite(v) ? Number(v) : 'n/a';
    return {
      previousAssistantIndex,
      previous,
      current,
      label: `volume ${value(previous.volume)}→${value(current.volume)} ${volumeStep} · chapter ${value(previous.chapter)}→${value(current.chapter)} ${chapterStep} · Chatindex ${value(previous.chatindex)}→${value(current.chatindex)} ${chatindexStep}`,
      regression: regressions.length ? regressions.join('+') : 'NONE',
    };
  }

  function diagnosticRecurrencePrior(messages, currentUserIndex, probe) {
    if (!probe?.eligible) return { status: 'INELIGIBLE', userIndex: -1, assistantIndex: -1, distance: null, hashHex: 'n/a' };
    const hash = Number(probe.hash);
    if (!Number.isFinite(hash)) return { status: 'NO HASH', userIndex: -1, assistantIndex: -1, distance: null, hashHex: 'n/a' };
    const family = String(probe.modeFamily || 'A');
    const mode = family === 'C' ? 'C' : (family === 'B' ? 'B_START' : 'A');
    const rows = Array.isArray(messages) ? messages : [];
    for (let i = Math.min(rows.length - 1, Number(currentUserIndex) - 1); i >= 0; i--) {
      if (rows[i]?.role !== 'user') continue;
      const fp = recurrenceRules.templateFingerprint(textMessageContent(rows[i]), mode);
      if (fp.eligible && Number(fp.hash) === hash) {
        const assistantIndex = diagnosticAssistantAfterUser(rows, i);
        return {
          status: 'MATCH',
          userIndex: i,
          assistantIndex,
          distance: Number(currentUserIndex) - i,
          hashHex: `0x${(hash >>> 0).toString(16).padStart(8, '0')}`,
        };
      }
    }
    return {
      status: 'NO MATCH',
      userIndex: -1,
      assistantIndex: -1,
      distance: null,
      hashHex: `0x${(hash >>> 0).toString(16).padStart(8, '0')}`,
    };
  }

  function diagnosticSection(title, messages, userIndex, assistantIndex, meta = []) {
    const userRaw = diagnosticRawMessage(messages, userIndex);
    const assistantRaw = diagnosticRawMessage(messages, assistantIndex);
    return [
      `--- ${title} ---`,
      ...meta,
      `User index: ${Number.isInteger(Number(userIndex)) && Number(userIndex) >= 0 ? Number(userIndex) : 'n/a'}`,
      `Assistant index: ${Number.isInteger(Number(assistantIndex)) && Number(assistantIndex) >= 0 ? Number(assistantIndex) : 'n/a'}`,
      '',
      'USER (RAW):',
      userRaw || '[unavailable]',
      '',
      'ASSISTANT (RAW):',
      assistantRaw || '[unavailable]',
      '',
    ].join('\n');
  }

  function diagnosticTimingIso(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : 'n/a';
  }

  function diagnosticTimingDelta(from, to) {
    const a = Number(from);
    const b = Number(to);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b < a) return 'n/a';
    const ms = b - a;
    return ms >= 1000 ? `${(ms / 1000).toFixed(3)} s` : `${ms.toFixed(1)} ms`;
  }

  function diagnosticNumericDelta(from, to) {
    const a = Number(from);
    const b = Number(to);
    return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= a ? b - a : null;
  }

  function diagnosticFormatMs(value) {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms < 0) return 'n/a';
    return ms >= 1000 ? `${(ms / 1000).toFixed(3)} s` : `${ms.toFixed(1)} ms`;
  }

  function diagnosticRequestBreakdown(probe, perf) {
    if (!probe || !perf) return null;
    const n = (v) => Math.max(0, Number(v) || 0);
    const total = n(probe.requestTotalMs || perf.totalMs);
    const handshakeMeasured = diagnosticNumericDelta(probe.at, probe.handshakeAt);
    const handshakeTotal = handshakeMeasured == null
      ? n(perf.indicesMs) + n(perf.chatLoadMs) + n(perf.sessionLoadMs) + n(perf.promptScanMs)
      : handshakeMeasured;
    const handshakeKnown = n(perf.indicesMs) + n(perf.chatLoadMs) + n(perf.sessionLoadMs) + n(perf.promptScanMs);
    const handshakeOther = Math.max(0, handshakeTotal - handshakeKnown);
    const postHandshakeTotal = Math.max(0, total - handshakeTotal);
    const postKnown = n(perf.bootstrapMs) + n(perf.editReconcileMs) + n(perf.aliasRepairMs) + n(perf.onSendMs) + n(perf.postOnSendMs) + n(perf.cacheTopologyMs);
    const postHandshakeOther = Math.max(0, postHandshakeTotal - postKnown);

    const session = perf.sessionDetail || {};
    const edit = perf.editDetail || {};
    const sessionKnown = n(session.chatFallbackMs) + n(session.characterLoadMs) + n(session.initScanMs) + n(session.initMs);
    const sessionOther = Math.max(0, n(perf.sessionLoadMs) - sessionKnown);

    const send = perf.snapshotDetail || {};
    const onSendKnown = n(send.preLoadMs) + n(send.templateBootstrapMs) + n(send.lifecycleMs)
      + n(send.turnSerializeMs) + n(send.turnSetMs) + n(send.runtimeRenderMs);
    const onSendOther = Math.max(0, n(perf.onSendMs) - onSendKnown);
    const turnPayloadChars = n(send.turnPayloadChars);
    const turnSetPerKChars = turnPayloadChars > 0
      ? n(send.turnSetMs) / (turnPayloadChars / 1000)
      : null;

    const candidates = [
      ['INDICES', n(perf.indicesMs)], ['CHAT_LOAD', n(perf.chatLoadMs)],
      ['SESSION_CHAT_FALLBACK', n(session.chatFallbackMs)], ['CHARACTER_FETCH', n(session.characterLoadMs)],
      ['SESSION_INIT_SCAN', n(session.initScanMs)], ['SESSION_INIT', n(session.initMs)], ['SESSION_OTHER', sessionOther],
      ['PROMPT_SCAN', n(perf.promptScanMs)], ['HANDSHAKE_OTHER', handshakeOther],
      ['BOOTSTRAP', n(perf.bootstrapMs)], ['EDIT_RECONCILE', n(perf.editReconcileMs)], ['ALIAS_REPAIR', n(perf.aliasRepairMs)],
      ['PRE_LOAD', n(send.preLoadMs)], ['TEMPLATE_BOOTSTRAP', n(send.templateBootstrapMs)], ['LIFECYCLE', n(send.lifecycleMs)],
      ['TURN_SERIALIZE', n(send.turnSerializeMs)], ['TURN_STORAGE', n(send.turnSetMs)], ['PROMPT_RENDER', n(send.runtimeRenderMs)],
      ['ONSEND_OTHER', onSendOther], ['POST_ONSEND', n(perf.postOnSendMs)], ['CACHE_TOPOLOGY', n(perf.cacheTopologyMs)], ['POST_HANDSHAKE_OTHER', postHandshakeOther],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    const hotspot = candidates[0] || ['n/a', 0];

    return {
      total, handshakeTotal, handshakeOther, postHandshakeTotal, postHandshakeOther,
      sessionPath: String(session.path || 'n/a'), sessionOther, onSendOther, hotspot: hotspot[0], hotspotMs: hotspot[1],
      hotspotPercent: total > 0 ? (hotspot[1] / total) * 100 : 0,
      indicesMs: n(perf.indicesMs), chatLoadMs: n(perf.chatLoadMs), sessionLoadMs: n(perf.sessionLoadMs), promptScanMs: n(perf.promptScanMs),
      sessionChatFallbackMs: n(session.chatFallbackMs), characterLoadMs: n(session.characterLoadMs), initScanMs: n(session.initScanMs), initMs: n(session.initMs),
      bootstrapMs: n(perf.bootstrapMs), editReconcileMs: n(perf.editReconcileMs), aliasRepairMs: n(perf.aliasRepairMs), onSendMs: n(perf.onSendMs), postOnSendMs: n(perf.postOnSendMs), cacheTopologyMs: n(perf.cacheTopologyMs),
      preLoadMs: n(send.preLoadMs), templateBootstrapMs: n(send.templateBootstrapMs), lifecycleMs: n(send.lifecycleMs),
      turnSerializeMs: n(send.turnSerializeMs), turnSetMs: n(send.turnSetMs), turnPayloadChars, turnSetPerKChars, runtimeRenderMs: n(send.runtimeRenderMs),
      restoreReason: String(send.restoreReason || 'n/a'), preRead: !!send.mustRestorePre, preHit: !!send.existingPre,
      editPath: String(edit.path || 'n/a'), editDidSave: !!edit.didSave, editCompatibilitySource: String(edit.compatibilitySource || 'n/a'),
      editOrigin: String(edit.editOrigin || 'NONE'), editPriorRepresentation: String(edit.editPriorRepresentation || 'UNAVAILABLE'), editPriorMatch: String(edit.editPriorMatch || 'n/a'),
      editPriorCanonical: String(edit.editPriorCanonical || 'n/a'), editPriorFresh: String(edit.editPriorFresh || 'n/a'), editCurrentFingerprint: String(edit.editCurrentFingerprint || 'n/a'), editCurrentMatch: String(edit.editCurrentMatch || 'NONE'),
      editDeltaCanonical: edit.editDeltaCanonical == null ? null : Number(edit.editDeltaCanonical), editDeltaFresh: edit.editDeltaFresh == null ? null : Number(edit.editDeltaFresh), editDeltaShape: String(edit.editDeltaShape || 'UNCLASSIFIED'),
    };
  }

  function diagnosticOutputBreakdown(perf) {
    if (!perf) return null;
    const n = (v) => Math.max(0, Number(v) || 0);
    const total = n(perf.totalMs);
    const detail = perf.outputDetail || {};
    const mirror = perf.mirrorDetail || {};

    const processTotal = n(perf.sessionProcessMs);
    const processKnown = n(detail.stateLoadMs) + n(detail.prepareMs) + n(detail.validateMs)
      + n(detail.finalizeMs) + n(detail.outSerializeMs) + n(detail.outSetMs) + n(detail.outPruneMs);
    const processOther = Math.max(0, processTotal - processKnown);

    const mirrorTotal = n(perf.mirrorMs);
    const mirrorKnown = n(mirror.chatLoadMs) + n(mirror.prepareMs) + n(mirror.setChatMs);
    const mirrorOther = Math.max(0, mirrorTotal - mirrorKnown);

    const outerKnown = n(perf.indicesMs) + n(perf.chatLoadMs) + n(perf.sessionLoadMs)
      + processTotal + mirrorTotal + n(perf.diagnosticsMs);
    const handlerOther = Math.max(0, total - outerKnown);
    const stateSource = String(detail.stateLoadSource || 'unknown').toUpperCase().replace(/[^A-Z0-9]+/g, '_');

    const candidates = [
      ['OUTPUT_INDICES', n(perf.indicesMs)], ['OUTPUT_CHAT_LOAD', n(perf.chatLoadMs)], ['OUTPUT_SESSION_LOAD', n(perf.sessionLoadMs)],
      ['OUTPUT_STATE_LOAD', n(detail.stateLoadMs)], ['RECOVERY_PREPARE', n(detail.prepareMs)], ['STRUCTURE_VALIDATE', n(detail.validateMs)],
      ['OUTPUT_FINALIZE', n(detail.finalizeMs)], ['OUT_SERIALIZE', n(detail.outSerializeMs)], ['OUT_STORAGE', n(detail.outSetMs)],
      ['OUTPUT_PROCESS_OTHER', processOther], ['MIRROR_CHAT_LOAD', n(mirror.chatLoadMs)], ['MIRROR_PREPARE', n(mirror.prepareMs)],
      ['CHAT_MIRROR_WRITE', n(mirror.setChatMs)], ['MIRROR_OTHER', mirrorOther], ['OUTPUT_DIAGNOSTICS', n(perf.diagnosticsMs)],
      ['OUTPUT_HANDLER_OTHER', handlerOther],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    const hotspot = candidates[0] || ['n/a', 0];

    return {
      total, handlerOther, processTotal, processOther, mirrorTotal, mirrorOther, stateSource,
      hotspot: hotspot[0], hotspotMs: hotspot[1], hotspotPercent: total > 0 ? (hotspot[1] / total) * 100 : 0,
      indicesMs: n(perf.indicesMs), chatLoadMs: n(perf.chatLoadMs), sessionLoadMs: n(perf.sessionLoadMs), diagnosticsMs: n(perf.diagnosticsMs),
      stateLoadMs: n(detail.stateLoadMs), prepareMs: n(detail.prepareMs), validateMs: n(detail.validateMs), finalizeMs: n(detail.finalizeMs),
      outSerializeMs: n(detail.outSerializeMs), outSetMs: n(detail.outSetMs), outPruneMs: n(detail.outPruneMs), pruneDeferred: !!detail.pruneDeferred,
      mirrorChatLoadMs: n(mirror.chatLoadMs), mirrorPrepareMs: n(mirror.prepareMs), mirrorSetChatMs: n(mirror.setChatMs),
    };
  }

  function buildLastTurnDiagnosticReport(chat, state) {
    const messages = Array.isArray(chat?.message) ? chat.message : [];
    const latestAssistantIndex = diagnosticLastAssistantIndex(messages);
    const currentUserIndex = diagnosticUserBefore(messages, latestAssistantIndex >= 0 ? latestAssistantIndex : messages.length);
    const requestProbe = lastDiagnosticRequestProbe || null;
    const capturedAt = Date.now();
    const probeFresh = diagnosticProbeFresh(currentUserIndex);
    const runtimeMode = diagnosticRuntimeMode(probeFresh, requestProbe);
    const runtimeActive = !!runtimeMode;
    const outputFresh = !!(runtimeActive
      && requestProbe?.outputStatus === 'COMMITTED'
      && Number(requestProbe?.outIndex) === Number(latestAssistantIndex));
    const lineage = runtimeActive ? (lastRequestLineageProbe || null) : null;
    const handoff = runtimeActive ? (lastCommunitySourceHandoffProbe || null) : null;
    const recurrenceProbe = runtimeActive ? (lastTemplateRecurrenceProbe || null) : null;
    const frameGuard = outputFresh ? (lastFrameGuardProbe || null) : null;
    const evidenceMap = runtimeActive ? (lastEvidenceMappingProbe || null) : null;
    const evidenceFence = runtimeActive ? (lastEvidenceFenceProbe || null) : null;
    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;
    const broadcastTerminal = outputFresh && runtimeMode === 'B_END' && latestAssistantIndex >= 0
      ? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))
      : null;
    const preamble = outputFresh ? (lastPreambleProvenance || null) : null;
    const requestPerf = probeFresh && lastPerf && Number(lastPerf.sendIndex) === Number(currentUserIndex)
      && String(lastPerf.locationKey || '') === String(requestProbe?.locationKey || '') ? lastPerf : null;
    const requestBreakdown = requestPerf ? diagnosticRequestBreakdown(requestProbe, requestPerf) : null;
    const outputBreakdown = outputFresh && lastOutputPerf ? diagnosticOutputBreakdown(lastOutputPerf) : null;
    const deferredMirrorProbe = runtimeMirror.lastProbe();
    const deferredMirror = outputFresh && deferredMirrorProbe
      && Number(deferredMirrorProbe.outIndex) === Number(latestAssistantIndex)
      && String(deferredMirrorProbe.locationKey || '') === String(requestProbe?.locationKey || '')
      ? deferredMirrorProbe : null;
    const editPathRaw = requestBreakdown ? String(requestBreakdown.editPath || 'n/a') : 'n/a';
    const editPathLabel = editPathRaw === 'n/a'
      ? 'n/a'
      : editPathRaw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const mirrorStatus = deferredMirror?.status || (outputFresh ? 'PENDING' : 'NOT_EXERCISED');
    const bindingStatus = outputFresh ? 'BOUND' : (probeFresh ? 'REQUEST_ONLY' : 'NOT_EXERCISED');
    const stabilityStatus = runtimeDisposed || requestProbe?.status === 'ERROR' || requestProbe?.outputStatus === 'ERROR'
      ? 'FAIL'
      : (outputFresh && mirrorStatus === 'COMMITTED' && staleRuntimeDrops === 0
        ? 'PASS'
        : (probeFresh ? 'OBSERVED' : 'NOT_EXERCISED'));
    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;
    const topologyProbe = runtimeActive ? (lastRequestTopologyProbe || null) : null;
    const trajectoryProbe = runtimeActive ? (lastCacheTrajectoryProbe || null) : null;
    const budget = runtimeActive ? (lastRuntimePromptBudget || null) : null;
    const rootIndex = probeFresh && lineage ? Number(lineage.rootIndex) : -1;
    const parentIndex = probeFresh && lineage ? Number(lineage.parentIndex) : -1;
    const rootAssistantIndex = rootIndex >= 0 && rootIndex !== currentUserIndex
      ? diagnosticAssistantAfterUser(messages, rootIndex)
      : -1;
    const parentAssistantIndex = parentIndex >= 0 && parentIndex !== currentUserIndex
      ? diagnosticAssistantAfterUser(messages, parentIndex)
      : -1;
    const recurrenceHistory = probeFresh && recurrenceProbe ? diagnosticRecurrencePrior(messages, currentUserIndex, recurrenceProbe) : null;
    const frameProbe = diagnosticFrameContinuity(messages, currentUserIndex, latestAssistantIndex);
    const warnings = outputFresh && Array.isArray(lastCore?.issues) ? lastCore.issues : [];
    const compatibility = outputFresh && Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];
    const broadcastTerminalExplicit = !!(broadcastTerminal
      && broadcastTerminal.sceneCount > 0
      && broadcastTerminal.tailStatus === 'MONOTONIC'
      && broadcastTerminal.candidate);
    const broadcastCommunityClean = !warnings.some((x) => /^COMMUNITY\b/.test(String(x || '')));
    const prefixLabel = !probeFresh || !cacheProbe
      ? 'n/a'
      : (cacheProbe.baseline
        ? 'BASELINE'
        : ((cacheProbe.precision === 'PREFIX_FLOOR' || cacheProbe.precision === 'LINE_BOUND')
          ? `>=${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · HANDOFF_${cacheProbe.precision}`
          : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`));
    const lines = [
      '=== SimCore Last Turn Diagnostic ===',
      'Diagnostic format: raw-lineage-v2',
      `Version: ${SIMCORE_RUNTIME_VERSION}`,
      `Captured: ${new Date(capturedAt).toISOString()}`,
      `Runtime boot: ${diagnosticTimingIso(diagnosticRuntimeBootAt)} · generation ${diagnosticRuntimeGeneration}`,
      `Reload safety: ${runtimeDisposed ? 'DISPOSED' : 'ARMED'} · epoch ${runtimeEpoch} · stale drops ${staleRuntimeDrops} · UI parts ${simcoreUiParts.length} · hook cleanup NAMED`,
      `Probe context: ${probeFresh ? 'CURRENT TURN' : (requestProbe?.sendIndex >= 0 ? `STALE · probe user @${Number(requestProbe.sendIndex)} · current user @${currentUserIndex >= 0 ? currentUserIndex : 'n/a'}` : 'UNAVAILABLE')}`,
      `Request hook: ${probeFresh ? (requestProbe?.hookSeen ? 'SEEN' : 'n/a') : 'n/a'}`,
      `Core handshake: ${probeFresh ? (requestProbe?.handshake || 'UNKNOWN') : 'n/a'}`,
      `Runtime status: ${probeFresh ? (requestProbe?.status || 'UNKNOWN') : 'n/a'} · output ${probeFresh ? (requestProbe?.outputStatus || 'n/a') : 'n/a'}`,
      `Mode: ${runtimeMode || 'n/a'}`,
      `Stored last mode: ${state?.lastMode || 'n/a'}`,
      `Turn binding: request user @${probeFresh ? Number(requestProbe?.sendIndex) : 'n/a'} · output assistant @${outputFresh ? Number(requestProbe?.outIndex) : 'n/a'}`,
      `Stability: ${stabilityStatus} · binding ${bindingStatus} · out ${outputFresh ? 'COMMITTED' : (probeFresh ? String(requestProbe?.outputStatus || 'n/a') : 'NOT_EXERCISED')} · mirror ${mirrorStatus} · stale ${staleRuntimeDrops} · hooks NAMED`,
      `Request timing: ${probeFresh ? `hook ${diagnosticTimingIso(requestProbe?.at)} · handshake +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.handshakeAt)} · prepared +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.preparedAt)} · done +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.requestDoneAt)}` : 'n/a'}`,
      `Handshake breakdown: ${requestBreakdown ? `indices ${diagnosticFormatMs(requestBreakdown.indicesMs)} · chat ${diagnosticFormatMs(requestBreakdown.chatLoadMs)} · session ${diagnosticFormatMs(requestBreakdown.sessionLoadMs)} · prompt scan ${diagnosticFormatMs(requestBreakdown.promptScanMs)} · other ${diagnosticFormatMs(requestBreakdown.handshakeOther)} · total ${diagnosticFormatMs(requestBreakdown.handshakeTotal)}` : 'n/a'}`,
      `Session load: ${requestBreakdown ? `${requestBreakdown.sessionPath} · chat fallback ${diagnosticFormatMs(requestBreakdown.sessionChatFallbackMs)} · character ${diagnosticFormatMs(requestBreakdown.characterLoadMs)} · init scan ${diagnosticFormatMs(requestBreakdown.initScanMs)} · init ${diagnosticFormatMs(requestBreakdown.initMs)} · other ${diagnosticFormatMs(requestBreakdown.sessionOther)}` : 'n/a'}`,
      `Post-handshake breakdown: ${requestBreakdown ? `bootstrap ${diagnosticFormatMs(requestBreakdown.bootstrapMs)} · edit ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · alias ${diagnosticFormatMs(requestBreakdown.aliasRepairMs)} · onSend ${diagnosticFormatMs(requestBreakdown.onSendMs)} · post-onSend ${diagnosticFormatMs(requestBreakdown.postOnSendMs)} · other ${diagnosticFormatMs(requestBreakdown.postHandshakeOther)} · total ${diagnosticFormatMs(requestBreakdown.postHandshakeTotal)}` : 'n/a'}`,
      `Edit reconcile: ${requestBreakdown ? `${editPathLabel} · ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · snapshot ${requestBreakdown.editDidSave ? 'UPDATED' : 'UNCHANGED'} · representation ${requestBreakdown.editCompatibilitySource || 'n/a'}` : 'n/a'}`,
      `Prior representation: ${requestBreakdown ? `${requestBreakdown.editPriorRepresentation || 'UNAVAILABLE'} · mirror ${requestBreakdown.editPriorMatch || 'n/a'} · canonical ${requestBreakdown.editPriorCanonical || 'n/a'} · fresh ${requestBreakdown.editPriorFresh || 'n/a'}` : 'n/a'}`,
      `Edit origin: ${requestBreakdown ? `${requestBreakdown.editOrigin || 'NONE'} · current ${requestBreakdown.editCurrentFingerprint || 'n/a'} · match ${requestBreakdown.editCurrentMatch || 'NONE'} · raw bodies NOT RETAINED` : 'n/a'}`,
      `Edit delta: ${requestBreakdown ? `vs canonical ${requestBreakdown.editDeltaCanonical == null ? 'n/a' : `${Number(requestBreakdown.editDeltaCanonical) >= 0 ? '+' : ''}${Number(requestBreakdown.editDeltaCanonical)}`} · vs fresh ${requestBreakdown.editDeltaFresh == null ? 'n/a' : `${Number(requestBreakdown.editDeltaFresh) >= 0 ? '+' : ''}${Number(requestBreakdown.editDeltaFresh)}`} · shape ${requestBreakdown.editDeltaShape || 'UNCLASSIFIED'} · boundary n/a` : 'n/a'}`,
      `onSend breakdown: ${requestBreakdown ? `pre-load ${diagnosticFormatMs(requestBreakdown.preLoadMs)} · template bootstrap ${diagnosticFormatMs(requestBreakdown.templateBootstrapMs)} · lifecycle ${diagnosticFormatMs(requestBreakdown.lifecycleMs)} · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · storage ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · prompt render ${diagnosticFormatMs(requestBreakdown.runtimeRenderMs)} · other ${diagnosticFormatMs(requestBreakdown.onSendOther)} · total ${diagnosticFormatMs(requestBreakdown.onSendMs)}` : 'n/a'}`,
      `Pre snapshot: ${requestBreakdown ? `${String(requestBreakdown.restoreReason || 'n/a').toUpperCase()} · ${requestBreakdown.preRead ? `READ ${requestBreakdown.preHit ? 'HIT' : 'MISS'}` : 'SKIPPED'} · ${diagnosticFormatMs(requestBreakdown.preLoadMs)}` : 'n/a'}`,
      `Turn storage: ${requestBreakdown ? `payload ${Math.round(Number(requestBreakdown.turnPayloadChars || 0)).toLocaleString('en-US')} chars · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · set ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · set/1K ${requestBreakdown.turnSetPerKChars == null ? 'n/a' : `${Number(requestBreakdown.turnSetPerKChars).toFixed(2)} ms`}` : 'n/a'}`,
      `Request hotspot: ${requestBreakdown ? `${requestBreakdown.hotspot} · ${diagnosticFormatMs(requestBreakdown.hotspotMs)} · ${Number(requestBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,
      `Output timing: ${probeFresh && requestProbe?.outputSeenAt ? `seen ${diagnosticTimingIso(requestProbe.outputSeenAt)} · request→output gap ${diagnosticTimingDelta(requestProbe?.requestDoneAt, requestProbe?.outputSeenAt)} · committed +${diagnosticTimingDelta(requestProbe?.outputSeenAt, requestProbe?.outputAt)}` : 'n/a'}`,
      `Output handler breakdown: ${outputBreakdown ? `indices ${diagnosticFormatMs(outputBreakdown.indicesMs)} · chat ${diagnosticFormatMs(outputBreakdown.chatLoadMs)} · session ${diagnosticFormatMs(outputBreakdown.sessionLoadMs)} · process ${diagnosticFormatMs(outputBreakdown.processTotal)} · mirror ${diagnosticFormatMs(outputBreakdown.mirrorTotal)} · diagnostics ${diagnosticFormatMs(outputBreakdown.diagnosticsMs)} · other ${diagnosticFormatMs(outputBreakdown.handlerOther)} · total ${diagnosticFormatMs(outputBreakdown.total)}` : 'n/a'}`,
      `Output process: ${outputBreakdown ? `state ${outputBreakdown.stateSource} · load ${diagnosticFormatMs(outputBreakdown.stateLoadMs)} · recovery ${diagnosticFormatMs(outputBreakdown.prepareMs)} · validate ${diagnosticFormatMs(outputBreakdown.validateMs)} · finalize ${diagnosticFormatMs(outputBreakdown.finalizeMs)} · serialize ${diagnosticFormatMs(outputBreakdown.outSerializeMs)} · storage ${diagnosticFormatMs(outputBreakdown.outSetMs)} · other ${diagnosticFormatMs(outputBreakdown.processOther)} · total ${diagnosticFormatMs(outputBreakdown.processTotal)}` : 'n/a'}`,
      `Output mirror: ${outputBreakdown ? `DEFERRED · critical path ${diagnosticFormatMs(outputBreakdown.mirrorTotal)}` : 'n/a'}`,
      `Deferred mirror: ${deferredMirror ? `${deferredMirror.status || 'n/a'} · out @${Number(deferredMirror.outIndex)} · chat ${diagnosticFormatMs(deferredMirror.chatLoadMs)} · prepare ${diagnosticFormatMs(deferredMirror.prepareMs)} · setChat ${diagnosticFormatMs(deferredMirror.setChatMs)} · total ${diagnosticFormatMs(deferredMirror.totalMs)}` : 'n/a'}`,
      `Output provenance: ${deferredMirror ? `HOST_RAW ${deferredMirror.hostRawFingerprint || 'n/a'} · CANONICAL ${deferredMirror.canonicalFingerprint || 'n/a'} · FRESH_CHAT ${deferredMirror.freshFingerprint || 'n/a'} · match ${deferredMirror.fingerprintMatch || 'n/a'}` : 'n/a'}`,
      `Output representation: ${deferredMirror ? runtimeProbeRules.representation(deferredMirror) : 'n/a'}`,
      `Representation ownership: REPRESENTATION · ledger ${representationRegistry.rows().length} · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED`,
      `Envelope recovery: ${deferredMirror ? `${deferredMirror.freshEnvelopeRecovery || 'NOT_APPLICABLE'} · policy ${deferredMirror.freshEnvelopePolicy || 'n/a'} · source ${deferredMirror.freshEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.freshEnvelopeRecovery === 'RECOVERED' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.freshEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Envelope boundary: ${deferredMirror?.freshEnvelopePolicy === 'BOUNDARY_CONFIRMED_SUFFIX' ? `RAW_SUFFIX ${Number(deferredMirror.freshEnvelopeCandidateChars || 0)} → NORMALIZED ${Number(deferredMirror.freshEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0)} · ${deferredMirror.freshEnvelopeBoundaryKind || 'CRLF_ONLY'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Safe-envelope reconcile: ${deferredMirror ? `${deferredMirror.safeEnvelopeReconcile || 'NOT_APPLICABLE'} · policy ${deferredMirror.safeEnvelopePolicy || 'n/a'} · source ${deferredMirror.safeEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.safeEnvelopeReconcile === 'CONFIRMED' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.safeEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Safe-envelope boundary: ${deferredMirror?.safeEnvelopeReconcile === 'CONFIRMED' ? `CANONICAL ${Number(deferredMirror.safeEnvelopeCanonicalChars || 0)} → NORMALIZED ${Number(deferredMirror.safeEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.safeEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.safeEnvelopeBoundaryDelta || 0)} · ${deferredMirror.safeEnvelopeBoundaryKind || 'STRUCTURAL_LF'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,
      `Hook activity: request ${diagnosticActivity.requestHooks} · output ${diagnosticActivity.outputHooks} · slow>=50ms ${diagnosticActivity.requestSlow50}/${diagnosticActivity.outputSlow50} · max ${Number(diagnosticActivity.requestMaxMs || 0).toFixed(1)}/${Number(diagnosticActivity.outputMaxMs || 0).toFixed(1)} ms`,
      `Diagnostic age: ${probeFresh ? diagnosticTimingDelta(requestProbe?.outputAt || requestProbe?.requestDoneAt || requestProbe?.at, capturedAt) : 'n/a'}`,
      `Warnings: ${outputFresh ? warnings.length : 'n/a'}`,
      `Compatibility diagnostics: ${outputFresh ? compatibility.length : 'n/a'}`,
      `Preamble provenance: ${preamble ? `${preamble.kind || 'UNKNOWN'} · chars ${Number(preamble.chars || 0)} · lines ${Number(preamble.lines || 0)} · action ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? 'STRIPPED' : (preamble.action || 'n/a')} · policy ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? (deferredMirror.freshEnvelopePolicy || 'FRESH_CONFIRMED_SUFFIX') : (preamble.policy || 'n/a')} · envelope offset ${preamble.envelopeOffset == null ? 'n/a' : Number(preamble.envelopeOffset)} · candidates ${Number(preamble.candidateCount || 0)}${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? ' · selected 1' : (preamble.selectedCandidate == null ? '' : ` · selected ${Number(preamble.selectedCandidate)}`)}` : 'n/a'}`,
      `Prompt prefix: ${prefixLabel}`,
      `Cache posture: ${runtimeProbeRules.cachePosture(cacheProbe, runtimeContracts.cache)}`,
      `Cache topology: ${probeFresh ? runtimeProbeRules.topology(topologyProbe) : 'n/a'}`,
      `Cache integrity: ${probeFresh ? runtimeProbeRules.cacheIntegrity(topologyProbe) : 'n/a'}`,
      `Cache break: ${probeFresh ? runtimeProbeRules.breakInfo(topologyProbe) : 'n/a'}`,
      `Cache effect: ${probeFresh ? runtimeProbeRules.cacheEffect(topologyProbe, lastFrontierMovementProbe) : 'n/a'}`,
      `Host prefix attribution: ${probeFresh ? runtimeProbeRules.hostPrefixAttribution(topologyProbe) : 'n/a'}`,
      `Host prefix delta: ${probeFresh ? runtimeProbeRules.hostPrefixDelta(topologyProbe) : 'n/a'}`,
      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,
      `History alignment: ${probeFresh ? runtimeProbeRules.historyAlignment(lastHistoryStabilizationProbe) : 'n/a'}`,
      `History stabilization: ${probeFresh ? runtimeProbeRules.historyStabilization(lastHistoryStabilizationProbe) : 'n/a'}`,
      `Reconcile frontier: ${probeFresh ? runtimeProbeRules.reconcileFrontier(lastReconcileFrontierProbe) : 'n/a'}`,
      `Frontier movement: ${probeFresh ? runtimeProbeRules.frontierMovement(lastFrontierMovementProbe) : 'n/a'}`,
      `Repeated break: ${probeFresh ? runtimeProbeRules.repeatedBreak(lastRepeatedBreakProbe) : 'n/a'}`,
      `Representation correlation: ${probeFresh ? runtimeProbeRules.representationCorrelation(lastHistoryMutationAttributionProbe) : 'n/a'}`,
      `Mutation attribution: ${probeFresh ? runtimeProbeRules.mutationAttribution(lastHistoryMutationAttributionProbe) : 'n/a'}`,
      `Rebuild attribution: ${probeFresh ? runtimeProbeRules.rebuildAttribution(lastReconcileFrontierProbe) : 'n/a'}`,
      `Local exposure proxy: ${probeFresh ? runtimeProbeRules.exposure(topologyProbe) : 'n/a'}`,
      `Runtime identity: ${probeFresh ? runtimeProbeRules.runtimeIdentity(cacheProbe) : 'n/a'}`,
      `SimCore contribution: ${probeFresh ? runtimeProbeRules.simcoreContribution(topologyProbe) : 'n/a'}`,
      `Cache placement: ${probeFresh && topologyProbe ? `current user @${topologyProbe.currentUserIndex >= 0 ? Number(topologyProbe.currentUserIndex) : 'n/a'} · ${topologyProbe.currentUserPosition || 'n/a'} · runtime @${topologyProbe.runtimeIndex >= 0 ? Number(topologyProbe.runtimeIndex) : 'n/a'} · ${topologyProbe.runtimePosition || 'n/a'}` : 'n/a'}`,
      `Cache cadence: ${probeFresh && topologyProbe ? `previous request +${runtimeProbeRules.cadence(topologyProbe.cadenceMs)} · signature ${topologyProbe.signatureKind || 'n/a'} · raw bodies ${topologyProbe.retainedBodies ? 'RETAINED' : 'NOT RETAINED'}` : 'n/a'}`,
      `Cache trajectory: ${probeFresh ? runtimeProbeRules.trajectory(trajectoryProbe) : 'n/a'}`,
      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,
      `Telemetry capsule: ${lastTelemetryCheckpointProbe?.compaction ? `${lastTelemetryCheckpointProbe.compaction.format || 'COMPACT_V2'} · ${Number(lastTelemetryCheckpointProbe.compaction.wholeChars || 0).toLocaleString('en-US')}/16,384 chars · prompt ${Number(lastTelemetryCheckpointProbe.compaction.components?.prompt?.chars || 0).toLocaleString('en-US')}/4,096 · topology ${Number(lastTelemetryCheckpointProbe.compaction.components?.topology?.chars || 0).toLocaleString('en-US')}/6,144 · trajectory ${Number(lastTelemetryCheckpointProbe.compaction.components?.trajectory?.chars || 0).toLocaleString('en-US')}/2,048 · prompt precision ${lastTelemetryCheckpointProbe.compaction.precision?.prompt || 'FRESH'} · topology precision ${lastTelemetryCheckpointProbe.compaction.precision?.topology || 'FRESH'} · ${lastTelemetryCheckpointProbe.compaction.status || 'UNKNOWN'}` : 'n/a'}`,
      `Handoff precision: ${lastTelemetryContinuityProbe?.handoffPrecision ? `prompt ${lastTelemetryContinuityProbe.handoffPrecision.prompt || 'FRESH'} · topology ${lastTelemetryContinuityProbe.handoffPrecision.topology || 'FRESH'}` : 'n/a'}`,
      `Session surface: ${lastTelemetryCheckpointProbe?.surface ? `WINDOW ${lastTelemetryCheckpointProbe.surface.window || 'UNOBSERVED'} · GLOBAL_THIS ${lastTelemetryCheckpointProbe.surface.globalThis || 'UNOBSERVED'} · relation ${lastTelemetryCheckpointProbe.surface.relation || 'NONE'}` : 'n/a'}`,
      `Host-local transport: ${lastTelemetryCheckpointProbe?.host ? `API ${lastTelemetryCheckpointProbe.host.api || 'UNOBSERVED'} · store ${lastTelemetryCheckpointProbe.host.store || 'UNOBSERVED'} · clear ${lastTelemetryCheckpointProbe.host.clear || 'UNKNOWN'} · boot ${lastTelemetryCheckpointProbe.host.boot || 'UNOBSERVED'}` : 'n/a'}`,
      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory || 'UNAVAILABLE'} · SESSION ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.session === 'WRITTEN' ? ` via ${lastTelemetryCheckpointProbe.sessionRoot || 'NONE'}` : (lastTelemetryCheckpointProbe.sessionRoot && lastTelemetryCheckpointProbe.sessionRoot !== 'NONE' ? ` · root ${lastTelemetryCheckpointProbe.sessionRoot}` : '')}${lastTelemetryCheckpointProbe.fallbackFrom ? ` · fallback ${lastTelemetryCheckpointProbe.fallbackFrom}` : ''}${lastTelemetryCheckpointProbe.attempted && lastTelemetryCheckpointProbe.session === 'FAILED' ? ` · attempted ${lastTelemetryCheckpointProbe.attempted}` : ''} · HOST_LOCAL ${lastTelemetryCheckpointProbe.hostLocal || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.serialization && lastTelemetryCheckpointProbe.serialization !== 'OK' ? ` · serialization ${lastTelemetryCheckpointProbe.serialization}` : ''} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars${lastTelemetryCheckpointProbe.hostElapsedMs > 0 ? ` · host ${diagnosticFormatMs(lastTelemetryCheckpointProbe.hostElapsedMs)}` : ''} · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} total · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,
      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · candidate ${lastCacheCandidateCostMs == null ? 'n/a' : diagnosticFormatMs(lastCacheCandidateCostMs)} · provider cache UNVERIFIED`,
      `Runtime prompt: ${probeFresh && budget ? `${Number(budget.chars || 0)} chars / ${Number(budget.lines || 0)} lines` : 'n/a'}`,
      `Broadcast lifecycle: ${probeFresh && budget ? `${budget.broadcastSessionState || 'CLOSED'} · mode ${budget.mode || 'n/a'}` : 'n/a'}`,
      `Broadcast end authority: ${probeFresh && budget ? `${budget.broadcastEndAuthority || 'NOT_APPLICABLE'} · ${budget.broadcastEndReason || 'unknown'}` : 'n/a'}`,
      `End boundary: ${probeFresh && budget && budget.broadcastEndAuthority === 'DENIED' ? 'PROSE+COMMUNITY+KNOWLEDGE · explicit B_END required' : (probeFresh && budget && budget.broadcastEndAuthority === 'ALLOWED' ? 'END AUTHORIZED' : 'n/a')}`,
      `Broadcast closure: ${outputFresh && runtimeMode === 'B_END' ? `${broadcastTerminalExplicit && broadcastCommunityClean ? 'COMPLETE' : 'PARTIAL'} · terminal ${broadcastTerminalExplicit ? 'EXPLICIT' : 'MISSING_OR_INVALID'} · structure ${broadcastCommunityClean ? 'PASS' : 'QUARANTINED'}` : 'n/a'}`,
      `Broadcast terminal coverage: ${outputFresh && runtimeMode === 'B_END' ? (broadcastTerminalExplicit ? `EXPLICIT_TERMINAL · frame ${broadcastTerminal?.frameTimestamp || 'n/a'} · terminal ${broadcastTerminal?.candidate || 'n/a'} · stored ${state?.broadcastAirtime || 'n/a'}` : `${broadcastTerminal?.tailStatus || 'MISSING'} · explicit terminal canonical timestamp absent or invalid · RAW prose cross-check required for elapsed/end-time cues`) : 'n/a'}`,
      `Short-C source lock: ${runtimeActive ? (budget?.sourceAnchor ? 'ON' : 'OFF') : 'n/a'}`,
      `Summary scope: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.summaryScope || 'NONE'} · target ${recurrenceProbe.summaryTargetYear == null ? 'n/a' : Number(recurrenceProbe.summaryTargetYear)} · comparison ${recurrenceProbe.summaryComparisonYear == null ? 'n/a' : Number(recurrenceProbe.summaryComparisonYear)} · authority ${recurrenceProbe.summaryAuthority || 'NONE'} · reason ${recurrenceProbe.summaryScopeReason || 'INELIGIBLE'}` : 'n/a'}`,
      `Template recurrence: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.eligible ? (recurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE'} · family ${recurrenceProbe.modeFamily || 'n/a'}` : 'n/a'}`,
      `Recurrence guidance: ${probeFresh && budget ? (budget.recurrence ? 'ON' : 'OFF') : 'n/a'}`,
      `Recurrence history match: ${recurrenceHistory ? `${recurrenceHistory.status} · hash ${recurrenceHistory.hashHex} · user @${recurrenceHistory.userIndex >= 0 ? recurrenceHistory.userIndex : 'n/a'} · assistant @${recurrenceHistory.assistantIndex >= 0 ? recurrenceHistory.assistantIndex : 'n/a'}${recurrenceHistory.distance != null ? ` · distance ${recurrenceHistory.distance}` : ''}` : 'n/a'}`,
      `Request lineage: ${probeFresh && lineage ? `${lineage.sourceKind || 'UNSEEDED'} · root ${lineage.rootMode || 'n/a'}@${Number(lineage.rootIndex ?? -1)} · parent ${lineage.parentMode || 'n/a'}@${Number(lineage.parentIndex ?? -1)} · depth ${Number(lineage.depth || 0)}` : 'n/a'}`,
      `Source handoff: ${probeFresh && handoff ? `${handoff.newSource ? 'NEW SOURCE' : (handoff.eligible ? (handoff.seen ? 'SAME SOURCE' : 'FIRST') : 'INELIGIBLE')} · reason ${handoff.reason || 'n/a'}` : 'n/a'}`,
      `RAW frame continuity: ${frameProbe.label}`,
      `RAW frame regression: ${frameProbe.regression}`,
      `Continuity summary: ${probeFresh ? ((frameGuard?.applied || narrative?.calendarFrameChanged || Number(narrative?.sceneRolloverCount || 0) > 0 || narrative?.floorApplied) ? 'REPAIRED' : 'PASS') : 'n/a'}`,
      `Calendar transition: ${probeFresh && narrative ? (narrative.calendarEligible ? `${narrative.calendarReason || 'RESOLVED'} · previous ${narrative.calendarPreviousDate || 'n/a'} · target ${narrative.calendarTargetDate || 'n/a'} · weekday ${narrative.calendarWeekday || 'n/a'}${narrative.calendarFrameChanged ? ' · FRAME_REPAIRED' : ''}${Number(narrative.sceneRolloverCount || 0) > 0 ? ` · scene-year repairs ${Number(narrative.sceneRolloverCount || 0)}` : ''}` : `INELIGIBLE · ${narrative.calendarReason || 'none'}`) : 'n/a'}`,
      `Frame sequence: ${frameGuard ? `${frameGuard.sequenceStatus || (frameGuard.applied ? 'REPAIRED' : 'PASS')} · volume ${frameGuard.observed?.volume ?? 'n/a'}→${frameGuard.output?.volume ?? 'n/a'} expected ${frameGuard.expected?.volume ?? 'n/a'} · chapter ${frameGuard.observed?.chapter ?? 'n/a'}→${frameGuard.output?.chapter ?? 'n/a'} expected ${frameGuard.expected?.chapter ?? 'n/a'} · Chatindex ${frameGuard.observed?.chatindex ?? 'n/a'}→${frameGuard.output?.chatindex ?? 'n/a'} expected ${frameGuard.expected?.chatindex ?? 'n/a'}` : 'n/a'}`,
      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'REPAIRED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,
      `Evidence shape: ${evidenceMap ? `${evidenceMap.status} · root ${evidenceMap.rootUserShape} raw @${evidenceMap.rootUserRawIndex}→request @${evidenceMap.rootUserRequestIndex >= 0 ? evidenceMap.rootUserRequestIndex : 'n/a'} role ${evidenceMap.rootUserRequestRole || 'n/a'} (${evidenceMap.rootUserMatches} match) · source assistant ${evidenceMap.sourceAssistantShape} raw @${evidenceMap.sourceAssistantRawIndex >= 0 ? evidenceMap.sourceAssistantRawIndex : 'n/a'}→request @${evidenceMap.sourceAssistantRequestIndex >= 0 ? evidenceMap.sourceAssistantRequestIndex : 'n/a'} role ${evidenceMap.sourceAssistantRequestRole || 'n/a'} (${evidenceMap.sourceAssistantMatches} match)` : 'n/a'}`,
      `Evidence boundary: ${evidenceMap ? `root anchors ${evidenceMap.rootUserAnchorMask} · norm ${evidenceMap.rootUserNormChars}→${evidenceMap.rootUserRequestNormChars} · gaps ${evidenceMap.rootUserLeadingGap}/${evidenceMap.rootUserTrailingGap} · assistant anchors ${evidenceMap.sourceAssistantAnchorMask} · norm ${evidenceMap.sourceAssistantNormChars}→${evidenceMap.sourceAssistantRequestNormChars} · gaps ${evidenceMap.sourceAssistantLeadingGap}/${evidenceMap.sourceAssistantTrailingGap}` : 'n/a'}`,
      `Evidence mode: ${evidenceFence?.mode || 'n/a'}`,
      `Evidence root fence: ${evidenceFence?.rootFence ? `${evidenceFence.rootFence.status} · request @${evidenceFence.rootFence.requestIndex >= 0 ? evidenceFence.rootFence.requestIndex : 'n/a'} role ${evidenceFence.rootFence.role || 'n/a'} · shape ${evidenceFence.rootFence.shape || 'n/a'} · delta ${evidenceFence.rootFence.normDelta == null ? 'n/a' : evidenceFence.rootFence.normDelta} · ${evidenceFence.rootFence.reason || 'n/a'}` : 'n/a'}`,
      `Evidence source fence: ${evidenceFence?.sourceFence ? `${evidenceFence.sourceFence.status} · request @${evidenceFence.sourceFence.requestIndex >= 0 ? evidenceFence.sourceFence.requestIndex : 'n/a'} role ${evidenceFence.sourceFence.role || 'n/a'} · shape ${evidenceFence.sourceFence.shape || 'n/a'} · delta ${evidenceFence.sourceFence.normDelta == null ? 'n/a' : evidenceFence.sourceFence.normDelta} · ${evidenceFence.sourceFence.reason || 'n/a'}` : 'n/a'}`,
      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Post-B_END clock handoff: ${probeFresh && narrative ? `${narrative.postBEndClockDisposition || 'INELIGIBLE'} · floor ${narrative.postBEndClockFloor || 'n/a'} · narrative ${narrative.previousAnchor || 'n/a'} · effective ${narrative.effectiveFloor || narrative.previousAnchor || 'n/a'} · reason ${narrative.postBEndClockReason || 'unknown'}` : 'n/a'}`,
      `Current-time authority: ${probeFresh && narrative ? (narrative.currentTimeAuthority || 'NARRATIVE') : 'n/a'}`,
      `Narrative tail coverage: ${probeFresh && narrative ? (/^FRAME_ONLY/.test(String(narrative.tailStatus || '')) ? 'FRAME_ONLY · no explicit terminal timestamp beyond frame · RAW prose cross-check required for elapsed/current/end-time cues' : (narrative.tailPromoted ? 'EXPLICIT_TAIL · terminal timestamp observed and committed' : `NO_TAIL_PROMOTION · ${narrative.tailStatus || 'n/a'}`)) : 'n/a'}`,
      `Visible chronology: ${probeFresh && narrative ? (narrative.tailStatus === 'SKIPPED_NON_MONOTONIC' ? 'NON_MONOTONIC_VISIBLE_SEQUENCE · state floor protected · body unchanged' : (narrative.tailStatus === 'SKIPPED_MALFORMED' ? 'MALFORMED_VISIBLE_SEQUENCE · state floor protected · body unchanged' : 'PASS_OR_NOT_APPLICABLE')) : 'n/a'}`,
      `Stored broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,
      '',
      'Warnings detail:',
      ...(warnings.length ? warnings.map((x) => `- ${x}`) : ['- none']),
      'Compatibility detail:',
      ...(compatibility.length ? compatibility.map((x) => `- ${x}`) : ['- none']),
      '',
    ];

    const sections = [];
    let previousAssistantIndex = -1;
    const previousSearchBefore = currentUserIndex >= 0 ? currentUserIndex : latestAssistantIndex;
    for (let i = previousSearchBefore - 1; i >= 0; i--) {
      if (diagnosticAssistantRole(messages[i])) {
        previousAssistantIndex = i;
        break;
      }
    }
    const previousUserIndex = diagnosticUserBefore(
      messages,
      previousAssistantIndex >= 0 ? previousAssistantIndex : previousSearchBefore,
    );

    if (previousUserIndex >= 0 || previousAssistantIndex >= 0) {
      sections.push(diagnosticSection(
        '직전 턴 (RAW)',
        messages,
        previousUserIndex,
        previousAssistantIndex,
      ));
    } else {
      sections.push([
        '--- 직전 턴 (RAW) ---',
        'unavailable',
        '',
      ].join('\n'));
    }

    sections.push(diagnosticSection(
      '최근 턴 (RAW)',
      messages,
      currentUserIndex,
      latestAssistantIndex,
      [`Runtime mode: ${runtimeMode || 'n/a'} · stored last mode: ${state?.lastMode || 'n/a'}`],
    ));
    return lines.join('\n') + sections.join('\n');
  }

  function diagnosticCopyErrorName(error) {
    const name = String(error?.name || 'Error').replace(/[^A-Za-z0-9_$.-]+/g, '_').slice(0, 80);
    return name || 'Error';
  }

  function diagnosticCopyResult(status, detail = {}) {
    return Object.freeze({
      ok: status === 'COPIED' || status === 'COPIED_FALLBACK',
      status,
      reportChars: Math.max(0, Number(detail.reportChars || 0)),
      primaryAvailable: !!detail.primaryAvailable,
      primaryErrorName: detail.primaryErrorName || null,
      fallbackAttempted: !!detail.fallbackAttempted,
      fallbackErrorName: detail.fallbackErrorName || null,
    });
  }

  function fallbackCopyText(reportText) {
    if (typeof document === 'undefined'
        || !document.body
        || typeof document.createElement !== 'function'
        || typeof document.execCommand !== 'function') return false;

    const activeElement = document.activeElement || null;
    const textarea = document.createElement('textarea');
    let appended = false;
    try {
      textarea.value = reportText;
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      textarea.tabIndex = -1;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      appended = true;
      try { textarea.focus({ preventScroll: true }); } catch (_) { textarea.focus(); }
      textarea.select();
      if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(0, reportText.length);
      }
      return document.execCommand('copy') === true;
    } finally {
      if (appended && textarea.parentNode) textarea.parentNode.removeChild(textarea);
      if (activeElement
          && activeElement !== textarea
          && activeElement.isConnected !== false
          && typeof activeElement.focus === 'function') {
        try { activeElement.focus({ preventScroll: true }); } catch (_) {
          try { activeElement.focus(); } catch (_) {}
        }
      }
    }
  }

  async function runDiagnosticCopy(buildReport, primaryCopy, fallbackCopy) {
    const primaryAvailable = typeof primaryCopy === 'function';
    let reportText;
    try {
      reportText = String(buildReport());
    } catch (_) {
      return diagnosticCopyResult('REPORT_BUILD_FAILED', { primaryAvailable });
    }

    const reportChars = reportText.length;
    let primaryErrorName = null;
    if (primaryAvailable) {
      try {
        await primaryCopy(reportText);
        return diagnosticCopyResult('COPIED', { reportChars, primaryAvailable });
      } catch (error) {
        primaryErrorName = diagnosticCopyErrorName(error);
      }
    }

    let fallbackErrorName = null;
    const fallbackAttempted = typeof fallbackCopy === 'function';
    if (fallbackAttempted) {
      try {
        if (await fallbackCopy(reportText)) {
          return diagnosticCopyResult('COPIED_FALLBACK', {
            reportChars,
            primaryAvailable,
            primaryErrorName,
            fallbackAttempted,
          });
        }
        fallbackErrorName = 'CopyCommandFalse';
      } catch (error) {
        fallbackErrorName = diagnosticCopyErrorName(error);
      }
    } else {
      fallbackErrorName = 'Unavailable';
    }

    return diagnosticCopyResult('CLIPBOARD_WRITE_FAILED', {
      reportChars,
      primaryAvailable,
      primaryErrorName,
      fallbackAttempted,
      fallbackErrorName,
    });
  }

  function diagnosticCopyButtonText(result) {
    switch (result?.status) {
      case 'COPIED': return '복사됨 ✓';
      case 'COPIED_FALLBACK': return '복사됨 (대체 방식) ✓';
      case 'REPORT_BUILD_FAILED': return '진단 생성 실패';
      default: return '클립보드 복사 실패';
    }
  }

  async function copyLastTurnDiagnostic(chat, state) {
    const primaryCopy = typeof navigator !== 'undefined' && navigator.clipboard?.writeText
      ? (reportText) => navigator.clipboard.writeText(reportText)
      : null;
    const result = await runDiagnosticCopy(
      () => buildLastTurnDiagnosticReport(chat, state),
      primaryCopy,
      fallbackCopyText,
    );
    lastDiagnosticCopyProbe = Object.freeze({
      status: result.status,
      reportChars: result.reportChars,
      primaryAvailable: result.primaryAvailable,
      primaryErrorName: result.primaryErrorName,
      fallbackAttempted: result.fallbackAttempted,
      fallbackErrorName: result.fallbackErrorName,
      at: Date.now(),
    });
    console.log(SIMCORE_LOG_PREFIX + ' diagnostic copy:', lastDiagnosticCopyProbe);
    return result;
  }

  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.66.0',
    name: 'M2-4 Session / Runtime Mirror Boundary Completion',
    scenario: '06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT',
    summary: Object.freeze([
      'M2-4 — output-finalize / Store housekeeping / Recovery direct-owner / Runtime Mirror observation boundaries를 동작 변경 없이 정리',
      '자연 A/C/B 요청에서 output commit · Deferred Mirror · Frame/Time/COMMUNITY/Reaction 회귀가 없는지 확인',
      'Representation fast reconcile과 genuine hand edit controls를 다시 확인',
      '이상 징후는 현재 진단을 먼저 보존하고 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.66.0', name: 'M2-4 Boundary Completion', bullets: Object.freeze(['Session finalization/housekeeping ownership 축소', 'Mirror Observe→Interpret→Apply→Record 경계 완성']) }),
      Object.freeze({ version: '0.65.0', name: 'M2-3 + Runtime Identity Convergence', bullets: Object.freeze(['Edit Reconcile application service 추출', 'metadata/runtime/host identity 0.65.0 수렴']) }),
      Object.freeze({ version: '0.64.11', name: 'Bounded Telemetry Capsule Compaction', bullets: Object.freeze(['reload handoff bounded compact shape', 'whole capsule 16KB hard cap']) }),
    ]),
  });

  function buildOperatorReleaseCardHtml() {
    const card = OPERATOR_RELEASE_CARD;
    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');
    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">
<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>
<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>
<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>
<div style="font-weight:700;margin:8px 0 5px">실전 확인</div>
<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 A/C/B 요청에서 Version 0.66.0 · Runtime ACTIVE · output COMMITTED 확인</li><li>ordinary exact carryover → SAME_FAST · Edit origin NONE 확인</li><li>자연스럽게 가능한 prior OUTPUT_MISMATCH + exact Fresh carryover → REPRESENTATION_FAST_RECONCILED · snapshot UNCHANGED 확인</li><li>genuine hand edit → USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT 확인</li><li>Deferred Mirror의 CANONICAL/HOST_RAW/confirmed-boundary 의미와 stale/superseded guard가 이전과 동일한지 확인</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>예상 밖 semantic/runtime 이상, unsafe mirror write, repeated adoption/reset, identity split 또는 구조 회귀가 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }


  async function openPanel() {
    try {
      const { chaIdx, chatIdx } = await host.currentIndices();
      const chat = await host.getChat(chaIdx, chatIdx);
      await runtimeSession.loadCoreForChat(chaIdx, chatIdx, chat);
      const s = coreSession?.current;
      const storageDiag = coreSession?.storageDiagnostics?.() || null;
      const aliasDiag = coreSession?.communityAliasDiagnostics?.() || null;
      const recurrenceDiag = coreSession?.templateRecurrenceDiagnostics?.() || null;
      const maxima = Object.entries(s?.community?.platformMax || {})
        .map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
      const rows = maxima.length
        ? maxima.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v.toLocaleString('en-US')}</td></tr>`).join('')
        : '<tr><td colspan="2" class="muted">아직 기록 없음</td></tr>';
      const broadcastClockRows = s?.broadcastLocked
        ? `<div><div class="k">Broadcast airtime</div><div class="v">${escapeHtml(s?.broadcastAirtime || 'unknown')}</div></div>
<div><div class="k">Airtime start</div><div class="v">${escapeHtml(s?.broadcastAirtimeStart || 'unknown')}</div></div>`
        : (s?.broadcastAirtime
          ? `<div><div class="k">Last broadcast airtime</div><div class="v">${escapeHtml(s.broadcastAirtime)}</div></div>`
          : '');
      const snap = lastPerf?.snapshotDetail || null;
      const currentSnapshotPath = !snap
        ? 'NO REQUEST DATA'
        : (!snap.mustRestorePre
          ? 'FORWARD · no restore'
          : (snap.existingPre
            ? `RESTORED · ${escapeHtml(snap.restoreReason || 'restore')}`
            : `MISS · ${escapeHtml(snap.restoreReason || 'restore')}`));
      const narrativeProbe = lastNarrativeClockProbe;
      const narrativeTransition = narrativeProbe
        ? `${narrativeProbe.previousMode || '?'} → ${narrativeProbe.mode || '?'}`
        : 'n/a';
      const narrativeGuardLabel = narrativeProbe ? (narrativeProbe.guardActive ? 'ON' : 'OFF') : 'n/a';
      const recurrenceLabel = lastTemplateRecurrenceProbe
        ? (lastTemplateRecurrenceProbe.eligible ? (lastTemplateRecurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE')
        : 'n/a';
      const lineageLabel = lastRequestLineageProbe
        ? (lastRequestLineageProbe.sourceKind === 'INLINE'
          ? 'INLINE SOURCE'
          : (lastRequestLineageProbe.sourceKind === 'UNSEEDED'
            ? 'UNSEEDED'
            : `${lastRequestLineageProbe.rootMode || '?'} → ${String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B')} · depth ${Number(lastRequestLineageProbe.depth || 0)}`))
        : 'n/a';
      const handoffLabel = lastCommunitySourceHandoffProbe
        ? (lastCommunitySourceHandoffProbe.newSource
          ? 'NEW SOURCE'
          : (lastCommunitySourceHandoffProbe.eligible
            ? (lastCommunitySourceHandoffProbe.seen ? 'SAME SOURCE' : 'FIRST')
            : 'INELIGIBLE'))
        : 'n/a';
      const parentShiftLabel = lastCommunitySourceHandoffProbe
        ? (lastCommunitySourceHandoffProbe.newSource
          ? 'NEW ROOT'
          : (!lastCommunitySourceHandoffProbe.eligible
            ? 'INELIGIBLE'
            : (!lastCommunitySourceHandoffProbe.seen
              ? 'FIRST'
              : (lastCommunitySourceHandoffProbe.parentShift
                ? 'NEW PARENT'
                : (lastCommunitySourceHandoffProbe.parentComparable ? 'SAME PARENT' : 'BASELINE')))))
        : 'n/a';
      const promptCacheLabel = !lastRuntimePromptCacheProbe
        ? '—'
        : (lastRuntimePromptCacheProbe.baseline
          ? 'BASELINE'
          : `${Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${lastRuntimePromptCacheProbe.reason || 'other'}`);
      const panelMessages = Array.isArray(chat?.message) ? chat.message : [];
      let panelLatestAssistantIndex = -1;
      for (let i = panelMessages.length - 1; i >= 0; i--) {
        if (diagnosticAssistantRole(panelMessages[i])) { panelLatestAssistantIndex = i; break; }
      }
      let panelCurrentUserIndex = -1;
      for (let i = panelLatestAssistantIndex - 1; i >= 0; i--) {
        if (panelMessages[i]?.role === 'user') { panelCurrentUserIndex = i; break; }
      }
      const panelFrameProbe = diagnosticFrameContinuity(panelMessages, panelCurrentUserIndex, panelLatestAssistantIndex);
      const panelFrameValue = (v) => Number.isFinite(v) ? Number(v) : 'n/a';
      const panelProbeFresh = diagnosticProbeFresh(panelCurrentUserIndex);
      const panelModeLabel = diagnosticRuntimeMode(panelProbeFresh, lastDiagnosticRequestProbe) || 'n/a';
      const panelRuntimeStatus = panelProbeFresh ? (lastDiagnosticRequestProbe?.status || 'UNKNOWN') : 'STALE';
      const panelOutputFresh = !!(panelProbeFresh && panelModeLabel !== 'n/a'
        && lastDiagnosticRequestProbe?.outputStatus === 'COMMITTED'
        && Number(lastDiagnosticRequestProbe?.outIndex) === Number(panelLatestAssistantIndex));
      const panelWarningCount = panelOutputFresh && Array.isArray(lastCore.issues) ? lastCore.issues.length : 0;
      const panelSourceLock = !!lastRuntimePromptBudget?.sourceAnchor;
      const panelFrameOk = panelFrameProbe.regression === 'NONE';
      const panelPrefixClass = !lastRuntimePromptCacheProbe || lastRuntimePromptCacheProbe.baseline
        ? 'neutral'
        : (Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0) >= 60 ? 'good'
          : (Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0) >= 30 ? 'warn' : 'bad'));
      const panelRootLabel = lastRequestLineageProbe?.rootIndex >= 0
        ? `${lastRequestLineageProbe.rootMode || '?'}@${Number(lastRequestLineageProbe.rootIndex)}`
        : 'UNSEEDED';
      const panelParentLabel = lastRequestLineageProbe?.parentIndex >= 0
        ? `${lastRequestLineageProbe.parentMode || '?'}@${Number(lastRequestLineageProbe.parentIndex)}`
        : 'none';
      const panelCurrentLabel = `${String(lastRequestLineageProbe?.currentMode || panelModeLabel || '?').replace(/^B_.*/, 'B')}@current`;
      const panelPerfLabelMap = {
        indicesMs: 'Indices', chatLoadMs: 'Chat load', sessionLoadMs: 'Session load', promptScanMs: 'Prompt scan',
        bootstrapMs: 'History bootstrap', aliasRepairMs: 'Community alias repair', editReconcileMs: 'Edit reconcile',
        prepareMs: 'Core prepare', stateMirrorMs: 'State mirror', snapshotMs: 'Snapshot/onSend'
      };
      const panelPerfTop = Object.entries(lastPerf || {})
        .filter(([k, v]) => k !== 'totalMs' && k.endsWith('Ms') && typeof v === 'number' && Number.isFinite(v) && v >= 0)
        .sort((a, b) => b[1] - a[1])[0] || null;
      const panelPerfTopLabel = panelPerfTop ? (panelPerfLabelMap[panelPerfTop[0]] || panelPerfTop[0].replace(/Ms$/, '')) : 'n/a';
      const panelHealthLabel = !panelFrameOk ? 'REGRESSION' : (panelWarningCount > 0 ? 'CHECK' : 'HEALTHY');
      const panelHealthClass = !panelFrameOk ? 'bad' : (panelWarningCount > 0 ? 'warn' : 'good');
      const panelEditPath = String(lastPerf?.editDetail?.path || '');
      const panelEditRebuilt = panelEditPath === 'manual-edit-rebuilt';
      const panelEditLabel = !lastPerf ? '—' : (panelEditRebuilt ? 'REBUILT' : 'CLEAN');
      const panelEditClass = !lastPerf ? 'neutral' : (panelEditRebuilt ? 'warn' : 'good');
      const panelSourceLabel = panelSourceLock ? 'LOCK' : (lastCommunitySourceHandoffProbe?.newSource ? 'NEW' : '—');
      const panelSourceClass = (panelSourceLock || lastCommunitySourceHandoffProbe?.newSource) ? 'good' : 'neutral';
      const panelFrameStepUi = (step) => {
        const value = String(step || 'n/a');
        if (value === 'ADVANCED') return '↑ ADVANCED';
        if (value === 'SAME') return '━ SAME';
        if (value === 'REGRESSED') return '↓ REGRESSED';
        if (value === 'RESET_AFTER_VOLUME_ADVANCE') return '↻ RESET';
        return `· ${value}`;
      };
      const panelChapterStep = (Number.isFinite(panelFrameProbe.previous.volume) && Number.isFinite(panelFrameProbe.current.volume)
        && panelFrameProbe.current.volume > panelFrameProbe.previous.volume && Number.isFinite(panelFrameProbe.previous.chapter)
        && Number.isFinite(panelFrameProbe.current.chapter) && panelFrameProbe.current.chapter < panelFrameProbe.previous.chapter)
        ? 'RESET_AFTER_VOLUME_ADVANCE' : diagnosticStepLabel(panelFrameProbe.previous.chapter, panelFrameProbe.current.chapter);
      document.body.innerHTML = `
<style>
body{margin:0;background:#0b1020;color:#e7ecf6;font:14px system-ui,sans-serif} .wrap{max-width:720px;margin:auto;padding:0 20px 20px}
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0 10px;background:rgba(11,16,32,.94);backdrop-filter:blur(10px);border-bottom:1px solid #202c45}.title{font-size:18px;font-weight:800}.subtitle{color:#8291ad;font-size:11px;margin-top:2px}.actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.card{background:#121a2d;border:1px solid #293754;border-radius:12px;padding:14px;margin:10px 0}.health{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0 8px}.chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800;border:1px solid #33415f;background:#111a2b}.chip.good{border-color:#285c4b;background:#10271f;color:#9ce5c3}.chip.warn{border-color:#66582f;background:#2b2512;color:#f2d889}.chip.bad{border-color:#743b48;background:#2d151b;color:#ffb3c0}.chip.neutral{color:#c4d1e8}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.k{color:#9fb3d7;font-size:12px}.v{font-weight:700;margin-top:3px}.section-title{font-size:13px;font-weight:800;margin-bottom:10px}.breadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.crumb{background:#0e1628;border:1px solid #2a3b5d;border-radius:8px;padding:6px 8px;font-weight:700}.arrow{color:#7185aa}.frame-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.frame-cell{background:#0e1628;border:1px solid #23314d;border-radius:9px;padding:9px}.frame-step{font-size:11px;color:#91a6c9;margin-top:4px}.frame-ok{color:#9ce5c3}.frame-bad{color:#ffb3c0}.bottleneck{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#0e1628;border:1px solid #2a3b5d;border-radius:9px;padding:9px 10px;margin:0 0 8px}.bottleneck span{color:#9fb3d7;font-size:12px}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:7px;border-bottom:1px solid #26324a}th{color:#9fb3d7}.muted{color:#8291ad}
button{background:#263d73;color:white;border:1px solid #4564a2;border-radius:8px;padding:7px 11px;cursor:pointer}
.compact{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.metric{background:#0e1628;border:1px solid #23314d;border-radius:9px;padding:9px 10px;transition:opacity .15s ease,border-color .15s ease}.metric.dim{opacity:.42}.overall-chip{font-size:12px;padding:7px 10px}.advanced-count{font-weight:500;color:#8291ad;font-size:11px;margin-left:5px}.crumb.root{border-color:#385781}.crumb.current{border-color:#285c4b;color:#b7efd5}.crumb.mutedcrumb{opacity:.55}.frame-step.regressed{color:#ffb3c0;font-weight:800}
details.card{padding:0}details.card>summary{cursor:pointer;padding:13px;font-weight:700;color:#dbe6fb;list-style:none}details.card>summary::-webkit-details-marker{display:none}details.card>summary:before{content:'▸';display:inline-block;width:18px;color:#9fb3d7}details.card[open]>summary:before{content:'▾'}.detail-body{padding:0 13px 13px}
@media(max-width:520px){.wrap{padding:0 12px 14px}.topbar{align-items:flex-start}.title{font-size:16px}.subtitle{display:none}.actions button{padding:6px 8px;font-size:11px}.frame-grid{grid-template-columns:1fr}.health{gap:5px}.chip{padding:5px 7px}}
</style><div class="wrap">
<div class="topbar">
<div><div class="title">⚙️ SimCore v${escapeHtml(SIMCORE_RUNTIME_VERSION)}</div><div class="subtitle">Runtime & Integrity Diagnostics</div></div>
<div class="actions"><button id="copy-turn-diag">최근 2턴 진단 복사</button><button id="toggle-release-card">업데이트 내역</button><button id="close">닫기</button></div>
</div>
${buildOperatorReleaseCardHtml()}
<div class="health">
<span class="chip overall-chip ${panelHealthClass}">● ${panelHealthLabel}</span>
<span class="chip neutral">MODE ${escapeHtml(panelModeLabel)}</span>
<span class="chip ${panelRuntimeStatus === 'ACTIVE' ? 'good' : (panelRuntimeStatus === 'ERROR' ? 'bad' : 'neutral')}">RUNTIME ${escapeHtml(panelRuntimeStatus)}</span>
<span class="chip ${panelWarningCount === 0 ? 'good' : 'bad'}">WARN ${panelWarningCount}</span>
<span class="chip ${panelSourceClass}">SOURCE ${escapeHtml(panelSourceLabel)}</span>
<span class="chip ${panelFrameOk ? 'good' : 'bad'}">FRAME ${panelFrameOk ? 'OK' : escapeHtml(panelFrameProbe.regression)}</span>
<span class="chip ${panelEditClass}">EDIT ${escapeHtml(panelEditLabel)}</span>
<span class="chip ${panelPrefixClass}">PREFIX ${escapeHtml(promptCacheLabel)}</span>
</div>
<div class="card">
<div class="section-title">Continuity at a glance</div>
<div class="breadcrumb"><span class="crumb root ${panelRootLabel === 'UNSEEDED' ? 'mutedcrumb' : ''}">ROOT ${escapeHtml(panelRootLabel)}</span><span class="arrow">→</span><span class="crumb ${panelParentLabel === 'none' ? 'mutedcrumb' : ''}">PARENT ${escapeHtml(panelParentLabel)}</span><span class="arrow">→</span><span class="crumb current">${escapeHtml(panelCurrentLabel)}</span></div>
<div class="frame-grid">
<div class="frame-cell"><div class="k">Volume</div><div class="v">${panelFrameValue(panelFrameProbe.previous.volume)} → ${panelFrameValue(panelFrameProbe.current.volume)}</div><div class="frame-step ${diagnosticStepLabel(panelFrameProbe.previous.volume, panelFrameProbe.current.volume) === 'REGRESSED' ? 'regressed' : ''}">${escapeHtml(panelFrameStepUi(diagnosticStepLabel(panelFrameProbe.previous.volume, panelFrameProbe.current.volume)))}</div></div>
<div class="frame-cell"><div class="k">Chapter</div><div class="v">${panelFrameValue(panelFrameProbe.previous.chapter)} → ${panelFrameValue(panelFrameProbe.current.chapter)}</div><div class="frame-step ${panelChapterStep === 'REGRESSED' ? 'regressed' : ''}">${escapeHtml(panelFrameStepUi(panelChapterStep))}</div></div>
<div class="frame-cell"><div class="k">Chatindex</div><div class="v">${panelFrameValue(panelFrameProbe.previous.chatindex)} → ${panelFrameValue(panelFrameProbe.current.chatindex)}</div><div class="frame-step ${diagnosticStepLabel(panelFrameProbe.previous.chatindex, panelFrameProbe.current.chatindex) === 'REGRESSED' ? 'regressed' : ''}">${escapeHtml(panelFrameStepUi(diagnosticStepLabel(panelFrameProbe.previous.chatindex, panelFrameProbe.current.chatindex)))}</div></div>
</div>
<div class="${panelFrameOk ? 'frame-ok' : 'frame-bad'}" style="font-weight:800;margin-top:10px">FRAME REGRESSION: ${escapeHtml(panelFrameProbe.regression)}</div>
</div>
<div class="card grid">
<div><div class="k">Runtime mode</div><div class="v">${escapeHtml(panelModeLabel)}</div></div>
<div><div class="k">Stored last mode</div><div class="v">${escapeHtml(s?.lastMode || 'A')}</div></div>
<div><div class="k">Broadcast</div><div class="v">${s?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'}</div></div>
${broadcastClockRows}
<div><div class="k">Episode</div><div class="v">${Number(s?.episodeNo || 0)}</div></div>
<div><div class="k">Community blocks</div><div class="v">${Number(s?.community?.activationCount || 0)}</div></div>
<div><div class="k">Community classifier</div><div class="v">v${Number(s?.community?.classifierVersion || 0)}</div></div>
<div><div class="k">Reaction floor</div><div class="v">PER PLATFORM</div></div>
<div><div class="k">Korean age offset</div><div class="v">+${Number(s?.koreanAgeOffset || 0)}</div></div>
<div><div class="k">World year</div><div class="v">${s?.worldYear ?? 'unknown'}</div></div>
<div><div class="k">Narrative anchor</div><div class="v">${escapeHtml(s?.narrativeTimestamp || 'unknown')}</div></div>
<div><div class="k">Warnings</div><div class="v">${lastCore.issues.length}</div></div>
<div><div class="k">Compatibility diagnostics</div><div class="v">${(lastCore.diagnostics || []).length}</div></div>
</div>
<details class="card" id="advanced-diagnostics"><summary>Advanced diagnostics <span class="advanced-count" id="advanced-count"></span></summary><div class="detail-body compact" id="advanced-grid">
<div class="metric"><div class="k">Current snapshot path</div><div class="v">${currentSnapshotPath}</div></div>
<div class="metric"><div class="k">Narrative guard</div><div class="v">${narrativeGuardLabel}</div></div>
<div class="metric"><div class="k">Current-time floor</div><div class="v">${narrativeProbe?.floorApplied ? 'CLAMPED' : 'ON'}</div></div>
<div class="metric"><div class="k">Mode transition</div><div class="v">${escapeHtml(narrativeTransition)}</div></div>
<div class="metric"><div class="k">Template recurrence</div><div class="v">${recurrenceLabel}</div></div>
<div class="metric"><div class="k">Request lineage</div><div class="v">${escapeHtml(lineageLabel)}</div></div>
<div class="metric"><div class="k">Source handoff</div><div class="v">${escapeHtml(handoffLabel)}</div></div>
<div class="metric"><div class="k">Parent shift</div><div class="v">${escapeHtml(parentShiftLabel)}</div></div>
<div class="metric"><div class="k">Reference anchor</div><div class="v">ON · +2 lines</div></div>
<div class="metric"><div class="k">Current age anchor</div><div class="v">${Number(s?.koreanAgeOffset || 0) > 0 ? `ON · +1 line · offset +${Number(s?.koreanAgeOffset || 0)}` : `STANDBY · offset +0`}</div></div>
<div class="metric"><div class="k">Timestamp syntax</div><div class="v">${lastTimestampCanonicalization ? (lastTimestampCanonicalization.changed ? `CANONICALIZED · ${Number(lastTimestampCanonicalization.count || 0)}` : `OK`) : `n/a`}</div></div>
<div class="metric"><div class="k">Short-C lineage</div><div class="v">${lastRuntimePromptBudget?.sourceAnchor ? 'SOURCE LOCKED' : (lastRuntimePromptBudget?.lineageAnchor ? 'CURRENT LINEAGE' : 'OFF')}</div></div>
<div class="metric"><div class="k">Runtime prompt</div><div class="v">${lastRuntimePromptBudget ? `${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines` : 'n/a'}</div></div>
<div class="metric"><div class="k">Prompt prefix</div><div class="v">${escapeHtml(promptCacheLabel)}</div></div>
<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>
<div class="metric"><div class="k">output</div><div class="v">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>
</div></details>
${lastCore.issues.length ? `<div class="card"><div class="k" style="margin-bottom:8px">Latest warnings</div><div>${lastCore.issues.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}
${(lastCore.diagnostics || []).length ? `<div class="card"><div class="k" style="margin-bottom:8px">Compatibility diagnostics</div><div>${lastCore.diagnostics.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}
${lastRuntimePromptBudget ? `<div class="card"><div class="k" style="margin-bottom:8px">Runtime prompt budget (current request)</div><div>${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines · mode ${escapeHtml(lastRuntimePromptBudget.mode || '?')}</div><div class="muted" style="margin-top:5px">reaction_max line ${Number(lastRuntimePromptBudget.reactionMaxChars || 0).toLocaleString('en-US')} chars · reference ${Number(lastRuntimePromptBudget.referenceLines || 0)} lines</div><div class="muted" style="margin-top:5px">active flags: ${escapeHtml([lastRuntimePromptBudget.broadcast ? 'broadcast' : '', lastRuntimePromptBudget.community ? 'community' : '', lastRuntimePromptBudget.narrativeProgression ? 'narrative' : '', lastRuntimePromptBudget.recurrence ? 'recurrence' : '', lastRuntimePromptBudget.handoff ? 'handoff' : '', lastRuntimePromptBudget.ageAnchor ? 'age-anchor' : '', lastRuntimePromptBudget.lineageAnchor ? 'lineage-anchor' : ''].filter(Boolean).join(' · ') || 'base-only')} · diagnostics only · prompt unchanged</div></div>` : ''}
${lastRuntimePromptCacheProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Prompt cache probe (SimCore runtime block)</div><div>${lastRuntimePromptCacheProbe.baseline ? 'BASELINE · no previous same-chat runtime block' : `${Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0).toFixed(1)}% stable prefix · ${escapeHtml(lastRuntimePromptCacheProbe.reason || 'other')}`}</div><div class="muted" style="margin-top:5px">current ${Number(lastRuntimePromptCacheProbe.currentChars || 0).toLocaleString('en-US')} chars · previous ${Number(lastRuntimePromptCacheProbe.previousChars || 0).toLocaleString('en-US')} · stable prefix ${Number(lastRuntimePromptCacheProbe.stablePrefixChars || 0).toLocaleString('en-US')} chars / ${Number(lastRuntimePromptCacheProbe.stablePrefixLines || 0)} full lines</div><div class="muted" style="margin-top:5px">${lastRuntimePromptCacheProbe.firstChangedLine == null ? 'first change: none' : `first change: line ${Number(lastRuntimePromptCacheProbe.firstChangedLine)} · changed line slots ${Number(lastRuntimePromptCacheProbe.changedLineSlots || 0)}`} · memory-only previous block</div><div class="muted" style="margin-top:5px">SimCore runtime block only · does not observe or infer PocketRisu/provider cache hit/miss</div></div>` : ''}
${lastTemplateRecurrenceProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · mode ${escapeHtml(lastTemplateRecurrenceProbe.modeFamily || '?')} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? 'delta/variation hint injected' : 'no recurrence hint'}</div></div>` : ''}
${lastRequestLineageProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Request lineage probe (runtime)</div><div>${escapeHtml(lineageLabel)}</div><div class="muted" style="margin-top:5px">root ${escapeHtml(lastRequestLineageProbe.rootMode || 'none')}@${Number(lastRequestLineageProbe.rootIndex)} · parent ${escapeHtml(lastRequestLineageProbe.parentMode || 'none')}@${Number(lastRequestLineageProbe.parentIndex)} · transition ${escapeHtml(lastRequestLineageProbe.transitionFrom || '?')} → ${escapeHtml(String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B'))}</div><div class="muted" style="margin-top:5px">recent A/B ${escapeHtml((lastRequestLineageProbe.recentSources || []).map((x) => `${x.mode}@${x.index}`).join(' · ') || 'none')} · diagnostics only · prompt +0</div></div>` : ''}
${lastCommunitySourceHandoffProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Community source handoff (runtime)</div><div>${escapeHtml(handoffLabel)} · registry ${Number(lastCommunitySourceHandoffProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">current ${escapeHtml(lastCommunitySourceHandoffProbe.rootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.rootIndex)} · prior ${escapeHtml(lastCommunitySourceHandoffProbe.priorRootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorRootIndex)} · request chars ${Number(lastCommunitySourceHandoffProbe.normalizedChars || 0)}</div><div class="muted" style="margin-top:5px">${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : (lastRuntimePromptBudget?.lineageAnchor ? '1-line current-lineage hint injected' : 'prompt +0')} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}</div></div>` : ''}
${lastCommunitySourceHandoffProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Community parent-shift probe (runtime)</div><div>${escapeHtml(parentShiftLabel)} · same-root follow-up diagnostics</div><div class="muted" style="margin-top:5px">current parent ${escapeHtml(lastCommunitySourceHandoffProbe.parentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.parentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.depth)} · prior parent ${escapeHtml(lastCommunitySourceHandoffProbe.priorParentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorParentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.priorDepth)}</div><div class="muted" style="margin-top:5px">diagnostics/state only · prompt +0 · no semantic decision</div></div>` : ''}
${recurrenceDiag ? `<div class="card"><div class="k" style="margin-bottom:8px">Template history bootstrap</div><div>DONE · ${Number(recurrenceDiag.registrySize || 0)} templates retained</div><div class="muted" style="margin-top:5px">${Number(recurrenceDiag.userMessages || 0)} user msgs · eligible A/B/C ${Number(recurrenceDiag.modeEligible?.A || 0)}/${Number(recurrenceDiag.modeEligible?.B || 0)}/${Number(recurrenceDiag.modeEligible?.C || 0)} · ${Number(recurrenceDiag.repeatedTemplates || 0)} historical repeats</div></div>` : ''}
${narrativeProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Narrative clock probe (runtime)</div><div>${escapeHtml(narrativeProbe.commitStatus || 'UNKNOWN')} · ${escapeHtml(narrativeTransition)} · guard ${narrativeProbe.guardActive ? 'ON' : 'OFF'}</div><div class="muted" style="margin-top:5px">trigger ${escapeHtml(narrativeProbe.trigger || 'none')} · previous ${escapeHtml(narrativeProbe.previousAnchor || 'unknown')} · observed ${escapeHtml(narrativeProbe.observedTimestamp || 'pending')} · committed ${escapeHtml(narrativeProbe.outputTimestamp || 'pending')}</div></div>` : ''}
${s?.lastNarrativeClockWarning ? `<div class="card"><div class="k" style="margin-bottom:8px">Narrative current-time floor</div><div>${s.lastNarrativeClockWarning.action === 'clamped' ? 'FLOOR CLAMPED' : 'REJECTED BACKWARD'} · ${escapeHtml(s.lastNarrativeClockWarning.rejected || 'unknown')}</div><div class="muted" style="margin-top:5px">floor ${escapeHtml(s.lastNarrativeClockWarning.previous || 'unknown')} · ${escapeHtml(s.lastNarrativeClockWarning.reason || 'forward')}</div></div>` : ''}
${lastHistoryRestore ? `<div class="card"><div class="k" style="margin-bottom:8px">Last snapshot restore (runtime)</div><div>RESTORED · ${escapeHtml(lastHistoryRestore.reason)} · send index ${Number(lastHistoryRestore.sendIndex)}</div><div class="muted" style="margin-top:5px">previous output index ${Number.isFinite(lastHistoryRestore.previousOutputIndex) ? Number(lastHistoryRestore.previousOutputIndex) : 'unknown'} · ${escapeHtml(new Date(lastHistoryRestore.at).toLocaleString())}</div></div>` : ''}
${lastPerf ? `<details class="card"><summary>beforeRequest performance · ${lastPerf.totalMs.toFixed(1)} ms${panelPerfTop ? ` · slowest ${escapeHtml(panelPerfTopLabel)} ${Number(panelPerfTop[1]).toFixed(1)} ms` : ''}</summary><div class="detail-body">${panelPerfTop ? `<div class="bottleneck"><span>Slowest step</span><strong>${escapeHtml(panelPerfTopLabel)} · ${Number(panelPerfTop[1]).toFixed(1)} ms</strong></div>` : ''}<table>
<tr><td>Total</td><td>${lastPerf.totalMs.toFixed(1)} ms</td></tr>
<tr><td>Indices</td><td>${lastPerf.indicesMs.toFixed(1)} ms</td></tr>
<tr><td>Chat load</td><td>${lastPerf.chatLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session load</td><td>${lastPerf.sessionLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Prompt scan</td><td>${lastPerf.promptScanMs.toFixed(1)} ms (${lastPerf.promptScannedMessages}/${lastPerf.promptTotalMessages} msgs, ${Number(lastPerf.promptScannedChars || 0).toLocaleString('en-US')} chars)</td></tr>
<tr><td>History bootstrap</td><td>${lastPerf.bootstrapMs.toFixed(1)} ms</td></tr>
<tr><td>Community alias repair</td><td>${Number(lastPerf.aliasRepairMs || 0).toFixed(1)} ms${lastPerf.aliasRepair?.skipped ? ' (already v2)' : ` (${Number(lastPerf.aliasRepair?.assistantScanned || 0)} assistant, ${Number(lastPerf.aliasRepair?.aliasSections || 0)} alias)`}</td></tr>
<tr><td>Edit reconcile</td><td>${lastPerf.editReconcileMs.toFixed(1)} ms${lastPerf.editDetail?.path ? ` (${escapeHtml(lastPerf.editDetail.path)})` : ''}</td></tr>
${lastPerf.editDetail ? `<tr><td>&nbsp;&nbsp;Fingerprint</td><td>${Number(lastPerf.editDetail.fingerprintMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Host compatibility</td><td>${Number(lastPerf.editDetail.compatibilityMs || 0).toFixed(1)} ms${lastPerf.editDetail.compatibilitySource ? ` (${escapeHtml(lastPerf.editDetail.compatibilitySource)})` : ''}</td></tr>
<tr><td>&nbsp;&nbsp;Saved out load</td><td>${Number(lastPerf.editDetail.savedOutLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Send snapshot load</td><td>${Number(lastPerf.editDetail.sendLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Envelope prepare</td><td>${Number(lastPerf.editDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Finalize</td><td>${Number(lastPerf.editDetail.finalizeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Legacy clock repair</td><td>${Number(lastPerf.editDetail.clockRepairMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;State sync</td><td>${Number(lastPerf.editDetail.stateSyncMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit out serialize</td><td>${Number(lastPerf.editDetail.outSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit out storage set</td><td>${Number(lastPerf.editDetail.outSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Edit snapshot prune</td><td>${Number(lastPerf.editDetail.outPruneMs || 0).toFixed(1)} ms${lastPerf.editDetail.didSave ? '' : ' (no save)'}</td></tr>` : ''}
<tr><td>Snapshot/onSend</td><td>${lastPerf.onSendMs.toFixed(1)} ms</td></tr>
${lastPerf.snapshotDetail ? `<tr><td>&nbsp;&nbsp;Pre restore/load</td><td>${Number(lastPerf.snapshotDetail.preLoadMs || 0).toFixed(1)} ms${lastPerf.snapshotDetail.mustRestorePre ? ` (${lastPerf.snapshotDetail.existingPre ? `restored:${escapeHtml(lastPerf.snapshotDetail.restoreReason || 'restore')}` : `miss:${escapeHtml(lastPerf.snapshotDetail.restoreReason || 'restore')}`})` : ' (forward skip)'}</td></tr>
<tr><td>&nbsp;&nbsp;Template bootstrap</td><td>${Number(lastPerf.snapshotDetail.templateBootstrapMs || 0).toFixed(1)} ms${lastPerf.snapshotDetail.templateBootstrap ? ` (${Number(lastPerf.snapshotDetail.templateBootstrap.userMessages || 0)} user, ${Number(lastPerf.snapshotDetail.templateBootstrap.communityInputs || 0)} community, ${Number(lastPerf.snapshotDetail.templateBootstrap.registrySize || 0)} retained)` : ' (skip)'}</td></tr>
<tr><td>&nbsp;&nbsp;Lifecycle prepare</td><td>${Number(lastPerf.snapshotDetail.lifecycleMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Turn serialize</td><td>${Number(lastPerf.snapshotDetail.turnSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Turn storage set</td><td>${Number(lastPerf.snapshotDetail.turnSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Runtime render</td><td>${Number(lastPerf.snapshotDetail.runtimeRenderMs || 0).toFixed(1)} ms</td></tr>` : ''}
</table></div></details>` : ''}
${lastOutputPerf ? `<details class="card"><summary>output performance · ${lastOutputPerf.totalMs.toFixed(1)} ms</summary><div class="detail-body"><table>
<tr><td>Total</td><td>${lastOutputPerf.totalMs.toFixed(1)} ms</td></tr>
<tr><td>Indices</td><td>${lastOutputPerf.indicesMs.toFixed(1)} ms</td></tr>
<tr><td>Chat load</td><td>${lastOutputPerf.chatLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session load</td><td>${lastOutputPerf.sessionLoadMs.toFixed(1)} ms</td></tr>
<tr><td>Session/processOutput</td><td>${lastOutputPerf.sessionProcessMs.toFixed(1)} ms</td></tr>
${lastOutputPerf.outputDetail ? `<tr><td>&nbsp;&nbsp;State/send load</td><td>${Number(lastOutputPerf.outputDetail.stateLoadMs || 0).toFixed(1)} ms${lastOutputPerf.outputDetail.stateLoadSource ? ` (${escapeHtml(lastOutputPerf.outputDetail.stateLoadSource)})` : ''}</td></tr>
<tr><td>&nbsp;&nbsp;Recovery/prepare</td><td>${Number(lastOutputPerf.outputDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Structure validate</td><td>${Number(lastOutputPerf.outputDetail.validateMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Finalize + fingerprint</td><td>${Number(lastOutputPerf.outputDetail.finalizeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Out serialize</td><td>${Number(lastOutputPerf.outputDetail.outSerializeMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Out storage set</td><td>${Number(lastOutputPerf.outputDetail.outSetMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Snapshot prune / keys</td><td>${Number(lastOutputPerf.outputDetail.outPruneMs || 0).toFixed(1)} ms (${lastOutputPerf.outputDetail.pruneDeferred ? 'deferred scheduled' : 'skipped hot path'})</td></tr>
<tr><td>&nbsp;&nbsp;Output size</td><td>${Number(lastOutputPerf.outputDetail.inputChars || 0).toLocaleString('en-US')} → ${Number(lastOutputPerf.outputDetail.outputChars || 0).toLocaleString('en-US')} chars</td></tr>` : ''}
<tr><td>State mirror</td><td>${lastOutputPerf.mirrorMs.toFixed(1)} ms</td></tr>
${lastOutputPerf.mirrorDetail ? `<tr><td>&nbsp;&nbsp;Mirror chat load</td><td>${Number(lastOutputPerf.mirrorDetail.chatLoadMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;Mirror prepare</td><td>${Number(lastOutputPerf.mirrorDetail.prepareMs || 0).toFixed(1)} ms</td></tr>
<tr><td>&nbsp;&nbsp;setChatToIndex</td><td>${Number(lastOutputPerf.mirrorDetail.setChatMs || 0).toFixed(1)} ms</td></tr>` : ''}
<tr><td>Post diagnostics</td><td>${lastOutputPerf.diagnosticsMs.toFixed(1)} ms</td></tr>
</table></div></details>` : ''}
${storageDiag ? `<details class="card"><summary>Storage diagnostics · ${escapeHtml(storageDiag.op || 'unknown')} · ${Number(storageDiag.ms || 0).toFixed(1)} ms · ${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')} keys</summary><div class="detail-body"><table>
<tr><td>Operation</td><td>${escapeHtml(storageDiag.op || 'unknown')}</td></tr>
<tr><td>Key scan</td><td>${Number(storageDiag.ms || 0).toFixed(1)} ms</td></tr>
<tr><td>Total plugin-storage keys</td><td>${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')}</td></tr>
<tr><td>Current-chat SimCore keys</td><td>${storageDiag.currentChatKeys == null ? 'n/a' : Number(storageDiag.currentChatKeys || 0).toLocaleString('en-US')}</td></tr>
<tr><td>Operation-matching keys</td><td>${storageDiag.matchingKeys == null ? 'n/a' : Number(storageDiag.matchingKeys || 0).toLocaleString('en-US')}</td></tr>
</table><div class="muted" style="margin-top:8px">No extra keys() call is made for this panel; values come only from an existing cold/deferred scan.</div></div></details>` : `<details class="card"><summary>Storage diagnostics · no scan yet</summary><div class="detail-body muted">No scan observed in this live session yet (fast path only).</div></details>`}
${aliasDiag ? `<div class="card"><div class="k" style="margin-bottom:8px">Community alias backfill (this live session)</div><table>
<tr><td>Assistant outputs scanned</td><td>${Number(aliasDiag.assistantScanned || 0)}</td></tr>
<tr><td>Alias sections found</td><td>${Number(aliasDiag.aliasSections || 0)}</td></tr>
<tr><td>Changed families</td><td>${escapeHtml((aliasDiag.changedFamilies || []).join(', ') || 'none')}</td></tr>
</table></div>` : ''}
<details class="card"><summary>Platform-family reaction_max · ${maxima.length} families</summary><div class="detail-body"><table><tr><th>Platform</th><th>Max</th></tr>${rows}</table></div></details>
<details class="card"><summary>Diagnostic Tools</summary><div class="detail-body muted">Frame continuity + recurrence-history match run only for manual diagnostic copy; Evidence Fence status reports request-only source-boundary behavior.</div></details>
</div>`;
      const advancedGrid = document.getElementById('advanced-grid');
      const advancedCount = document.getElementById('advanced-count');
      if (advancedGrid) {
        const metrics = Array.from(advancedGrid.querySelectorAll('.metric'));
        let standby = 0;
        for (const metric of metrics) {
          const value = String(metric.querySelector('.v')?.textContent || '').trim();
          const isStandby = value === 'n/a' || value === '—' || value === 'OFF' || value === 'NO REQUEST DATA' || value.startsWith('STANDBY');
          if (isStandby) { metric.classList.add('dim'); standby += 1; }
        }
        if (advancedCount) advancedCount.textContent = `· ${metrics.length - standby} active · ${standby} standby`;
      }
      const releaseCardButton = document.getElementById('toggle-release-card');
      const releaseCardSection = document.getElementById('operator-release-card');
      if (releaseCardButton && releaseCardSection) releaseCardButton.onclick = () => {
        releaseCardSection.style.display = releaseCardSection.style.display === 'none' ? 'block' : 'none';
      };
      const copyTurnDiagButton = document.getElementById('copy-turn-diag');
      if (copyTurnDiagButton) copyTurnDiagButton.onclick = async () => {
        const oldText = copyTurnDiagButton.textContent;
        copyTurnDiagButton.textContent = diagnosticCopyButtonText(await copyLastTurnDiagnostic(chat, s));
        setTimeout(() => { copyTurnDiagButton.textContent = oldText; }, 1200);
      };
      document.getElementById('close').onclick = () => Risuai.hideContainer();
      await Risuai.showContainer('fullscreen');
    } catch (e) {
      console.log(SIMCORE_LOG_PREFIX + ' panel error:', e.message);
    }
  }

  try {
    const buttonPart = await Risuai.registerButton({ name: 'SimCore', icon: '⚙️', iconType: 'html', location: 'chat' }, openPanel);
    if (buttonPart?.id) simcoreUiParts.push(buttonPart);
    const settingPart = await Risuai.registerSetting('SimCore', openPanel, '⚙️', 'html');
    if (settingPart?.id) simcoreUiParts.push(settingPart);
  } catch (e) {
    console.log(SIMCORE_LOG_PREFIX + ' UI registration failed:', e.message);
  }

  await Risuai.onUnload(async () => {
    runtimeDisposed = true;
    runtimeEpoch += 1;
    await checkpointRuntimeTelemetry('UNLOAD');
    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);
    for (const part of simcoreUiParts.splice(0)) {
      if (!part?.id) continue;
      try { await Risuai.unregisterUIPart(part.id); } catch (_) {}
    }
    coreSession = null;
    coreKey = null;
    coreLocationKey = null;
    lastRuntimePromptCacheProbe = null;
    lastRequestTopologyProbe = null;
    lastHistoryStabilizationProbe = null;
    lastCacheTrajectoryProbe = null;
    lastCacheCandidateCostMs = null;
    runtimePromptCache.reset();
    requestTopology.reset();
    cacheCandidates.reset();
    lastEvidenceMappingProbe = null;
    lastEvidenceFenceProbe = null;
    lastDiagnosticRequestProbe = null;
    lastDiagnosticCopyProbe = null;
    representationRegistry.clear();
    runtimeMirror.clear();
  });
  console.log(SIMCORE_LOG_PREFIX + ' initialized');
})();
