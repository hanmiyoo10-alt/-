from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.59'
NEW_VERSION = '3.0.0-alpha.5.60'
ENGINE_VERSION = '1.6.13'
MANAGER_VERSION = '1.2.6'


def read(path: Path) -> str:
    return path.read_text()


def write(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, got {count}')
    write(path, text.replace(old, new, 1))


def replace_all_required(path: Path, old: str, new: str, label: str, minimum: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected >= {minimum} matches in {path}, got {count}')
    write(path, text.replace(old, new))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sync_guidelines_release_state() -> None:
    manifest = json.loads(read(RUNTIME / 'product-manifest.json'))
    current = read(GUIDELINES)
    start = '<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'
    end = '<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'
    if current.count(start) != 1 or current.count(end) != 1:
        raise SystemExit('guidelines release-state markers must each appear exactly once')
    components = manifest.get('components') or {}
    block = '\n'.join([
        start,
        f"- Product: `{manifest['productVersion']}`",
        f"- Bridge Engine: `{components['bridge']['requiredVersion']}`",
        f"- Bridge Manager: `{components['bridgeManager']['version']}`",
        f"- Release branch: `{manifest['releaseBranch']}`",
        '- Source: `plugins/usage-dashboard/runtime/product-manifest.json`',
        end,
    ])
    a = current.index(start)
    b = current.index(end, a) + len(end)
    write(GUIDELINES, current[:a] + block + current[b:])


# 5.60 is release-infrastructure hardening only. Runtime scheduling, capture,
# cache, recovery, payload, parser, and CLI behavior remain byte-for-byte 5.59.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)

engine = RUNTIME / 'bridge-engine.mjs'
engine_sha_before = sha256_file(engine)
engine_text = read(engine)
if f"const VERSION = '{ENGINE_VERSION}';" not in engine_text:
    raise SystemExit(f'expected unchanged engine {ENGINE_VERSION}')

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
if f"const MANAGER_VERSION = '{MANAGER_VERSION}';" not in read(manager):
    raise SystemExit(f'expected unchanged manager {MANAGER_VERSION}')
if f"const BUNDLED_ENGINE_VERSION = '{ENGINE_VERSION}';" not in read(manager):
    raise SystemExit(f'expected unchanged bundled engine {ENGINE_VERSION}')

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
previous_engine_sha = str(manifest['components']['bridge']['sha256'])
if previous_engine_sha != engine_sha_before:
    raise SystemExit('5.59 manifest/engine sha mismatch before 5.60 release')
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = ENGINE_VERSION
manifest['components']['bridge']['sha256'] = engine_sha_before
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

if sha256_file(engine) != engine_sha_before:
    raise SystemExit('5.60 must not modify bridge-engine.mjs')

# Durable memory: keep 5.59 device scheduling evidence and the verified stale
# release-job incident that motivated this infrastructure-only release.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.59 — Snapshot Scheduling Attribution`.

Verified from the 5.59 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.13` and Bridge Manager `1.2.6` were healthy with no local runtime errors or failures.
- Organization discovery stayed `capture-primary · fallback 0 · shared account capture yes`; shared 24h reuse stayed active with dedicated 24h fallback 0.
- Snapshot scheduling telemetry was live and bounded: organizations ran `0→8291ms`; `usageScopes` and `analyticsScopes` started at `8291ms` and ended around `15324–15325ms`.
- The sampled Bridge snapshot was about 15.33s. The exact task timeline verified a serialized root barrier: about 8.29s organization/bootstrap followed by about 7.03s post-root usage/analytics.
- The Bridge ran 3 CLI operations: `credits 1→6973ms`, `devpass-capture-24h 31→8280ms`, then `usage-24h-model 8299→15316ms`; limit 2, peak active 2, queued 0.
- This verified that current primary latency is scheduling/dependency shape rather than CLI queueing; however three cold ~7–8s CLI operations under a hard limit of 2 still require at least two execution waves.
- Snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering, CLI concurrency, CLI timeout, cache TTLs, stale/circuit behavior, capture reuse, fallback behavior, payload semantics, or updater flow.
- Keep 5.58 shared 24h capture coalescing unchanged, including the dedicated 24h fallback only when shared activity is absent.
- `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.

Verified release-infrastructure incident after 5.59 materialization:

- Main materialized validated 5.59, then a delayed 5.58 publisher wrote `release-usage-dashboard` back to 5.58.
- The release branch was manually restored using the exact validated main 5.59 artifact blobs.
- This was a stale release-job race, not a same-file Git merge conflict.
- A shared `repo-main-write` lock remains necessary but is not sufficient by itself; release publishing also needs a monotonic candidate/version guard.

Current release implementation: `3.0.0-alpha.5.60 — Monotonic Release Publish Guard`.

5.60 release contract:

- Bridge Engine remains `1.6.13`; Bridge Manager remains `1.2.6`.
- Runtime scheduling, CLI concurrency, CLI timeout, cache TTLs, stale/circuit behavior, capture reuse, fallbacks, payload semantics, parser `provider-usage-v3`, updater behavior, and Cache Write/TTL UNKNOWN semantics remain unchanged from 5.59.
- Add a fail-closed Local Usage Dashboard publisher guard that compares candidate, current main, and current release manifests using parsed semantic project versions.
- A candidate older than either current main or current release must never publish.
- A candidate newer than current main must fail closed rather than inventing release state.
- If candidate and release versions are equal, Engine, Manager, bootstrap, latest.js, and canonical manifest identity must match; divergence fails closed.
- Malformed/unsupported versions or manifest/product mismatches fail closed.
- Keep the shared `repo-main-write` lock for main writers.
- Archive the recent 5.55–5.59 automatic publisher workflows so they cannot be automatically retriggered from current main; their original behavior remains available in Git history.
- The 5.60 publisher must fetch fresh main/release state immediately before publishing and run the monotonic guard before creating a release commit.

Next step after the 5.60 real-device diagnostic: verify update/health with unchanged Engine 1.6.13, then use the preserved 5.59 timeline evidence to choose the next performance repair in the following design turn.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {ENGINE_VERSION} unchanged, manager {MANAGER_VERSION}) with monotonic release publishing')
