# Agent Skill Security Benchmark

Repository-owned advisory benchmark for `cisco-ai-skill-scanner==2.1.0`.

This surface is intentionally separate from `.agents/skills/**` and from the authoritative
`Agent Skills CI`. It measures a fixed local corpus and the current repository-owned skills;
it does not certify that a clean skill is secure.

## Contract

- Scanner identity: `cisco-ai-skill-scanner==2.1.0`
- Upstream tag commit: `a24df340ca6056a6446a239f4a7b114b11c6073a`
- Policy: `balanced`
- Modes: `CORE`, `CORE_BEHAVIORAL`
- Repeats: 3 per mode
- Inference/cloud analyzers: forbidden
- Synthetic truth owner: `corpus.json`
- Real-skill targets: discovered directly from `.agents/skills/*/SKILL.md`

`HIGH_GATE_ELIGIBLE` means only that the declared corpus contract passed. A permanent gate
still requires a separate packet and a repository-owned frozen/hash-locked dependency
contract.

`NOT_ELIGIBLE` is a valid benchmark result. It must not be converted to green by weakening
fixture labels or thresholds after observing scanner output. `BENCHMARK_INVALID` means the
measurement itself is not trustworthy.

## Local execution

Use an isolated Python 3.12 environment, install the pinned scanner, capture the resolved
dependency manifest, then run:

```bash
python tools/agent-skill-security/evaluate.py \
  --repo-root . \
  --output-dir .agent-skill-security-benchmark \
  --dependency-manifest .agent-skill-security-benchmark/resolved-dependencies.txt \
  --install-duration-ms 0
```

Before the benchmark, run the stdlib-only contract tests:

```bash
python -m unittest discover -s tools/agent-skill-security/tests -p 'test_*.py' -v
```

The checked-in advisory workflow performs the same bounded benchmark with
`permissions: contents: read`, no secrets, no SARIF upload, and no Required/protection
registration.
