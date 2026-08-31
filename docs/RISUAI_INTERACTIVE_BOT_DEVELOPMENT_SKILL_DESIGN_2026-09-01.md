# RisuAI Interactive Bot Development Skill Design — 2026-09-01

Status: **DESIGN COMPLETE — DOCS ONLY / NO SKILL INSTALLATION OR ACTIVATION AUTHORIZED**

Scope: design a reusable repository skill from the user-supplied `New.zip` project template and its RisuAI development guides. This document is a design artifact only. It does not install a skill, change any plugin/runtime/release authority, run the supplied build script, or upload the user artifact into the repository.

## 1. Source authority reviewed

User-supplied artifact:

```text
New.zip
SHA-256: ea451fd3cdc82edada44e3826928f156cb1f2668483e89812bdc55745a0c9881
files inspected: 25
```

Highest-value source files inside the artifact:

```text
CLAUDE.md
build.ps1
가이드/PROJECT_GUIDE.md
가이드/핵심_패턴_가이드.md
가이드/문법가이드_Lua.md
가이드/문법가이드_트리거_스크립트.md
가이드/문법가이드_정규식.md
가이드/문법가이드_로어북.md
가이드/문법가이드_HTML_CSS.md
가이드/CBS_QUICK_REF.md
가이드/REGEX_OPTIMIZATION.md
lua/01_example_button_handler.lua
regex/001_example_sidepanel.json
lorebook/example_data.json
lorebook/example_rp.json
html/00_first_message.html
css/00_wrapper_start.txt
css/01_example_style.css
css/99_wrapper_end.txt
risu/기본변수.txt
globalnote/01_example_system.txt
```

Static artifact checks performed during design:

```text
regex/001_example_sidepanel.json  -> JSON parse PASS, data items 2
lorebook/example_data.json        -> JSON parse PASS, data items 2
lorebook/example_rp.json          -> JSON parse PASS, data items 1
```

Repository context composed with this design:

```text
docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md
docs/REPOSITORY_COMMON_RULES.md
docs/SIMCORE_REFERENCE_ANALYSIS_RISUAI_SCRIPTING_SKILL_2026-08-30.md
.agents/skills/plugin-authority-scan/
```

The existing RisuAI scripting analysis already describes a reference-pack shape around CBS, trigger/regex, Lua, plugin API v3, interop, and schemas. The new artifact contributes something different: a concrete source-layout/build workflow plus repeated interactive-bot development patterns.

## 2. Core design decision

Do **not** build another giant RisuAI syntax encyclopedia.

The preferred shape is a higher-level workflow skill:

```text
risuai-interactive-bot-development
```

whose job is:

```text
read project-local authority
-> classify the requested behavior
-> choose the narrowest correct RisuAI layer
-> plan the cross-layer state/data flow
-> edit source files only within authorized scope
-> run static validation
-> hand off any build/import/device-only validation according to project authority
```

This skill should complement, not replace, focused RisuAI scripting references.

The durable distinction is:

```text
RisuAI scripting reference = what each host surface means
interactive-bot development skill = how to compose those surfaces into a maintainable project change
```

## 3. Project-local authority versus reusable domain knowledge

The user artifact mixes two different kinds of knowledge. The skill must separate them.

### 3.1 Project-local authority — never hard-code as universal RisuAI law

Examples from the supplied `CLAUDE.md` / `PROJECT_GUIDE.md`:

```text
- back up every file before modification
- only implement explicitly requested work
- ask before acting when ambiguous
- do not run build.ps1; user runs it manually
- update CHANGELOG.md / CURRENT_STATUS.md after work
- use a specific backup numbering convention
```

These are valid rules for that template/project, but they are not proven universal RisuAI semantics.

Therefore the future skill must:

1. search for project-local authority such as `CLAUDE.md`, `AGENTS.md`, project guides, build docs, and repo rules;
2. treat those files as the owning workflow contract;
3. never invent a universal build/backup/manual-handoff rule from this one artifact;
4. if project-local authority forbids a build, do not build;
5. if another project explicitly authorizes an automated build, do not let this artifact's manual-build rule override it.

### 3.2 Reusable RisuAI domain knowledge — good skill material

The following patterns are repeatedly stated and demonstrated across the artifact and are strong candidates for skill/reference extraction:

```text
button -> chat variable -> reloadDisplay -> CBS-rendered state
cv_step based multi-step UI
AI output tag -> Lua onOutput parse -> chat variable update -> display/request regex
async alertInput / alertSelect / alertConfirm with async + :await()
prefix-based risu-btn dispatch
Lua-built complex HTML -> chat variable -> CBS getvar rendering
dynamic/local lorebook activation or creation
side-panel display composition
regex display/request separation
CSS in background embedding rather than repeated regex output
RisuAI-specific class-prefix handling for adjacent CSS classes
source folders split by semantic layer, derived risu/ outputs not hand-edited
numbered source ordering for deterministic merge order
```

These should be paraphrased into reusable instructions and tests, not copied as a frozen project template.

## 4. Skill invocation and mutation class

Recommended class:

```text
EXPLICIT / USER-INVOKED WRITER
```

Reason:

- it may modify Lua, regex JSON, lorebook JSON, HTML, CSS, globalnote, or variable source files;
- it may touch several files for one semantic feature;
- project-local build and backup rules may materially differ;
- mutation should not happen merely because the model notices RisuAI-shaped files.

A separate read-only helper may later be split out if repeated evidence supports it, for example:

```text
risuai-project-scan
```

but this design does not require that split initially.

## 5. Proposed skill directory

Repository-native target shape, following current `.agents/skills/` convention:

```text
.agents/skills/risuai-interactive-bot-development/
├── SKILL.md
├── references/
│   ├── layer-selection.md
│   ├── interaction-patterns.md
│   ├── lua-risu.md
│   ├── cbs.md
│   ├── regex.md
│   ├── lorebook.md
│   ├── html-css.md
│   ├── project-layout-and-build-contract.md
│   └── cross-layer-gotchas.md
├── scripts/
│   ├── scan_project.py
│   ├── validate_project.py
│   └── validate_cross_layer.py
├── evals/
│   ├── evals.json
│   └── files/
└── tests/
    ├── test_scan_project.py
    ├── test_validate_project.py
    └── test_validate_cross_layer.py
```

No file above is created by this design.

## 6. `SKILL.md` responsibility

Keep the top-level skill small and procedural. It should not duplicate all RisuAI syntax.

Recommended top-level flow:

### Step 0 — Read local authority

Look for project-local rules and state before suggesting edits.

At minimum, detect when present:

```text
CLAUDE.md
AGENTS.md
PROJECT_GUIDE.md
CURRENT_STATUS.md
CHANGELOG.md
build instructions
source/output folder conventions
```

If local authority conflicts with generic skill guidance, local authority wins unless it conflicts with a repository hard invariant.

### Step 1 — Classify the requested semantic job

Map user intent to the narrowest needed layer(s):

| Need | Preferred layer |
| --- | --- |
| button action / persistent interaction state | Lua + chat variables |
| simple conditional rendering | CBS in HTML/regex output |
| AI-output event extraction | Lua `onOutput` |
| hide/transform display text | display regex/editDisplay |
| reduce request context from old UI tags | request regex/editRequest |
| keyword context / RP instructions | lorebook |
| persistent/global model instruction | globalnote or appropriate lorebook |
| visual style | CSS/background embedding |
| first-screen structure | HTML/first message |

Do not add Lua when CBS/regex is enough, and do not add broad host/plugin authority for a character-local task.

### Step 2 — Draw the state/data flow before editing

For multi-layer work, explicitly state the path.

Examples derived from the artifact:

```text
button
-> onButtonClick
-> setChatVar
-> reloadDisplay
-> CBS reads getvar
-> rendered UI
```

```text
AI response tag
-> onOutput parser
-> chat state
-> editDisplay hides/renders tag
-> editRequest optionally bounds historical tag retention
```

This prevents scattered edits that share no semantic owner.

### Step 3 — Select source files, not generated outputs

If the project uses the supplied split-source convention, edit source locations such as:

```text
lua/
css/
regex/
html/
lorebook/
globalnote/
```

and treat `risu/` as derived output.

However, the skill must learn this from local project authority rather than universally assuming every RisuAI project uses the same tree.

### Step 4 — Apply the minimal pattern

Use the smallest reusable pattern that satisfies the request. Avoid bundling unrelated cleanup or redesign.

### Step 5 — Static validation

Run deterministic checks before declaring source work complete.

### Step 6 — Follow project-owned build/import policy

The skill must not hard-code `build.ps1` execution or prohibition.

Examples:

```text
local authority says build forbidden -> stop before build and hand off exact project-owned step
local authority says automated build is authoritative -> use it if available and authorized
no build authority found -> preserve UNKNOWN and ask only if the build boundary is necessary to complete the task
```

### Step 7 — Real RisuAI acceptance only where needed

Static checks cannot prove actual host rendering, event timing, lorebook activation timing, or import compatibility in all environments. When physical/runtime evidence is required, give a bounded checklist rather than asking the user to debug source manually.

## 7. Progressive-disclosure reference design

### `references/layer-selection.md`

Purpose: fastest routing table from semantic requirement to RisuAI layer.

Should include:

```text
CBS
regex/editDisplay
regex/editRequest
Lua trigger functions
chat variables
lorebook
globalnote
HTML
CSS/background embedding
```

and anti-patterns such as using broad stateful Lua for purely visual substitution.

### `references/interaction-patterns.md`

Paraphrase the supplied ten-pattern guide into compact reusable contracts:

```text
1. button -> variable -> display refresh
2. cv_step multi-step UI
3. AI tag parsing
4. dynamic lorebook activation/generation
5. async input/select/confirm
6. toggle state
7. prefix-index selection
8. Lua-generated HTML through chat variables
9. persistent side-panel rendering
10. prefix-grouped button dispatch
```

Each pattern should contain:

```text
when to use
required layers
state owner
minimal flow
failure/gotcha
validation target
```

not a large copy of the original example code.

### `references/lua-risu.md`

Only RisuAI-specific Lua behavior that the model is likely to get wrong should stay here. Generic Lua 5.4 tutorial content should be omitted unless needed to explain a RisuAI-specific boundary.

High-value items from the artifact include:

```text
triggerId-bearing callbacks
setChatVar / getChatVar
reloadDisplay
onButtonClick
onOutput
risu-trigger callable functions
async wrappers around alertInput/alertSelect/alertConfirm
:await() requirement in those async flows
local lorebook upsert/search behavior described by the source
```

Any host-version-sensitive API statement should be marked as requiring fresh verification before implementation if the project does not pin the host version.

### `references/cbs.md`

Keep only practical syntax used in project work:

```text
getvar/setvar/addvar/setdefaultvar
#if / #when
comparison
basic calculation
arrays/each
chat_index / lastmessageid
special characters
```

The supplied `CBS_QUICK_REF.md` labels itself as a V166 abridged reference. That version marker is mutable host truth and must not be silently treated as current forever.

### `references/regex.md`

Separate effects clearly:

```text
presentation transform
request-context transform
output transform
ordering
historical-retention optimization
```

The artifact's recent-message retention examples are useful patterns, but exact retention counts such as `5` are project tuning values, not common defaults.

### `references/lorebook.md`

Include:

```text
keyword matching concepts
always-active versus inactive entries
decorator-driven activation
stored/local lorebook pattern
Lua-driven activation/generation
reported one-turn delay caveat from the supplied source
```

The one-turn-delay statement is source-derived and should remain a caveat to verify against the target RisuAI version when it matters.

### `references/html-css.md`

Include source-derived RisuAI constraints and gotchas:

```text
prefer shared CSS/background embedding over repeated inline style injection via regex
JavaScript script tags not part of this project pattern
avoid blank-line-sensitive HTML layouts according to the supplied parser guidance
adjacent-class x-risu- prefix handling described by the source
component/source CSS separation
```

Version-sensitive parser behavior should be rechecked when a target project contradicts the reference.

### `references/project-layout-and-build-contract.md`

This reference should explain the *template convention*, not claim it is a host requirement.

Template convention observed:

```text
numbered split sources
-> deterministic lexical merge
-> derived risu/* import files
```

The supplied `build.ps1`:

```text
merges CSS/Lua/HTML/globalnote by sorted filename
extracts Regex/Lorebook data arrays
writes BOM-less output
creates lorebook folder entries with generated GUIDs for data-* / rp-* folders
```

Important design warning:

The current Regex/Lorebook merge logic finds the `"data"` member and brackets with string `IndexOf` / `LastIndexOf`, and lorebook folder assignment adds a `folder` property by string surgery before the last brace. The future common skill must **not** canonize that implementation as a safe universal parser. Treat it as template behavior. Any replacement/validator should parse JSON structurally.

### `references/cross-layer-gotchas.md`

Highest-value gotchas to keep always near the workflow:

```text
project-local authority may forbid build or require backups
risu/ may be derived and overwritten by build
async alert APIs need the async/await pattern described by the source
UI state needs one semantic owner; do not independently mutate the same state in several layers
AI tags can affect visible output and request context differently
request-context cleanup must not remove durable semantic state needed for later turns
lorebook activation timing may not be same-turn
CSS adjacent-class parsing has RisuAI-specific behavior in the supplied guide
exact host syntax/version claims can go stale
```

## 8. Deterministic helper scripts

The first implementation should prefer validators over a replacement builder.

### 8.1 `scripts/scan_project.py`

Read-only.

Proposed output: structured JSON containing discovered authority and project surfaces.

Example fields:

```json
{
  "authority_files": [],
  "source_dirs": [],
  "derived_dirs": [],
  "build_files": [],
  "risu_surfaces": {
    "lua": true,
    "regex": true,
    "lorebook": true,
    "html": true,
    "css": true,
    "globalnote": true
  }
}
```

No guessed default paths should be reported as present.

### 8.2 `scripts/validate_project.py`

Static structural checks only.

Candidate checks supported by the artifact:

```text
JSON parse for regex/lorebook files
expected top-level object/data shapes when the project uses that format
filename ordering/duplicate numbering warnings
CSS wrapper start/end presence when local project convention requires them
BOM detection where project build contract requires BOM-less source/output
no direct generated-output edit in a diff when risu/ is locally marked derived
```

Do not turn stylistic preferences into hard errors unless local authority marks them mandatory.

### 8.3 `scripts/validate_cross_layer.py`

This is the most valuable future script.

Candidate cross-layer checks:

```text
risu-btn values have a reachable button-handler branch or explicitly generic prefix handler
risu-trigger function names exist in Lua source
chat variables referenced by getvar/setChatVar can be inventoried across layers
cv_step states referenced by UI can be compared with transition writers
AI tag formats in globalnote can be compared with Lua parsers and display/request regexes
regex comment numbering can be checked for duplicate identifiers
CSS classes emitted by HTML/regex/Lua can be compared with declared style classes as advisory evidence
```

These checks should report `ERROR`, `WARN`, or `UNKNOWN`; they must not invent missing semantics.

## 9. Why no replacement build script in v1

The supplied `build.ps1` is useful evidence of the template's build contract, but a generic builder is not the right first reusable asset.

Reasons:

1. some projects may use a different build layout;
2. local authority may intentionally require manual build;
3. the current JSON merge implementation is string-based rather than structural;
4. lorebook folder IDs are generated during build, which may affect exact-byte reproducibility;
5. actual RisuAI import/runtime compatibility is not proven by static file concatenation alone.

First prove read-only scan + structural/cross-layer validation. A builder may be designed later from real multi-project evidence.

## 10. Eval plan

The skill is not ready for common installation until it proves value over the baseline.

### Eval 1 — button and step transition

Prompt class:

```text
add a start button that moves a setup screen from step 0 to step 1
```

Expected behavior:

```text
chooses Lua + chat variable + display/CBS path
keeps one state owner
adds/updates only required source files
reloads display after state mutation when needed
```

### Eval 2 — async player-name editor

Prompt class:

```text
let the user edit their name from the UI
```

Expected behavior:

```text
uses risu-trigger callable function
uses async wrapper and :await() for alertInput per supplied source
validates empty/null-like result before state write
refreshes UI after accepted input
```

### Eval 3 — AI status tag pipeline

Prompt class:

```text
AI emits a status tag; keep the latest status in variables but hide the tag from the screen
```

Expected behavior:

```text
globalnote/output-format instruction considered if required
Lua parses semantic state
presentation hides tag separately
request cleanup is not added unless requested/evidence-backed
```

### Eval 4 — dynamic lorebook

Prompt class:

```text
activate character RP instructions after the user selects that character
```

Expected behavior:

```text
chooses lorebook + Lua activation pattern
accounts for the source-reported timing caveat
never promises same-turn host behavior without runtime evidence
```

### Eval 5 — CSS/parser gotcha

Prompt class:

```text
add active/inactive visual states to an existing component
```

Expected behavior:

```text
reads existing project CSS first
uses local styling conventions
applies the supplied RisuAI adjacent-class prefix rule when applicable
avoids pushing shared style blocks into repeated regex output
```

### Eval 6 — local build prohibition

Fixture contains the supplied style of `CLAUDE.md` with explicit build prohibition.

Expected behavior:

```text
skill does not run build
reports source validation complete
hands off only the locally authorized build/import step
```

### Eval 7 — opposite authority case

Fixture explicitly authorizes an existing automated build command.

Expected behavior:

```text
skill does not inherit the supplied artifact's manual-build prohibition
follows fixture-local authority
```

This eval is essential to prove the skill separated project policy from RisuAI domain knowledge.

### Eval 8 — near miss / trigger negative

Prompt class:

```text
write a generic standalone Lua sorting function
```

Expected behavior:

```text
skill should not trigger merely because the word Lua appears
```

## 11. Objective assertions

Candidate machine/human assertions across evals:

```text
- no generated-output path edited when fixture marks it derived
- no build run when fixture forbids it
- build may run only when fixture authorizes it and test harness provides it
- all modified JSON files parse
- requested risu-btn has a matching exact/prefix Lua handler
- requested risu-trigger function exists
- state variable naming is consistent across relevant layers
- no unrelated layer is modified
- no new API/version claim appears without a source/reference basis
- runtime-only outcomes are labelled pending until host evidence exists
```

Run `with_skill` versus `without_skill` or versus the previous skill version. The skill should earn its context cost by reducing wrong-layer choices, cross-layer mismatches, and policy violations.

## 12. Trigger-description design

Proposed intent, not final wording:

```text
Use this skill when modifying or designing a RisuAI interactive character/bot project that composes Lua trigger scripts, chat variables, CBS, regex transforms, lorebook, first-message HTML, CSS/background embedding, or global notes. Use it for cross-layer UI interactions, state flows, AI-output tag parsing, dynamic lorebooks, or maintaining split RisuAI project source. Do not use it for generic Lua/HTML/CSS work unrelated to RisuAI.
```

Trigger evals should include positive paraphrases that do not explicitly say `RisuAI` when the repository/project files clearly establish the domain, plus near-miss negatives for generic Lua, regex, HTML, and chatbot prompts.

## 13. Promotion path

Recommended sequence:

```text
DESIGN (this document)
-> original/paraphrased skill draft
-> validator unit tests
-> 2-3 synthetic evals first
-> full 8-case eval set with baseline
-> one real RisuAI project pilot
-> actual RisuAI import/render/interaction validation where needed
-> second distinct project pilot
-> only then consider repository-wide common skill promotion
```

Do not promote merely because the template is comprehensive.

## 14. Relationship to existing RisuAI scripting reference work

The repository already contains an analysis of a RisuAI scripting skill pack with progressive references for CBS, trigger/regex, Lua, interop, schemas, and plugins.

Preferred future relationship:

```text
existing scripting knowledge/reference concepts
        +
this artifact's concrete interactive project patterns
        +
repository skill methodology / common authority rules
        ↓
risuai-interactive-bot-development workflow skill
```

Avoid maintaining two independent copies of the same API catalog. If an implementation phase begins, first inventory the existing archived/reference material and decide which references can be safely reused, paraphrased, or freshly verified.

## 15. Design verdict

```text
PROMISING
```

Best first implementation slice:

```text
SKILL.md
+ layer-selection.md
+ interaction-patterns.md
+ cross-layer-gotchas.md
+ scan_project.py
+ validate_project.py
+ validate_cross_layer.py
+ a small eval set
```

Defer in v1:

```text
generic replacement build system
automatic RisuAI import
browser/device automation
full RisuAI API encyclopedia
plugin API v3 expansion when the target job is character-local
automatic migration of arbitrary legacy bot projects
```

Final principle:

> **The reusable value of the supplied project is not its exact folder tree or its manual-build policy. It is the repeated cross-layer method: choose the least-power RisuAI surface, keep one semantic state flow, edit maintainable source rather than derived output, validate the connections between layers, and defer host-only truth to real RisuAI evidence.**
