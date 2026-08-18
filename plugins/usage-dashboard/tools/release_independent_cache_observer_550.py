from pathlib import Path
import hashlib
import json
import re

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.49'
NEW_VERSION = '3.0.0-alpha.5.50'
OLD_ENGINE = '1.6.5'
NEW_ENGINE = '1.6.6'
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


def remove_block(path: Path, start: str, end: str, label: str) -> None:
    text = read(path)
    start_at = text.find(start)
    if start_at < 0:
        raise SystemExit(f'{label}: start marker missing in {path}')
    end_at = text.find(end, start_at + len(start))
    if end_at < 0:
        raise SystemExit(f'{label}: end marker missing in {path}')
    write(path, text[:start_at] + text[end_at:])


# ---------------------------------------------------------------------------
# 1) Product/runtime contract: Local Usage owns cache observation itself.
# Provider Manager was only a reference implementation and is no longer a
# runtime dependency. SimCore is untouched.
# ---------------------------------------------------------------------------
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(core, '//@allowed-ipc provider-manager\n', '', 'remove Provider Manager IPC permission')
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE}';",
    'required bridge engine version',
)
remove_block(
    core,
    "  const PROVIDER_MANAGER_PLUGIN = 'provider-manager';\n",
    "  const DEFAULTS = {",
    'Provider Manager constants',
)
remove_block(
    core,
    "  const providerManagerCacheRuntime = {\n",
    "  function bridgeLifecycleMode() {",
    'Provider Manager runtime state',
)

# ---------------------------------------------------------------------------
# 2) Remove the 5.48/5.49 Provider Manager client completely. The independent
# observer is fed by Local Usage's own authenticated, sanitized LLMGateway /logs
# capture in the bundled bridge engine.
# ---------------------------------------------------------------------------
bridge_io = SRC / '20-bridge-io.part.js'
bridge_text = read(bridge_io)
pm_start = bridge_text.find('\n  function providerManagerCacheMetricKnown(usage) {')
if pm_start < 0:
    raise SystemExit('Provider Manager bridge client marker missing')
write(bridge_io, bridge_text[:pm_start].rstrip() + '\n')

refresh = SRC / '30-refresh-runtime.part.js'
replace_once(
    refresh,
    '        scheduleProviderManagerCacheEnrichment(state.data, refreshEpoch, refreshLifecycleGeneration);\n',
    '',
    'remove Provider Manager post-refresh scheduler',
)

bootstrap = SRC / '90-bootstrap.part.js'
replace_once(
    bootstrap,
    """      if(providerManagerCacheProbeTimer){clearTimeout(providerManagerCacheProbeTimer);providerManagerCacheProbeTimer=null;}\n      for(const pending of providerManagerCachePending.values()){try{clearTimeout(pending.timer);pending.resolve({ok:false,status:'disposed',error:'runtime disposed',rows:[]});}catch(_){}}\n      providerManagerCachePending.clear();\n      providerManagerCacheProbePromise=null;\n      providerManagerCacheRuntime.inFlight=false;\n""",
    '',
    'remove Provider Manager unload cleanup',
)

# ---------------------------------------------------------------------------
# 3) Preserve provider cache semantics instead of conflating generic cached
# tokens with explicit cache-read tokens.
# ---------------------------------------------------------------------------
request_normalize = SRC / '10-request-normalize.part.js'
replace_once(
    request_normalize,
    """    const explicitCachedInputTokens = metric([\n      'cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens',\n      'usage.cachedInputTokens','usage.cached_input_tokens','usage.cachedTokens','usage.cached_tokens'\n    ]);\n    const cacheReadInputTokens = metric([\n      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens',\n      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',\n      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',\n      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'\n    ]);""",
    """    const explicitCachedInputTokens = metric([\n      'cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens',\n      'usage.cachedInputTokens','usage.cached_input_tokens','usage.cachedTokens','usage.cached_tokens',\n      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',\n      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',\n      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'\n    ]);\n    const cacheReadInputTokens = metric([\n      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens'\n    ]);""",
    'generic cached tokens are not explicit cache reads',
)

analytics = SRC / '16-usage-analytics.part.js'
replace_once(
    analytics,
    "      cacheReadInputTokens:num(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens ?? row?.cachedTokens ?? row?.cached_tokens) ? Number(row.cacheReadInputTokens ?? row.cache_read_input_tokens ?? row.cachedTokens ?? row.cached_tokens) : null,",
    "      cacheReadInputTokens:num(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens) ? Number(row.cacheReadInputTokens ?? row.cache_read_input_tokens) : null,",
    'provider/model generic cached tokens are not cache read',
)
replace_once(
    analytics,
    "    const cacheReadInputTokens = num(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) ? Number(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) : null;",
    "    const cacheReadInputTokens = num(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) ? Number(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) : null;",
    'aggregate generic cached tokens are not cache read',
)

ledger = SRC / '14-request-ledger.part.js'
replace_once(
    ledger,
    """        cacheCreation1hTokens:cacheMetrics.cacheCreation1hTokens,\n        cacheReadRatio:cacheMetrics.cacheReadRatio,\n        requestedServiceTier,""",
    """        cacheCreation1hTokens:cacheMetrics.cacheCreation1hTokens,\n        cacheReadRatio:cacheMetrics.cacheReadRatio,\n        cacheMetricSource:String(recentRequestValue(row, ['cacheMetricSource','cache_metric_source'], '') || ''),\n        requestedServiceTier,""",
    'request cache metric source normalization',
)
replace_once(
    ledger,
    """          cacheCreation1hTokens:num(row.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : (num(current?.cacheCreation1hTokens) ? Number(current.cacheCreation1hTokens) : null),\n          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),\n          requestedServiceTier:""",
    """          cacheCreation1hTokens:num(row.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : (num(current?.cacheCreation1hTokens) ? Number(current.cacheCreation1hTokens) : null),\n          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),\n          cacheMetricSource:String(row.cacheMetricSource || current?.cacheMetricSource || ''),\n          requestedServiceTier:""",
    'preserve cache metric source in ledger',
)
replace_once(
    ledger,
    """    const read = s.readKnown > 0 || s.cacheReadInputTokens > 0 ? Number(s.cacheReadInputTokens).toLocaleString() : '—';\n    const write = s.writeKnown > 0 || s.cacheCreationInputTokens > 0 ? Number(s.cacheCreationInputTokens).toLocaleString() : '—';\n    const ratio = num(s.readRatio) ? `${Number(s.readRatio).toFixed(1)}%` : '—';\n    return `HIT ${hitRate} · Read ${read} · Write ${write} · Read ratio ${ratio}`;""",
    """    const cached = s.tokenKnown > 0 || s.cachedInputTokens > 0 ? Number(s.cachedInputTokens).toLocaleString() : '—';\n    const read = s.readKnown > 0 || s.cacheReadInputTokens > 0 ? Number(s.cacheReadInputTokens).toLocaleString() : '—';\n    const write = s.writeKnown > 0 || s.cacheCreationInputTokens > 0 ? Number(s.cacheCreationInputTokens).toLocaleString() : '—';\n    const ratio = num(s.readRatio) ? `${Number(s.readRatio).toFixed(1)}%` : '—';\n    return `HIT ${hitRate} · Cached ${cached} · Read ${read} · Write ${write} · Read ratio ${ratio}`;""",
    'show cached total separately from explicit reads',
)

# ---------------------------------------------------------------------------
# 4) Diagnostics describe the independent observer and no longer mention PM.
# ---------------------------------------------------------------------------
diag = SRC / '40-diagnostics.part.js'
remove_block(
    diag,
    '  function providerManagerCacheDiagnosticText() {\n',
    '  function diagText() {',
    'Provider Manager diagnostic helper',
)
replace_once(
    diag,
    '  function diagText() {',
    """  function cacheObserverDiagnosticText(rows) {\n    const list = Array.isArray(rows) ? rows : [];\n    const tokenRows = list.filter(row => [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num));\n    const sources = [...new Set(tokenRows.map(row => String(row?.cacheMetricSource || '')).filter(Boolean))].sort();\n    const readKnown = list.filter(row => num(row?.cacheReadInputTokens)).length;\n    const writeKnown = list.filter(row => num(row?.cacheCreationInputTokens)).length;\n    return `independent · protocol cache-observability-v1 · parser provider-usage-v1 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · parser sources ${sources.join(',') || 'none'}`;\n  }\n\n  function diagText() {""",
    'independent cache observer diagnostic helper',
)
replace_once(
    diag,
    """      `Provider Manager cache IPC: ${providerManagerCacheDiagnosticText()}`,\n      `Optional integrations: Provider cache ${providerManagerCacheRuntime.status === 'ready' ? 'ready' : providerManagerCacheRuntime.inFlight ? 'probing' : 'degraded'} · primary refresh independent`,\n      `Cache semantics: request HIT rate != token Read ratio · unknown stays unknown · source request metadata / Bridge aggregates / Provider Manager IPC v1 when available`,""",
    """      `Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}`,\n      `Cache semantics: request HIT rate != token Read ratio · cached total != explicit Read · unknown stays unknown · source request metadata / Bridge aggregates / independent provider usage parser`,""",
    'independent cache observer diagnostic lines',
)

# ---------------------------------------------------------------------------
# 5) Bridge Engine 1.6.6: extend the existing privacy-preserving /logs capture.
# Parser semantics are clean-room equivalents of the reference PM behavior:
# Anthropic has explicit read/create (+5m/1h); Gemini exposes cached-content;
# OpenAI-compatible exposes cached/write details. Generic cached totals never
# become explicit reads unless the upstream field explicitly says read.
# ---------------------------------------------------------------------------
engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE}';", f"const VERSION = '{NEW_ENGINE}';", 'bridge engine version')
replace_once(
    engine,
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v7');",
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v8');",
    'capture tap marker',
)
replace_once(
    engine,
    "    const allowed = ['id','provider','requestCount','inputTokens','outputTokens','totalTokens','cost'];",
    "    const allowed = ['id','provider','requestCount','inputTokens','outputTokens','totalTokens','cachedTokens','cacheWriteTokens','cost'];",
    'aggregate model cache fields',
)

parser = r'''  // CACHE_OBSERVER_PARSER_START
  const cacheFinite = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : null;
  };

  const cachePath = (root, path) => {
    let value = root;
    for (const part of String(path).split('.')) value = value?.[part];
    return value;
  };

  const cacheNumber = (root, paths) => {
    for (const path of paths) {
      const value = cacheFinite(cachePath(root, path));
      if (value !== null) return value;
    }
    return null;
  };

  const cacheUsageCandidates = (row) => {
    const candidates = [
      row?.usage,
      row?.usageMetadata,
      row?.usage_metadata,
      row?.response?.usage,
      row?.response?.usageMetadata,
      row?.response?.usage_metadata,
      row?.metadata?.usage,
      row,
    ];
    return candidates.filter((value, index) => value && typeof value === 'object' && !Array.isArray(value) && candidates.indexOf(value) === index);
  };

  const normalizeProviderCacheUsageObject = (usage) => {
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;

    const inputTokens = cacheNumber(usage, ['inputTokens','input_tokens','promptTokens','prompt_tokens','promptTokenCount','prompt_token_count']);
    const outputTokens = cacheNumber(usage, ['outputTokens','output_tokens','completionTokens','completion_tokens','candidatesTokenCount','candidates_token_count']);
    const totalTokens = cacheNumber(usage, ['totalTokens','total_tokens','totalTokenCount','total_token_count']);

    const explicitRead = cacheNumber(usage, ['cacheReadInputTokens','cache_read_input_tokens']);
    let explicitWrite = cacheNumber(usage, ['cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens','input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens']);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cache_creation.ephemeral_1h_input_tokens']);
    if (explicitWrite === null && (write5m !== null || write1h !== null)) explicitWrite = Number(write5m || 0) + Number(write1h || 0);

    const explicitCached = cacheNumber(usage, ['cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens']);
    const geminiCached = cacheNumber(usage, ['cachedContentTokenCount','cached_content_token_count']);
    const openAiCached = cacheNumber(usage, ['input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens']);

    let source = '';
    if (explicitRead !== null || cachePath(usage, 'cache_creation') || cachePath(usage, 'cache_creation_input_tokens') !== undefined) source = 'anthropic-usage';
    else if (geminiCached !== null || cachePath(usage, 'promptTokenCount') !== undefined || cachePath(usage, 'prompt_token_count') !== undefined) source = 'gemini-usage';
    else if (cachePath(usage, 'prompt_tokens_details') || cachePath(usage, 'prompt_tokens') !== undefined) source = 'openai-chat-usage';
    else if (cachePath(usage, 'input_tokens_details') || cachePath(usage, 'input_tokens') !== undefined) source = 'openai-responses-usage';
    else if (cachePath(usage, 'cachedTokens') !== undefined || cachePath(usage, 'cacheWriteTokens') !== undefined || cachePath(usage, 'cached_tokens') !== undefined || cachePath(usage, 'cache_write_tokens') !== undefined) source = 'llmgateway-usage';
    else if (explicitCached !== null || explicitWrite !== null) source = 'normalized-usage';

    let cachedInputTokens = explicitCached;
    if (cachedInputTokens === null && geminiCached !== null) cachedInputTokens = geminiCached;
    if (cachedInputTokens === null && openAiCached !== null) cachedInputTokens = openAiCached;
    if (cachedInputTokens === null && (explicitRead !== null || explicitWrite !== null)) cachedInputTokens = Number(explicitRead || 0) + Number(explicitWrite || 0);

    const hasCacheMetric = [cachedInputTokens, explicitRead, explicitWrite, write5m, write1h].some(value => value !== null);
    if (!hasCacheMetric) return null;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cachedInputTokens,
      cacheReadInputTokens: explicitRead,
      cacheCreationInputTokens: explicitWrite,
      cacheCreation5mTokens: write5m,
      cacheCreation1hTokens: write1h,
      source: source || 'normalized-usage',
    };
  };

  const normalizeProviderCacheUsage = (row) => {
    for (const candidate of cacheUsageCandidates(row)) {
      const normalized = normalizeProviderCacheUsageObject(candidate);
      if (normalized) return normalized;
    }
    return null;
  };
  // CACHE_OBSERVER_PARSER_END

'''
replace_once(
    engine,
    '  const sanitizeLogs = (value) => {\n',
    parser + '  const sanitizeLogs = (value) => {\n',
    'independent provider cache parser insertion',
)
replace_once(
    engine,
    """      return {\n        timestamp,\n        requestNumber: String(requestNumber),\n        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),\n        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),\n        cost: row.cost ?? null,\n        totalTokens: row.totalTokens ?? row.total_tokens ?? null,\n        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,\n        requestedServiceTier: requestedTier.value,""",
    """      const cacheUsage = normalizeProviderCacheUsage(row);\n      return {\n        timestamp,\n        requestNumber: String(requestNumber),\n        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),\n        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),\n        cost: row.cost ?? null,\n        totalTokens: cacheUsage?.totalTokens ?? row.totalTokens ?? row.total_tokens ?? null,\n        inputTokens: cacheUsage?.inputTokens ?? null,\n        outputTokens: cacheUsage?.outputTokens ?? null,\n        cachedInputTokens: cacheUsage?.cachedInputTokens ?? null,\n        cacheReadInputTokens: cacheUsage?.cacheReadInputTokens ?? null,\n        cacheCreationInputTokens: cacheUsage?.cacheCreationInputTokens ?? null,\n        cacheCreation5mTokens: cacheUsage?.cacheCreation5mTokens ?? null,\n        cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens ?? null,\n        cacheMetricSource: cacheUsage?.source ?? '',\n        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,\n        requestedServiceTier: requestedTier.value,""",
    'sanitized logs cache projection',
)
replace_once(
    engine,
    """      cost: finite(row.cost),\n      totalTokens: finite(row.totalTokens),\n      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,\n      requestedServiceTier:""",
    """      cost: finite(row.cost),\n      totalTokens: finite(row.totalTokens),\n      inputTokens: finite(row.inputTokens),\n      outputTokens: finite(row.outputTokens),\n      cachedInputTokens: finite(row.cachedInputTokens),\n      cacheReadInputTokens: finite(row.cacheReadInputTokens),\n      cacheCreationInputTokens: finite(row.cacheCreationInputTokens),\n      cacheCreation5mTokens: finite(row.cacheCreation5mTokens),\n      cacheCreation1hTokens: finite(row.cacheCreation1hTokens),\n      cacheMetricSource: String(row.cacheMetricSource || ''),\n      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,\n      requestedServiceTier:""",
    'captured recent cache propagation',
)

# ---------------------------------------------------------------------------
# 6) Manager stays 1.2.6, but its product/bundled-engine descriptor advances so
# existing managed installs self-sync Engine 1.6.6 from the Local Usage channel.
# ---------------------------------------------------------------------------
manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE}';", 'manager bundled engine version')
engine_sha = hashlib.sha256(read(engine).encode()).hexdigest()
manager_text = read(manager)
manager_text, count = re.subn(
    r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
    f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
    manager_text,
    count=1,
)
if count != 1:
    raise SystemExit('manager bundled engine sha: expected 1 match')
write(manager, manager_text)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != OLD_VERSION:
    raise SystemExit(f"product manifest drifted: {manifest.get('productVersion')}")
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts must remain v1')
if manifest['components']['bridgeManager']['version'] != MANAGER_VERSION:
    raise SystemExit('manager implementation version must stay 1.2.6')
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(read(manager).encode()).hexdigest()
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# Active forward-contract tests should follow the bundled engine contract. Keep
# legacy PM-path tests intact as historical fixtures; 5.50 CI no longer runs them.
for test in TESTS.glob('*.cjs'):
    if test.name in {'p8-provider-manager-cache-ipc.cjs', 'p9-provider-manager-cache-hardening.cjs'}:
        continue
    text = read(test)
    if OLD_ENGINE in text:
        write(test, text.replace(OLD_ENGINE, NEW_ENGINE))

# Final invariants before the build concatenates modules into latest.js.
for path in [core, bridge_io, refresh, bootstrap, diag]:
    text = read(path)
    if 'providerManagerCache' in text or 'Provider Manager cache IPC' in text:
        raise SystemExit(f'Provider Manager runtime dependency remains in {path}')
if 'provider-manager' in read(core):
    raise SystemExit('Provider Manager IPC permission still present in core')
if "const VERSION = '1.6.6';" not in read(engine):
    raise SystemExit('Engine 1.6.6 not materialized')
if 'CACHE_OBSERVER_PARSER_START' not in read(engine):
    raise SystemExit('Independent cache parser missing')

print('Local Usage 5.50 independent cache observer patch: OK')
