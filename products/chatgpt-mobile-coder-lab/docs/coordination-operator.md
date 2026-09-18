# MCL coordination operator v1

`mcl-coordination-operator.cjs` is a thin operator adapter over the existing Mobile Coder Lab D-013 lease and D-014 handoff owners.
It removes repetitive input assembly; it does not create routing, overlap, reservation, Git, CI, merge, release, runtime, or production authority.

## Authority boundary

The helper composes current owners in place:

- D-012 / `device-routing.md` selects the semantic route outside this helper.
- canonical-main Work System proves packet/PR scope overlap outside this helper.
- D-013 / #2352 remains the only MCL lease state owner.
- `task-lease.cjs` remains the lifecycle, scope-profile, generation, lease-identity, and conflict owner.
- D-014 / `task-handoff.cjs` remains the manifest/receipt schema and identity owner.
- Git/worktree currentness, CI, main-write, release, and production gates remain external.

The helper never patches #2352 directly and never synthesizes a missing packet lifecycle token.

## Commands

All GitHub-reading lease commands require an explicit `--repo owner/repo` and `--packet #N`.
`inspect` reads the exact current packet body and #2352, hashes the exact body bytes, reports the D-013 lifecycle classification and current generation, and optionally normalizes requested scopes.

### GitHub authentication transport

GitHub authentication is transport only and never grants lease or repository authority.

- When `GH_TOKEN` or `GITHUB_TOKEN` is already present, the operator preserves the existing explicit-token fetch client path.
- When neither environment token is present, the operator may reuse an already authenticated `gh` CLI session through a bounded read-only `gh api` fallback.
- The fallback accepts only the exact issue GETs required by `readContext`: the requested open packet issue and fixed ledger issue #2352 under the explicit validated `owner/repo`.
- The fallback does not expose a generic endpoint, HTTP method, request body, or shell-string interface.
- It never invokes `gh auth token`, login, refresh, or logout, and never reads or writes the credential store.
- Raw `gh` stderr and credential/account/auth-scope material are not emitted in operator receipts.
- If both the explicit-token path and authenticated-`gh` read path are unavailable, the command fails closed.

The existing `--dispatch` effect boundary is unchanged. Dispatch still invokes only the fixed `mcl-task-lease.yml` workflow through bounded `gh` argv and still relies on D-013 generation, packet, lease, workflow, and readback checks.


```text
node products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs inspect \
  --repo owner/repo --packet '#2378' --scopes-json '["path:..."]'
```
`lease-acquire` and `lease-release` are plan-only by default. They re-read #2352 on every invocation and emit the exact normalized workflow inputs without mutation.

```text
... lease-acquire --repo owner/repo --packet '#2378' \
  --route S --executor S --scopes-json '["path:..."]' \
  --scope-disposition DISJOINT --workspace-kind repository \
  --branch server/example --worktree /root/nyang-worktrees/example \
  --observed-base-sha <40-hex>

... lease-release --repo owner/repo --packet '#2378' --lease-id <64-hex>
```

Adding `--dispatch` is the explicit effect boundary. It invokes only `.github/workflows/mcl-task-lease.yml` through `gh` argv with the explicit repository and `main` ref, then observes the resulting run and current ledger.
A failed stale-generation run is surfaced as failure. The helper does not change inputs and retry automatically. More than one newly observed workflow run is `UNKNOWN / DISPATCH_RUN_AMBIGUOUS`.

## D-014 envelopes

`handoff-manifest --input <json-file>` delegates manifest build/verification/rendering to `task-handoff.cjs`.
`handoff-receipt --manifest <manifest-file> --input <result-json-file>` delegates completion receipt build and cross-validation to the same owner.
The manifest file may be either canonical JSON or a rendered D-014 manifest envelope.

These commands only emit envelopes. They do not post comments, choose a latest envelope, mutate a task registry, or replace the owning packet lifecycle.
## Fail-closed behavior

- Exact packet-body SHA-256 is computed from the GitHub-returned body string. Terminal newlines are not stripped or invented.
- Missing or stage-only lifecycle evidence remains `PACKET_LIFECYCLE_UNKNOWN`; see #2356.
- Invalid or duplicate scope grammar blocks before dispatch.
- Acquire uses the current ledger generation and caller-supplied `DISJOINT` overlap evidence; this helper does not compute overlap.
- Release requires the exact packet reference and lease identity against the fresh ledger.
- Dispatch run ambiguity, workflow failure, malformed ledger evidence, and readback mismatch stay explicit rather than becoming success.
- A successful dispatched run is accepted only when its bounded workflow log contains the exact planned lease ID; otherwise run attribution remains `UNKNOWN`.
- Output contains hashes/locators and bounded status only. It does not echo packet bodies, tokens, environment dumps, private device/session identifiers, or shell strings.

## Non-goals

V1 does not select S/M routes, create/delete/sync worktrees, edit source, commit, push, open/merge PRs, repair packet lifecycle, classify issue labels, create a scheduler/dispatcher, or introduce a second ledger/database.

The ordinary safe sequence remains:

```text
current authority + route
→ Work System overlap
→ operator plan / explicit D-013 dispatch
→ Git/worktree currentness
→ authorized mutation + validation
→ operator plan / explicit D-013 release
→ D-014 completion receipt when applicable
```
