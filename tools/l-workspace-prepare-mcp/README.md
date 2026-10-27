# MCL L Workspace Prepare MCP

Bounded L-local transport for one existing reviewed effect:

```text
mcl-l-repository-owner prepare-workspace
```

It exists because ordinary Remote Desktop tool calls may fail before that
effect reaches the reviewed repository owner. This server does **not** weaken
the owner or add generic shell/Git/worktree authority.

## Model-visible surface

Exactly one mutating tool is registered:

```text
prepare_workspace(packet_number: int, manifest_id: str)
```

The caller cannot choose repository, branch, worktree, path, commit, route,
executor, Git command, remote, shell, holder, lease ID, timeout, force flag,
cleanup selector, PR, merge or arbitrary payload.

## Admission

The server is fixed to:

```text
repository: hanmiyoo10-alt/-
landing:    /home/alsl0/nyang-repo
ledger:     #2352
route:      L
executor:   L
```

Every call reads direct protected `main`, the exact open packet, current ledger
and packet comments through fixed `gh api` endpoints. The packet must be
nonterminal and at `IMPLEMENTATION_PR`.

Exactly one comment must carry the caller's D-014 manifest ID. The Node bridge
then re-parses that manifest using current repository `task-handoff.cjs`,
requires exact packet-body hash, current-main base, L/L repository workspace,
active D-013 evidence via `mcl-workspace-holder.validateEvidence`, and the
existing L repository-owner manifest validator.

The bridge never imports owner code from the possibly stale landing checkout.
It requires the exact current-main commit object to exist in the landing Git
object store, uses fixed read-only git archive plus fixed tar to materialize
only the reviewed owner dependency files into a private temporary directory,
and loads task-handoff, D-013 evidence validation, and the L repository owner
from those exact current-main bytes. Missing current-main objects fail closed
as CURRENT_MAIN_OBJECT_MISSING; the existing reviewed main-object materializer
remains the separate prerequisite owner.

Only after those checks does it invoke:

```text
mcl-l-repository-owner.cjs prepare-workspace ... --apply
```

That owner independently rechecks protected main and branch/worktree state
immediately around the effect. Existing partial-state, stale-main, branch,
remote-ref and worktree conflicts remain fail-closed.

## Result boundary

The MCP returns only bounded status, packet/manifest identity, workspace state,
public commit identity, stable reason codes and all-false authority. It does
not return lease IDs, holder claims, raw owner stdout/stderr, filesystem
contents, credentials or environment/process data.

## OAuth / HTTP

Repository source includes an OAuth-capable HTTP front door but no public
listener is enabled during source implementation. HTTP mode is localhost-only
and requires a complete OAuth configuration.

The front door reuses only the reviewed OAuth broker protocol from the sibling
`repo-admin-mcp` package. It does not mount or expose that server's
private-mirror credential tools.

Runtime installation therefore installs both reviewed packages from the same
merged repository checkout:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e tools/repo-admin-mcp -e tools/l-workspace-prepare-mcp
```

HTTP mode variables are intentionally empty until EXPERIMENT_CLOSE creates and
proves the real endpoint:

```text
L_PREPARE_MCP_TRANSPORT=streamable-http
L_PREPARE_OAUTH_PUBLIC_BASE_URL=<verified https origin>
L_PREPARE_OAUTH_SIGNING_KEY=<runtime secret>
L_PREPARE_GITHUB_OAUTH_CLIENT_ID=<runtime secret>
L_PREPARE_GITHUB_OAUTH_CLIENT_SECRET=<runtime secret>
PORT=8766
```

No endpoint, OAuth secret, Funnel configuration or plugin connection belongs
in repository source.

## Validation

```bash
PYTHONPATH=tools/l-workspace-prepare-mcp   python -m unittest discover -s tools/l-workspace-prepare-mcp/tests -p 'test_*.py' -v
node --test tools/l-workspace-prepare-mcp/tests/test_owner_bridge.cjs
python -m compileall -q tools/l-workspace-prepare-mcp/l_workspace_prepare_mcp
node --check tools/l-workspace-prepare-mcp/l_workspace_prepare_mcp/owner_bridge.cjs
```

Live installation, service creation, Tailscale Funnel, OAuth client/secret
custody and ChatGPT plugin connection are owned only by EXPERIMENT_CLOSE.
