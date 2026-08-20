import json
import os
import re
from pathlib import Path

version = os.environ['VERSION']
release_name = os.environ['RELEASE_NAME']
release_commit = os.environ['RELEASE_COMMIT']
release_blob = os.environ['RELEASE_BLOB']

root = Path('products/basecore')
manifest_path = root / 'manifest.json'
current_path = root / 'CURRENT_DEVELOPMENT.md'
guidelines_path = root / 'GUIDELINES.md'

manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
prior_version = manifest.get('production_version')
prior_validation = str(manifest.get('validation') or '')
validation_status = prior_validation if prior_version == version and prior_validation.startswith('VALIDATED_') else 'PENDING_REAL_LONG_CHAT'
manifest['production_version'] = version
manifest['release_name'] = release_name
manifest['release_branch'] = 'release-basecore'
manifest['release_commit'] = release_commit
manifest['release_blob'] = release_blob
manifest['status'] = 'production'
manifest['validation'] = validation_status
manifest['managed_by'] = '.github/workflows/basecore-release-state-sync.yml'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

current = current_path.read_text(encoding='utf-8')
begin = '<!-- BASECORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- BASECORE_PRODUCTION_SNAPSHOT:END -->'
if current.count(begin) != 1 or current.count(end) != 1:
    raise SystemExit('BaseCore production snapshot markers missing/ambiguous')

snapshot = f'''{begin}
## Current Production Snapshot

- Product: BaseCore
- Production version: `{version}`
- Release: `{release_name}`
- Release branch: `release-basecore`
- Release commit: `{release_commit}`
- Release blob: `{release_blob}`
- Validation status: `{validation_status}`
- Donor baseline: SimCore `v0.63.56` (historical provenance only)

This block is machine-managed after each BaseCore production release update.
{end}'''
current = re.sub(re.escape(begin) + r'.*?' + re.escape(end), snapshot, current, count=1, flags=re.S)
current_path.write_text(current, encoding='utf-8')

guidelines = guidelines_path.read_text(encoding='utf-8')
gbegin = '<!-- BASECORE_PRODUCTION_BASELINE:BEGIN -->'
gend = '<!-- BASECORE_PRODUCTION_BASELINE:END -->'
if guidelines.count(gbegin) != 1 or guidelines.count(gend) != 1:
    raise SystemExit('BaseCore production baseline markers missing/ambiguous')

baseline = f'''{gbegin}
- Production version: `{version}`
- Release: `{release_name}`
- Release branch: `release-basecore`
- Validation: `{validation_status}`
{gend}'''
guidelines = re.sub(re.escape(gbegin) + r'.*?' + re.escape(gend), baseline, guidelines, count=1, flags=re.S)
guidelines_path.write_text(guidelines, encoding='utf-8')
