# Pilot evaluation notes

`plugin-authority-scan` remains validated only for `plugin:usage-dashboard`.

The implementation now supports **independent-locator / authority-plan mechanics**, but that is not the same as second-scope validation or repository-wide promotion.

## Mechanical regression

Run from the repository root:

```bash
python3 -m unittest discover \
  -s .agents/skills/plugin-authority-scan/tests \
  -p 'test_*.py' -v
```

The tests cover:

- exact/name/path scope resolution;
- read-only behavior;
- unknown and ambiguous scope rejection;
- registry/catalog conflict visibility;
- missing owning-guideline visibility;
- machine-readable CLI errors;
- absence of frozen product versions or SHA constants;
- basic Agent Skills frontmatter/name/description constraints;
- independent locator semantics for a split authority topology;
- no implicit release-branch + manifest join;
- current-checkout existence not being treated as ref ownership;
- authority-plan provenance requirements;
- fail-closed unresolved-plan behavior;
- rejection of mutation-shaped authority plans.

## Output evals

`evals/evals.json` contains realistic Local Usage Dashboard tasks. When a host supports isolated skill runs, compare each prompt:

1. with this skill;
2. without the skill (baseline).

Grade the assertions in the file and record concrete evidence. Do not count a remembered correct version as a pass; the point of this skill is fresh authority resolution.

`evals/second_scope_candidate_evals.json` contains **candidate-only** SimCore output evals for the generalized authority-plan procedure. Their presence does not grant `plugin:simcore` pilot validation. They must be run in an isolated explicit evaluation context and graded before any allowlist or trigger promotion.

## Trigger evals

`evals/trigger_queries.json` contains positive prompts plus near-miss negatives. This pilot deliberately keeps SimCore and repository-wide enumeration as trigger negatives until the second-scope promotion gates pass.

Live model trigger-rate benchmarking is a promotion gate, not something the helper scripts can prove by themselves.

## Promotion boundary

Do not expand `PILOT_VALIDATED_SCOPES` until all of the following are evidenced:

- current generalized mechanical regressions green;
- Local Usage Dashboard output evals remain acceptable against baseline/previous skill;
- second-scope candidate output evals are run and graded;
- trigger evals are run with positive and near-miss negatives for the promoted scope;
- a reviewed promotion decision confirms no mutable project truth moved into the skill.
