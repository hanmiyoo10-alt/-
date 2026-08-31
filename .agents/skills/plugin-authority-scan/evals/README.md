# Pilot evaluation notes

`plugin-authority-scan` is initially validated only for `plugin:usage-dashboard`.

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
- basic Agent Skills frontmatter/name/description constraints.

## Output evals

`evals/evals.json` contains realistic Local Usage Dashboard tasks. When a host supports isolated skill runs, compare each prompt:

1. with this skill;
2. without the skill (baseline).

Grade the assertions in the file and record concrete evidence. Do not count a remembered correct version as a pass; the point of this skill is fresh authority resolution.

## Trigger evals

`evals/trigger_queries.json` contains positive prompts plus near-miss negatives. This pilot deliberately marks SimCore and repository-wide enumeration as negatives until a second-scope compatibility review promotes the skill.

Live model trigger-rate benchmarking is a promotion gate, not something the helper script can prove by itself.
