# Repository Common Rule Review — Extension Namespace / Failure Containment — 2026-09-02

Status: **NO NEW RCR · KEEP INTEROP/DOMAIN GUARDRAIL · EXISTING H02/H08/D13 (+ C10 WHERE PARTIAL/UNKNOWN EXTENSIONS APPLY) · DOCS/POLICY ONLY · NO RUNTIME/RELEASE AUTHORITY**

## 0. Question

Review the LATER candidate:

```text
app-private portable metadata
→ app-owned extension namespace

malformed private extension
→ fail only that extension-dependent scope
→ keep otherwise-valid interoperable core usable
```

Determine whether this should become a repository-wide common rule, remain a domain/interoperability guardrail, or be absorbed by existing Repository Common Rules.

## 1. Summary verdict

Do **not** create a new Repository Common Rule for extension namespaces.

The portable principle is real and useful when a format has both:

```text
independently valid interoperable core
+
optional / auxiliary app-private extension state
```

In that case:

```text
PRIVATE EXTENSION
MUST NOT SILENTLY BECOME CORE-SCHEMA AUTHORITY

PRIVATE EXTENSION FAILURE
SHOULD BE CONTAINED TO THE EXTENSION-DEPENDENT CAPABILITY
WHEN THE CORE REMAINS INDEPENDENTLY VALID
```

But this is not universal enough for a new repository constitution rule. Some formats intentionally make an extension required for a specific consumer or feature, and some projects have no portable extension boundary at all.

Selected classification:

```text
NEW RCR = NO
DOMAIN / INTEROP GUARDRAIL = KEEP
PRIMARY COMMON OWNERS = H02 + H08 + D13
C10 = supporting rule when partial/unknown extension views could gain destructive omission authority
```

## 2. Evidence — RisuBard independent portability example

`rpaddict/RisuBard@e47bc14090618450b271eaac2a1c1891757ac535` keeps Grimoire state under:

```text
data.extensions.risubard.bardLore
```

while preserving standard `character_book` semantics.

Its optional app-specific data is non-authoritative for the standard lorebook projection. Malformed private extension data therefore does not need to invalidate otherwise-valid standard lorebook content.

This is strong evidence for two separations:

```text
standard interoperable schema
!=
private application schema

private parser failure
!=
whole-format failure
```

when the private extension is explicitly optional/auxiliary.

## 3. Evidence — current official PocketRisu already follows part of the pattern

Current PocketRisu design evidence records that `createBaseV2()` writes PocketRisu-owned state beneath:

```text
data.extensions.risuai
```

and preserves other character extension namespaces instead of promoting them into PocketRisu ownership.

`importCharacterCardSpec()` reads PocketRisu extension fields independently from the standard Character Card / lorebook projection.

The existing design therefore treats:

```text
standard Character Card fields
→ interoperable authority

PocketRisu private metadata
→ PocketRisu-owned extension namespace
```

and explicitly requires malformed optional app-extension data not to invalidate valid standard card/lorebook content.

This is credible current design evidence, though the current PocketRisu document remains `DESIGN_NEEDED` and does not itself authorize a production patch.

## 4. Why namespace isolation is useful

Without namespace ownership, app-private fields can accidentally:

```text
collide with standard fields
become required by readers that should ignore them
be mistaken for interoperable truth
be rewritten by unrelated consumers
create undocumented cross-app schema coupling
```

A stable owner namespace provides a clear semantic boundary:

```text
core.foo
→ core-format owner

extensions.appA.foo
→ appA owner

extensions.appB.foo
→ appB owner
```

The namespace is an ownership locator, not proof that the contained data is valid or authoritative beyond its declared scope.

## 5. Why failure containment is useful

When the standard/core projection is independently valid, an optional private parser failure should not destroy unrelated usable data.

Preferred shape:

```text
parse core
→ validate core
→ core usable

parse optional extension
→ valid      → enable extension-dependent capability
→ malformed  → reject/ignore/quarantine extension locally
                 while preserving valid core
```

This preserves dependency-scoped failure handling rather than converting one auxiliary defect into total data loss.

## 6. Critical counterexample — extensions are not always optional

A universal rule such as:

```text
extension parse failure
→ always ignore and continue
```

would be wrong.

A consumer may intentionally require one extension to perform a feature correctly, for example:

```text
valid generic document
+
required app-specific execution plan
```

If the execution-plan extension is malformed, the app may need to fail closed for **that execution capability**.

The correct distinction is:

```text
CORE INDEPENDENTLY VALID?
EXTENSION OPTIONAL FOR THIS CONSUMER?
```

If yes, contain the extension failure.

If no, the extension-dependent capability may fail closed while unrelated independently valid capabilities remain available where the owning contract permits.

## 7. Critical counterexample — a namespace name does not grant authority

Simply storing data under:

```text
extensions.someApp
```

does not prove:

```text
schema validity
current revision
trusted provenance
permission to mutate core fields
canonical truth
```

Namespace placement is an ownership boundary, not an epistemic or persistence authority upgrade.

## 8. Critical counterexample — unknown extension preservation is project-specific

Some formats preserve unknown extension namespaces for round-trip compatibility; others may intentionally drop unsupported extension data.

The common layer must not mandate one universal unknown-extension storage policy.

If a project uses a partial/projected view and later writes it back, `RCR-C10` applies: omitted unknown extension fields must not become deletion authority unless the representation is proven complete/authoritative or explicit destructive intent exists.

But C10 does not require every project to preserve every unknown extension forever.

## 9. Existing Repository Common Rules already own the general behavior

### RCR-H02 — Preserve owning authority; do not manufacture truth

This owns the core namespace boundary:

```text
private convenience/app schema
!=
interoperable core authority
```

A private extension may own its own state but must not silently replace the standard schema owner.

### RCR-H08 — Unresolved conflicts fail closed to explicit uncertainty

This owns dependency-scoped failure handling when extension authority/validity is unresolved.

The affected extension-dependent action should stop rather than guessing, while independent valid scopes need not be invalidated without a dependency reason.

### RCR-D13 — Validate contracts across boundaries

This owns the required end-to-end checks:

```text
core schema ↔ importer/exporter
extension namespace ↔ extension parser
unknown extension ↔ round-trip preservation policy
malformed extension ↔ failure containment behavior
```

### RCR-C10 — Incomplete/projected views do not own deletion-by-omission

C10 supports implementations that expose only a subset of extension namespaces. A partial compatibility view cannot silently delete unrepresented extension data by omission.

Together these rules already provide the repository-wide constitutional discipline without standardizing a universal extension API.

## 10. Selected interoperability guardrail

Use this in projects that actually have an interoperable core plus app-private portable metadata:

```text
When a portable/interoperable representation has a standard core and app-private extension data, keep private data under an owner-scoped extension namespace rather than overloading standard fields.

If the core is independently valid and the extension is optional for the current consumer, parse/validate the extension independently and contain malformed-extension failure to the extension-dependent capability.

Do not let extension presence, namespace placement, or successful round-trip create authority over the standard core.
```

This is a domain/interoperability pattern, not a repository-mandated serialized field path.

Projects remain free to use:

```text
data.extensions.<owner>
metadata.<owner>
custom.<owner>
separate sidecar object
separate file/record
```

or another explicit owner-scoped representation if their format contract requires it.

## 11. Acceptance pattern for extension-capable formats

When a project adds or modifies a private portable extension, verify at least:

1. who owns the standard/core schema;
2. who owns the extension namespace;
3. whether the extension is optional or required for each consumer/capability;
4. whether standard/core readers can ignore the private extension safely;
5. whether malformed private data is failure-contained when core remains independently valid;
6. whether required extension-dependent actions fail closed when extension validity is unavailable;
7. whether unknown extension namespaces follow the owning round-trip policy;
8. whether partial/projected writers preserve unowned extension data under C10 where applicable;
9. whether legacy aliases normalize into one current live owner rather than creating duplicate authorities;
10. whether tests cover valid core + malformed extension, unknown extension, and round-trip behavior.

## 12. SimCore applicability

Current SimCore 3.0M Source Intelligence does not serialize persistent private source metadata into a shared interoperable host schema.

Therefore this review:

```text
DOES NOT activate Candidate C
DOES NOT authorize host message extension writes
DOES NOT authorize persistence/export changes
DOES NOT authorize runtime implementation
```

A future SimCore use case could arise if an owning host/export format contains:

```text
standard host message/document
+
SimCore private source metadata
```

Then a child design should require:

```text
host/core fields remain host-owned
SimCore private data is explicitly namespaced or sidecar-scoped
malformed SimCore metadata cannot invalidate an otherwise-valid host record unless that consumer specifically requires the metadata
extension-dependent source capability fails closed when its own metadata is invalid
unknown/unowned metadata is preserved according to the host/write contract
```

Presentation CSS namespaces such as source-family DOM selectors are a different problem and do not count as serialized extension-schema evidence.

## 13. Promotion decision

```text
NEW RCR = NO
EXTENSION-NAMESPACE UNIVERSAL PATH = REJECT
FAILURE-CONTAINMENT UNIVERSAL IGNORE = REJECT
DOMAIN / INTEROP GUARDRAIL = KEEP
PRIMARY COMMON OWNERS = H02 + H08 + D13
C10 SUPPORT = YES, WHEN PARTIAL/PROJECTED WRITEBACK EXISTS
SIMCORE INPUT = FUTURE-ONLY
```

Revisit promotion only if multiple independent registered projects repeatedly need a common rule that existing authority/failure/boundary rules cannot express without ambiguity.

If promotion is ever needed, promote an ownership/dependency principle rather than a particular path such as `data.extensions.<app>`.

## 14. Transaction scope

This review is documentation/policy only.

```text
repository common-rule body = UNCHANGED
runtime change               = NONE
schema implementation        = NONE
storage implementation       = NONE
network behavior             = NONE
SimCore implementation       = NONE
release change               = NONE
production change            = NONE
```
