# Usage Dashboard E8-F Stage Trigger Repair

Status: **SECOND REPAIR IN VALIDATION — live evidence tracked by Issue #312 / #340**

Recorded during the 5.75 release attempt.

## Triggering failure 1 — connected slash command denied

The connected GitHub control surface rejected creation of the exact `/usage-dashboard stage ...` control comment before GitHub received the `issue_comment` event. No candidate or production ref was mutated.

PR #341 retained the existing owner-only Issue #197 slash-command path and added an exact owner-authored stage-request issue form:

```text
[usage-dashboard-stage] release/usage-dashboard-<safe-name>
```

## Triggering failure 2 — issue-open delivery did not converge

After #341 merged, connected owner request #342 was created with the exact allowed title and owner authorship. No 5.75 `UD_STAGE_ACCEPTED`, `UD_STAGE_REJECTED`, or `UD_CANDIDATE_READY` receipt appeared on #197 and no 5.75 candidate ref appeared.

Therefore `issues.opened` delivery alone is retained as non-authoritative convenience activation, not sufficient operational closure evidence.

## Self-healing request consumer

The bounded repair keeps the issue as request metadata but adds a trusted-main consumer:

- `Usage Dashboard Stage Request Self-Heal` checks only open `plugin:usage-dashboard` issues authored by the repository owner;
- it accepts only titles that pass the existing exact stage-request parser;
- it selects the oldest matching request deterministically;
- it validates the parsed `release/usage-dashboard-*` source branch with existing candidate policy;
- it dispatches `Usage Dashboard E7 Candidate-Ready Stage` on exact `main` using `workflow_dispatch` and only the parsed source branch;
- a successful dispatch consumes/closes the request issue so scheduled fallback cannot replay it indefinitely;
- trusted-main push activates the consumer after this repair lands, and a bounded five-minute schedule provides self-healing for later connected requests.

The stage workflow gains `workflow_dispatch(source_branch)` only as an additional trusted entrypoint. It re-parses the branch through the same `/usage-dashboard stage ...` grammar before any source inspection or candidate work.

## Safety contract

- The original owner-only #197 slash-command path remains supported.
- The direct owner `issues.opened` path remains supported but is not relied upon for convergence.
- The self-healer checks out and dispatches `main`; it never executes request/source branch code.
- The self-healer has metadata + Actions dispatch authority only and contains no `git push`.
- Materialization remains read-only.
- Candidate mutation remains owned only by the existing trusted stage writer.
- Candidate writes remain digest/path/parent checked, CAS guarded, fast-forward-only and postverified.
- Production mutation remains owned only by the existing promoter.
- A stage-request issue carries request metadata only; it never contains or writes candidate/generated artifacts.
- These repairs do not change Local Usage Dashboard product/runtime bytes.

Both failures and repairs are retained E8-F operational evidence. E8 generation feedback is performed only after the real 5.75 release proof is complete.
