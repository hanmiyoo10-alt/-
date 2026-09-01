# Feature-ID: PLUGIN-STORAGE-REFRESH-TOP-UP-ONLY

Status: ADOPTED invariant

## Problem / evidence

PocketRisu v1.11.1 introduced a regression where periodic V2 plugin-storage index refresh re-ran the bulk `/api/plugin-storage/all` preload. On remote deployments this repeatedly downloaded the whole plugin store and could saturate the link for minutes. Official fixes:

- `PocketRisu/PocketRisu@127ca67fd6a11be37cb23a1b7c4598df14404144`
- `PocketRisu/PocketRisu@167def7df98e8272dcb179a4e8b4451e29e32604`

The follow-up also prevents a permanently unparseable stored row from being re-fetched on every refresh.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

## Ownership boundary

The plugin-storage store owns the distinction between:

1. initial bulk hydration,
2. authoritative index refresh,
3. missing-key top-up,
4. local cache/index state,
5. per-key durable writes,
6. temporarily suppressed unparseable keys.

An index refresh may discover new/missing keys, but it must not implicitly replay full-store hydration.

## Invariants

- Initial bulk preload is bounded to initialization/recovery semantics, not periodic refresh.
- After preload, refresh fetches only keys known by the authoritative index but absent from local cache.
- A value that failed parsing is not fetched repeatedly on every refresh while the authoritative index remains unchanged.
- A successful rewrite clears the unparseable suppression immediately.
- If the authoritative index stops listing an unparseable key, suppression is cleared so a future recreated key can be read.
- Cache/index must not claim a server value before server-first durability succeeds.
- Existing per-key write ordering remains authoritative.
- No change may reintroduce forced DB flush on `visibilitychange` / `pagehide`, alter `flushServerDbKeepalive()`, or weaken targeted V3 plugin reload.

## Validation / acceptance

Regression coverage should prove:

- one initial bulk preload;
- multiple subsequent index refreshes do not invoke another whole-store stream;
- a remotely-added key is fetched by bounded top-up;
- a corrupt row is fetched/parsed once, then skipped across repeated refreshes;
- rewriting that key makes it readable again;
- authoritative disappearance/recreation re-enables reads;
- concurrent sync/async writes retain per-key ordering and cache/index correctness.

## Risk / blast radius

The main risk is stale negative caching: a suppression marker that survives repair would hide legitimate data. Scope suppression strictly to parse failures and give explicit repair/removal escape hatches.

## Rollback / fallback

If top-up logic regresses, disable periodic top-up rather than falling back to periodic whole-store streaming. A user-visible/manual refresh is safer than silently saturating the remote link.

## PR decomposition

No implementation PR is required: the invariant is already adopted in official PocketRisu. Future changes touching plugin-storage preload/index refresh should treat this document as an acceptance boundary.