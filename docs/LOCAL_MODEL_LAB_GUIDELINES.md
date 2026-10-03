# Local Model Lab — Development & Research Guidelines

This document is the canonical bootstrap/operating contract for the `local-model-lab` scope.

- Canonical product root: `products/local-model-lab/`
- Current-state evidence: `products/local-model-lab/CURRENT.md`
- Product locator: `products/local-model-lab/product.json`
- Architecture: `products/local-model-lab/docs/ARCHITECTURE.md`
- Teacher configuration: `products/local-model-lab/config/teacher-stack.json`

The project is currently a research product root. It does not own a production, deployment, runtime, or release channel.

## Repository common-rules inheritance

This project inherits `docs/REPOSITORY_COMMON_RULES.md` by reference. Repository `HARD_INVARIANT` rules remain binding.

## Operating contract

1. Read `CURRENT.md` before resuming work.
2. Keep external provider APIs as teacher/evaluation surfaces, not as hidden final-runtime dependencies.
3. Provider model names, limits, terms, and account capabilities must be re-verified at the time data generation actually runs.
4. Never commit API keys, credentials, session/auth material, private corpus payloads, or unsanitized sensitive logs.
5. Keep dataset provenance and licensing/terms review explicit. API access alone does not prove permission to use outputs for model training.
6. Preserve `UNKNOWN` or `UNASSIGNED` for unresolved backbone, model size, context length, thresholds, and provider contracts.
7. Validate each training stage against both its target capability and regression of previously acquired capabilities.
8. Do not declare the local student equivalent to a teacher from architecture similarity or training completion alone. Use measured benchmark evidence.
9. Do not create release/deployment/runtime authority until a separately reviewed lifecycle change establishes it.

## Teacher-data boundary

Teacher records should prefer a normalized, minimal training schema over dumping raw provider responses.

At minimum, generated records should retain:

- source/corpus provenance locator;
- teacher family and exact model/version used when known;
- generation timestamp or dataset build identity;
- task type;
- normalized supervision signal;
- validation/error status.

They must not retain secrets.

## Capability gates

A capability may be called implemented only after its own evaluation surface exists.

Suggested gates:

- semantic retrieval: Recall / MRR / nDCG;
- contextual retrieval: long-document and context-dependent retrieval set;
- reranking: hard-negative and ranking metrics;
- judge/calibration: accuracy plus calibration metrics such as Brier score or ECE;
- joint model: regression matrix across all prior capabilities.

## Bootstrap non-goals

- production model claims;
- release-channel creation;
- synthetic benchmark scores entered without execution evidence;
- provider contract assumptions;
- broad repository-runtime changes unrelated to the model lab.
