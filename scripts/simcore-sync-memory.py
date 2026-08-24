import argparse
import json
import os
import re
from pathlib import Path


def args():
    p = argparse.ArgumentParser(description='Transitional SimCore release declaration / rollback writer')
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--manifest-only', action='store_true')
    g.add_argument('--legacy-full', action='store_true')
    return p.parse_args()


def required_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f'missing environment: {name}')
    return value


opt = args()
version = required_env('VERSION')
release_name = required_env('RELEASE_NAME')
release_commit = required_env('RELEASE_COMMIT')
release_blob = required_env('RELEASE_BLOB')

manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
previous_release_commit = manifest.get('release_commit')
production_identity_changed = previous_release_commit != release_commit
manifest['production_version'] = version
manifest['release_name'] = release_name
manifest['release_branch'] = 'release-simcore'
manifest['release_commit'] = release_commit
manifest['release_blob'] = release_blob
if production_identity_changed:
    manifest['validation_status'] = 'PENDING_REAL_LONG_CHAT'
manifest['provider_cache_status'] = manifest.get('provider_cache_status', 'UNVERIFIED')
manifest['managed_by'] = '.github/workflows/simcore-release-state-sync.yml'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if opt.manifest_only:
    print('SimCore legacy declaration: manifest-only')
    raise SystemExit(0)

# --legacy-full is rollback-only after RS2-2 cutover. The rollback procedure must
# restore the legacy CURRENT_DEVELOPMENT markers and un-enroll the Guidelines
# canonical block before invoking this mode. There is deliberately no implicit
# full mode; explicit mode required.
dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
begin = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'
if dev.count(begin) != 1 or dev.count(end) != 1:
    raise SystemExit('legacy-full requires exactly one legacy CURRENT_DEVELOPMENT marker pair')

validation_status = manifest.get('validation_status', 'PENDING_REAL_LONG_CHAT')
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
dev_path.write_text(dev, encoding='utf-8')

guide_path = Path('docs/SIMCORE_GUIDELINES.md')
guide = guide_path.read_text(encoding='utf-8')
if '<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->' in guide or '<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->' in guide:
    raise SystemExit('legacy-full requires Guidelines canonical baseline markers to be rolled back first')
baseline = re.compile(r'(## \d+\. Current Production Baseline.*?```text\n)(SimCore v[^\n]+(?:\nRelease commit: [^\n]+)?)(\n```)', re.S)
guide, count = baseline.subn(rf'\1SimCore v{version} — {release_name}\3', guide, count=1)
if count != 1:
    raise SystemExit(f'legacy-full guideline baseline match count={count}')
guide_path.write_text(guide, encoding='utf-8')
print('SimCore legacy declaration: legacy-full rollback writer')
