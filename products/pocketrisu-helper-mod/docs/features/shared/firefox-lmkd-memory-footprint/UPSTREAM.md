# Upstream PR dossier — firefox-lmkd-memory-footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `LOCAL_CANDIDATE_BUILT / LIVE_VERIFY_PENDING`

## Problem / motivation
On Android memory pressure, LMKD can reclaim PocketRisu's large Firefox Gecko content process while Firefox main survives. Firefox later restores the tab as a new non-BFCache `back_forward` document.

## Minimal upstream scope
Release a large hydrated active chat from the reactive runtime after the page has remained hidden for 5 seconds and all tracked saves have succeeded. Rehydrate the existing placeholder on foreground return.

No preset lazy-loading in this scope.

## Dependencies
- existing chat stub/placeholder conversion
- existing `/api/chat-content` hydration
- existing dirty-tracking hydration suppression
- existing `flushSaves()`
- existing `doingChat` generation state

## Explicitly out of scope
- sound keep-alive fix
- same-process navigation root cause
- inactive bot-preset lazy loading
- server DB format changes
- forced reload
- server Android notifications

## Verification evidence
Root cause:
- LMKD explicitly reclaimed the PocketRisu-correlated Firefox tab for `low watermark is breached or filecache is low`.
- reclaimed tab had roughly 508 MB RSS + 397 MB swap.
- restored PocketRisu-correlated tab reaches roughly 600–700 MB RSS.

Candidate:
- isolated commit `9f6bad3f34eceb2d708cb70ba19fb1a31b0ca330`.
- 3 tracked files only.
- chat lifecycle helper uses existing stub/placeholder shapes and one-tick dirty suppression.
- hidden caller requires 5s delay, no generation, successful `flushSaves()`, and same slot/id before applying.
- foreground caller uses existing hydration path.
- targeted tests 23/23 PASS.
- svelte-check 0 errors / 4 pre-existing warnings.
- isolated and final-composition production builds PASS.

Local composite deployment:
- deploy HEAD `c702a1c0424faef245337c7dc08cda554f044862`.
- server health ready.
- live browser activation and memory A/B still pending.

## Upstream pitch
A server-backed lazy chat should not remain fully hydrated in a backgrounded mobile tab when the OS is actively reclaiming cached processes. Safely dehydrate only after durable save, and restore through the existing hydration contract on return.

## Review / PR state
- implementation isolated and statically verified.
- next action: real-device dehydrate/rehydrate memory A/B and persistence smoke before preparing an upstream PR.
