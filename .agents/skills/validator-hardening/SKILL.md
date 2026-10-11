---
name: validator-hardening
description: >-
  Review a repository validator or classifier with a bounded adversarial and fail-closed
  procedure before implementation or merge. Use current owning authority, preserve the
  target's result vocabulary, probe malformed and ambiguous evidence, check resource
  bounds and environmental poisoning where applicable, and keep all mutation, CI,
  release, production, and device authority with existing owners.
---

# Validator Hardening

Read-only review procedure for repository validators and classifiers.

This skill answers one question:

> Given one current validator/classifier owner and one bounded contract, what adversarial cases and evidence gaps should be checked before trusting or extending that validator?

It is a review procedure. It is not a validator implementation, a truth owner, an autofix tool, a CI replacement, or a release/runtime authority.

## Read first

Before making any validator claim, read:

1. `docs/REPOSITORY_COMMON_RULES.md`;
2. `docs/REPO_PROJECT_CATALOG.md` when repository/project scope resolution is needed;
3. the current owning project/domain guideline or contract;
4. the target validator/classifier source and current tests;
5. the exact CI/Required or other validation surface only when the requested claim depends on it.

Conversation memory, copied status prose, prior PASS labels, and this skill are context only.

## Hard boundaries

- Preserve the target owner's result vocabulary and semantics. This skill must not redefine `PASS`, `FAIL`, `UNKNOWN`, `CONFLICT`, or owner-specific states.
- Emit or recommend a target `FAIL` only when current owner semantics and observed evidence prove a contract violation.
- Missing, ambiguous, unavailable, partial, malformed, or unsupported evidence remains `UNKNOWN` unless the current owner explicitly defines another state for that condition.
- Never infer absence from incomplete discovery or partial object/source availability.
- Do not fabricate defaults, provenance, current SHAs, versions, runtime state, or object identity.
- Do not auto-fix, rewrite, close, delete, merge, release, deploy, mutate production, mutate devices, or grant authority.
- Do not weaken or replace repository tests, Agent Skills CI, project CI, Required, branch protection, or release gates.
- Do not force Python, pytest, Hypothesis, or any package onto a target. Property-based testing is optional guidance only when the current test owner and isolated development environment support it.
- Keep secrets, credentials, tokens, private payloads, sensitive logs, and unrelated environment dumps out of fixtures and receipts.
- Treat this skill's review receipt as derived advisory evidence only.

These boundaries compose with repository hard invariants and the target owner's own contract.

## Procedure

### 1. Lock the target owner and claim

Identify exactly:

- target validator/classifier path or command;
- owning project/domain and guideline;
- requested claim to review;
- target-owned result vocabulary;
- current tests and validation surfaces relevant to that claim.

If ownership or the requested semantic claim cannot be established from current evidence, stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_OWNER`. Do not continue by guessing an owner.

### 2. Extract the current evidence contract

Record the target's accepted input classes, evidence sources, explicit uncertainty behavior, effect boundary, and any owner-defined resource ceilings.

Separate:

- what the validator directly observes;
- what it derives;
- what it refuses or cannot determine;
- what external evidence is required;
- what it never has authority to mutate.

A previous PASS proves only the exact scope of that prior check.

### 3. Classify hardening-dimension applicability

For every dimension below, record one of:

- `APPLICABLE`;
- `NOT_APPLICABLE_WITH_OWNER_BASIS`;
- `UNKNOWN`.

Do not mark a dimension not applicable merely because the current implementation does not test it. Cite the current owner/contract basis.

### 4. Build the adversarial matrix

Exercise the applicable dimensions with the narrowest deterministic cases that can prove the contract.

#### A. Text, path, and ref inputs

Consider, where applicable:

- empty and whitespace-only values;
- NUL and other control characters;
- Unicode surrogate input and normalization-sensitive forms;
- absolute, traversal, non-canonical, separator-variant, and platform-variant paths;
- option-like refs or arguments such as values beginning with `-`;
- length, byte, path-component, and count ceilings.

Distinguish character limits from encoded-byte limits when the owner contract does.

#### B. Structured data

Consider, where applicable:

- duplicate JSON keys when parser behavior matters;
- wrong scalar/container types and malformed shapes;
- oversized documents, arrays, strings, or fields;
- deep nesting and recursion limits;
- unknown/additional fields according to the owning schema;
- parser failure, decode failure, and incomplete input.

Do not silently normalize ambiguous parser behavior into a successful classification.

#### C. Source and AST patterns

Consider, where applicable:

- computed or dynamic expressions that defeat literal matching;
- aliasing, indirection, imports, or generated forms relevant to the target;
- unsupported syntax or parse failures;
- multiple semantically similar forms whose text differs.

Unsupported or unresolved syntax stays explicit. Do not treat "not matched" as "safe".

#### D. Git and object evidence

Consider, where applicable:

- missing or unavailable objects;
- exact object type rather than SHA-shaped text alone;
- blob, tree, symlink, and gitlink distinctions;
- malformed or unsupported object IDs and object formats;
- partial clone or lazy object availability;
- replacement objects;
- ambient Git repository, config, pathspec, trace, or environment poisoning;
- source and destination identity for rename/copy-sensitive checks.

A missing object or unavailable evidence is not proof that the object is absent from the owning history or contract.

#### E. Evidence semantics

Check that:

- proven violations alone reach owner-defined failure;
- insufficient or ambiguous evidence remains explicit uncertainty;
- partial discovery does not prove absence;
- derived findings keep source/owner provenance;
- stable reason codes or bounded failure provenance are preserved when the owner contract expects them;
- local labels are not widened into whole-system conclusions.

#### F. Resource bounds and determinism

Check, where applicable:

- input-size ceilings;
- scan/file/object-count ceilings;
- recursion/depth ceilings;
- subprocess timeout and output ceilings;
- bounded diagnostic excerpts;
- deterministic ordering and reason-code stability when contractually required;
- repeated identical immutable input does not produce semantically contradictory output.

Use the target owner's existing ceilings first. If an additional test needs a temporary bound, make it explicit and do not promote it into owner truth.

#### G. Authority and effect denial

Verify the target remains within its declared effect surface:

- read-only/advisory means no autofix or implicit writer;
- no issue close/delete, Git write, merge, release, production, device, credential, or authority mutation;
- no bypass of CI, Required, branch protection, or project gates;
- no creation of a second mutable truth store merely to make classification easier.

### 5. Prefer existing owner tests, then add bounded adversarial generation

Run or cite the current owner tests first. Add focused deterministic cases before broad fuzzing.

When Python property-based generation is justified:

- keep the current unittest/pytest owner unchanged;
- use Hypothesis only from an already-authorized isolated development environment;
- bound examples, input sizes, recursion, and deadlines explicitly;
- keep generated inputs reproducible enough to reduce a failure to a concrete regression case;
- never make Hypothesis itself a runtime, production, or CI authority.

Property-based generation is a feedback amplifier, not proof that ungenerated classes are safe.

### 6. Interpret observations without stealing target semantics

For the review itself, use these advisory dispositions:

- `HARDENING_REVIEW_COMPLETE` - all declared applicable dimensions were exercised with sufficient current evidence and no unresolved review gap remains;
- `PARTIAL` - useful review evidence exists but one or more declared dimensions remain unexercised or insufficiently proven;
- `UNKNOWN` - the requested review cannot be resolved from current owner/evidence; use a bounded reason code such as `REVIEW_BLOCKED_UNKNOWN_OWNER` when the owner itself cannot be established;
- `CONFLICT` - current authoritative-looking owner evidence materially disagrees.

A review disposition does not rewrite the target validator's own result.

When an adversarial case exposes a target defect, describe it as a `PROVEN_GAP` only when current evidence demonstrates the violated contract. Otherwise preserve `UNKNOWN` or `PARTIAL`.

### 7. Emit a bounded review receipt

Report:

```text
target
owning scope / guideline
requested claim
owner result vocabulary
applicability by dimension A-G
cases actually exercised
owner tests / commands actually used
observations with source/evidence basis
PROVEN_GAP findings, if any
UNKNOWN / unresolved gaps and reason codes
resource bounds used
authority/effect denials checked
review disposition: HARDENING_REVIEW_COMPLETE | PARTIAL | UNKNOWN | CONFLICT
next legal action
```

Keep the receipt bounded. Point to larger logs or artifacts instead of embedding them when a locator preserves the required evidence.

## Completion criterion

The skill is complete for one review only when current owner evidence has been read, applicability for all seven dimensions is explicit, exercised cases and unresolved gaps are separated, uncertainty has not been normalized away, and the final receipt states what it does and does not prove.

A clean review never certifies every future input or implementation as secure or correct.
