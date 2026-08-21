import json
import os
import re
from pathlib import Path

version = os.environ['VERSION']
release_name = os.environ['RELEASE_NAME']
release_commit = os.environ['RELEASE_COMMIT']
release_blob = os.environ['RELEASE_BLOB']

manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['production_version'] = version
manifest['release_name'] = release_name
manifest['release_branch'] = 'release-simcore'
manifest['release_commit'] = release_commit
manifest['release_blob'] = release_blob
priority_by_version = {
    '0.63.54': 'SAFE_ENVELOPE_STRUCTURAL_BOUNDARY_RECONCILE_VALIDATION',
    '0.63.55': '2M_MAJOR_M2_MECHANICAL_BOUNDARY_REFACTOR',
    '0.63.56': '2M_MAJOR_M2_1_LIVE_VALIDATION',
    '0.63.57': '06357_CURRENT_TIMELINE_AUTHORITY_LIVE_VALIDATION',
    '0.63.58': '06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION',
}
if version in priority_by_version:
    manifest['current_priority'] = priority_by_version[version]
manifest['provider_cache_status'] = manifest.get('provider_cache_status', 'UNVERIFIED')
manifest['managed_by'] = '.github/workflows/simcore-release-state-sync.yml'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
begin = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'
if dev.count(begin) != 1 or dev.count(end) != 1:
    raise SystemExit('CURRENT_DEVELOPMENT production snapshot markers missing/ambiguous')

validation_status_by_version = {
    '0.63.55': 'VALIDATED_REAL_LONG_CHAT',
}
validation_status = validation_status_by_version.get(version, 'PENDING_REAL_LONG_CHAT')

snapshot = f'''{begin}
## Current Production Snapshot

- Product: SimCore
- Version: `{version}`
- Release: `{release_name}`
- Release branch: `release-simcore`
- Release commit: `{release_commit}`
- Release blob: `{release_blob}`
- Validation status: `{validation_status}`
- Primary optimization target: `{manifest.get('current_priority', 'PROMPT_PREFIX_STABILITY')}`
- Provider cache: `{manifest.get('provider_cache_status', 'UNVERIFIED')}`

This block is machine-managed after each production release update.
{end}'''
dev = re.sub(re.escape(begin) + r'.*?' + re.escape(end), snapshot, dev, count=1, flags=re.S)

if version == '0.63.54' and '### v0.63.54 Safe-Envelope Structural Boundary Reconcile implementation' not in dev:
    verified_insert = '''## VERIFIED

### v0.63.53 same-runtime representation-drift A/B completed

Runtime `mt16584l-0okmn1` produced the decisive natural sequence without a user edit between the compared turns:

```text
B_CONTINUE @1850→1851 entry:
SAME_FAST 1 ms · Prior EXACT · Edit origin NONE

output:
CANONICAL 4238:79ba988
FRESH_CHAT 4237:88402e3
Δchars -1 · OUTPUT_MISMATCH · setChat 0
SAFE_ENVELOPE_COMPAT · warnings 0

next B_END @1852 request:
MANUAL_EDIT_REBUILT 4.091 s
Prior representation OUTPUT_MISMATCH
Edit origin REPRESENTATION_DRIFT_CORRELATED
current == prior FRESH_CHAT
vs canonical -1 · vs fresh +0
```

The following exact B_END ended `CANONICAL == FRESH_CHAT` and the next C request returned:

```text
SAME_FAST 0 ms
Prior representation EXACT
Edit origin NONE
current == prior FRESH_CHAT
```

This is strong same-runtime evidence that a tiny visible Fresh representation drift can feed the expensive next-turn reconcile path. It is not described as universal provider/host causation, but it is sufficient for a narrowly gated repair.

### v0.63.54 Safe-Envelope Structural Boundary Reconcile implementation

Source inspection before release invalidated the first trailing-newline hypothesis:

```text
kernel.fingerprintText(...)
→ CRLF normalized to LF
→ trimEnd()

canonical safe envelope candidate
→ .trim()
```

Therefore a fingerprint-level `-1` difference cannot be explained by a document-end CR/LF. v0.63.54 instead tests only deterministic **internal structural separators** emitted by SimCore after a safe envelope is already accepted:

```text
base → COMMUNITY
COMMUNITY → COMMUNITY
COMMUNITY → Knowledge
base → Knowledge
```

The gate is intentionally narrow:

- preamble must be `THOUGHTS_COMPAT`;
- action must already be `STRIPPED`;
- policy must be `SAFE_ENVELOPE_COMPAT`;
- exactly one response-envelope candidate;
- zero Structure warnings;
- safe state commit;
- only one LF from one known `\\n\\n` structural separator is removed in a transient canonical-derived variant;
- only fingerprints/length/delta/kind are retained;
- exactly one variant must equal the already-read `FRESH_CHAT` fingerprint;
- Fresh body is never copied or retained;
- ambiguous/non-boundary differences remain `OUTPUT_MISMATCH` with `setChat 0`.

Successful confirmation is reported as:

```text
Safe-envelope reconcile: CONFIRMED
policy SAFE_BOUNDARY_CONFIRMED
source CANONICAL_BOUNDARY
confirmation FRESH_EXACT
persistent NONE

Safe-envelope boundary:
CANONICAL N → NORMALIZED N-1
Δchars -1
BASE_TO_COMMUNITY / COMMUNITY_TO_COMMUNITY / COMMUNITY_TO_KNOWLEDGE / BASE_TO_KNOWLEDGE
FRESH_EXACT
```

All confirmed Fresh identities (`FRESH_CONFIRMED_SUFFIX`, `BOUNDARY_CONFIRMED_SUFFIX`, `SAFE_BOUNDARY_CONFIRMED`) are treated as `EXACT` by next-turn Edit Origin Attribution.

'''
    if '## VERIFIED\n' not in dev:
        raise SystemExit('CURRENT_DEVELOPMENT VERIFIED marker missing')
    dev = dev.replace('## VERIFIED\n', verified_insert, 1)

    old_gate = '## Current v0.63.53 Live Gate'
    if old_gate in dev:
        dev = dev.replace(old_gate, '## Historical v0.63.53 Live Gate (superseded)', 1)
    historical_gate = '## Historical v0.63.53 Live Gate (superseded)'
    live_gate = '''## Current v0.63.54 Live Gate

Target release:

```text
v0.63.54 — Safe-Envelope Structural Boundary Reconcile
```

After the one reload needed to apply the update, use natural same-runtime turns. No forced edit, malformed output, or cache break is required.

A compact useful sequence is:

```text
C
→ B_START
→ B_CONTINUE
→ B_END
→ C
```

Additional B_CONTINUE turns are useful. Inspect especially:

```text
Preamble provenance
Safe-envelope reconcile
Safe-envelope boundary
Output provenance
Output representation
Deferred mirror
Edit reconcile on the following turn
Prior representation
Edit origin
Warnings / Compatibility diagnostics
```

Expected ordinary safe output:

```text
Safe-envelope reconcile: NOT_APPLICABLE
CANONICAL↔FRESH Δchars +0 · EXACT
Deferred mirror: COMMITTED
```

Desired target evidence for the previously observed `-1` family:

```text
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
Safe-envelope reconcile: CONFIRMED · policy SAFE_BOUNDARY_CONFIRMED
Safe-envelope boundary: CANONICAL N → NORMALIZED N-1 · Δchars -1 · <known boundary> · FRESH_EXACT
Output representation: EXACT
Deferred mirror: COMMITTED
```

Then the following request should remain:

```text
Prior representation: EXACT
Edit reconcile: SAME_FAST
Edit origin: NONE
```

If the Fresh mismatch is not exactly one known structural-LF variant, the correct result remains `REJECTED` / `OUTPUT_MISMATCH` / `setChat 0`. Do not broaden the gate from one real sample.

Cache/history policy remains frozen and provider cache remains `UNVERIFIED`.

'''
    if historical_gate in dev:
        dev = dev.replace(historical_gate, live_gate + historical_gate, 1)
    else:
        dev += '\n\n' + live_gate

dev_path.write_text(dev, encoding='utf-8')

guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')

baseline = re.compile(r'(## \d+\. Current Production Baseline.*?```text\n)(SimCore v[^\n]+)(\n```)', re.S)
guide, count = baseline.subn(rf'\1SimCore v{version} — {release_name}\3', guide, count=1)
if count != 1:
    raise SystemExit(f'guideline Current Production Baseline match count={count}')

# Migrate the old version-specific operational block once. After migration the generic block is
# intentionally stable, and future releases only update the production baseline above.
old_live = re.compile(
    r'## \d+\. Current Primary Optimization Goal.*?(?=## \d+\. Current Hard Freeze)',
    re.S,
)
generic_live = '''## 45. Current Operational Source

Release-specific investigation state is intentionally **not duplicated** in this guideline.

Use:

```text
product-manifest.json
→ machine-readable current release identity / current priority

docs/CURRENT_DEVELOPMENT.md
→ VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN
→ current live validation gate
→ current repair/measurement target
→ next candidate
```

This separation prevents durable development principles from becoming stale when a mini release advances.

## 46. Current Cache Strategy

The durable strategy remains:

```text
PROMPT PREFIX STABILITY
```

Focus first on the earliest request-prefix break and preserve the distinction between local prefix evidence and actual gateway/provider cache evidence.

The exact current diagnostic or repair stage must be read from `docs/CURRENT_DEVELOPMENT.md`, not inferred from an older version-specific section in this file.

'''
if old_live.search(guide):
    guide, live_count = old_live.subn(generic_live, guide, count=1)
    if live_count != 1:
        raise SystemExit(f'guideline live-section migration match count={live_count}')
else:
    if '## 45. Current Operational Source' not in guide or '## 46. Current Cache Strategy' not in guide:
        raise SystemExit('guideline contains neither migratable old live section nor canonical generic live section')

guide_path.write_text(guide, encoding='utf-8')
