# Usage Dashboard E8-F Stage Trigger Repair

Status: **IMPLEMENTED IN SOURCE — CI/merge proof pending**

Recorded during the 5.75 release attempt.

## Triggering failure observed during 5.75

The connected GitHub control surface rejected creation of the exact `/usage-dashboard stage ...` control comment before GitHub received the `issue_comment` event. No candidate or production ref was mutated.

The existing owner-only Issue #197 slash-command path remains supported. This repair adds an equivalent trusted-main owner-issue request path so the connected assistant can initiate staging without asking the user to perform repository administration.

## Trusted issue request

Accepted issue title form:

```text
[usage-dashboard-stage] release/usage-dashboard-<safe-name>
```

The request is accepted only when:

- event is `issues.opened`;
- `github.actor == github.repository_owner`;
- issue author equals `github.repository_owner`;
- the title passes the exact release-branch parser;
- the resulting source branch then passes the existing candidate/source policy.

## Safety contract

- The workflow still executes from canonical trusted `main` only.
- Materialization remains read-only.
- Candidate mutation remains owned only by the existing trusted stage writer.
- Candidate writes remain digest/path/parent checked, CAS guarded, fast-forward-only and postverified.
- Production mutation remains owned only by the existing promoter.
- The original #197 slash-command path remains unchanged.
- A connected stage-request issue carries request metadata only; it never contains or writes candidate/generated artifacts.
- This repair does not change Local Usage Dashboard product/runtime bytes.

This failure and repair are retained E8-F operational evidence. E8 generation feedback is performed only after the real 5.75 release proof is complete.