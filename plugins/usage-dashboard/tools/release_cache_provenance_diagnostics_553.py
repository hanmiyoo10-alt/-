from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'
OLD_VERSION = '3.0.0-alpha.5.52'
NEW_VERSION = '3.0.0-alpha.5.53'
ENGINE_VERSION = '1.6.8'
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


# 5.53 is diagnostics-only fidelity. It does not infer missing Write/TTL,
# change the provider parser, or alter cache token totals. It separates
# provenance state from the observable Read-present/Write-value-absent shape.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)

ledger = SRC / '14-request-ledger.part.js'
replace_once(
    ledger,
    """      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      writeReported:0, writeNotReported:0, ttlReported:0, ttlNotReported:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,""",
    """      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      writeReported:0, writeNotReported:0, writeUnknownOnCache:0, readWithoutWriteValue:0,
      ttlReported:0, ttlNotReported:0, ttlUnknownAfterWrite:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,""",
    'cache provenance diagnostic counters',
)
replace_once(
    ledger,
    """      if (num(row?.cacheReadInputTokens)) stats.readKnown += 1;
      if (num(row?.cacheCreationInputTokens)) stats.writeKnown += 1;
      if (row?.cacheWriteTelemetry === 'reported') stats.writeReported += 1;
      if (row?.cacheWriteTelemetry === 'not-reported') stats.writeNotReported += 1;
      if (row?.cacheTtlTelemetry === 'reported') stats.ttlReported += 1;
      if (row?.cacheTtlTelemetry === 'not-reported') stats.ttlNotReported += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;""",
    """      const readValueKnown = num(row?.cacheReadInputTokens);
      const writeValueKnown = num(row?.cacheCreationInputTokens);
      if (readValueKnown) stats.readKnown += 1;
      if (writeValueKnown) stats.writeKnown += 1;
      if (row?.cacheWriteTelemetry === 'reported') stats.writeReported += 1;
      if (row?.cacheWriteTelemetry === 'not-reported') stats.writeNotReported += 1;
      if ((readValueKnown || writeValueKnown) && !['reported','not-reported'].includes(String(row?.cacheWriteTelemetry || ''))) stats.writeUnknownOnCache += 1;
      if (readValueKnown && !writeValueKnown) stats.readWithoutWriteValue += 1;
      if (row?.cacheTtlTelemetry === 'reported') stats.ttlReported += 1;
      if (row?.cacheTtlTelemetry === 'not-reported') stats.ttlNotReported += 1;
      if (writeValueKnown && !['reported','not-reported'].includes(String(row?.cacheTtlTelemetry || ''))) stats.ttlUnknownAfterWrite += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;""",
    'cache provenance diagnostic accumulation',
)

diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """    const writeReported = list.filter(row => row?.cacheWriteTelemetry === 'reported').length;
    const writeNotReported = list.filter(row => row?.cacheWriteTelemetry === 'not-reported').length;
    const ttlReported = list.filter(row => row?.cacheTtlTelemetry === 'reported').length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v3 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · write reported ${writeReported}/${list.length} · read-without-write ${writeNotReported}/${list.length} · ttl reported ${ttlReported}/${list.length} · parser sources ${sources.join(',') || 'none'}`;""",
    """    const writeReported = list.filter(row => row?.cacheWriteTelemetry === 'reported').length;
    const writeNotReported = list.filter(row => row?.cacheWriteTelemetry === 'not-reported').length;
    const writeUnknownOnCache = list.filter(row => [row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num) && !['reported','not-reported'].includes(String(row?.cacheWriteTelemetry || ''))).length;
    const readWithoutWriteValue = list.filter(row => num(row?.cacheReadInputTokens) && !num(row?.cacheCreationInputTokens)).length;
    const ttlReported = list.filter(row => row?.cacheTtlTelemetry === 'reported').length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v3 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · write reported ${writeReported}/${list.length} · write not-reported ${writeNotReported}/${list.length} · write unknown-on-cache ${writeUnknownOnCache}/${list.length} · read/no-write-value ${readWithoutWriteValue}/${list.length} · ttl reported ${ttlReported}/${list.length} · parser sources ${sources.join(',') || 'none'}`;""",
    'cache observer diagnostic semantics',
)
replace_once(
    diag,
    """      `Cache write telemetry: reported ${diagCacheObservability.writeReported}/${diagCacheObservability.rows} · read-without-write ${diagCacheObservability.writeNotReported}/${diagCacheObservability.rows} · TTL reported ${diagCacheObservability.ttlReported}/${diagCacheObservability.rows} · TTL unreported-after-write ${diagCacheObservability.ttlNotReported}/${diagCacheObservability.rows}`,""",
    """      `Cache write telemetry: reported ${diagCacheObservability.writeReported}/${diagCacheObservability.rows} · not-reported ${diagCacheObservability.writeNotReported}/${diagCacheObservability.rows} · unknown-on-cache ${diagCacheObservability.writeUnknownOnCache}/${diagCacheObservability.rows} · read/no-write-value ${diagCacheObservability.readWithoutWriteValue}/${diagCacheObservability.rows} · TTL reported ${diagCacheObservability.ttlReported}/${diagCacheObservability.rows} · TTL unreported-after-write ${diagCacheObservability.ttlNotReported}/${diagCacheObservability.rows} · TTL unknown-after-write ${diagCacheObservability.ttlUnknownAfterWrite}/${diagCacheObservability.rows}`,""",
    'cache write diagnostic semantics',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')

p11 = TESTS / 'p11-cache-fidelity.cjs'
replace_all_required(p11, OLD_VERSION, NEW_VERSION, 'P11 product version', minimum=5)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = ENGINE_VERSION
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {ENGINE_VERSION}, manager {MANAGER_VERSION}) with cache provenance diagnostics v2'
)
