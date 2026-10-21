# SimCore Risu Final Target Design v1 - 2026-10-12

Status: **FINAL TARGET DESIGN RECORDED / PRE-IMPLEMENTATION / NO RUNTIME, RELEASE, DEPLOYMENT, OR PRODUCTION AUTHORITY**

This document records the consolidated target for SimCore Risu after the project grew beyond the boundaries of a single SimCore plugin.

It is a design freeze for the target product shape. It does not claim that the product, migration, native host integration, donor transplants, or release system have been implemented or validated.

## 1. Product definition

SimCore Risu is the planned private flagship Risu-lineage application that integrates SimCore Fusion natively at the host level.

The intended product is not merely:

```text
Risu + one large plugin
```

The intended product is:

```text
Risu-lineage host
+ native SimCore Fusion
+ native Memory / Knowledge / Reference
+ native Worldline / Save integration
+ LightBoard Presentation
+ Private / Public Wiki
+ Canon Alignment
+ integrated diagnostics / model routing / migration
= SimCore Risu
```

The compatibility SimCore Fusion Plugin remains a deliberate secondary adapter for ordinary Risu/PocketRisu hosts.

## 2. Repository topology

Target repository roles are:

```text
PocketRisu/PocketRisu
        |
        | official upstream
        v
hanmiyoo10-alt/PocketRisu
        |
        | owner integration / staging fork
        v
hanmiyoo10-alt/myang
        |
        | future flagship application repository
        v
SimCore Risu
```

The repository `hanmiyoo10-alt/-` remains responsible for:
- current SimCore plugin production authority;
- Fusion semantic contracts and architecture records;
- donor research and traceability;
- compatibility-plugin coordination;
- cross-product coordination and authority locators.

After proven migration, `products/simcore-risu/` in `hanmiyoo10-alt/-` should become a thin external-product locator and coordination root rather than a duplicate application source tree.

## 3. MYANG migration prerequisite

The owner explicitly requires the existing contents of MYANG to be moved out before SimCore Risu work begins there.

Point-in-time evidence observed on 2026-10-12:

```text
repository: hanmiyoo10-alt/myang
visibility: private
main: 3297a5745740ebb7962d875c5fa96ba8806c7e32
root:
- README.md
- repo-cockpit-aggregator/
```

This evidence is historical after the repository changes. Current MYANG truth must be re-read before any migration work.

Hard prerequisite:

```text
MYANG existing-content relocation
        |
        | must complete first
        v
MYANG SimCore Risu authority/bootstrap
        |
        v
native implementation work
```

Until that prerequisite is proven complete:
- do not move SimCore Risu source into MYANG;
- do not create MYANG release or production authority for SimCore Risu;
- do not delete or overwrite existing MYANG content by assumption;
- do not treat the target design as implementation completion.

## 4. Host strategy

The preferred lineage is:

```text
official PocketRisu
-> owner PocketRisu fork
-> SimCore Risu distribution in MYANG
```

The owner PocketRisu fork is the preferred integration/staging surface for:
- upstream change intake;
- isolated host modifications;
- compatibility experiments;
- upstream contribution preparation;
- preserving already proven owner-specific PocketRisu behavior.

MYANG is the intended product repository for the final integrated application, not merely another staging fork.

## 5. Architectural principle

The core invariant remains:

```text
one semantic field
-> one canonical writer
-> versioned contract
-> deterministic validation
-> explicit provenance
-> no hidden fallback owner
```

Native host integration may provide stronger lifecycle evidence than the plugin API, but it does not change semantic ownership.

## 6. Five canonical planes

SimCore Fusion remains organized into five canonical planes.

### 6.1 Control

Owns:
- Mode A / B_START / B_CONTINUE / B_END / C;
- Broadcast lifecycle and end authority;
- protagonist and secondary-character authority;
- current-input secondary activation;
- exposure, secret, front, and public/private utilization policy;
- final permission to use Memory, Reference, Canon Alignment, and Presentation material.

Must not own:
- deterministic live world state;
- long-term memory storage;
- retrieval indexes.

### 6.2 Runtime

Owns deterministic current world state:
- vars;
- time;
- Korean age/year progression;
- scenario;
- fronts and secrets;
- checks and fight;
- actions, events, choices;
- checkpoints;
- board, messenger, shop, quest, party, calendar and similar live systems.

Runtime truth is not reconstructed from narrative memory.

### 6.3 Memory & Knowledge

Owns:
- Source Ledger / Reconciler;
- StoryWorldline Registry;
- Semantic Observer output records;
- Knowledge Registry;
- Curated Overlay;
- Reference Library;
- retrieval, ranking, indexing, jobs and audit;
- derived Canon Alignment projections.

It must not overwrite Runtime truth or Control exposure policy.

### 6.4 Presentation

LightBoard-family presentation owns:
- COMMUNITY;
- platform selection/taxonomy;
- platform voice and culture;
- posts, comments, replies;
- Reaction values and continuity;
- Hot / Digested behavior;
- memes, controversies, returning commenters;
- Scene / Episode presentation;
- news, board, messenger/status/annotation surfaces where applicable;
- Public Wiki rendering.

Presentation state is not canonical Runtime or Knowledge truth.

### 6.5 Composer / Host

Owns:
- one host lifecycle owner;
- exact host snapshot capture;
- prompt/context ordering;
- token budget;
- model/job routing;
- SecondaryOutputTask routing;
- CompositionReceipt diagnostics;
- final Runtime tail placement for model requests.

Composer does not become a semantic truth database.

## 7. Host adapters

Fusion Core remains host-agnostic.

```text
Fusion Core
├ Compatibility Plugin Adapter
└ Native SimCore Risu Adapter
```

### Compatibility Plugin Adapter

Purpose:
- ordinary Risu/PocketRisu compatibility;
- migration/equivalence testing;
- fallback portability;
- preservation of current production SimCore migration path.

### Native SimCore Risu Adapter

Purpose:
- exact request lifecycle ownership;
- exact edit/delete/reroll/branch/save/load events;
- first-class SQL/job/model/UI integration;
- removal of prompt scanning and pluginStorage workarounds where native equivalents exist;
- direct SourceRevision and StoryWorldline binding.

The native adapter becomes the flagship path only after proof.

## 8. Source revision and acceptance

SourceLineage and StoryWorldline remain separate identity axes.

Assistant output lifecycle:

```text
generated output
-> PROVISIONAL
-> exact revision observed active in a later authoritative continuation
-> ACCEPTED
```

A rerolled, deleted, abandoned or superseded candidate before acceptance must not leave durable ghost state.

Normal durable consumers of generated material require ACCEPTED evidence:
- Knowledge;
- worldline-scoped exposure;
- Canon Alignment divergence;
- Public Wiki;
- durable Presentation continuity.

Same-turn LightBoard may consume explicitly aired/public provisional material for immediate presentation, but durable publication waits for acceptance.

## 9. StoryWorldline

StoryWorldline tracks fictional continuity separately from source edit history.

It owns:
- root;
- branch;
- checkpoint create/restore;
- activate/deactivate;
- import/reconciliation topology.

Erased-future evidence remains historical provenance but is ineligible for ordinary active-worldline generation unless an explicit carry rule permits it.

Legacy exposure semantics become:

> once durably exposed, persistent inside the applicable StoryWorldline unless an explicit carry rule says otherwise.

## 10. Modes

### Mode A

Normal narrative path:

```text
User
-> Control
-> Runtime + Memory + Knowledge + Reference
-> Composer
-> Main Model
-> Narrative
```

LightBoard is normally idle unless explicitly requested.

### B_START / B_CONTINUE

- Main model renders broadcast prose.
- Control determines public/airable scope.
- LightBoard renders Scene/community presentation when required.
- Broadcast terminal authority is denied until B_END.

### B_END

- Main model renders terminal broadcast output.
- LightBoard receives distinct Scene and Episode scopes.
- Prefer one batched LightBoard generation call when quality permits.
- Durable exposure/publication settles after ACCEPTED proof.

### Mode C

- no narrative-world advancement;
- Presentation over the active SourceRevision, StoryWorldline and Exposure scope;
- mature qualified target may use zero main-model calls and one LightBoard call;
- current production path remains until equivalence is proven.

## 11. Knowledge

Canonical durable semantic path:

```text
SourceRevision
-> SemanticObservation
-> KnowledgePatch
-> Knowledge Registry / Curated Overlay
```

Manual corrections, pins, identity merges and explicit owner edits belong to Curated Overlay and must survive automated rebuilds according to their authority.

Legacy `<Knowledge>` is a compatibility projection during migration, not the long-term canonical memory database.

## 12. Reference Library

Reference Library owns original/canon/lore/reference evidence and its provenance.

Source classes remain explicit. For example:
- original work;
- official material;
- curated owner reference;
- community wiki;
- fan interpretation.

A retrieved community page does not silently become official canon.

## 13. Canon Alignment

LoreQAcustom contributes a derived capability family, not a new canonical plane.

```text
Reference Library
+ accepted current-world Knowledge / Runtime read projection
+ active StoryWorldline
-> Canon Alignment Projection
```

It may derive:

### Canon Position
- current original-work position;
- medium/numbering scheme;
- confidence and provenance;
- previous-position anchoring.

### AU Divergence
- durable current states that differ from canon;
- canon evidence and current-world evidence;
- latest-state and dedupe semantics.

### Temporal / Epistemic Guard
- secrets already true at the current canon point;
- who may know or not know them;
- future-canon information excluded from early use.

### Canon Progression
Next canon beats may be classified:
- AS_CANON;
- CHANGED;
- IMPOSSIBLE.

Canon Alignment cannot overwrite Runtime, activate SourceRevision, create StoryWorldlines, elevate exposure, or convert community claims into canon.

## 14. Dual Wiki

One underlying Knowledge system and one shared document/rendering family expose two epistemic projections.

### Private Wiki

Owner-only projection.

May show:
- hidden facts;
- real identity;
- aliases;
- relationships;
- private character knowledge;
- unrevealed events;
- manual corrections/pins;
- read-only Runtime projections;
- explicitly separated inactive-worldline history/forensics.

Editing Private Wiki produces typed Curated Overlay changes rather than silently rewriting Runtime.

### Public Wiki

In-world/public encyclopedia.

Pipeline:

```text
Knowledge Registry
-> active StoryWorldline
-> Control Exposure/Visibility Gate
-> Public Wiki
```

Only ACCEPTED, active-worldline, publishable/exposed assertions may appear.

Secret/private/backstage facts remain absent even if Private Wiki knows them.

Generated public article text is derived Presentation, not canonical truth.

Shared renderer features may include:
- infobox;
- TOC;
- headings;
- tables;
- quotes;
- lists;
- footnotes;
- internal links;
- related/recent docs;
- search and navigation.

## 15. LightBoard

LightBoard is the canonical Presentation donor/engine.

It owns the target behavior for:
- COMMUNITY;
- platform taxonomy;
- platform-specific voice/culture;
- comments/replies;
- reaction labels and values;
- reaction history/heat;
- Hot/Digested behavior;
- overseas presentation;
- memes/controversies;
- returning commenters;
- Scene/Episode public reaction;
- Public Wiki presentation.

The legacy Core_Ruleset platform wording is product-intent evidence, not a style ceiling.

## 16. Legacy Core_Ruleset migration

The old prompt is treated as the original product-intent prototype.

Move:
- activation/protagonist/secondary/keyword config -> native Control;
- user-control policy -> Control;
- Korean age/year progression -> Runtime;
- A/B/C and Broadcast lifecycle -> Control;
- exposure/secret rules -> Control + SourceRevision acceptance + StoryWorldline;
- COMMUNITY/platform/reaction -> LightBoard;
- durable Knowledge -> Knowledge Registry;
- prose/style -> replaceable Narrative Profile.

Legacy prompt scanning remains compatibility/import only until proven migration, then retires.

## 17. Model-call policy

Avoid donor-specific model swarms.

Logical roles:
1. Main narrative model;
2. Unified Semantic Observer;
3. LightBoard Presentation generator;
4. Embedding/indexing model;
5. optional bounded Reference Research job profile.

Normal invariant:
- ordinary semantic interpretation <= 1 per narrative source;
- independent Memory critic = 0 when SemanticObservation is reusable;
- automatic retry chains = 0 normally;
- LLM reranker/critic = escalation-only;
- Canon Alignment research runs only when invalidated or explicitly needed.

Typical targets:

```text
A:
1 main + 0/1 observer

B_START / B_CONTINUE:
1 main + 0/1 observer + 0/1 LightBoard

B_END:
1 main + 0/1 observer + preferably 1 batched LightBoard

C mature target:
0 main + 1 LightBoard
```

## 18. Storage target

Target distinction:

### Host/app storage
Uses the selected Risu-lineage host storage architecture for character/chat/settings/app state, subject to host audit.

### Fusion long-horizon store
Target:
- PostgreSQL;
- pg_trgm;
- pgvector as rebuildable semantic selector;
- content-addressed local reference files.

Long-horizon canonical families include:
- source revisions;
- StoryWorldline events;
- semantic observations;
- Knowledge Registry;
- Curated Overlay;
- reference metadata;
- Canon Alignment projections/cache;
- Presentation continuity/projections;
- Wiki projection metadata;
- jobs/audit.

Vector indexes do not own semantic truth.

## 19. Donor allocation

Every intentionally selected donor keeps a traceable destination until proven equal-or-better supersession.

### Future donor acquisition priority

SimCore Risu is intended to become the owner's primary Risu environment. Accordingly, future donor discovery prioritizes the host ecosystem:

- materially distinct RisuAI/PocketRisu forks, modified distributions, forks-of-forks and Risu-derived applications enter the donor-candidate registry by default when discovered;
- host/mobile/server/Termux/storage/performance/save/context/memory/UI/product-integration variants are in scope;
- unrelated new standalone plugins are discovered selectively when they address a proven product gap;
- this priority does not demote already selected plugin donors;
- donor registration is inventory/provenance first, not automatic integration.

Broad Risu fork/mod ecosystem discovery is tracked by #3645.

### Owner-private snapshot intake

The owner's private Google Drive `포켓리스` folder is an additional donor source. Artifacts and repository links intentionally placed there enter the donor-candidate inventory, with deduplication and explicit provenance. Private Drive locators remain outside the public repository. Drive snapshot intake is tracked by #3647.

Owner placement is product-intent evidence. The artifact does not need to contribute to Fusion core.

### Product Feature & Experience donor lane

SimCore Risu is the target home application, so donors may contribute optional first-class product experiences in addition to core architecture.

Examples include:
- RPG/game systems;
- fishing/gacha/card systems;
- music/rhythm/interactive entertainment;
- NPC/entity managers;
- readers/editors/search tools;
- lorebook and import/export utilities;
- provider/model-management tools;
- other owner-selected Risu ecosystem features.

Target boundary:

```text
Fusion Core / Host Truth
        |
        | typed read projections + action/promotion gates
        v
Product Feature & Experience Modules
        |
        v
SimCore Risu integrated UI
```

Feature modules may remain optional and independently enabled. They do not gain direct authority over canonical Runtime/Knowledge merely because they are built into the app. World-affecting results must cross explicit Control/Runtime/Knowledge boundaries.

| Donor | Target contribution |
| --- | --- |
| Current SimCore | Control semantics, host safety, current behavioral baseline |
| Archived SimCore v1.13 | deterministic Runtime engine and live subsystem concepts |
| NMOS | Source Ledger, revision reconciliation, provenance, retrieval patterns |
| Archive Center | canon/lore/reference lifecycle |
| NyoruMemory | reviewable events/facts/relations/identity and correction UX |
| HypaPlus | node, pin/favorite, embedding/manual workflow lessons |
| risupot | People/Wiki schemas, identity merge, curation, visibility lessons |
| RisuBard | bounded Composer, request manifest, Wiki UX, save/load, durability/migration |
| LightBoard family | Presentation, COMMUNITY, Reaction, Public Wiki |
| LoreQAcustom | Canon Alignment, AU divergence, temporal guard, canon progression |
| HaejeokRisu | host performance, SQL/storage, lazy-loading, Termux/cross-platform lessons |
| RisuAI | parent Risu host lineage, ecosystem/data/plugin compatibility reference |
| PocketRisu | primary self-hosted upstream, ecosystem compatibility and host lineage |
| hanmiyoo10-alt/PocketRisu | owner integration/staging fork and proven local host modifications |
| Legacy Core_Ruleset | original product intent and migration requirements |
| SocialRisu | interactive social client, Surface-to-World promotion, world-native social network, Media/Asset Pipeline, social privacy and migration durability |

### Owner private donor-source policy

For owner-supplied plugin/donor artifacts used only in the owner's private SimCore Risu build, the owner has explicitly authorized source-level inspection, adaptation and selective transplant.

Private adaptation does not make donor code a second canonical owner. Reused code must be moved under the correct Fusion/SimCore Risu semantic owner.

This project policy does not assert public redistribution rights. Original provenance, author/project identity, upstream links and applicable license/copyright notices remain recorded. Any future public/shared distribution remains separately license/provenance-gated.

### MYANG donor/update hub

After the MYANG existing-content relocation prerequisite and MYANG authority bootstrap:

- MYANG becomes the private donor intake/update/distribution hub;
- original upstream URLs remain preserved for provenance and release comparison;
- owner-facing update/install URLs for adapted private plugin builds should point to MYANG-controlled endpoints/manifests;
- upstream releases are compared and integrated into MYANG before reaching the private build;
- native SimCore Risu capabilities use the unified SimCore Risu updater rather than retaining independent donor self-updaters;
- operational donor version/update state must not be duplicated between MYANG and `hanmiyoo10-alt/-`.

Full policy:
`products/simcore-risu/DONOR_UPDATE_HUB_POLICY_V1_2026-10-13.md`

Public/shared distribution remains license/provenance-gated.

## 20. Unified product UI

Target top-level surfaces:

```text
SimCore Risu

Chat

Runtime

Memory

People / Wiki
├ Private Wiki
└ Public Wiki

References

Canon Alignment
├ Current Canon Position
├ AU Divergences
├ Temporal Guard
└ Canon Progression

Surfaces / LightBoard

Experiences / Tools
├ Games / RPG
├ Social / Community
├ Creative / Media
├ Editors / Readers
└ Utilities

Worldlines / Saves

Models

Diagnostics

Import / Backup
```

Diagnostics should expose bounded provenance, source/worldline identity, projection freshness, exposure decisions, token budgets, model/job calls and task lineage without leaking private material into public views.

## 21. Frozen Fusion contracts

The host product must preserve the frozen semantic contract set:

1. HostTurnSnapshot.v1
2. RuntimeStateCapsule.v1
3. SourceRevision.v1
4. StoryWorldlineEvent.v1
5. SemanticObservation.v1
6. KnowledgePatch.v1
7. MemoryQuery.v1
8. MemoryPacket.v1
9. ReferencePacket.v1
10. SecondaryOutputTask.v1

Derived/non-truth projections may include:
- CompositionReceipt.v1;
- CanonAlignmentProjection.v1;
- WikiProjection private/public profiles;
- Presentation projection/cache receipts.

These do not create additional canonical semantic writers.

## 22. Migration and implementation sequence

The current gate order is:

```text
FINAL TARGET DESIGN RECORD                 DONE
        |
        v
MYANG EXISTING-CONTENT RELOCATION          REQUIRED / NOT YET PROVEN
        |
        v
MYANG PRODUCT AUTHORITY BOOTSTRAP
        |
        v
HOST BASELINE AUDIT
official PocketRisu / owner fork / HaejeokRisu / RisuBard
        |
        v
NATIVE HOST-FIT SPIKE
HostTurnSnapshot / SourceRevision / StoryWorldline
        |
        v
TRUNK + UPSTREAM STRATEGY FREEZE
        |
        v
NATIVE SHELL + MIGRATION SKELETON
        |
        v
FUSION CORE NATIVE ADAPTER
        |
        v
MEMORY / KNOWLEDGE / REFERENCE / CANON ALIGNMENT
        |
        v
LIGHTBOARD + DUAL WIKI
        |
        v
UNIFIED UI / DIAGNOSTICS / IMPORT / BACKUP
        |
        v
FIXTURE + REPLAY QUALIFICATION
        |
        v
BOUNDED REAL-DEVICE ACCEPTANCE
        |
        v
RELEASE SYSTEM DESIGN
        |
        v
FIRST QUALIFIED SIMCORE RISU RELEASE
```

No later stage is considered complete before its required predecessor is proven.

## 23. Cutover rule

Current SimCore plugin production remains independent until a separately proven cutover.

Moving application source to MYANG does not itself:
- retire `plugin:simcore`;
- change `release-simcore`;
- authorize a SimCore Risu release;
- move PocketRisu Helper Mod ownership;
- prove native equivalence.

The compatibility Fusion Plugin remains supported as a separate adapter even after native flagship qualification unless explicitly retired later.

## 24. Final product definition

SimCore Risu is the planned owner-controlled Risu-lineage flagship application that natively integrates deterministic world state, source lineage, fictional worldlines, memory, structured knowledge, canon alignment, public/private knowledge projections, LightBoard presentation, save/restore, model routing and diagnostics while preserving explicit semantic ownership and provenance.

Short form:

> The world remembers and computes. The models render. The owner can inspect and curate the truth.

## 25. Tracking

- Fusion architecture: #2961
- LoreQAcustom donor: #3599
- SimCore Risu host/repository strategy: #3600
- independent product-root bootstrap: #3601
