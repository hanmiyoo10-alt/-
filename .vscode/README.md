# Repository VS Code workspace shell

This directory is a convenience adapter for repository development work. It is not a source of PASS/READY state, release identity, production truth, or runtime authority.

## Current shell

The shared repository tasks are:

- `Repo: Plugin Control Plane Contracts`
- `Repo: Agent Skill Security Contract Tests`
- `Repo: Agent Execution Compactness Contract Tests`
- `Repo: Repository Read MCP Unit Tests`
- `Repo: Repository Patch Write Contract Tests`

`Repo: Plugin Control Plane Contracts` delegates to the same existing Plugin Control Plane receipt runner and manifest used by repository CI. The task does not reimplement validation logic inside VS Code.

`Repo: Agent Skill Security Contract Tests` delegates directly to the stdlib-only unittest command owned by `tools/agent-skill-security/README.md`. It validates the advisory benchmark harness contract only. A PASS is not a security certification and does not replace Agent Skills CI, Required, or any security/release authority.

`Repo: Agent Execution Compactness Contract Tests` delegates directly to the unittest command owned by `.agents/skills/agent-execution-compactness/SKILL.md`. Its PASS is non-authoritative local-development evidence only and does not satisfy Required, Agent Skills CI, release/promotion, postmerge convergence, production, or any owner-required fresh proof. VS Code does not implement or persist same-state reuse; that remains owned by the skill contract.

`Repo: Repository Read MCP Unit Tests` delegates directly to the unit-test command owned by `.github/workflows/repository-read-mcp-ci.yml`. It is local unit-test evidence only. Repository Read MCP remains read-only, and a PASS does not replace Repository Read MCP CI, protected `Required`, canonical-main currentness/status reads, release, or production authority. The task does not install dependencies; local install/import prerequisites remain owned by `tools/repo-ci-mcp/README.md`.

`Repo: Repository Patch Write Contract Tests` delegates directly to the offline unittest command owned by `tools/repo-write/README.md` and used by `.github/workflows/repo-patch-write.yml`. A PASS is local contract evidence only: it neither authorizes nor proves that a repository write occurred. Real Repository Patch Write mutations remain governed by the existing exact-head, queue, and direct-CLI safety contract. The task does not replace Repository Patch Write workflow validation, protected `Required`, current-main checks, release, or production authority, and it does not install local Python or Git prerequisites.

Run any task from `Tasks: Run Task` in the Command Palette when a human editor entrypoint is useful.

## Authority boundary

- Git, protected `Required`, CI, release, security, production, and project-owned authorities remain unchanged.
- Workspace files must not hard-code mutable current SHAs, versions, release identities, or operational status.
- A VS Code task may wrap an existing repository/project command, but it must not invent a parallel success or readiness contract.
- Automated agents should invoke the same underlying repository command directly when their connected tool surface can do so safely. The VS Code task is a human convenience entrypoint, not a required intermediary.

## Scope boundary

This shared shell intentionally contains no product-specific tasks and no `settings.json`.

Product/plugin task groups require their owning project guidelines and exact existing command surfaces to be read first, then should be added through separately bounded work so groups such as `SimCore: ...` or `Usage Dashboard: ...` remain owned by the correct project authority.
