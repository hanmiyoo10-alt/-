# Local Usage Dashboard — Module Splitting Principle

Status: **ACTIVE OPERATING PRINCIPLE**

Recorded: `2026-08-24`

Scope: `plugins/usage-dashboard/`

## Principle

When a module grows large enough that it carries multiple responsibilities, becomes difficult to review safely, or approaches the existing module-size guard, prefer extracting an independent module or splitting it along real responsibility boundaries instead of allowing one file to keep growing indefinitely.

The goal is maintainability and safer releases, not arbitrary fragmentation.

## Preferred decisions

- If a coherent responsibility can stand on its own, extract it into an independent module.
- If one module contains several tightly related but separable responsibilities, split it into smaller ordered parts.
- Preserve existing behavior and public/internal contracts while splitting.
- Update the authoritative module registries (`src/parts.cjs` and Engine `parts.json`) rather than hard-coding version-specific module counts in tests.
- Add or update regression coverage so the split proves source/build parity and no orphan or missing modules.
- Keep generated artifacts generated; do not hand-edit `latest.js` or built Engine output as a substitute for source modularization.
- Prefer a small, explainable refactor before the module becomes a release-risk bottleneck.

## What not to do

Do not split a module merely to reduce line count when the resulting pieces have no meaningful ownership boundary. Avoid tiny modules that only add indirection without isolating a responsibility, test surface, or lifecycle.

## Release interaction

Module splitting is maintenance unless it changes runtime behavior. If behavior is unchanged, Product/Engine/Manager versions should not be bumped solely because source files were reorganized. The normal reconciliation, source-parity, regression, PR, and exact-byte release rules still apply.

This principle complements the E5 release simplification work: smaller responsibility-focused modules should make candidate review, behavior attribution, and future automated staging faster and less error-prone.
