# Repository Agent and Review Guide

This file is a navigation and review guide only. It does not own repository, project, release, runtime, deployment, CI, merge, or production truth.

## Start here

Before making repository or project claims:

1. Read `docs/REPOSITORY_COMMON_RULES.md` first.
2. Resolve the affected scope through `docs/REPO_PROJECT_CATALOG.md`.
3. Read the owning project guideline and follow the authority chain it names.
4. For canonical-main execution or coordination work, also read:
   - `.github/plugin-control-plane/canonical-main/work-system/README.md`;
   - `.github/plugin-control-plane/canonical-main/shared-interaction-contract.md`;
   - the active work packet and every authority input it names.
5. Use `.agents/skills/**` only when the current task or owning contract makes a skill applicable.

Conversation history, summaries, status views, generated documentation, assistant output, and this file are context only when an owning authority exists.

## Review priorities

Prefer high-signal, actionable findings over style noise. Prioritize:

1. authority or gate bypass, including CI, protected-main, release, security, and production boundaries;
2. evidence or uncertainty collapse, especially `UNKNOWN` or `CONFLICT` being treated as success by omission or inference;
3. broken cross-boundary wiring, such as producer ↔ consumer, schema ↔ persistence, writer ↔ reader, UI action ↔ handler, manifest ↔ runtime owner, source ↔ generated artifact, or release tuple ↔ promoted artifact;
4. missing or weakened regression/validation coverage for a changed durable contract;
5. security or privacy boundary widening, secret-sensitive material, unsafe input/effect surfaces, or broader privilege than the change requires;
6. stale/currentness, concurrency, supersession, or late-effect bugs where an older operation can overwrite newer authoritative state;
7. unrelated scope growth, opportunistic rewrites, or behavior changes outside the stated primary goal;
8. regressions that break a previously verified neighboring baseline.

## Review discipline

- Support findings with the changed code and the current owning contract or source evidence.
- Treat `PASS`, `READY`, `MATCH`, and similar labels as scoped claims only.
- Do not infer that an omitted field, missing edge, empty result, or incomplete projection proves absence unless the owning contract says the view is complete.
- Preserve project-specific specialization. Repository defaults do not silently override a project's owning guideline.
- Generated artifacts remain derived unless the owning project explicitly defines otherwise; prefer checking canonical source → build/materializer → artifact consistency.
- Do not recommend weakening, skipping, or bypassing existing validation or authority merely to make a change pass.
- Do not report purely stylistic preferences unless they create a concrete correctness, safety, maintenance, or contract risk.
- When current evidence cannot resolve a material disagreement, report `UNKNOWN` or `CONFLICT` rather than choosing the convenient interpretation.
- Review findings are advisory evidence. They do not grant merge, release, runtime, security, or production authority.

## Scope

More specific instructions in an owning project guideline, project-local `AGENTS.md`, or other authoritative contract may specialize this guide within their valid scope, but they must not silently weaken repository hard invariants.
