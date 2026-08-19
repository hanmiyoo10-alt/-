from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'
OLD_VERSION = '3.0.0-alpha.5.51'
NEW_VERSION = '3.0.0-alpha.5.52'
OLD_ENGINE = '1.6.7'
NEW_ENGINE = '1.6.8'
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


def insert_after_once(path: Path, marker: str, addition: str, label: str) -> None:
    text = read(path)
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 marker in {path}, got {count}')
    write(path, text.replace(marker, marker + addition, 1))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# 5.52 keeps 5.51's independent observer and explicit Read capture intact.
# The new work is provenance-first: consume every official write alias we can
# observe, preserve whether Write/TTL were actually reported, and never derive
# missing token counts from costs/prices or from provider/model assumptions.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE}';",
    'required bridge engine version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE}';", f"const VERSION = '{NEW_ENGINE}';", 'bridge engine version')
replace_once(
    engine,
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v9');",
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v10');",
    'capture tap marker',
)

replace_once(
    engine,
    """    let explicitWrite = cacheNumber(usage, ['cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens','input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens']);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','cache_creation.ephemeral_5m_input_tokens','prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','cache_creation.ephemeral_1h_input_tokens','prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens']);
    if (explicitWrite === null && (write5m !== null || write1h !== null)) explicitWrite = Number(write5m || 0) + Number(write1h || 0);""",
    """    let explicitWrite = cacheNumber(usage, [
      'cacheCreationInputTokens','cache_creation_input_tokens',
      'cacheCreationTokens','cache_creation_tokens',
      'cacheWriteTokens','cache_write_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_creation_tokens','prompt_tokens_details.cache_creation_tokens'
    ]);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','cache_creation.ephemeral_5m_input_tokens','prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','cache_creation.ephemeral_1h_input_tokens','prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens']);
    const explicitWriteReported = explicitWrite !== null;
    const ttlReported = write5m !== null || write1h !== null;
    if (explicitWrite === null && ttlReported) explicitWrite = Number(write5m || 0) + Number(write1h || 0);""",
    'official cache write aliases and provenance flags',
)

replace_once(
    engine,
    """    const hasCacheMetric = [cachedInputTokens, explicitRead, explicitWrite, write5m, write1h].some(value => value !== null);
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
    };""",
    """    const hasCacheMetric = [cachedInputTokens, explicitRead, explicitWrite, write5m, write1h].some(value => value !== null);
    if (!hasCacheMetric) return null;

    const cacheMetricFidelity = explicitRead !== null && explicitWrite !== null
      ? 'explicit-read-write'
      : explicitRead !== null
        ? 'explicit-read'
        : explicitWrite !== null
          ? 'explicit-write'
          : cachedInputTokens !== null
            ? 'cached-total'
            : 'unknown';
    const cacheWriteTelemetry = explicitWriteReported || ttlReported
      ? 'reported'
      : explicitRead !== null
        ? 'not-reported'
        : 'unknown';
    const cacheTtlTelemetry = ttlReported
      ? 'reported'
      : explicitWrite !== null
        ? 'not-reported'
        : 'unknown';

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cachedInputTokens,
      cacheReadInputTokens: explicitRead,
      cacheCreationInputTokens: explicitWrite,
      cacheCreation5mTokens: write5m,
      cacheCreation1hTokens: write1h,
      cacheMetricFidelity,
      cacheWriteTelemetry,
      cacheTtlTelemetry,
      source: source || 'normalized-usage',
    };""",
    'cache metric provenance',
)

replace_once(
    engine,
    """        cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens ?? null,
        cacheMetricSource: cacheUsage?.source ?? '',
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,""",
    """        cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens ?? null,
        cacheMetricFidelity: cacheUsage?.cacheMetricFidelity ?? 'unknown',
        cacheWriteTelemetry: cacheUsage?.cacheWriteTelemetry ?? 'unknown',
        cacheTtlTelemetry: cacheUsage?.cacheTtlTelemetry ?? 'unknown',
        cacheMetricSource: cacheUsage?.source ?? '',
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,""",
    'sanitized cache provenance projection',
)

request_normalize = SRC / '10-request-normalize.part.js'
replace_once(
    request_normalize,
    """      'cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens',
      'usage.cacheCreationInputTokens','usage.cache_creation_input_tokens','usage.cacheWriteTokens','usage.cache_write_tokens',
      'usage.input_tokens_details.cache_write_tokens','usage.prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens'""",
    """      'cacheCreationInputTokens','cache_creation_input_tokens','cacheCreationTokens','cache_creation_tokens','cacheWriteTokens','cache_write_tokens',
      'usage.cacheCreationInputTokens','usage.cache_creation_input_tokens','usage.cacheCreationTokens','usage.cache_creation_tokens','usage.cacheWriteTokens','usage.cache_write_tokens',
      'usage.input_tokens_details.cache_write_tokens','usage.prompt_tokens_details.cache_write_tokens',
      'usage.input_tokens_details.cache_creation_tokens','usage.prompt_tokens_details.cache_creation_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_creation_tokens','prompt_tokens_details.cache_creation_tokens'""",
    'request write token aliases',
)
replace_once(
    request_normalize,
    """      'cacheCreation5mTokens','cache_creation_5m_tokens','usage.cacheCreation5mTokens','usage.cache_creation_5m_tokens',
      'cache_creation.ephemeral_5m_input_tokens','usage.cache_creation.ephemeral_5m_input_tokens'""",
    """      'cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','usage.cacheCreation5mTokens','usage.cache_creation_5m_tokens','usage.cacheWrite5mTokens','usage.cache_write_5m_tokens',
      'cache_creation.ephemeral_5m_input_tokens','usage.cache_creation.ephemeral_5m_input_tokens',
      'prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens',
      'usage.prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','usage.input_tokens_details.cache_creation.ephemeral_5m_input_tokens'""",
    'request 5m write aliases',
)
replace_once(
    request_normalize,
    """      'cacheCreation1hTokens','cache_creation_1h_tokens','usage.cacheCreation1hTokens','usage.cache_creation_1h_tokens',
      'cache_creation.ephemeral_1h_input_tokens','usage.cache_creation.ephemeral_1h_input_tokens'""",
    """      'cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','usage.cacheCreation1hTokens','usage.cache_creation_1h_tokens','usage.cacheWrite1hTokens','usage.cache_write_1h_tokens',
      'cache_creation.ephemeral_1h_input_tokens','usage.cache_creation.ephemeral_1h_input_tokens',
      'prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens',
      'usage.prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','usage.input_tokens_details.cache_creation.ephemeral_1h_input_tokens'""",
    'request 1h write aliases',
)

ledger = SRC / '14-request-ledger.part.js'
replace_once(
    ledger,
    """        cacheReadRatio:cacheMetrics.cacheReadRatio,
        cacheMetricSource:String(recentRequestValue(row, ['cacheMetricSource','cache_metric_source'], '') || ''),
        requestedServiceTier,""",
    """        cacheReadRatio:cacheMetrics.cacheReadRatio,
        cacheMetricFidelity:String(recentRequestValue(row, ['cacheMetricFidelity','cache_metric_fidelity'], 'unknown') || 'unknown'),
        cacheWriteTelemetry:String(recentRequestValue(row, ['cacheWriteTelemetry','cache_write_telemetry'], 'unknown') || 'unknown'),
        cacheTtlTelemetry:String(recentRequestValue(row, ['cacheTtlTelemetry','cache_ttl_telemetry'], 'unknown') || 'unknown'),
        cacheMetricSource:String(recentRequestValue(row, ['cacheMetricSource','cache_metric_source'], '') || ''),
        requestedServiceTier,""",
    'ledger cache provenance normalization',
)

replace_once(
    ledger,
    """      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,
      cacheCreation5mTokens:0, cacheCreation1hTokens:0, readDenominator:0, readRatio:null""",
    """      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      writeReported:0, writeNotReported:0, ttlReported:0, ttlNotReported:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,
      cacheCreation5mTokens:0, cacheCreation1hTokens:0, readDenominator:0, readRatio:null""",
    'cache observability provenance counters',
)
replace_once(
    ledger,
    """      if (num(row?.cacheReadInputTokens)) stats.readKnown += 1;
      if (num(row?.cacheCreationInputTokens)) stats.writeKnown += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;""",
    """      if (num(row?.cacheReadInputTokens)) stats.readKnown += 1;
      if (num(row?.cacheCreationInputTokens)) stats.writeKnown += 1;
      if (row?.cacheWriteTelemetry === 'reported') stats.writeReported += 1;
      if (row?.cacheWriteTelemetry === 'not-reported') stats.writeNotReported += 1;
      if (row?.cacheTtlTelemetry === 'reported') stats.ttlReported += 1;
      if (row?.cacheTtlTelemetry === 'not-reported') stats.ttlNotReported += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;""",
    'cache observability provenance accumulation',
)
replace_once(
    ledger,
    """          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),
          cacheMetricSource:String(row.cacheMetricSource || current?.cacheMetricSource || ''),
          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),""",
    """          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),
          cacheMetricFidelity:String(row.cacheMetricFidelity || current?.cacheMetricFidelity || 'unknown'),
          cacheWriteTelemetry:String(row.cacheWriteTelemetry || current?.cacheWriteTelemetry || 'unknown'),
          cacheTtlTelemetry:String(row.cacheTtlTelemetry || current?.cacheTtlTelemetry || 'unknown'),
          cacheMetricSource:String(row.cacheMetricSource || current?.cacheMetricSource || ''),
          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),""",
    'ledger cache provenance enrichment',
)

diag = SRC / '40-diagnostics.part.js'
replace_once(diag, 'parser provider-usage-v2', 'parser provider-usage-v3', 'cache parser diagnostic version')
replace_once(
    diag,
    """    const readKnown = list.filter(row => num(row?.cacheReadInputTokens)).length;
    const writeKnown = list.filter(row => num(row?.cacheCreationInputTokens)).length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v3 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · parser sources ${sources.join(',') || 'none'}`;""",
    """    const readKnown = list.filter(row => num(row?.cacheReadInputTokens)).length;
    const writeKnown = list.filter(row => num(row?.cacheCreationInputTokens)).length;
    const writeReported = list.filter(row => row?.cacheWriteTelemetry === 'reported').length;
    const writeNotReported = list.filter(row => row?.cacheWriteTelemetry === 'not-reported').length;
    const ttlReported = list.filter(row => row?.cacheTtlTelemetry === 'reported').length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v3 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · write reported ${writeReported}/${list.length} · read-without-write ${writeNotReported}/${list.length} · ttl reported ${ttlReported}/${list.length} · parser sources ${sources.join(',') || 'none'}`;""",
    'cache observer provenance diagnostic',
)
replace_once(
    diag,
    """      `Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}`,
      `Cache semantics: request HIT rate = gateway replay only · LLMGateway cachedTokens = provider cache Read · cached total = Read + Write when both are known · unknown stays unknown · source request metadata / Bridge aggregates / independent provider usage parser`,""",
    """      `Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}`,
      `Cache write telemetry: reported ${diagCacheObservability.writeReported}/${diagCacheObservability.rows} · read-without-write ${diagCacheObservability.writeNotReported}/${diagCacheObservability.rows} · TTL reported ${diagCacheObservability.ttlReported}/${diagCacheObservability.rows} · TTL unreported-after-write ${diagCacheObservability.ttlNotReported}/${diagCacheObservability.rows}`,
      `Cache semantics: request HIT rate = gateway replay only · LLMGateway cachedTokens = provider cache Read · cached observed = known Read + known Write components · missing Write/TTL stays unknown and is never inferred from price/provider`,""",
    'cache write provenance diagnostics',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE}';", 'manager bundled engine version')

# Keep P11 as the regression suite for the independent observer while advancing
# its version assertions and adding 5.52 provenance cases.
p11 = TESTS / 'p11-cache-fidelity.cjs'
replace_all_required(p11, OLD_VERSION, NEW_VERSION, 'P11 product version', minimum=5)
replace_all_required(p11, OLD_ENGINE, NEW_ENGINE, 'P11 engine version', minimum=4)
replace_once(
    p11,
    "Symbol.for('llmgateway.devpass.bridge.capture.v9')",
    "Symbol.for('llmgateway.devpass.bridge.capture.v10')",
    'P11 capture marker',
)
replace_once(p11, 'parser provider-usage-v2', 'parser provider-usage-v3', 'P11 parser diagnostic')
replace_once(
    p11,
    """assert.equal(llmgatewayLog.cacheCreation1hTokens, 200);
assert.equal(llmgatewayLog.cachedInputTokens, 9200);""",
    """assert.equal(llmgatewayLog.cacheCreation1hTokens, 200);
assert.equal(llmgatewayLog.cachedInputTokens, 9200);
assert.equal(llmgatewayLog.cacheMetricFidelity, 'explicit-read-write');
assert.equal(llmgatewayLog.cacheWriteTelemetry, 'reported');
assert.equal(llmgatewayLog.cacheTtlTelemetry, 'reported');""",
    'P11 explicit write provenance assertions',
)
replace_once(
    p11,
    """assert.equal(llmgatewayWriteOnly.cacheCreation1hTokens, 0);
assert.equal(llmgatewayWriteOnly.cachedInputTokens, 4096);""",
    """assert.equal(llmgatewayWriteOnly.cacheCreation1hTokens, 0);
assert.equal(llmgatewayWriteOnly.cachedInputTokens, 4096);
assert.equal(llmgatewayWriteOnly.cacheMetricFidelity, 'explicit-read-write');
assert.equal(llmgatewayWriteOnly.cacheWriteTelemetry, 'reported');
assert.equal(llmgatewayWriteOnly.cacheTtlTelemetry, 'reported');""",
    'P11 write-only fixture provenance assertions',
)
insert_after_once(
    p11,
    """assert.equal(generic.cacheCreationInputTokens, 4);
""",
    """
const officialAlias = parse({usage:{
  prompt_tokens:900,
  prompt_tokens_details:{
    cached_tokens:400,
    cache_creation_tokens:125,
    cache_creation:{ephemeral_5m_input_tokens:100,ephemeral_1h_input_tokens:25},
  },
}});
assert.equal(officialAlias.source, 'openai-chat-usage');
assert.equal(officialAlias.cachedInputTokens, 400);
assert.equal(officialAlias.cacheCreationInputTokens, 125);
assert.equal(officialAlias.cacheCreation5mTokens, 100);
assert.equal(officialAlias.cacheCreation1hTokens, 25);
assert.equal(officialAlias.cacheMetricFidelity, 'explicit-write');
assert.equal(officialAlias.cacheWriteTelemetry, 'reported');
assert.equal(officialAlias.cacheTtlTelemetry, 'reported');

const readWithoutWrite = parse({
  requestId:'req-cache-read-only',
  createdAt:'2026-08-19T10:02:00.000Z',
  cachedTokens:2048,
  cacheWriteTokens:null,
  cacheWrite5mTokens:null,
  cacheWrite1hTokens:null,
});
assert.equal(readWithoutWrite.source, 'llmgateway-log-cache-v1');
assert.equal(readWithoutWrite.cacheReadInputTokens, 2048);
assert.equal(readWithoutWrite.cacheCreationInputTokens, null);
assert.equal(readWithoutWrite.cacheMetricFidelity, 'explicit-read');
assert.equal(readWithoutWrite.cacheWriteTelemetry, 'not-reported');
assert.equal(readWithoutWrite.cacheTtlTelemetry, 'unknown');
""",
    'P11 official alias and unknown-preservation fixtures',
)
replace_once(
    p11,
    """assert.ok(sanitizeBlock.includes('cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens'));
""",
    """assert.ok(sanitizeBlock.includes('cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens'));
assert.ok(sanitizeBlock.includes("cacheMetricFidelity: cacheUsage?.cacheMetricFidelity"));
assert.ok(sanitizeBlock.includes("cacheWriteTelemetry: cacheUsage?.cacheWriteTelemetry"));
assert.ok(sanitizeBlock.includes("cacheTtlTelemetry: cacheUsage?.cacheTtlTelemetry"));
""",
    'P11 sanitized provenance assertions',
)
replace_once(
    p11,
    "console.log('usage-dashboard P11 cache fidelity: OK · LLMGateway log cache read/write/TTL fields preserved independently');",
    "console.log('usage-dashboard P11 cache fidelity: OK · official write aliases + provenance preserve unknown without inference');",
    'P11 success message',
)

engine_sha = sha256_file(engine)
manager_text = read(manager)
sha_marker = "const BUNDLED_ENGINE_SHA256 = '"
sha_start = manager_text.find(sha_marker)
if sha_start < 0:
    raise SystemExit('manager bundled engine sha marker missing')
sha_value_start = sha_start + len(sha_marker)
sha_value_end = manager_text.find("';", sha_value_start)
if sha_value_end < 0:
    raise SystemExit('manager bundled engine sha terminator missing')
manager_text = manager_text[:sha_value_start] + engine_sha + manager_text[sha_value_end:]
write(manager, manager_text)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {NEW_ENGINE}, manager {MANAGER_VERSION}) with cache write provenance v1'
)
