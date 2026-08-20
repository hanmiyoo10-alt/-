from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.60'
NEW_VERSION = '3.0.0-alpha.5.61'
OLD_ENGINE_VERSION = '1.6.13'
NEW_ENGINE_VERSION = '1.6.14'
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


# Product/plugin metadata and required bundled engine.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE_VERSION}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE_VERSION}';",
    'required bridge version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE_VERSION}';", f"const VERSION = '{NEW_ENGINE_VERSION}';", 'bridge engine version')

# Credits raw data used to be private to loadOrgs(). Share it as a 30s bounded
# in-flight/cache entry so the snapshot may start one safe Credits 24h usage
# request as soon as the Credits CLI releases a lane. Stale fallback is disabled
# for this seed so it cannot silently invent a currently-selectable org. Keep the
# bootstrap on its own default circuit family so one Credits failure is not
# double-counted against the pre-existing organizations circuit through nested
# cached() wrappers.
replace_once(
    engine,
    """  accountCapture: 30_000,
  devpassStatus: 30_000,""",
    """  accountCapture: 30_000,
  creditsBootstrap: 30_000,
  devpassStatus: 30_000,""",
    'credits bootstrap ttl',
)
replace_once(
    engine,
    "name !== 'accountCapture' && ageMs <= CACHE_STALE_MAX_MS",
    "name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS",
    'credits bootstrap circuit-open no-stale behavior',
)
replace_once(
    engine,
    "const allowStale = name !== 'accountCapture';",
    "const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';",
    'credits bootstrap refresh-error no-stale behavior',
)
replace_once(
    engine,
    """async function loadAccountCapture() {
  // The official orgs session can safely collect status plus 24h activity/logs
  // through the existing capture tap. Keeping the same accountCapture cache key
  // preserves its 30s TTL, no-stale fallback policy, and circuit semantics.
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'));
}

async function cached(name, loader) {""",
    """async function loadAccountCapture() {
  // The official orgs session can safely collect status plus 24h activity/logs
  // through the existing capture tap. Keeping the same accountCapture cache key
  // preserves its 30s TTL, no-stale fallback policy, and circuit semantics.
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'));
}

async function loadCreditsBootstrap() {
  return cached('creditsBootstrap', async () => runCli(['credits', '--json']));
}

async function cached(name, loader) {""",
    'shared credits bootstrap loader',
)

# loadOrgs retains the exact capture-primary + plain-org fallback contract, but
# joins the shared Credits bootstrap instead of owning a private Credits CLI call.
replace_once(
    engine,
    """    const [captureResult, rawCredits] = await Promise.all([
      capturePromise,
      runCli(['credits', '--json']),
    ]);""",
    """    const [captureResult, rawCredits] = await Promise.all([
      capturePromise,
      loadCreditsBootstrap(),
    ]);""",
    'loadOrgs shared credits bootstrap',
)

# Early-start selection is deliberately conservative. Use only explicit source
# IDs with a real Credits amount. An exact requested ID is safe; otherwise there
# must be exactly one eligible Credits ID. Ambiguous rows preserve the 5.60 root
# behavior. Explicit non-default/deleted rows are rejected when the source says so.
marker = "async function loadOrgs() {\n"
engine_text = read(engine)
if engine_text.count(marker) != 1:
    raise SystemExit('loadOrgs insertion marker missing')
helper = """function creditsBootstrapCandidate(rawCredits, requestedOrgId = '') {
  const rows = firstArray(rawCredits, ['organizations', 'credits', 'data', 'items', 'results']);
  const ids = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '').trim();
    const amount = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining', 'amount'], null));
    const explicitKind = pick(row, ['kind', 'type'], null);
    const explicitStatus = pick(row, ['status'], null);
    if (!id || amount === null) continue;
    if (explicitKind !== null && String(explicitKind) !== 'default') continue;
    if (explicitStatus !== null && String(explicitStatus) === 'deleted') continue;
    if (!ids.includes(id)) ids.push(id);
  }
  const requestedId = String(requestedOrgId || '').trim();
  if (requestedId && ids.includes(requestedId)) return { id: requestedId, mode: 'requested-exact' };
  if (ids.length === 1) return { id: ids[0], mode: 'single-credit-id' };
  return null;
}

function startCreditsUsageEarly(rawCreditsPromise, requestedOrgId = '') {
  if (CLI_CONCURRENCY < 2) return Promise.resolve(null);
  return Promise.resolve(rawCreditsPromise)
    .then((rawCredits) => {
      const candidate = creditsBootstrapCandidate(rawCredits, requestedOrgId);
      if (!candidate) return null;
      return usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')
        .then(() => candidate.id)
        .catch(() => null);
    })
    .catch(() => null);
}

"""
write(engine, engine_text.replace(marker, helper + marker, 1))

# Start Credits bootstrap before the organization task. loadOrgs joins the same
# in-flight Credits request while account capture occupies the second lane. When
# Credits finishes first, safe 24h usage can take the newly free lane. The normal
# usageScopes call still starts only after full org selection and joins the same
# usage cache/in-flight key when the selected ID matches.
replace_once(
    engine,
    """  const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);""",
    """  const creditsBootstrapPromise = loadCreditsBootstrap();
  startCreditsUsageEarly(creditsBootstrapPromise, requestedCreditsOrgId);
  const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);""",
    'snapshot credits usage early start',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager bundled engine version')
new_engine_sha = sha256_file(engine)
manager_text = read(manager)
sha_prefix = "const BUNDLED_ENGINE_SHA256 = '"
start = manager_text.find(sha_prefix)
if start < 0:
    raise SystemExit('manager bundled engine sha marker missing')
end = manager_text.find("';", start + len(sha_prefix))
if end < 0:
    raise SystemExit('manager bundled engine sha terminator missing')
manager_text = manager_text[:start] + sha_prefix + new_engine_sha + manager_text[end:]
write(manager, manager_text)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE_VERSION
manifest['components']['bridge']['sha256'] = new_engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# Durable current memory. Preserve the long-term roadmap/Product Vision that were
# added after 5.60 by replacing only the current-memory section.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## Long-term update roadmap\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory/roadmap section markers are invalid')
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
- This verified that queueing is not the primary bottleneck. In the sampled cold shape, Credits finished about 1.31s before account capture, leaving one CLI lane idle until root completion.
- Snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Keep 5.58 shared 24h capture coalescing unchanged, including the dedicated 24h fallback only when shared activity is absent.
- `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Preserve the 5.57 organization recovery contract: if account capture fails or has no usable organization rows, fall back to the prior plain orgs list --json path; if capture and that fallback are both empty, `No organizations found in CLI output` remains an error.

Verified release-infrastructure state from 5.60:

- `3.0.0-alpha.5.60 — Monotonic Release Publish Guard` deployed with Bridge Engine `1.6.13` unchanged and Bridge Manager `1.2.6`.
- P22 verifies stale-candidate blocking, same-version artifact divergence failure, and the archived 5.55–5.59 automatic publishers.
- The shared `repo-main-write` lock remains necessary, and the monotonic candidate/main/release guard remains mandatory for all later publishers.

Current release implementation: `3.0.0-alpha.5.61 — Credits Usage Early Start`.

5.61 release contract:

- Bridge Engine becomes `1.6.14`; Bridge Manager remains `1.2.6`.
- Share the existing Credits CLI read through a bounded 30s `creditsBootstrap` cache/in-flight entry; do not add another Credits CLI call to the normal snapshot.
- Start one Credits 24h usage prefetch only with an exact requested Credits ID or exactly one explicit eligible Credits ID from the real Credits source. Ambiguous/missing IDs keep the 5.60 root-gated path.
- `creditsBootstrap` must not serve stale fallback data. Its dedicated circuit family must not double-count failures against the existing organizations circuit. UNKNOWN/source fidelity remains unchanged.
- Default CLI concurrency remains 2. `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` disables early-start and restores the previous serial execution mode.
- Full organization selection remains authoritative for the returned payload. If the early candidate does not equal the final selected Credits org, the early result is not used by `usageScopes`.
- Preserve account capture, plain orgs fallback, shared 24h DevPass capture, cache TTLs other than the explicit aligned Credits bootstrap entry, existing organizations circuit semantics, CLI timeout 25s, Request Ledger/provider cache fidelity, parser `provider-usage-v3`, updater behavior, and 5.60 monotonic release integrity.
- Existing snapshot timeline/CLI-operation diagnostics are sufficient for device verification; do not add raw org IDs, CLI args, payloads, headers, tokens, or capture paths.

5.61 device success evidence to collect:

- Functional health remains READY/ok with no new active runtime errors.
- On an eligible cold sample, `usage-24h-model` should start at or shortly after the Credits CLI ends and before `organizations` ends.
- CLI runs should remain bounded with limit 2 and no duplicate Credits call.
- If the Credits source is ambiguous, early-start may be absent by design and the previous root-gated behavior is correct.
- Compare snapshot/CLI timings against the 5.59 baseline without claiming telemetry-independent speedup from a single noisy sample.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) Credits Usage Early Start')
