# `plugin-impact-scope` pilot evaluation notes

Pilot validation is limited to `plugin:usage-dashboard` / Local Usage Dashboard.

## What Agent Skills CI proves

The repository-wide Agent Skills CI is the mechanical regression gate for this skill. It compiles Python under `.agents/skills/**` and runs discovered skill unit tests.

For this pilot, mechanical tests must prove at least:

- helper execution is read-only;
- bounded roots/seeds stay bounded;
- every mechanical discovery result remains `CANDIDATE_ONLY` / `UNPROVEN`;
- no-match output does not claim absence of dynamic/semantic dependencies;
- non-pilot scopes fail closed;
- serialized impact maps require provenance for non-UNKNOWN edges;
- UNKNOWN/CONFLICT verdicts remain fail-closed;
- mutation-shaped impact-map fields are rejected;
- no current product version or SHA is frozen into the skill.

Mechanical CI does **not** prove output quality, trigger quality, or semantic dependency correctness.

## Output evals

`evals.json` contains realistic Usage Dashboard cases derived from existing work classes:

- Service Tier Fidelity;
- managed Models/Diagnostics identity lineage;
- lifecycle stress/no-version audit impact;
- a narrow-task negative.

A proper output evaluation must use isolated runs and compare:

```text
with plugin-impact-scope
vs
without the skill (or a prior version after iteration)
```

Grade exact assertions plus qualitative usefulness and orchestration cost. Static JSON presence is not a PASS.

## Trigger evals

`trigger_queries.json` contains positive broad-impact prompts and near-miss negatives for authority-only, diagnosis, design, release execution, narrow edits, and SimCore.

Live/model trigger evaluation remains separate evidence. The repository currently has no proven generic isolated Agent Skill model eval runner; do not manufacture trigger/output PASS from mechanical CI or assistant conversation.

## Promotion boundary

Do not add another scope to `PILOT_VALIDATED_SCOPES` until:

1. mechanical Agent Skills CI is green;
2. Usage Dashboard output evals are run and reviewed in isolated context;
3. Usage Dashboard trigger positives and near-miss negatives are run;
4. a second-scope candidate eval is run in isolation;
5. the promotion is explicitly reviewed;
6. no mutable project truth is moved into the skill.

Until then, SimCore remains unvalidated and should remain a negative trigger.
