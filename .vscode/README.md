# Repository VS Code workspace shell

This directory is a convenience adapter for repository development work. It is not a source of PASS/READY state, release identity, production truth, or runtime authority.

## Current shell

The first shared task is:

- `Repo: Plugin Control Plane Contracts`

It delegates to the same existing Plugin Control Plane receipt runner and manifest used by repository CI. The task does not reimplement validation logic inside VS Code.

Run it from `Tasks: Run Task` in the Command Palette when a human editor entrypoint is useful.

## Authority boundary

- Git, protected `Required`, CI, release, security, production, and project-owned authorities remain unchanged.
- Workspace files must not hard-code mutable current SHAs, versions, release identities, or operational status.
- A VS Code task may wrap an existing repository/project command, but it must not invent a parallel success or readiness contract.
- Automated agents should invoke the same underlying repository command directly when their connected tool surface can do so safely. The VS Code task is a human convenience entrypoint, not a required intermediary.

## Scope boundary

This first shell intentionally contains no product-specific tasks and no `settings.json`.

Product/plugin task groups require their owning project guidelines and exact existing command surfaces to be read first, then should be added through separately bounded work so groups such as `SimCore: ...` or `Usage Dashboard: ...` remain owned by the correct project authority.
