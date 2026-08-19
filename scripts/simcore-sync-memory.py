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
manifest['provider_cache_status'] = manifest.get('provider_cache_status', 'UNVERIFIED')
manifest['managed_by'] = '.github/workflows/simcore-release-state-sync.yml'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
begin = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'
if dev.count(begin) != 1 or dev.count(end) != 1:
    raise SystemExit('CURRENT_DEVELOPMENT production snapshot markers missing/ambiguous')

snapshot = f'''{begin}
## Current Production Snapshot

- Product: SimCore
- Version: `{version}`
- Release: `{release_name}`
- Release branch: `release-simcore`
- Release commit: `{release_commit}`
- Release blob: `{release_blob}`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `{manifest.get('current_priority', 'PROMPT_PREFIX_STABILITY')}`
- Provider cache: `{manifest.get('provider_cache_status', 'UNVERIFIED')}`

This block is machine-managed after each production release update.
{end}'''
dev = re.sub(re.escape(begin) + r'.*?' + re.escape(end), snapshot, dev, count=1, flags=re.S)
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
