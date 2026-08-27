# Feature-ID: GENERATION-TARGET-CONTEXT

Status: DESIGN_NEEDED

## Classification
- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: MEDIUM
- Size: M
- Evidence: HIGH
- Risk: MEDIUM
- Dependencies: PocketRisu generation/request/tool/parser/error ownership audit
- Priority: P1
- Lifecycle: DESIGN_NEEDED

## Problem / evidence
HaejeokRisuai's multitasking work exposed a repeated race class: asynchronous generation work can outlive the UI selection that started it. A sequence of fixes pins request parsing, CBS/lorebook/template evaluation, Hypa memory, auto suggestions, image prompts, MCP/tool calls, trigger LLM effects, and early error persistence to the original generation target instead of consulting the currently selected chat later. Representative evidence includes `fc7228af26ce5f89bbb1d9630b80025407d544da` and `9d319d984385125a0299c1a3f4c787f30b80c855`, plus the surrounding 2026-08-27 target-context series.

PocketRisu already has per-real-chat generation state (`src/ts/process/generationState.ts`), which is a useful prerequisite, but that alone does not prove every delayed consumer uses an immutable generation target.

## Minimal safe scope
First slice is inspection/tests only: define a small immutable generation-target context (real chat id plus only the character/chat identity needed by pure consumers), trace it through one representative nested async path, and add a regression test that switches the visible chat before completion.

Do not introduce multi-chat tabs, native notifications, server lifecycle sync, storage migration, or provider rewrites in the first slice.

## Ownership boundaries
- UI selection owns only the currently visible chat.
- A generation owns its target identity from start until terminal completion.
- Parser/CBS/lorebook/template/memory/tool/error consumers receive target context explicitly when their result can mutate or derive chat-specific state.
- Global/current selection may be used only for truly UI-local behavior, not delayed generation effects.

## Mechanism
1. Capture real chat identity at generation start.
2. Carry target context through request arguments or a narrow typed context object.
3. Resolve chat-specific reads/writes from that context at the delayed boundary.
4. Reject/avoid fallback to current selection when an explicit target exists.
5. Keep compatibility fallback only for legacy paths that cannot yet provide a target, and measure/remove those incrementally.

## Compatibility / invariants
- Existing single-chat behavior remains unchanged.
- Per-chat generation guard in `generationState.ts` remains authoritative; no new persistent state.
- No forced DB flush on visibilitychange/pagehide.
- `flushServerDbKeepalive()` remains no-op.
- Targeted V3 plugin reload is untouched.
- runit remains; no PM2.
- No Android notification behavior is added.
- Tool execution must not be redirected to a newly selected chat while an older generation is in flight.

## Validation / acceptance
- Start generation in chat A, switch visible selection to chat B before a delayed callback completes, and prove the callback reads/writes only chat A.
- Cover at least one early-error path and one nested async consumer (tool/parser/memory) before implementation is considered ready.
- Rapid A→B→A switching must not make stale completion authoritative for B.
- Cancellation/terminal cleanup must release only the matching generation target.
- Existing `generationState` tests remain green.

## Risk / blast radius
MEDIUM: incorrect propagation can misroute messages, tool context, memory, or errors across chats. Keep the first implementation slice narrow and typed; do not globally replace selection APIs in one PR.

## Rollback / fallback
The context plumbing is additive. Revert the isolated feature branch/PR to restore current behavior. No persisted schema or migration is involved.

## Dependencies / PR decomposition
1. INSPECT_ONLY ownership map and race reproduction.
2. Typed target context + regression test for one bounded path.
3. Expand to other delayed consumers only as separate focused PRs after tests prove the pattern.
4. Multi-chat UI or cross-client lifecycle synchronization, if ever desired, stays separate.

Do not move to READY_TO_PORT until the first PocketRisu race is reproduced or an equivalent vulnerable call path is proven, and the exact first consumer boundary is identified.