# MCL L prepared repository apply composition v1

This coordinator closes one narrow automation gap for ordinary L repository work.

It starts only after the existing L repository owner has already created the exact create-only feature workspace and remote ref for a current L / L D-013/D-014 transaction.

It does not replace the workspace holder, the L repository owner, D-013, D-014, Git, pull-request, merge, release, runtime, or production authorities.

## Fixed flow

current open packet + exact posted D-014 + active exact L/L D-013
+ existing L workspace state PREPARED
+ bounded L-owner request / patch / non-closing PR request
→ canonical non-closing PR authoring preflight
→ existing workspace-holder lifecycle
→ existing L repository-owner apply
→ existing D-013 release owner
→ fresh packet / #2352 released-state readback
→ existing workspace-holder release
→ D-014 COMPLETE publication
→ bounded result

The holder capability is process-local. It is not a CLI field, request field, output field, Git artifact, issue/PR payload, D-014 field, or reusable file.

## Public operation

node mcl-l-repository-apply-composition.cjs apply --packet '#N' --manifest <manifest> --request <request.json> --patch <patch.diff> --pr-request <pr.json> --apply

The caller cannot select repository, route, executor, branch, worktree, holder identity, environment map, Git command, executable, PR number, merge strategy, retry count, cleanup action, runtime target, release target, or production target.

## Admission

Before holder or source effect, the coordinator requires current open packet state, exact manifest comment identity, exact L/L active coordination evidence, PREPARED workspace state, exact request/path binding, absent holder state, and canonical non-closing PR preflight PASS.

## Source effect boundary

All source mutation remains inside the existing device-ops/l-repository-owner apply operation. The composition adds no second Git writer.

## Coordination convergence

After exact L-owner PASS, the coordinator uses the existing D-013 release owner, re-reads packet and #2352, validates released state, releases the holder through the existing holder owner, and only then publishes D-014 COMPLETE.

## Failure semantics

Failure never becomes cleanup authority. L-owner non-PASS preserves lease and holder. D-013 release failure preserves holder and publishes no COMPLETE. Holder-release failure publishes no COMPLETE. No reset, rebase, stash, clean, force push, reapply, latest-wins, elapsed-time takeover, or automatic retry rule is added.

## Output

Successful output contains only bounded packet, manifest, commit, PR, completion, release-evidence and next-action identifiers. All authority flags remain false.

## Validation

Focused coordinator tests plus existing workspace-holder, L repository-owner, D-013 and D-014 contracts, source syntax, and git diff --check must pass.

Refs #3524 #3525 #3491 #3481 #3473 #2352.
