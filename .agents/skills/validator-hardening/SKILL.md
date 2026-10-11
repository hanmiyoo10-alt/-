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

If the owning project/domain cannot be established from current evidence, stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_OWNER`. Do not continue by guessing an owner.

If the owner is established but the requested semantic claim is missing, ambiguous, or cannot be bounded, stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_CLAIM`. Do not mislabel claim ambiguity as an ownership failure.

### 2. Extract the current evidence contract

Record the target's accepted input classes, evidence sources, explicit uncertainty behavior, effect boundary, and any owner-defined resource ceilings.

Capture the exact reviewed source identity before interpreting results:

- for Git-backed repository work, record the exact commit object ID that anchors the review;
- record worktree state as `CLEAN` or `DIRTY`;
- when the worktree is dirty relative to that commit, identify every dirty input that contributes to the review, including target source, imported helpers/modules, tests, fixtures, and owner-contract files actually relied upon;
- record an immutable digest or bounded diff identity for each such dirty reviewed/executed input, not only for the target file;
- if dirty contributing inputs cannot be bounded and identified completely, preserve `UNKNOWN` rather than claiming `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- for a non-Git artifact, record the owner-defined immutable artifact digest or equivalent exact identity;
- if the reviewed bytes cannot be attributed to an immutable identity, preserve `UNKNOWN` rather than claiming `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- prefer reading and executing from an immutable snapshot when available;
- when any contributing evidence comes from a mutable source, including a Git checkout/worktree or a non-Git mutable path, immediately before emitting the final receipt revalidate its immutable identity: commit/worktree state for Git-backed inputs and the recorded digest/equivalent exact identity for every mutable non-Git input;
- the final barrier covers every contributing source, helper, test, fixture, owner-contract, and executed-input identity recorded for the review regardless of storage mechanism;
- if any contributing input changed during the review, stop with `UNKNOWN / REVIEW_INPUT_CHANGED_DURING_REVIEW`; never attribute observations to the earlier identity.

Separate:

- what the validator directly observes;
- what it derives;
- what it refuses or cannot determine;
- what external evidence is required;
- what it never has authority to mutate.

A previous PASS proves only the exact scope of that prior check.

### 3. Classify hardening-dimension applicability

For every dimension below, classify applicability **relative to the locked requested claim**, not merely to the validator as a whole. Record one of:

- `APPLICABLE` — this dimension is material to proving the locked claim;
- `OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS` — the dimension may apply to the target generally, but current owner/contract evidence shows it is outside this locked claim and it must not be exercised merely to broaden the review;
- `NOT_APPLICABLE_WITH_OWNER_BASIS` — current owner/contract evidence shows the dimension does not apply to the relevant target contract at all;
- `UNKNOWN`.

Do not mark a dimension not applicable or out of scope merely because the current implementation does not test it. Cite the current owner/contract basis. A narrow claim must not expand into unrelated validator behavior just because another dimension applies to the target elsewhere.

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
- exact Git object type rather than SHA-shaped text alone and, when evidence comes from a tree entry, the exact tree-entry mode as a separate fact;
- validate expected type/mode combinations where applicable: regular/executable file modes `100644`/`100755` -> `blob`, symlink mode `120000` -> `blob`, gitlink mode `160000` -> `commit`, and directory mode `040000` -> `tree`;
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
- generic execution-environment/dependency poisoning outside Git when applicable, including inherited `PATH`, `PYTHONPATH`/module search path, `HOME`/tool configuration, working directory, locale/encoding/timezone, executable resolution, proxy/network environment, and other owner-relevant ambient state;
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

### 5. Preserve read-only review, then use bounded adversarial execution only when separately authorized

Inspect or cite the current owner tests first.

On a read-only surface that lacks execution capability:

- propose a focused deterministic adversarial matrix without editing the repository under review;
- mark every unexecuted case explicitly as proposed/not exercised;
- do not claim that owner tests, commands, fuzzing, or adversarial inputs were run;
- use review disposition `PARTIAL` when execution is still needed to prove the requested hardening claim.

When a separately authorized execution-capable surface exists:

- direct target execution additionally requires an owner-provided sandbox or equivalent proven effect containment for writes outside the workspace, subprocesses, network access, credentials, devices, and other external state the target could reach;
- direct adversarial execution also requires bounded host-resource containment appropriate to the target: an outer wall-clock timeout plus CPU time, memory, process/thread count, filesystem growth, and output limits where the host/harness can expose them;
- a temporary directory alone is neither effect containment nor host-resource containment;
- any owner test that imports, invokes, loads, or otherwise executes the target under review requires the same proven effect containment and host-resource containment as direct adversarial target execution;
- if either required containment class is unavailable, do not execute the target, including indirectly through owner tests; keep target-dependent validation static-only and cite already-existing immutable external validation evidence only when its owner/provenance contract permits that use;
- an owner test proven not to load or execute the target may run only within its separately established effect/resource boundary and an isolated copy/workspace or proven no-write configuration;
- execute focused deterministic cases only inside that proven effect/resource containment plus an isolated temporary workspace/copy or an existing owner-provided temporary harness;
- never edit the repository checkout under review merely to create review cases;
- preserve the exact source/input identities used by that isolated execution;
- for every exercised case, record the bounded execution-surface identity: operating system/filesystem semantics when relevant, interpreter/parser/runtime version, Git and other material tool versions, working directory, sandbox/containment identity, and relevant sanitized environment/config overrides;
- if material runtime/toolchain/environment identity cannot be bounded, do not claim `HARDENING_REVIEW_COMPLETE` from that execution.

When Python property-based generation is justified:

- keep the current unittest/pytest owner unchanged;
- use Hypothesis only from an already-authorized isolated development environment and isolated temporary workspace/copy;
- bound examples, input sizes, recursion, and deadlines explicitly;
- keep generated inputs reproducible enough to reduce a failure to a concrete regression case;
- never make Hypothesis itself a runtime, production, or CI authority.

Property-based generation is a feedback amplifier, not proof that ungenerated classes are safe.

### Eval fixture boundary

Source-controlled fixtures under `evals/` are a candidate review corpus. Their presence and structural validity do not prove that the Agent Platform live-eval adapter currently registers this skill or can execute those fixtures.

Live-eval registration is a separate Agent Platform wiring decision owned outside this skill directory. Until that owner explicitly registers the skill, do not describe these fixtures as runnable through the public live-eval workflow.

### 6. Interpret observations without stealing target semantics

For the review itself, use these advisory dispositions:

- `HARDENING_REVIEW_COMPLETE` - all declared applicable dimensions were exercised with sufficient current evidence and no unresolved review gap remains;
- `PARTIAL` - useful review evidence exists but one or more declared dimensions remain unexercised or insufficiently proven;
- `UNKNOWN` - the requested review cannot be resolved from current owner/evidence; use bounded reason codes such as `REVIEW_BLOCKED_UNKNOWN_OWNER` for unavailable ownership and `REVIEW_BLOCKED_UNKNOWN_CLAIM` for an unresolved requested claim;
- `CONFLICT` - current authoritative-looking owner evidence materially disagrees.

A review disposition does not rewrite the target validator's own result.

When an adversarial case exposes a target defect, describe it as a `PROVEN_GAP` only when current evidence demonstrates the violated contract. Otherwise preserve `UNKNOWN` or `PARTIAL`.

When CI, Required, or another remote validation result contributes to the requested claim, bind it to immutable provenance before using it:

- record the exact run/check/job identity and attempt when relevant;
- record the exact tested source/head SHA and conclusion;
- preserve an immutable or stable result locator;
- verify that the tested identity matches the reviewed source identity or the owning contract's explicitly allowed relation;
- stale, mismatched, or unattributable remote validation evidence remains `UNKNOWN` or `CONFLICT`; never reuse it as current proof.

### 7. Emit a bounded review receipt

Report:

```text
target
owning scope / guideline
requested claim
owner result vocabulary
reviewed source identity (exact commit/object/artifact identity)
worktree state: CLEAN | DIRTY | NOT_APPLICABLE
dirty reviewed/executed input identities (digest or bounded diff identity) when applicable
applicability by dimension A-G
proposed/not-exercised adversarial cases, with reason each remains unexecuted
cases actually exercised
owner tests / commands actually used
execution surface/runtime/toolchain identity for each exercised case, or NOT_APPLICABLE when no execution occurred
relevant sanitized environment/config identity and effect/resource containment identity for exercised cases
external validation evidence used, if any: exact run/check/job identity, tested source/head SHA, conclusion, attempt when relevant, and immutable result locator
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

The skill is complete for one review only when current owner evidence has been read, the reviewed bytes have an exact immutable source identity or have passed the final mutable-input revalidation barrier, worktree dirtiness is explicit, applicability for all seven dimensions is explicit relative to the locked requested claim, exercised cases and unresolved gaps are separated, every exercised case has bounded runtime/toolchain/environment plus effect/resource-containment identity, every external validation result used has immutable run/head/conclusion provenance, uncertainty has not been normalized away, and the final receipt states what it does and does not prove.

A clean review never certifies every future input or implementation as secure or correct.
