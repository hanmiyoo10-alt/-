# Repository Shared Project Interaction Contract

This contract applies to every project registered through the canonical-main project descriptors. It supplements project-specific development, diagnostic, release, production, and safety guidance; it does not replace or outrank those project authorities.

## Stage-boundary reporting

For work that is likely to span multiple meaningful stages, do not hide the entire process behind one final long report.

At each meaningful stage boundary:

1. finish the bounded stage;
2. surface the stage result before continuing;
3. emphasize what changed, what was newly verified, and any new blocker rather than repeating the full history;
4. keep unchanged background context compact unless it is needed to understand the delta;
5. if the stage exposes a failure or blocker, report that result before beginning the next repair or expansion stage.

Typical meaningful boundaries include repository discovery/design, implementation-ready diff, validation/CI, live proof, merge, and close-sync. Small single-stage tasks may complete normally without artificial checkpoints.

This is a reporting-cadence contract only. It never weakens repo-first inspection, project-specific authority, exact-base/exact-head checks, PR/CI/release gates, fail-closed behavior, protected-surface rules, or repository-first artifact storage.

<!-- repository-shared-stage-boundary-reporting:v1 -->
