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

- before any evidence-bearing execution, including an exercised case, owner test/command, or executable static analyzer, verify current authorization provenance and exact execution scope from the owning authority: who/what authorized it, the authorized target/command class, allowed effect/resource boundary, and any expiry or identity constraint. If authorization is absent, expired, ambiguous, or narrower than the intended invocation, do not execute and preserve the corresponding unresolved state;
- preserve authorization provenance and scope per executed invocation: every exercised case and every evidence-bearing owner-test/command entry must bind an authorization identity/scope that covers that exact invocation, and every executable analyzer must do the same, or the receipt must provide an explicit invocation-to-authorization mapping. A review-level authorization record alone is insufficient when executions differ in authorizer, scope, target/command class, or expiry;
- when authorization has an expiry, validity window, generation, lease epoch, or another time-bounded currentness constraint, bind the invocation to a trustworthy execution timestamp or another immutable temporal/currentness relation proving the invocation occurred while that authorization was current. Recording the expiry alone is insufficient; missing temporal proof leaves that execution evidence unresolved;
- direct target execution additionally requires an owner-provided sandbox or equivalent proven effect containment for writes outside the workspace, subprocesses, network access, credentials, devices, and other external state the target could reach;
- containment protects external state but does not prove that prohibited effects were never attempted. When dimension G authority/effect denial is APPLICABLE and execution contributes evidence, require observable sandbox/audit telemetry for every contract-prohibited effect attempt, whether the attempt is denied or succeeds, including prohibited writes, subprocesses, network connections, credential reads, device access, and other owner-relevant effects; alternatively use separate static proof that covers those effect paths. If the containment configuration can prove that every owner-contract-prohibited effect is denied before it can occur and exposes that attempted-effect telemetry, record that bounded configuration/telemetry as the evidence. Silent containment or denied-only telemetry cannot mark dimension G exercised/clean; missing all-attempt telemetry or static proof remains unresolved.
- direct adversarial execution also requires bounded host-resource containment appropriate to the target: an outer wall-clock timeout plus every owner-relevant CPU-time, memory, process/thread-count, filesystem-growth, output, recursion/depth, and other resource ceiling needed by the locked claim. If any owner-relevant required limit cannot be enforced by the host/harness, treat host-resource containment as unavailable and keep target-dependent execution static-only;
- for every evidence-bearing executed invocation, record whether any configured resource limit or containment mechanism fired, including the specific limit, termination signal/exit/wrapper reason, and output truncation/kill telemetry when applicable. A containment-terminated observation is not the validator's owner-defined result; keep it unresolved unless the owner contract explicitly defines that containment termination as the expected outcome;
- a temporary directory alone is neither effect containment nor host-resource containment;
- any owner test that imports, invokes, loads, or otherwise executes the target under review requires the same proven effect containment and host-resource containment as direct adversarial target execution, and its receipt entry must bind that exact runtime/toolchain plus effect/resource-containment identity to the owner-test command result;
- when dimension G is APPLICABLE, every target-executing owner-test/command must also bind the same per-invocation telemetry for every owner-contract-prohibited effect attempt, whether denied or successful, that direct target execution requires, or an explicit immutable mapping to separate qualifying static/effect proof covering that exact invocation. Containment identity or resource-limit telemetry alone is insufficient; missing all-attempt effect telemetry/mapping leaves that owner-command evidence unresolved;
- if either required containment class is unavailable, do not execute the target, including indirectly through owner tests; keep target-dependent validation static-only and cite already-existing immutable external validation evidence only when its owner/provenance contract permits that use;
- an owner test proven not to load or execute the target may run only after verifying current invocation-scoped authorization and within its separately established effect/resource boundary and an isolated copy/workspace or proven no-write configuration;
- for every evidence-bearing owner test/command, bind the exact invocation: entrypoint/subcommand, ordered argv/arguments/flags, stdin/file/response-file or other input-channel mapping, and material per-invocation configuration/settings. A command or test name alone is insufficient when selectors, inputs, or configuration can change what actually ran;
- whenever material local execution environment/configuration for an owner command, exercised case, or executable analyzer includes a secret, credential, private payload, or other sensitive value, never embed that value raw in the receipt and never use a guessable digest of a low-entropy secret as its identity. Instead bind the invocation to an owner-backed opaque secret version/reference, immutable secret-manager version identifier, or equivalent immutable non-secret identity that is auditable by the owner and specific to that exact execution; missing secret-safe identity keeps the affected evidence unresolved;
- execute focused deterministic cases only inside that proven effect/resource containment plus an isolated temporary workspace/copy or an existing owner-provided temporary harness;
- never edit the repository checkout under review merely to create review cases;
- preserve the exact source/input identities used by that isolated execution;
- before attributing executed behavior to the reviewed validator, verify that every executed contributing input equals its corresponding reviewed identity, or matches an explicit owner-approved transformation/relation whose provenance is recorded; this includes the target, imported modules/helpers, owner tests, fixtures, wrappers, temporary harnesses, and any other executable or data input that materially contributes to the result;
- if any executed contributing input cannot be related exactly to the reviewed identity under that rule, preserve `UNKNOWN / REVIEW_EXECUTED_SOURCE_MISMATCH`; do not use that execution to claim `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- for every exercised adversarial case, record an exact owner-relevant input identity. When bytes are part of the target's input contract, bind the exact bytes or an algorithm-qualified full cryptographic digest over explicitly identified input bytes plus every owner-relevant structural property; for example `sha256:<full-hex>`, with canonical encoding/serialization recorded when logical values must be serialized before hashing. A bare, truncated, algorithm-ambiguous, or unspecified-bytes digest is insufficient. When the target consumes an in-memory value/object and bytes are not part of its contract, bind the exact owner-relevant type plus value/shape/structure needed to reproduce the semantic input without inventing a JSON/pickle/repr encoding the target never observed. Behavior can also depend on path, filename, file mode/executable bit, symlink/gitlink/tree-entry mode, Git object type, directory/tree structure, container shape, or other owner-relevant metadata. A descriptive case name alone is insufficient;
- for every exercised case, record an exact owner-relevant result identity. When result bytes are part of the target's result contract, preserve either a durable retrievable immutable result locator with an owner-defined retention guarantee covering the review's audit horizon or an algorithm-qualified full cryptographic digest over explicitly identified result bytes, for example `sha256:<full-hex>`, with canonical encoding/serialization recorded when logical values must be serialized before hashing; a mutable, temporary, expiring, or retention-unproven locator alone is insufficient, and when durable retrievability is not guaranteed preserve the exact collision-resistant content digest. When the target returns an in-memory value/object and bytes are not part of its result contract, bind the exact owner-relevant result type plus value/shape/structure needed to reproduce the semantic result without inventing a JSON/pickle/repr encoding the target never produced;
- bind every exercised case to its exact invocation identity: entrypoint/subcommand/function, ordered arguments/flags, stdin versus file/input-channel mapping, material per-invocation configuration/settings, and other owner-relevant invocation parameters needed to reproduce what actually executed;
- isolate mutable case state by using a fresh process and clean isolated workspace/copy for each exercised case by default; if the owner contract requires shared state, explicitly identify every owner-defined shared-state dependency, capture its pre-case identity/state, reset or reconstruct it deterministically between cases, and test that the reset succeeded before attributing later case results;
- for generated/property-based cases, also record the generation seed/configuration needed for replay and the exact reduced/minimized example identity or bounded example value/locator when reduction occurs;
- if an exercised input cannot be reproduced or attributed to an exact identity, keep that execution evidence `UNKNOWN` rather than promoting it to `HARDENING_REVIEW_COMPLETE` or `PROVEN_GAP`;
- for every exercised case, record the bounded execution-surface identity: operating system/filesystem semantics when relevant, interpreter/parser/runtime version, Git and other material tool versions, working directory, sandbox/containment identity, and relevant sanitized environment/config overrides;
- bind every material interpreter, executable, analyzer, imported module, package, image, and dependency whose implementation can affect evidence to an immutable implementation identity, such as an immutable package/image/artifact identity or collision-resistant content digest. Executable resolution path, package name, or self-reported version alone is insufficient because a shadowed or replaced implementation may reuse the same path/version;
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

- `HARDENING_REVIEW_COMPLETE` - every declared applicable dimension is closed by sufficient exercised evidence or qualifying owner-permitted static proof with current provenance, and no unresolved review gap remains;
- `PARTIAL` - useful review evidence exists but one or more declared dimensions lack sufficient exercised evidence or qualifying owner-permitted static proof, or are otherwise insufficiently proven;
- `UNKNOWN` - the requested review cannot be resolved from current owner/evidence; use bounded reason codes such as `REVIEW_BLOCKED_UNKNOWN_OWNER` for unavailable ownership and `REVIEW_BLOCKED_UNKNOWN_CLAIM` for an unresolved requested claim;
- `CONFLICT` - current authoritative-looking evidence materially disagrees; use `REVIEW_OWNER_CONFLICT` only for unresolved owner-identity disagreement and `REVIEW_CONTRACT_CONFLICT` for unresolved claim-relevant disagreement inside an established owner contract.

A review disposition does not rewrite the target validator's own result.

When an adversarial case or positive control exposes a target defect, describe it as a `PROVEN_GAP` only when current evidence demonstrates the violated contract, and bind that finding to the exact violated owner-contract clause/basis plus the immutable observation, case, and result evidence identities that prove the violation. Otherwise preserve `UNKNOWN` or `PARTIAL`.

When CI, Required, or another remote validation result contributes to the requested claim, bind it to immutable provenance before using it:

- record the exact run/check/job identity and attempt when relevant;
- record the exact relevant check/step identity for the locked claim and an owner-defined positive execution marker or bounded collection/execution count proving that the relevant validation actually ran; also record that identified check/step's raw outcome/conclusion and bounded passed/failed/skipped/error result when available. A successful enclosing run/job with the relevant step skipped, soft-failed, normalized by a wrapper, collecting no tests, or otherwise failing its owner-defined expectation cannot close an APPLICABLE dimension;
- record the exact tested source/head SHA, the identified relevant check/step's raw outcome/conclusion and bounded result, and the enclosing run/job conclusion separately; bind the recorded result to the material remote invocation configuration that selected or parameterized the validation, including relevant workflow-dispatch inputs, matrix values, event payload fields, job/step environment, response/input files, feature flags, and other owner-relevant settings. Preserve an immutable mapping from those material inputs/configuration values to the relevant check/step result; never substitute the enclosing run/job conclusion for the relevant check/step's actual outcome;
- bind remote evidence to the realized runner/execution-surface identity whenever OS, filesystem, shell, locale, preinstalled libraries, or host/runtime semantics can affect the locked claim. Prefer an immutable runner image/artifact identity or equivalent owner-backed execution-surface identity and record all material realized host/runtime environment identities; a mutable label such as `ubuntu-latest`, runner name, or nominal OS/version alone is insufficient. Missing runner/execution-surface provenance keeps that remote evidence unresolved;
- preserve an immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes, for example `sha256:<full-hex>`; if logical values require serialization before hashing, record the canonical encoding/serialization used. A merely stable, mutable, rerunnable, expiring URL/page, truncated digest, unqualified digest value, or digest over unspecified bytes is insufficient;
- verify that the tested identity matches the reviewed source identity or the owning contract's explicitly allowed relation;
- when the tested identity differs from the reviewed source under an owner-approved relation, such as a generated merge commit, record the exact reviewed-to-tested identity relation and the current owner-contract provenance that authorizes that relation; missing relation provenance keeps the remote evidence `UNKNOWN`;
- stale, mismatched, unattributable, or execution-unproven remote validation evidence remains `UNKNOWN`; never reuse it as current proof. Use `CONFLICT` only when current authoritative evidence on the relevant matched identity materially disagrees and the owning contract does not resolve the disagreement.

### 7. Emit a bounded review receipt

Report:

```text
target
owning scope / guideline
requested claim
owner result vocabulary
reviewed source identity (exact commit/object/artifact identity)
worktree state: CLEAN | DIRTY | UNKNOWN | NOT_APPLICABLE; UNKNOWN is unresolved and cannot support HARDENING_REVIEW_COMPLETE
all contributing input identities actually relied upon regardless of storage mechanism, including immutable snapshot/object reads, checkout bytes, mutable non-Git sources, tests, fixtures, helpers/modules, and owner-contract inputs
mutable-input hold/lease/lock provenance when used instead of an immutable snapshot/copy: exact hold identity, owner approval/provenance, covered input identities, acquisition/release interval, immutable hold-state receipt/evidence, and an explicit mapping from each evidence-bearing read/execution to the hold that covered its full operation window
dirty reviewed/executed input identities (digest or bounded diff identity) when applicable
applicability by dimension A-G, each entry binding its label to the current owner/contract basis locator and, when APPLICABLE, the exact exercised evidence/result or qualifying owner-permitted static proof that covers that dimension, or an explicit unresolved reason; if basis or required evidence mapping is missing, that dimension remains UNKNOWN and cannot support HARDENING_REVIEW_COMPLETE
proposed/not-exercised positive controls, each with accepted-input class, exact proposed input identity/structure, expected owner-defined successful result, the exact current owner-contract clause/basis locator defining that expected result, and reason it remains unexecuted
executed positive controls, each classified as EXECUTED_POSITIVE_CONTROL and binding accepted-input class, exact case/input identity, exact invocation and authorization provenance, expected owner-defined successful result plus the exact current owner-contract clause/basis locator defining that expectation, observed result, and immutable result evidence
proposed/not-exercised adversarial cases, each with concrete bounded input identity/structure, expected owner-defined outcome or uncertainty behavior plus the exact current owner-contract clause/basis locator defining that expectation, and reason it remains unexecuted
cases actually exercised, each binding exact owner-relevant input identity (byte+structural when bytes are part of the target contract; type+value/shape/structure when they are not), exact invocation identity, and the authorization identity/scope covering that invocation to expected owner-defined behavior plus the exact current owner-contract clause/basis locator defining that expectation, observed status/result, owner-defined reason code when applicable or NOT_APPLICABLE when the owner defines none, exit result when applicable, and exact owner-relevant result identity: either an immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes when bytes are part of the result contract, or exact owner-relevant result type plus value/shape/structure when bytes are not part of the result contract; do not invent a serialization the target never produced
per-case state isolation evidence: fresh process + clean isolated workspace identity, or explicit owner-defined shared-state capture/reset/revalidation proof
generated-case replay provenance when applicable: seed/configuration plus reduced/minimized example identity or bounded value/locator
reviewed-to-executed identity relation for every executed contributing input when execution occurred, including target, modules/helpers, tests, fixtures, wrappers, and harnesses
invocation-to-authorization mapping for every executed case, every evidence-bearing owner-test/command, and every executable static analyzer, including authorization identity, exact scope, authorizer/source, expiry/identity constraint when relevant, and a trustworthy execution timestamp or other immutable temporal/currentness relation whenever authorization is time-bounded
owner tests / commands actually executed, each with exact test/command identity plus exact invocation (entrypoint/subcommand, ordered argv/arguments/flags, stdin/file/response-file or other input-channel mapping, and material per-invocation configuration/settings), the authorization identity/scope covering that exact command, exact runtime/toolchain identity plus immutable implementation identities for every material interpreter/executable/module/package/image/dependency affecting that evidence-bearing command, material working-directory identity, sanitized material environment/config identity (including owner-relevant PATH/PYTHONPATH/module search path, HOME/tool config, locale/encoding/timezone, executable resolution and proxy/network settings), the effect/resource-boundary identity used for that command, the isolated copy/workspace identity or proven no-write configuration used for that command, per-invocation resource-limit/containment hit and termination telemetry including the fired limit and termination/truncation reason when applicable, exit status or conclusion, an owner-defined positive execution marker or bounded collection/execution count proving the intended tests actually ran, bounded passed/failed/skipped/error counts when available, and either a durable retrievable immutable result locator with an owner-defined retention guarantee covering the review audit horizon or an algorithm-qualified full cryptographic digest over explicitly identified result bytes; a temporary, expiring, or retention-unproven locator alone is insufficient and requires the exact collision-resistant content digest; target-executing owner tests additionally bind the stronger target-execution effect/resource-containment identity and per-evidence-bearing-test state-isolation proof: fresh process/workspace per relevant test, or explicit owner-defined shared-state capture/reset/revalidation plus order-independence evidence; if authorization identity/scope, runtime/toolchain identity, material environment identity, command effect/resource-boundary identity, isolated-copy/no-write identity, positive execution marker/count, required target-execution containment, or required isolation/reset proof is missing, that command evidence remains unresolved
target-executing owner-command effect-attempt provenance, when dimension G is APPLICABLE: per-invocation telemetry for every owner-contract-prohibited effect attempt whether denied or successful, or an explicit immutable mapping from that owner-command invocation to separate qualifying static/effect proof; containment/resource telemetry alone is insufficient
execution surface/runtime/toolchain identity for each exercised case, or NOT_APPLICABLE only when no runtime execution evidence is used
local execution secret-safe configuration identity, when material sensitive values affect any owner command, exercised case, or executable analyzer: owner-backed opaque secret version/reference, immutable secret-manager version identifier, or equivalent immutable non-secret identity bound to the exact invocation; never raw secrets or guessable low-entropy secret digests
relevant sanitized environment/config identity and effect/resource containment identity for exercised cases, plus per-invocation resource-limit hit/termination telemetry and all contract-prohibited effect-attempt telemetry whether denied or successful, or separate static effect proof when dimension G is applicable
executable evidence-bearing static analysis, if any: exact analyzer/tool identity and version plus immutable analyzer/tool/dependency implementation identities, exact invocation/configuration, exact analyzed input identity, owner-relevant runtime/toolchain/environment identity, an owner-defined positive coverage/execution marker or bounded count tied to the relevant rule and analyzed input proving claim-relevant analysis actually ran, observed result, per-invocation resource-limit/containment hit and termination telemetry, and either a durable retrievable immutable result locator with an owner-defined retention guarantee covering the review audit horizon or an algorithm-qualified full cryptographic digest over explicitly identified analyzer-output bytes; a temporary, expiring, or retention-unproven analyzer-result locator alone is insufficient and requires the exact collision-resistant content digest; any executable analyzer must also satisfy the same current authorization, effect/resource containment, isolated-copy/no-write, environment identity, and invocation-bound provenance safeguards required for other executable review evidence; a containment-terminated analyzer observation remains unresolved unless the owner contract explicitly defines that termination as the expected outcome; missing required provenance, coverage proof, telemetry, or execution safeguards keeps that static evidence unresolved
non-executable static proof, if any: exact owner permission/contract basis allowing static closure, exact covered claim/dimension, exact reviewed input identities, the proof method (for example bounded manual source inspection or formal reasoning), and an immutable proof artifact or observation identity that lets a reviewer audit what established the claim; do not fabricate analyzer identity, invocation, execution marker, runtime, or analyzer-output bytes for a proof that executed no analyzer; missing owner permission, input identity, covered-claim mapping, proof method, or immutable proof/observation identity keeps that static evidence unresolved
external validation evidence used, if any: exact run/check/job identity, exact relevant check/step identity, owner-defined positive execution marker or bounded collection/execution count, tested source/head SHA, exact reviewed-to-tested identity relation plus owner-contract provenance when the tested identity differs, the relevant check/step's raw outcome/conclusion and bounded passed/failed/skipped/error result, the enclosing run/job conclusion recorded separately, attempt when relevant, immutable identities for the relevant workflow definition and material scripts/actions/toolchain used by that validation or explicit owner provenance proving the immutable run identity already binds those exact validation-implementation inputs, an immutable mapping of all material remote invocation inputs/configuration that selected or parameterized the relevant validation (including applicable dispatch inputs, matrix values, event fields, job/step environment, response/input files, feature flags, and owner-relevant settings) to the recorded relevant-step result; secret, credential, private payload, or other sensitive values must never be embedded raw in that mapping and instead must use an owner-backed opaque secret version/reference (for example an immutable secret-manager version identifier) or equivalent immutable redacted identity that is non-secret-bearing, auditable by the owner, and bound to that exact run, and either an immutable result locator or an algorithm-qualified full cryptographic digest over explicitly identified result bytes (including canonical encoding/serialization when applicable)
external validation execution-surface provenance, when material to the claim: immutable runner image/artifact or equivalent owner-backed execution-surface identity plus all material realized OS/kernel/filesystem semantics, shell, locale/encoding/timezone, preinstalled libraries, and host/runtime identities; mutable runner labels alone are insufficient
observations with source/evidence basis
PROVEN_GAP findings, if any, each binding the exact violated owner-contract clause/basis to the immutable observation, case, and result evidence identities that prove it
UNKNOWN / unresolved gaps and reason codes
resource bounds used
authority/effect denials checked
review disposition: HARDENING_REVIEW_COMPLETE | PARTIAL | UNKNOWN | CONFLICT
next legal action
```

Keep the receipt bounded. Point to larger logs or artifacts instead of embedding them when a locator preserves the required evidence.

## Completion criterion

The skill is complete for one review only when current owner evidence has been read, the reviewed bytes have an exact immutable source identity or have passed the final mutable-input revalidation barrier, and every Git object read contributing identity/evidence is replacement-neutral or explicitly records and validates the exact active replacement relation plus actual substituted object bytes/type/mode under owner authority, any relevant worktree state is known as CLEAN/DIRTY or explicitly NOT_APPLICABLE rather than UNKNOWN, applicability for all seven dimensions is explicit relative to the locked requested claim, every APPLICABLE dimension is mapped to sufficient exercised evidence/result or qualifying owner-permitted static proof; any APPLICABLE dimension that remains unresolved forces `PARTIAL` or `UNKNOWN` and blocks `HARDENING_REVIEW_COMPLETE`, required owner-defined positive controls are represented in the receipt and proven at the required proof surface, every proposed/exercised control and adversarial case binds its expected behavior to the exact current owner-contract clause/basis locator defining that expectation, and every exercised positive control is classified as `EXECUTED_POSITIVE_CONTROL` and mapped to its accepted-input class, every runtime execution is mapped to current authorization provenance/scope that covers its exact invocation, and every time-bounded authorization is paired with a trustworthy execution timestamp or another immutable temporal/currentness relation proving the invocation occurred while authorization was current, every reviewed/executed contributing input binds owner-relevant structural metadata where material to the claim and was consumed from an immutable snapshot/copy or held stable across the evidence-bearing operation with exact hold/lease/lock identity, owner approval, acquisition/release interval, immutable hold-state evidence, covered-input identity set, and explicit read/invocation-to-hold provenance, exercised-case results preserve exact owner-relevant result identity: durable retrievable immutable locator with an owner-defined retention guarantee or algorithm-qualified full collision-resistant digest over explicitly identified result bytes when bytes are part of the result contract, or exact owner-relevant result type plus value/shape/structure when bytes are not part of the result contract, exercised cases and unresolved gaps are separated, every `PROVEN_GAP` binds the exact violated owner-contract clause/basis to immutable proving evidence identities, every evidence-bearing owner command is mapped to current invocation-scoped authorization, binds its exact ordered invocation and input/configuration mapping, proves the intended checks actually ran, and has exact runtime/toolchain plus immutable implementation identities for all material interpreters/executables/modules/packages/images/dependencies plus material working-directory/environment identity, bounded outcome, the command's required effect/resource-boundary plus isolated-copy/no-write provenance, and per-invocation resource-limit/containment hit and termination telemetry; target-executing commands additionally preserve required target containment/state-isolation provenance, every exercised case has bounded runtime/toolchain/environment plus complete owner-relevant effect/resource-containment identity and per-invocation resource-limit hit/termination telemetry, every executable evidence-bearing static analysis has equivalent analyzer/toolchain/invocation/input/immutable-result provenance with immutable analyzer/tool/dependency implementation identities plus positive claim-relevant coverage proof and per-invocation resource-limit/containment hit and termination telemetry, every executable analyzer satisfies the same authorization/effect/resource/isolated-copy safeguards as other executable review evidence, and every qualifying non-executable static proof binds owner permission, covered claim/dimension, exact reviewed inputs, proof method, and immutable proof artifact/observation identity without fabricated execution provenance, dimension G execution evidence preserves all prohibited-effect attempt telemetry or equivalent static proof, every external validation result proves the exact relevant check/step actually ran, preserves that relevant check/step's raw outcome/conclusion and bounded result separately from the enclosing run/job conclusion, has immutable run/head provenance plus immutable result locator or algorithm-qualified exact-result content digest, binds immutable identities for the relevant workflow definition and material scripts/actions/toolchain or explicit owner provenance proving the immutable run identity already binds those validation-implementation inputs, and preserves a secret-safe immutable mapping of all material remote invocation inputs/configuration that selected or parameterized the validation to that relevant-step result, using owner-backed opaque secret versions/references or equivalent immutable redacted identities instead of raw sensitive values, and any reviewed-to-tested identity mismatch records its exact owner-approved relation and contract provenance, every target-executing owner command used for dimension G binds all prohibited-effect attempt telemetry or explicit immutable mapping to qualifying static/effect proof, every local execution whose material configuration includes sensitive values binds owner-backed opaque secret versions/references or equivalent immutable non-secret identities instead of raw or guessably hashed secrets, every external validation result material to OS/filesystem/runtime semantics binds an immutable runner image/artifact or equivalent execution-surface identity plus all material realized host/runtime environment identities, uncertainty has not been normalized away, and the final receipt states what it does and does not prove.

A clean review never certifies every future input or implementation as secure or correct.
