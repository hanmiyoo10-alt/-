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

If current authoritative-looking evidence names materially different owning projects/domains and the owning contracts do not resolve which owner identity applies, stop with review disposition `CONFLICT` and reason code `REVIEW_OWNER_CONFLICT`. Preserve the conflicting owner source references; do not collapse owner-identity disagreement into missing ownership.

If the owner identity is established but current authoritative owner contracts materially disagree about target semantics, result vocabulary, resource ceilings, or another claim-relevant contract and the owner does not resolve the disagreement, stop with review disposition `CONFLICT` and reason code `REVIEW_CONTRACT_CONFLICT`. Preserve the conflicting contract source references; do not mislabel semantic/contract disagreement as an owner-identity conflict.

If the owning project/domain is genuinely unavailable after checking for owner-identity conflict, stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_OWNER`. Do not continue by guessing an owner.

If the owner is established but the requested semantic claim is missing, ambiguous, or cannot be bounded, stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_CLAIM`. Do not mislabel claim ambiguity as an ownership failure.

### 2. Extract the current evidence contract

Record the target's accepted input classes, evidence sources, explicit uncertainty behavior, effect boundary, and any owner-defined resource ceilings.

Capture the exact reviewed source identity before interpreting results:

- for Git-backed repository work, record the exact commit object ID that anchors the review;
- use a replacement-neutral immutable snapshot/object-read path for every Git object read that contributes source identity or evidence, and do not depend on checkout clean/smudge filter output for source identity. If replacement-neutral reads are unavailable, preserve `UNKNOWN` unless the current owner explicitly identifies the active replacement relation and the review binds the actual substituted object bytes, object type/mode, and replacement provenance to exact immutable identities; never attribute substituted bytes to the unreplaced object ID;
- record worktree state as `CLEAN`, `DIRTY`, or `UNKNOWN` when checkout/worktree inputs are involved; use `NOT_APPLICABLE` only when no worktree state is relevant. If a relevant worktree state cannot be established, preserve that uncertainty in the receipt and route the review to `PARTIAL` or `UNKNOWN`; never fabricate `CLEAN` or `DIRTY`; never treat `CLEAN` alone as byte identity;
- for every Git-backed contributing file or tree input actually read from a checkout/worktree, record an identity that binds the actual bytes plus every owner-relevant structural property relied upon by the review, even when the worktree reports `CLEAN`; this includes path/name, file mode/executable bit, symlink versus regular-file identity, Git object/tree-entry type and mode, directory/tree layout, and other claim-relevant structure, and it covers filter-normalized or otherwise transformed checkout bytes;
- the contributing-input identity set must include every source, imported helper/module, test, fixture, owner-contract file, directory/tree input, and other checkout byte/structural input actually relied upon by the review, regardless of CLEAN/DIRTY state;
- when the worktree is dirty relative to that commit, identify every dirty input that contributes to the review, including target source, imported helpers/modules, tests, fixtures, and owner-contract files actually relied upon;
- whenever this skill permits a digest as exact identity or immutable evidence, use an owner-approved collision-resistant cryptographic hash at least as strong as SHA-256, record the algorithm plus full digest over explicitly identified bytes, and record canonical encoding/serialization when logical values must be serialized. MD5, SHA-1, truncated digests, algorithm-ambiguous digests, deprecated/non-collision-resistant algorithms, and digests over unspecified bytes are insufficient;
- record an algorithm-qualified full cryptographic digest over explicitly identified bytes (for example `sha256:<full-hex>`, with canonical encoding/serialization when needed) or a bounded diff identity that deterministically binds the exact changed bytes and claim-relevant structure for each such dirty reviewed/executed input, not only for the target file; bare, truncated, algorithm-ambiguous, or unspecified-bytes digests are insufficient;
- if dirty contributing inputs cannot be bounded and identified completely, preserve `UNKNOWN` rather than claiming `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- for a non-Git artifact, record the owner-defined algorithm-qualified full cryptographic artifact digest over explicitly identified artifact bytes (for example `sha256:<full-hex>`, with canonical encoding/serialization when needed) or another owner-defined equivalent exact immutable identity; bare, truncated, algorithm-ambiguous, or unspecified-bytes digests are insufficient;
- if the reviewed bytes cannot be attributed to an immutable identity, preserve `UNKNOWN` rather than claiming `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- evidence-bearing reads and execution must consume a captured immutable snapshot/copy of every mutable contributing input whenever possible;
- if an immutable snapshot/copy is unavailable, use an owner-approved read lock/lease/hold or equivalent mechanism that validates the exact byte+structural identity before the operation, keeps that identity stable for the full evidence-bearing read/execution window, and revalidates it after the operation. Preserve the exact hold/lease/lock identity, owner approval/provenance, covered input identities, acquisition point, release point, and an immutable hold-state receipt or equivalent evidence that binds each covered read/execution to the hold interval. A final end-of-review identity check alone is insufficient because it cannot exclude an A→B→A mutable-input race; missing read/invocation-to-hold provenance keeps that evidence unresolved;
- when any contributing evidence comes from a mutable source, including a Git checkout/worktree or a non-Git mutable path, immediately before emitting the final receipt revalidate the exact identity of every relied-upon input, including both bytes and every owner-relevant structural property recorded for Git-backed inputs, and the recorded algorithm-qualified full cryptographic digest/equivalent exact identity plus claim-relevant structure for every mutable non-Git input;
- revalidation must not rely on `git status` cleanliness as a substitute for byte identity, and every Git object read used for identity must remain replacement-neutral. If replacement-neutral revalidation cannot be proven, preserve `UNKNOWN` unless the exact replacement relation and actual substituted object bytes/type/mode were explicitly identified and validated under the owner contract;
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

Every A-G applicability entry in the final receipt must carry the current owner/contract basis that justifies that label. If the basis for `APPLICABLE`, `OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS`, or `NOT_APPLICABLE_WITH_OWNER_BASIS` cannot be established from current owner evidence, record that dimension as `UNKNOWN` rather than emitting an unsupported applicability label.

### 4. Build the adversarial matrix

Build the matrix with owner-defined valid controls as well as adversarial cases.

- For every applicable accepted-input class, include at least one representative owner-defined valid positive control and require its expected successful owner-defined result before a completed hardening review can rely on adversarial outcomes.
- When an owner-defined size/count/depth/length ceiling is part of the locked claim, include the exact valid boundary value as a positive control and the nearest meaningful invalid boundary case when the contract defines one.
- On a read-only surface, propose these positive controls explicitly and mark them not exercised. On an execution-capable surface, exercise the positive controls under the same identity/containment/provenance rules as adversarial cases.
- Classify each exercised positive control explicitly as `EXECUTED_POSITIVE_CONTROL` and bind it to its accepted-input class, exact case/input identity, exact invocation and authorization provenance, expected owner-defined successful result, observed result, and immutable result evidence.
- For every proposed or exercised positive control and every proposed or exercised adversarial case, bind the expected owner-defined behavior/result to the exact current owner-contract clause or basis locator that defines that expectation. A generic dimension-level basis is not enough when closely related inputs can have different owner-defined outcomes; missing per-case expectation provenance keeps that case unresolved.
- If required positive-control behavior is unavailable or unexercised where execution is needed, preserve `PARTIAL` or `UNKNOWN`.
- If a fully attributed/exercised positive control definitively fails its owner-defined expected successful result, record that failure as a `PROVEN_GAP`. That failed control must not be used to validate adversarial conclusions that assume a healthy supported path, but the review itself may still reach `HARDENING_REVIEW_COMPLETE` once all applicable dimensions, control coverage, provenance, and unresolved-gap requirements are otherwise satisfied.

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

Inspect the contents of the current owner tests before relying on their coverage, semantics, fixtures, or expected outcomes. A path/name citation alone is insufficient. If current test contents are unavailable, do not infer what they cover; preserve `PARTIAL` or `UNKNOWN` according to whether the locked claim can still be bounded from the remaining current owner evidence.

On a read-only surface that lacks execution capability:

- propose a focused deterministic adversarial matrix without editing the repository under review;
- mark every unexecuted case explicitly as proposed/not exercised;
- do not claim that owner tests, commands, fuzzing, or adversarial inputs were run;
- use review disposition `PARTIAL` when execution is still needed to prove the requested hardening claim.

When a separately authorized execution-capable surface exists:

- verify current invocation-scoped authorization before every evidence-bearing execution;
- require proven effect containment, owner-relevant resource ceilings, isolated state, exact contributing-input identity, and target-execution proof before attributing behavior;
- bind local commands to the realized execution surface when OS/filesystem semantics matter;
- preserve immutable implementation/runtime/environment identity for material tools and dependencies;
- preserve exact input/result identity without exposing secrets or low-entropy private values;
- require complete runtime-input discovery when dynamic loading, configuration, plugins, or ambient state can affect the result;
- when dimension G is applicable, preserve invocation-bound prohibited-effect attempt telemetry with positive completeness/loss evidence or qualifying static proof;
- containment-triggered termination is not automatically the validator's result;
- never edit the reviewed checkout merely to manufacture adversarial cases.

The complete executable/local/remote evidence requirements are intentionally kept in the on-demand [receipt and execution evidence contract](references/receipt-contract.md). Load that reference before using execution evidence to close an applicable dimension or before emitting the detailed final receipt.

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

- `HARDENING_REVIEW_COMPLETE` - every declared applicable dimension is closed by sufficient exercised evidence or qualifying owner-permitted static proof with current provenance, and no unresolved review gap remains;
- `PARTIAL` - useful review evidence exists but one or more declared dimensions lack sufficient exercised evidence or qualifying owner-permitted static proof, or are otherwise insufficiently proven;
- `UNKNOWN` - the requested review cannot be resolved from current owner/evidence; use bounded reason codes such as `REVIEW_BLOCKED_UNKNOWN_OWNER` for unavailable ownership and `REVIEW_BLOCKED_UNKNOWN_CLAIM` for an unresolved requested claim;
- `CONFLICT` - current authoritative-looking evidence materially disagrees; use `REVIEW_OWNER_CONFLICT` only for unresolved owner-identity disagreement and `REVIEW_CONTRACT_CONFLICT` for unresolved claim-relevant disagreement inside an established owner contract.

A review disposition does not rewrite the target validator's own result.

When an adversarial case or positive control exposes a target defect, describe it as a `PROVEN_GAP` only when current evidence demonstrates the violated contract, and bind that finding to the exact violated owner-contract clause/basis plus the immutable observation, case, and result evidence identities that prove the violation. Otherwise preserve `UNKNOWN` or `PARTIAL`.

When CI, Required, or another remote validation result contributes to the requested claim, bind it to immutable provenance before using it:

- record the exact run/check/job identity and attempt when relevant;
- bind the run to the owner-approved remote validation trust domain: CI provider/service endpoint, owning repository/project and organization/tenant identity, event/ref trust context, and the exact current owner-contract clause/basis that permits this remote surface to provide evidence for the locked claim. When permissions, reusable-workflow trust, environment protection, or tenant policy are material, preserve their immutable/current identity as well. A run from a fork, lookalike project, different tenant/provider endpoint, or otherwise unapproved trust context remains `UNKNOWN` even if source SHA and workflow bytes match;
- record the exact relevant check/step identity for the locked claim and an owner-defined positive execution marker or bounded collection/execution count proving that the relevant validation actually ran; also record that identified check/step's raw outcome/conclusion and bounded passed/failed/skipped/error result when available. A successful enclosing run/job with the relevant step skipped, soft-failed, normalized by a wrapper, collecting no tests, or otherwise failing its owner-defined expectation cannot close an APPLICABLE dimension;
- record the exact tested source/head SHA, the identified relevant check/step's raw outcome/conclusion and bounded result, and the enclosing run/job conclusion separately; bind the recorded result to the material remote invocation configuration that selected or parameterized the validation, including relevant workflow-dispatch inputs, matrix values, event payload fields, job/step environment, response/input files, feature flags, and other owner-relevant settings. Preserve an immutable mapping from those material inputs/configuration values to the relevant check/step result; never substitute the enclosing run/job conclusion for the relevant check/step's actual outcome;
- bind remote evidence to the realized runner/execution-surface identity whenever OS, filesystem, shell, locale, preinstalled libraries, or host/runtime semantics can affect the locked claim. Prefer an immutable runner image/artifact identity or equivalent owner-backed execution-surface identity and record all material realized host/runtime environment identities; a mutable label such as `ubuntu-latest`, runner name, or nominal OS/version alone is insufficient. Missing runner/execution-surface provenance keeps that remote evidence unresolved;
- preserve an immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes, for example `sha256:<full-hex>`; if logical values require serialization before hashing, record the canonical encoding/serialization used. A merely stable, mutable, rerunnable, expiring URL/page, truncated digest, unqualified digest value, or digest over unspecified bytes is insufficient;
- verify that the tested identity matches the reviewed source identity or the owning contract's explicitly allowed relation;
- when the tested identity differs from the reviewed source under an owner-approved relation, such as a generated merge commit, record the exact reviewed-to-tested identity relation and the current owner-contract provenance that authorizes that relation; missing relation provenance keeps the remote evidence `UNKNOWN`;
- stale, mismatched, unattributable, or execution-unproven remote validation evidence remains `UNKNOWN`; never reuse it as current proof. Use `CONFLICT` only when current authoritative evidence on the relevant matched identity materially disagrees and the owning contract does not resolve the disagreement.

### 7. Emit a bounded review receipt

Keep the main review receipt compact and source-linked. When executable owner commands, exercised cases, executable analyzers, or remote CI evidence contribute to the claim, load and follow the on-demand [receipt and execution evidence contract](references/receipt-contract.md) before treating that evidence as sufficient or emitting the final detailed receipt.

At minimum, preserve the target/owner/claim, reviewed immutable source identity, worktree state, dimension A-G applicability, evidence or unresolved reason for each applicable dimension, PROVEN_GAP findings, required UNKNOWN/conflict state, authority/effect denials, resource bounds, and final review disposition.

Remote validation must prove the bytes it actually consumed. A matching head SHA alone is not sufficient on a reused/self-hosted or cleanup-disabled runner; require an immutable clean-checkout/workspace attestation or exact immutable identities for all remote contributing source/helper inputs.

Local owner tests/commands whose result can depend on OS or filesystem behavior must bind the realized local execution surface, including material host OS/kernel/filesystem semantics or an immutable image/equivalent owner-backed identity.

Keep the receipt bounded. Point to larger logs or artifacts instead of embedding them when a locator preserves the required evidence.

## Completion criterion

For reviews using executable or remote evidence, the detailed completion checklist in [references/receipt-contract.md](references/receipt-contract.md) is mandatory. Missing required provenance from that reference keeps the affected evidence unresolved and blocks `HARDENING_REVIEW_COMPLETE`.

A clean review never certifies every future input or implementation as secure or correct.
