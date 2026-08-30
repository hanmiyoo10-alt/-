# RUNTIME-DEPENDENCY-CLOSURE-DRIFT-GUARD

## Status

`ADOPTED` in official PocketRisu via `PocketRisu/PocketRisu@01681eeb5995156b065b65c6c02741ced4a3553d`.

## Problem / evidence

Portable and Docker artifacts ship a prebuilt frontend, but a conventional production install can still copy the application's entire production dependency set into the runtime image. The source change reports approximately 1 GB of `node_modules` before trimming versus approximately 39 MB for the actual server runtime closure. Shipping unnecessary frontend-heavy packages increases download size, install time, disk footprint, and the number of runtime packages that must be maintained.

The dangerous version of trimming is a hand-maintained allowlist: it can become stale and release an artifact that builds successfully but crashes when a newly added runtime dependency is first exercised.

## Minimal safe invariant

1. Treat executable Node entry points—not the root production dependency list—as the authority for a prebuilt server artifact's runtime package closure.
2. Derive the direct external package set from statically analyzable import/require edges.
3. Fail closed on dependency edges the generator cannot safely resolve, including unsupported dynamic/non-literal specifiers.
4. Pin the generated dependency set through the canonical lockfile and retain a frozen transitive lock for release installs.
5. Commit or otherwise canonically materialize the generated runtime manifest so CI can regenerate and compare it for drift.
6. Smoke-boot the fully assembled trimmed artifact and verify a real server response before packaging it.

## Ownership boundaries

- Application/server source owns the actual runtime import graph.
- The dependency-closure generator owns mapping that graph to external package names.
- The canonical lockfile owns versions and transitive resolution.
- Release/Docker workflows own regeneration, drift rejection, frozen installation, assembly, and smoke proof.
- The runtime package manifest is derived metadata; it must not silently become an independent hand-edited authority.

## Compatibility / guardrails

This invariant must not alter application save semantics, `flushServerDbKeepalive()`, targeted V3 plugin reload, runit, server-phone notification behavior, or host/device packages. Platform/native dependencies and updater-only entry points must be included by the same explicit dependency authority rules.

## Validation / acceptance

- Generator rejects unsupported dynamic dependency edges instead of omitting them.
- Regenerated direct dependency manifest matches the canonical committed/generated record.
- Production dependencies install from the derived frozen lock without falling back to the root application dependency graph.
- The assembled portable/runtime server boots and serves an HTTP request.
- Release-platform matrix catches platform-specific/native dependency omissions.
- Smoke-test artifacts are removed before packaging.

## Risk / blast radius

`MEDIUM`. A false-negative dependency scan can produce a release-only runtime crash. Damage is contained to build/release artifacts if CI remains fail closed and official/source installs continue to use their normal dependency graph.

## Rollback / fallback

Revert release packaging to the full known-good production dependency install while retaining the generator failure evidence. Do not paper over a missing dependency by adding undocumented ad-hoc copies; either fix the graph derivation or explicitly model the exceptional edge.

## Dependencies / PR decomposition

The official invariant is already adopted. A backport to an older personal fork should be decomposed as:

1. audit current server/updater entry points and release/Docker ownership;
2. add dependency-graph derivation plus fail-closed tests;
3. add canonical generated manifest/lock and CI drift comparison;
4. switch one release target to the trimmed install plus assembled-runtime smoke test;
5. expand to the remaining release targets only after the first slice is proven.

Because this spans release, Docker, dependency-generation, and smoke-test ownership, it remains an `M`-sized knowledge invariant rather than an autonomous implementation candidate for the lagging personal fork.
