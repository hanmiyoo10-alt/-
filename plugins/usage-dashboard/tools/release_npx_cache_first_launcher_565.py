from pathlib import Path
import hashlib
import json


ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.64'
NEW_VERSION = '3.0.0-alpha.5.65'
OLD_ENGINE_VERSION = '1.6.17'
NEW_ENGINE_VERSION = '1.6.18'
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


def replace_quoted_constant(path: Path, prefix: str, value: str, label: str) -> None:
    text = read(path)
    if text.count(prefix) != 1:
        raise SystemExit(f'{label}: expected one prefix in {path}')
    start = text.index(prefix) + len(prefix)
    end = text.find("';", start)
    if end < 0:
        raise SystemExit(f'{label}: closing quote missing in {path}')
    write(path, text[:start] + value + text[end:])


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


core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE_VERSION}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE_VERSION}';",
    'required bridge version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE_VERSION}';", f"const VERSION = '{NEW_ENGINE_VERSION}';", 'engine version')
replace_once(
    engine,
    "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.9.0';",
    "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.9.0';\nconst NPX_PREFER_OFFLINE = String(process.env.DEVPASS_BRIDGE_NPX_PREFER_OFFLINE || '1') !== '0';",
    'npx cache policy rollback',
)
replace_once(
    engine,
    """  const fallbackReason = launcher === 'npx-fallback' && String(launcherMeta?.fallbackReason) === 'direct-enoent'
    ? 'direct-enoent'
    : 'none';
  attribution.cliOperations.push({
    label: String(label || 'cli'),
    launcher,
    fallbackReason,
    startOffsetMs:""",
    """  const fallbackReason = launcher === 'npx-fallback' && String(launcherMeta?.fallbackReason) === 'direct-enoent'
    ? 'direct-enoent'
    : 'none';
  const npxPolicy = launcher === 'npx-fallback' && ['prefer-offline','default'].includes(String(launcherMeta?.npxPolicy))
    ? String(launcherMeta.npxPolicy)
    : 'not-applicable';
  attribution.cliOperations.push({
    label: String(label || 'cli'),
    launcher,
    fallbackReason,
    npxPolicy,
    startOffsetMs:""",
    'bounded npx policy metadata',
)
replace_once(
    engine,
    """async function runCliProcess(args, extraEnv = {}) {
  const launcherMeta = { launcher:'direct', fallbackReason:'none' };
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      launcherMeta.launcher = 'npx-fallback';
      launcherMeta.fallbackReason = 'direct-enoent';
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  }, launcherMeta);
}""",
    """async function runCliProcess(args, extraEnv = {}) {
  const launcherMeta = { launcher:'direct', fallbackReason:'none', npxPolicy:'not-applicable' };
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      launcherMeta.launcher = 'npx-fallback';
      launcherMeta.fallbackReason = 'direct-enoent';
      launcherMeta.npxPolicy = NPX_PREFER_OFFLINE ? 'prefer-offline' : 'default';
    }
    const npxArgs = NPX_PREFER_OFFLINE
      ? ['--yes', '--prefer-offline', `@llmgateway/cli@${CLI_VERSION}`, ...args]
      : ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args];
    return runProgram('npx', npxArgs, extraEnv);
  }, launcherMeta);
}""",
    'cache-first npx fallback',
)

diagnostics = SRC / '40-diagnostics.part.js'
replace_once(
    diagnostics,
    """    const counts = { direct:0, npxFallback:0, unknown:0, directEnoent:0 };
    for (const item of operations) {
      const launcher = ['direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      if (launcher === 'direct') counts.direct += 1;
      else if (launcher === 'npx-fallback') counts.npxFallback += 1;
      else counts.unknown += 1;
      if (launcher === 'npx-fallback' && String(item?.fallbackReason) === 'direct-enoent') counts.directEnoent += 1;
    }
    return `direct ${counts.direct} · npx-fallback ${counts.npxFallback} · unknown ${counts.unknown} · direct ENOENT ${counts.directEnoent}`;""",
    """    const counts = { direct:0, npxFallback:0, unknown:0, directEnoent:0 };
    const npxPolicies = new Set();
    for (const item of operations) {
      const launcher = ['direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      if (launcher === 'direct') counts.direct += 1;
      else if (launcher === 'npx-fallback') counts.npxFallback += 1;
      else counts.unknown += 1;
      if (launcher === 'npx-fallback' && String(item?.fallbackReason) === 'direct-enoent') counts.directEnoent += 1;
      if (launcher === 'npx-fallback') {
        const policy = ['prefer-offline','default'].includes(String(item?.npxPolicy)) ? String(item.npxPolicy) : 'not-applicable';
        npxPolicies.add(policy);
      }
    }
    const npxPolicy = npxPolicies.size === 1 ? [...npxPolicies][0] : 'not-applicable';
    return `direct ${counts.direct} · npx-fallback ${counts.npxFallback} · unknown ${counts.unknown} · policy ${npxPolicy} · direct ENOENT ${counts.directEnoent}`;""",
    'npx policy diagnostics',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager engine version')
new_engine_sha = sha256_file(engine)
replace_quoted_constant(manager, "const BUNDLED_ENGINE_SHA256 = '", new_engine_sha, 'manager engine sha')

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE_VERSION
manifest['components']['bridge']['sha256'] = new_engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256_file(RUNTIME / 'bootstrap-bridge-manager.sh')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## Long-term update roadmap\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines memory/roadmap markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.64 — Foreground CLI Launcher Attribution`.

Verified 5.64 foreground evidence:

- A comparable foreground sample ended at about 14.570s. Credits took about 6.967s, 24h account capture about 8.575s, and 24h usage about 7.587s.
- All three foreground source operations followed direct `llmgateway` ENOENT into the existing `npx` fallback, so routine npx-launcher use on the device is VERIFIED.
- The portion of each 7–8.6s interval attributable to npm metadata freshness checks remains UNKNOWN. Launcher attribution alone does not prove that npx is the dominant latency source.

Current release implementation: `3.0.0-alpha.5.65 — Npx Cache-First Launcher`.

5.65 release contract:

- Product becomes `3.0.0-alpha.5.65`; Bridge Engine becomes `1.6.18`; Bridge Manager remains `1.2.6`; snapshot/recent-request contracts remain `1/1`.
- Preserve the existing direct `llmgateway` attempt and fall back only when the direct attempt fails with `ENOENT`.
- The default fallback is exactly `npx --yes --prefer-offline @llmgateway/cli@1.9.0 <original args>`. The CLI package remains pinned to `1.9.0`.
- `DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` restores the exact 5.64 fallback, `npx --yes @llmgateway/cli@1.9.0 <original args>`.
- `prefer-offline` changes only npm package-acquisition freshness policy: cached data skips staleness checks, while missing data may still be fetched. It does not change Credits, Usage, DevPass, or dashboard cache semantics.
- Launcher vocabulary remains bounded to `direct`, `npx-fallback`, and `unknown`; fallback reason remains bounded to `direct-enoent` and `none`; npx policy is bounded to `prefer-offline`, `default`, and `not-applicable`.
- CLI operation attribution remains capped at eight records and exposes no executable path, PATH, HOME, npm cache path, package directory, environment, CLI arguments, token, organization ID, payload, header, or arbitrary error.
- Keep all five existing `runCli()` call sites, both existing `runProgram()` call sites, and the single existing `execFileAsync()` source operation. Add no subprocess, `npm install`, `npm cache` command, version probe, network request, endpoint, or source operation.
- No new `runCli()` call site, network endpoint, or CLI source operation is allowed.
- Keep 24h usage and DevPass Activity on the foreground truth path.
- Preserve the hard CLI concurrency cap and keep already-working behavior unchanged unless the release goal requires touching it.
- Diagnostics expose only sanitized family/scope/range for cache decisions and bounded launcher vocabulary for CLI operations.
- Keep UNKNOWN distinct from known zero.
- Preserve CLI concurrency 2, the `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` rollback, 25-second timeout, 4MB buffer, Credits early-start, shared capture, all TTLs, 24h foreground truth, circuit/recovery, organization fallback, Request Ledger, Cache fidelity, updater, and the rule that UNKNOWN stays distinct from known zero.
- Preserve every 5.63 long-window rule: secondary concurrency 1, 32-key bound, same-key/inFlight deduplication, foreground hold, 30-minute stale ceiling, leaf-only 7d/30d deferral, cold-cache blocking, standalone endpoint blocking, and stale provenance.
- Keep the shared `repo-main-write` lock and monotonic candidate/main/release publisher guard.

5.65 device success evidence to collect:

- Stable Readiness remains READY with Engine `1.6.18`, Manager `1.2.6`, and no active local runtime error.
- Foreground operations show `npx-fallback`, the launcher summary shows `policy prefer-offline`, and the sample has zero new launcher errors.
- Compare several similar cold-ish timer snapshots against the 5.64 baseline. One faster sample is insufficient to claim causality.
- If source and snapshot timings repeatedly fall, npm freshness checking was likely material. If they remain near 5.64, conclude that metadata freshness was not the primary bottleneck and keep its exact latency share UNKNOWN.
- 5.65 makes no guaranteed performance claim; it is a bounded cache-policy experiment with an immediate rollback.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) Npx Cache-First Launcher')
