#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ENGINE_SRC = UD / 'runtime-src' / 'bridge-engine'
RUNTIME = UD / 'runtime'
TOOLS = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.95.json'
CORE = SRC / '00-runtime-core.part.js'
LEDGER = SRC / '14-request-ledger.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
ENGINE_CLI = ENGINE_SRC / '30-cli-runtime.part.mjs'
ENGINE_PARTS = ENGINE_SRC / 'parts.json'
MODEL_CATEGORY_PART = ENGINE_SRC / '45-model-category.part.mjs'
LATEST = UD / 'latest.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
GUIDELINES = ROOT / 'docs' / 'USAGE_DASHBOARD_GUIDELINES.md'

BASE_VERSION = '3.0.0-alpha.5.94'
TARGET_VERSION = '3.0.0-alpha.5.95'
BASE_ENGINE = '1.6.30'
TARGET_ENGINE = '1.6.31'
BASE_MANAGER = '1.3.4'
TARGET_MANAGER = '1.3.5'
TARGET_CLI = '1.10.0'
CATALOG_PACKAGE = '@llmgateway/models'
CATALOG_VERSION = '1.251.0'
BASE_ENGINE_SHA = '035aa5d6535edd357df3390b7cd22acff2dec298a79e86d2fe2b4b0d3f2b4228'
BASE_MANAGER_SHA = 'bbcbb6b4ae2dfe6a27ec4282da8147d3e5a693586a1648211d90a107713f0801'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.95 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def regex_once(path: Path, pattern: str, replacement: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'5.95 {label} regex mismatch: {count}')
    path.write_text(next_text, encoding='utf-8')


def load_spec() -> dict:
    value = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'managedModelCatalogVersion': CATALOG_VERSION,
        'materializer': 'plugins/usage-dashboard/tools/release_model_category_595.py',
        'newRegression': 'plugins/usage-dashboard/tests/p61-catalog-pinned-request-model-category-fidelity.cjs',
    }
    for key, target in expected.items():
        if value.get(key) != target:
            raise SystemExit(f'5.95 release spec mismatch: {key}={value.get(key)!r}')
    cli = value.get('managedCliAuthority') or {}
    catalog = value.get('managedModelCatalogAuthority') or {}
    if cli.get('package') != '@llmgateway/cli' or cli.get('version') != TARGET_CLI or cli.get('exact') is not True:
        raise SystemExit('5.95 exact CLI authority missing')
    if catalog.get('package') != CATALOG_PACKAGE or catalog.get('version') != CATALOG_VERSION or catalog.get('exact') is not True:
        raise SystemExit('5.95 exact model catalog authority missing')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.95 contracts changed')
    return value


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        engine_sha = sha256(ENGINE)
        manager_sha = sha256(MANAGER)
        validate_target(engine_sha, manager_sha)
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}')
        raise SystemExit(0)
    if product != BASE_VERSION:
        raise SystemExit(f'5.95 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.95 baseline Engine semantic mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != BASE_MANAGER:
        raise SystemExit('5.95 baseline Manager semantic mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.95 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.95 baseline Engine bytes mismatch')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.95 baseline Manager bytes mismatch')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.95 baseline bootstrap bytes mismatch')


def patch_plugin_identity(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.94', '//@version 3.0.0-alpha.5.95', 'Plugin metadata')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.94';", "const VERSION = '3.0.0-alpha.5.95';", 'Plugin VERSION')
    replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.30';", "const REQUIRED_BRIDGE_VERSION = '1.6.31';", 'Plugin Engine requirement')
    replace_once(CORE, "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';", "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';", 'Plugin Manager requirement')
    notes = spec.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    block = "  const RELEASE_NOTES = Object.freeze({\n"
    block += f"    title: {json.dumps(spec['releaseTitle'], ensure_ascii=False)},\n"
    block += "    highlights: Object.freeze([\n" + ''.join(f"    {json.dumps(v, ensure_ascii=False)},\n" for v in highlights) + "    ]),\n"
    block += "    diagnosticHints: Object.freeze([\n" + ''.join(f"    {json.dumps(v, ensure_ascii=False)},\n" for v in hints) + "    ]),\n"
    block += "  });\n"
    text = CORE.read_text(encoding='utf-8')
    next_text, count = re.subn(r"  const RELEASE_NOTES = Object\.freeze\(\{.*?\n  \}\);\n", block, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('5.95 release notes boundary mismatch')
    CORE.write_text(next_text, encoding='utf-8')


def patch_engine_core() -> None:
    replace_once(ENGINE_CORE, "import { AsyncLocalStorage } from 'node:async_hooks';", "import { AsyncLocalStorage } from 'node:async_hooks';\nimport { pathToFileURL } from 'node:url';", 'Engine pathToFileURL import')
    replace_once(ENGINE_CORE, "const VERSION = '1.6.30';", "const VERSION = '1.6.31';", 'Engine VERSION')
    replace_once(
        ENGINE_CORE,
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';\nconst MODEL_CATALOG_PACKAGE = '@llmgateway/models';\nconst MODEL_CATALOG_VERSION = '1.251.0';",
        'Engine catalog constants',
    )


ENGINE_MANAGED_RUNTIME = r'''async function managedCliRuntime() {
  const unavailable = (state = 'unavailable', provisioning = 'unavailable') => ({
    state, version:'', provisioning, entry:null,
    modelCatalogState:'unavailable', modelCatalogVersion:'', modelCatalogExpectedVersion:MODEL_CATALOG_VERSION, modelCatalogEntry:null,
  });
  if (!MANAGED_CLI_ENABLED) return unavailable('unavailable', 'disabled');
  let descriptor;
  try { descriptor = JSON.parse(await fs.readFile(MANAGED_CLI_DESCRIPTOR, 'utf8')); }
  catch {
    const state = await readManagedCliState();
    return state.state === 'ready' ? unavailable('invalid') : {...unavailable(state.state, state.provisioning), version:state.version};
  }
  if (descriptor?.format !== 1 || descriptor?.state !== 'ready' || descriptor?.package !== '@llmgateway/cli' || descriptor?.version !== CLI_VERSION
      || descriptor?.catalogPackage !== MODEL_CATALOG_PACKAGE || descriptor?.catalogVersion !== MODEL_CATALOG_VERSION) {
    return unavailable('invalid');
  }
  try {
    const versionRoot = await fs.realpath(MANAGED_CLI_VERSION_ROOT);
    const entry = await fs.realpath(String(descriptor.entry || ''));
    if (!pathInside(versionRoot, entry)) return unavailable('invalid');
    if (!(await fs.stat(entry)).isFile()) return unavailable('invalid');

    const catalogRoot = await fs.realpath(path.join(versionRoot, 'node_modules', '@llmgateway', 'models'));
    if (!pathInside(versionRoot, catalogRoot)) return unavailable('invalid');
    const packageJson = JSON.parse(await fs.readFile(path.join(catalogRoot, 'package.json'), 'utf8'));
    if (packageJson?.name !== MODEL_CATALOG_PACKAGE || packageJson?.version !== MODEL_CATALOG_VERSION) return unavailable('invalid');
    const rootExport = packageJson?.exports?.['.'] ?? packageJson?.exports;
    const exportPath = typeof rootExport === 'string' ? rootExport : (rootExport?.import || packageJson?.module || '');
    if (typeof exportPath !== 'string' || !exportPath) return unavailable('invalid');
    const modelCatalogEntry = await fs.realpath(path.resolve(catalogRoot, exportPath));
    if (!pathInside(catalogRoot, modelCatalogEntry) || !pathInside(versionRoot, modelCatalogEntry)) return unavailable('invalid');
    if (!(await fs.stat(modelCatalogEntry)).isFile()) return unavailable('invalid');
    if (await fs.realpath(String(descriptor.catalogEntry || '')) !== modelCatalogEntry) return unavailable('invalid');
    return {
      state:'ready', version:CLI_VERSION, provisioning:'ok', entry,
      modelCatalogState:'ready', modelCatalogVersion:MODEL_CATALOG_VERSION,
      modelCatalogExpectedVersion:MODEL_CATALOG_VERSION, modelCatalogEntry,
    };
  } catch {
    return unavailable('invalid');
  }
}'''


def patch_engine_cli_runtime() -> None:
    text = ENGINE_CLI.read_text(encoding='utf-8')
    pattern = r"async function managedCliRuntime\(\) \{.*?\n\}\n\nasync function managedCliDiagnostics\(\) \{.*?\n\}"
    replacement = ENGINE_MANAGED_RUNTIME + r'''

async function managedCliDiagnostics() {
  const runtime = await managedCliRuntime();
  return {
    state:runtime.state,
    version:runtime.version,
    provisioning:runtime.provisioning,
    modelCatalogState:runtime.modelCatalogState,
    modelCatalogVersion:runtime.modelCatalogVersion,
    modelCatalogExpectedVersion:runtime.modelCatalogExpectedVersion,
  };
}'''
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'5.95 Engine managed runtime boundary mismatch: {count}')
    ENGINE_CLI.write_text(next_text, encoding='utf-8')


MODEL_CATEGORY_SOURCE = r'''let modelCategoryCatalogMap = null;
let modelCategoryCatalogLoad = null;
let modelCategoryCatalogStatus = Object.freeze({state:'unavailable',version:'',expectedVersion:MODEL_CATALOG_VERSION});

function normalizeModelCategoryId(usedModel) {
  const value = typeof usedModel === 'string' ? usedModel.trim() : '';
  if (!value) return '';
  const slashIndex = value.indexOf('/');
  const withoutProvider = slashIndex === -1 ? value : value.slice(slashIndex + 1);
  const colonIndex = withoutProvider.indexOf(':');
  return (colonIndex === -1 ? withoutProvider : withoutProvider.slice(0, colonIndex)).trim();
}

function modelCategoryFinitePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function buildModelCategoryMap(models) {
  const out = new Map();
  if (!Array.isArray(models)) return out;
  for (const model of models) {
    const id = typeof model?.id === 'string' ? model.id.trim() : '';
    if (!id) continue;
    let premium = false;
    for (const provider of (Array.isArray(model?.providers) ? model.providers : [])) {
      const inputPrice = modelCategoryFinitePrice(provider?.inputPrice);
      const outputPrice = modelCategoryFinitePrice(provider?.outputPrice);
      if ((inputPrice !== null && inputPrice >= 5e-6) || (outputPrice !== null && outputPrice >= 15e-6)) {
        premium = true;
        break;
      }
    }
    out.set(id, premium ? 'premium' : 'regular');
  }
  return out;
}

function classifyModelCategoryFromMap(usedModel, catalogMap) {
  const id = normalizeModelCategoryId(usedModel);
  if (!id || !(catalogMap instanceof Map) || !catalogMap.has(id)) {
    return {modelCategory:'unknown',modelCategorySource:'unknown'};
  }
  const value = catalogMap.get(id);
  if (!['premium','regular'].includes(value)) return {modelCategory:'unknown',modelCategorySource:'unknown'};
  return {modelCategory:value,modelCategorySource:'llmgateway-model-catalog'};
}

async function ensureModelCategoryCatalog() {
  if (modelCategoryCatalogMap instanceof Map) return modelCategoryCatalogMap;
  if (modelCategoryCatalogLoad) return modelCategoryCatalogLoad;
  modelCategoryCatalogLoad = (async () => {
    try {
      const runtime = await managedCliRuntime();
      if (runtime?.state !== 'ready' || runtime?.modelCatalogState !== 'ready' || runtime?.modelCatalogVersion !== MODEL_CATALOG_VERSION || !runtime?.modelCatalogEntry) {
        throw new Error('managed model catalog pair unavailable');
      }
      const module = await import(pathToFileURL(runtime.modelCatalogEntry).href);
      if (!Array.isArray(module?.models)) throw new Error('managed model catalog export missing models[]');
      const derived = buildModelCategoryMap(module.models);
      if (!derived.size) throw new Error('managed model catalog produced empty classification map');
      modelCategoryCatalogMap = derived;
      modelCategoryCatalogStatus = Object.freeze({state:'ready',version:MODEL_CATALOG_VERSION,expectedVersion:MODEL_CATALOG_VERSION});
      return derived;
    } catch {
      modelCategoryCatalogStatus = Object.freeze({state:'unavailable',version:'',expectedVersion:MODEL_CATALOG_VERSION});
      return null;
    } finally {
      modelCategoryCatalogLoad = null;
    }
  })();
  return modelCategoryCatalogLoad;
}

const loadAccountCaptureBeforeModelCategory = loadAccountCapture;
loadAccountCapture = async function loadAccountCaptureWithModelCategory() {
  await ensureModelCategoryCatalog();
  return loadAccountCaptureBeforeModelCategory();
};

const normalizeCapturedRecentLogsBeforeModelCategory = normalizeCapturedRecentLogs;
normalizeCapturedRecentLogs = function normalizeCapturedRecentLogsWithModelCategory(root) {
  const rows = normalizeCapturedRecentLogsBeforeModelCategory(root);
  return rows.map((row) => ({...row, ...classifyModelCategoryFromMap(row?.model, modelCategoryCatalogMap)}));
};

const managedCliDiagnosticsBeforeModelCategory = managedCliDiagnostics;
managedCliDiagnostics = async function managedCliDiagnosticsWithModelCategory() {
  const runtime = await managedCliDiagnosticsBeforeModelCategory();
  await ensureModelCategoryCatalog();
  return {...runtime, ...modelCategoryCatalogStatus};
};
'''


def write_model_category_part() -> None:
    MODEL_CATEGORY_PART.write_text(MODEL_CATEGORY_SOURCE, encoding='utf-8')
    parts = json.loads(ENGINE_PARTS.read_text(encoding='utf-8'))
    rows = parts.get('parts') or []
    if '45-model-category.part.mjs' not in rows:
        try:
            index = rows.index('40-sources.part.mjs') + 1
        except ValueError:
            raise SystemExit('5.95 Engine parts missing 40-sources.part.mjs')
        rows.insert(index, '45-model-category.part.mjs')
    parts['parts'] = rows
    ENGINE_PARTS.write_text(json.dumps(parts, indent=2) + '\n', encoding='utf-8')


MODEL_CATEGORY_PLUGIN_HELPERS = r'''
  function requestModelCategoryValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['premium','regular','unknown'].includes(text) ? text : 'unknown';
  }

  function requestModelCategorySourceValue(value, category = 'unknown') {
    const text = String(value || '').trim().toLowerCase();
    return requestModelCategoryValue(category) !== 'unknown' && text === 'llmgateway-model-catalog'
      ? 'llmgateway-model-catalog'
      : 'unknown';
  }

  function preferKnownModelCategory(incomingCategory, incomingSource, currentCategory, currentSource) {
    const incoming = requestModelCategoryValue(incomingCategory);
    if (incoming !== 'unknown') return {modelCategory:incoming,modelCategorySource:requestModelCategorySourceValue(incomingSource, incoming)};
    const current = requestModelCategoryValue(currentCategory);
    if (current !== 'unknown') return {modelCategory:current,modelCategorySource:requestModelCategorySourceValue(currentSource, current)};
    return {modelCategory:'unknown',modelCategorySource:'unknown'};
  }

  function requestModelCategoryText(row) {
    const category = requestModelCategoryValue(row?.modelCategory);
    if (category === 'premium') return 'Premium';
    if (category === 'regular') return 'Regular';
    return '?';
  }

  function requestModelCategoryStats(rows) {
    const stats = {rows:0,premium:0,regular:0,unknown:0};
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const category = requestModelCategoryValue(row?.modelCategory);
      stats.rows += 1;
      stats[category] += 1;
    }
    return stats;
  }
'''


def patch_plugin_ledger() -> None:
    text = LEDGER.read_text(encoding='utf-8')
    if 'function requestModelCategoryValue(value)' not in text:
        anchor = '  function normalizeRecentRequestRows(rows, limit = 12) {'
        if text.count(anchor) != 1:
            raise SystemExit('5.95 Plugin category helper anchor mismatch')
        text = text.replace(anchor, MODEL_CATEGORY_PLUGIN_HELPERS + '\n' + anchor, 1)
    old = "      const model = String(recentRequestValue(row, ['model','modelId','model_id','usedModel','used_model','metadata.used_model','metadata.usedModel','source.model'], 'Unknown') || 'Unknown');"
    new = old + "\n      const modelCategory = requestModelCategoryValue(recentRequestValue(row, ['modelCategory','model_category'], 'unknown'));\n      const modelCategorySource = requestModelCategorySourceValue(recentRequestValue(row, ['modelCategorySource','model_category_source'], 'unknown'), modelCategory);"
    if 'const modelCategory = requestModelCategoryValue' not in text:
        if text.count(old) != 1:
            raise SystemExit('5.95 Plugin category normalization anchor mismatch')
        text = text.replace(old, new, 1)
    return_anchor = '        model,\n        cost:num(costRaw) ? Number(costRaw) : null,'
    return_new = '        model,\n        modelCategory,\n        modelCategorySource,\n        cost:num(costRaw) ? Number(costRaw) : null,'
    if return_new not in text:
        if text.count(return_anchor) != 1:
            raise SystemExit('5.95 Plugin category return anchor mismatch')
        text = text.replace(return_anchor, return_new, 1)
    merge_anchor = "        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);\n        byKey.set(key, {"
    merge_new = "        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);\n        const modelCategoryTruth = preferKnownModelCategory(row?.modelCategory, row?.modelCategorySource, current?.modelCategory, current?.modelCategorySource);\n        byKey.set(key, {"
    if 'const modelCategoryTruth = preferKnownModelCategory' not in text:
        if text.count(merge_anchor) != 1:
            raise SystemExit('5.95 Plugin category merge anchor mismatch')
        text = text.replace(merge_anchor, merge_new, 1)
    merge_fields_anchor = '          serviceTierSelectionSource:preferKnownServiceTierSelectionSource(row.serviceTierSelectionSource, current?.serviceTierSelectionSource),\n          timestampPrecision:'
    merge_fields_new = '          serviceTierSelectionSource:preferKnownServiceTierSelectionSource(row.serviceTierSelectionSource, current?.serviceTierSelectionSource),\n          modelCategory:modelCategoryTruth.modelCategory,\n          modelCategorySource:modelCategoryTruth.modelCategorySource,\n          timestampPrecision:'
    if 'modelCategory:modelCategoryTruth.modelCategory' not in text:
        if text.count(merge_fields_anchor) != 1:
            raise SystemExit('5.95 Plugin category merge fields anchor mismatch')
        text = text.replace(merge_fields_anchor, merge_fields_new, 1)
    usage_old = 'const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : \'\', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : \'\', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(\' · \');'
    usage_new = 'const usageText = [resultText, requestModelCategoryText(row), httpStatusText, num(row.cost) ? money(row.cost,4) : \'\', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : \'\', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(\' · \');'
    count = text.count(usage_old)
    if count:
        text = text.replace(usage_old, usage_new)
    if text.count('requestModelCategoryText(row)') < 2:
        raise SystemExit('5.95 category UI bindings missing')
    LEDGER.write_text(text, encoding='utf-8')


def patch_bridge_io() -> None:
    text = BRIDGE_IO.read_text(encoding='utf-8')
    anchor = "      cliRuntimeVersion:String(raw.cliRuntimeVersion || raw.cli_runtime_version || ''),\n      cliRuntimeProvisioning:"
    replacement = "      cliRuntimeVersion:String(raw.cliRuntimeVersion || raw.cli_runtime_version || ''),\n      cliCatalogState:['ready','unavailable','invalid'].includes(String(raw.cliCatalogState || raw.cli_catalog_state)) ? String(raw.cliCatalogState || raw.cli_catalog_state) : 'unavailable',\n      cliCatalogVersion:String(raw.cliCatalogVersion || raw.cli_catalog_version || ''),\n      cliRuntimeProvisioning:"
    if 'cliCatalogState:' not in text:
        if text.count(anchor) != 1:
            raise SystemExit('5.95 bridge manager catalog projection anchor mismatch')
        text = text.replace(anchor, replacement, 1)
    BRIDGE_IO.write_text(text, encoding='utf-8')


MODEL_CATEGORY_DIAGNOSTICS = r'''
  function modelCategoryCatalogDiagnosticText(diagnostics) {
    const runtime = diagnostics?.cliRuntime && typeof diagnostics.cliRuntime === 'object' ? diagnostics.cliRuntime : null;
    const manager = state.bridgeManagerRuntime || null;
    const stateValue = String(runtime?.modelCatalogState || manager?.cliCatalogState || 'unavailable');
    const version = String(runtime?.modelCatalogVersion || manager?.cliCatalogVersion || '');
    if (stateValue === 'ready' && version === '1.251.0') return 'managed · ready · @llmgateway/models 1.251.0';
    return `managed · unavailable · expected @llmgateway/models 1.251.0`;
  }

  function modelCategoryFidelityDiagnosticText(rows) {
    const stats = requestModelCategoryStats(rows);
    const source = (stats.premium + stats.regular) > 0 ? 'llmgateway-model-catalog' : 'unknown';
    return `Premium ${stats.premium} · Regular ${stats.regular} · Unknown ${stats.unknown} · source ${source}`;
  }
'''


def patch_diagnostics() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    if 'function modelCategoryCatalogDiagnosticText' not in text:
        anchor = '  function bridgeCreditsEarlyStartText(performance) {'
        if text.count(anchor) != 1:
            raise SystemExit('5.95 diagnostics helper anchor mismatch')
        text = text.replace(anchor, MODEL_CATEGORY_DIAGNOSTICS + '\n' + anchor, 1)
    line = '      `Bridge CLI runtime: ${bridgeCliRuntimeText(state.data?.bridge?.diagnostics)}`,\n'
    insert = line + '      `Model category catalog: ${modelCategoryCatalogDiagnosticText(state.data?.bridge?.diagnostics)}`,\n      `Model category fidelity: ${modelCategoryFidelityDiagnosticText(requestLedgerRowsForScope(\'all\'))}`,\n'
    if 'Model category catalog:' not in text:
        if text.count(line) != 1:
            raise SystemExit('5.95 diagnostics line anchor mismatch')
        text = text.replace(line, insert, 1)
    DIAGNOSTICS.write_text(text, encoding='utf-8')


MANAGER_VERIFY_PAIR = r'''function resolveManagedCatalogEntry(rootReal) {
  const catalogRoot = fs.realpathSync(path.join(rootReal, 'node_modules', '@llmgateway', 'models'));
  if (!pathInside(rootReal, catalogRoot)) throw new Error('managed model catalog escaped runtime root');
  const packageJson = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'package.json'), 'utf8'));
  if (packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION) throw new Error('managed model catalog version mismatch');
  const rootExport = packageJson?.exports?.['.'] ?? packageJson?.exports;
  const exportPath = typeof rootExport === 'string' ? rootExport : (rootExport?.import || packageJson?.module || '');
  if (typeof exportPath !== 'string' || !exportPath) throw new Error('managed model catalog export missing');
  const catalogEntry = fs.realpathSync(path.resolve(catalogRoot, exportPath));
  if (!pathInside(catalogRoot, catalogEntry) || !pathInside(rootReal, catalogEntry)) throw new Error('managed model catalog entry escaped runtime root');
  if (!fs.statSync(catalogEntry).isFile()) throw new Error('managed model catalog entry is not a file');
  return catalogEntry;
}

function verifyManagedCliDirectory(root) {
  const rootReal = fs.realpathSync(root);
  const packageRoot = path.join(rootReal, 'node_modules', '@llmgateway', 'cli');
  const packageReal = fs.realpathSync(packageRoot);
  if (!pathInside(rootReal, packageReal)) throw new Error('managed CLI package escaped runtime root');
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageReal, 'package.json'), 'utf8'));
  if (packageJson?.name !== MANAGED_CLI_PACKAGE || packageJson?.version !== MANAGED_CLI_VERSION) throw new Error('managed CLI package version mismatch');
  const bin = resolveManagedCliBin(packageJson);
  const entry = fs.realpathSync(path.resolve(packageReal, bin));
  if (!pathInside(packageReal, entry) || !pathInside(rootReal, entry)) throw new Error('managed CLI entry escaped runtime root');
  if (!fs.statSync(entry).isFile()) throw new Error('managed CLI entry is not a file');
  const catalogEntry = resolveManagedCatalogEntry(rootReal);
  return {entry,catalogEntry};
}'''

MANAGER_RUNTIME_STATUS = r'''function managedCliRuntimeStatus() {
  if (!MANAGED_CLI_ENABLED) return {cliRuntimeState:'unavailable',cliRuntimeVersion:'',cliRuntimeProvisioning:'disabled',cliCatalogState:'unavailable',cliCatalogVersion:''};
  try {
    const descriptor = JSON.parse(fs.readFileSync(MANAGED_CLI_DESCRIPTOR, 'utf8'));
    const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);
    if (descriptor?.format !== 1 || descriptor?.state !== 'ready' || descriptor?.package !== MANAGED_CLI_PACKAGE || descriptor?.version !== MANAGED_CLI_VERSION
        || descriptor?.catalogPackage !== MANAGED_MODEL_CATALOG_PACKAGE || descriptor?.catalogVersion !== MANAGED_MODEL_CATALOG_VERSION
        || fs.realpathSync(String(descriptor.entry || '')) !== verified.entry || fs.realpathSync(String(descriptor.catalogEntry || '')) !== verified.catalogEntry) {
      throw new Error('managed CLI/catalog descriptor mismatch');
    }
    return {cliRuntimeState:'ready',cliRuntimeVersion:MANAGED_CLI_VERSION,cliRuntimeProvisioning:'ok',cliCatalogState:'ready',cliCatalogVersion:MANAGED_MODEL_CATALOG_VERSION};
  } catch (_) {
    const state = readManagedCliState();
    return state.state === 'ready'
      ? {cliRuntimeState:'invalid',cliRuntimeVersion:'',cliRuntimeProvisioning:'unavailable',cliCatalogState:'invalid',cliCatalogVersion:''}
      : {cliRuntimeState:state.state,cliRuntimeVersion:state.version,cliRuntimeProvisioning:state.provisioning,cliCatalogState:'unavailable',cliCatalogVersion:''};
  }
}'''


def patch_manager(engine_sha: str) -> None:
    replace_once(MANAGER, "const MANAGER_VERSION = '1.3.4';", "const MANAGER_VERSION = '1.3.5';", 'Manager VERSION')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.94';", "const PRODUCT_VERSION = '3.0.0-alpha.5.95';", 'Manager Product')
    replace_once(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.30';", "const BUNDLED_ENGINE_VERSION = '1.6.31';", 'Manager Engine version')
    regex_once(MANAGER, r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager Engine hash')
    replace_once(
        MANAGER,
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_CLI_VERSION = '1.10.0';\nconst MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';\nconst MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
        'Manager catalog constants',
    )
    text = MANAGER.read_text(encoding='utf-8')
    text, count = re.subn(r"function verifyManagedCliDirectory\(root\) \{.*?\n\}\nfunction managedCliRuntimeStatus\(\) \{.*?\n\}", MANAGER_VERIFY_PAIR + '\n' + MANAGER_RUNTIME_STATUS, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('5.95 Manager pair verifier boundary mismatch')
    old_dep = "JSON.stringify({private:true,dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION}}, null, 2)"
    new_dep = "JSON.stringify({private:true,dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION}}, null, 2)"
    if old_dep not in text and new_dep not in text:
        raise SystemExit('5.95 Manager stage dependency anchor missing')
    text = text.replace(old_dep, new_dep)
    text = text.replace("const entry = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);\n    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry,promotedAt:Date.now()});",
                        "const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);\n    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry:verified.entry,catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE,catalogVersion:MANAGED_MODEL_CATALOG_VERSION,catalogEntry:verified.catalogEntry,promotedAt:Date.now()});")
    text = text.replace("const entry = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);\n    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry,promotedAt:Date.now()});",
                        "const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);\n    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry:verified.entry,catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE,catalogVersion:MANAGED_MODEL_CATALOG_VERSION,catalogEntry:verified.catalogEntry,promotedAt:Date.now()});")
    if text.count('catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE') < 2:
        raise SystemExit('5.95 Manager descriptor pair markers missing')
    MANAGER.write_text(text, encoding='utf-8')


def sync_guidelines() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    text, count = re.subn(r"Current release implementation: `[^`]+`\.",
                          "Current release implementation: `3.0.0-alpha.5.95 / Engine 1.6.31 / Manager 1.3.5 / CLI 1.10.0 / Models 1.251.0`.",
                          text, count=1)
    if count != 1:
        raise SystemExit('5.95 current release memory marker missing')
    text, count = re.subn(r"^Last verified real-device baseline: `[^`]+`\.?$",
                          "Last verified real-device baseline: `3.0.0-alpha.5.94 / Engine 1.6.30 / Manager 1.3.4 / CLI 1.10.0 / READY / Health ok / active errors 0 / failures 0 / Cost Drivers PASS_PHYSICAL`.",
                          text, count=1, flags=re.M)
    if count != 1:
        raise SystemExit('5.95 verified baseline marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest(engine_sha: str, manager_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = manager_sha
    manifest['components']['bridgeManager']['bootstrapSha256'] = BASE_BOOTSTRAP_SHA
    manifest['components']['bridgeManager']['managedCliVersion'] = TARGET_CLI
    manifest['components']['bridgeManager']['managedModelCatalogVersion'] = CATALOG_VERSION
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target(engine_sha: str, manager_sha: str) -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine_cli = ENGINE_CLI.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    ledger = LEDGER.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for marker in ['//@version 3.0.0-alpha.5.95', "const VERSION = '3.0.0-alpha.5.95';", "const REQUIRED_BRIDGE_VERSION = '1.6.31';", "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';"]:
        if marker not in core: raise SystemExit(f'5.95 Plugin target missing: {marker}')
    for marker in ["const VERSION = '1.6.31';", "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';", "const MODEL_CATALOG_VERSION = '1.251.0';"]:
        if marker not in engine_core: raise SystemExit(f'5.95 Engine target missing: {marker}')
    for marker in ['modelCatalogState', 'catalogPackage', 'catalogVersion', 'catalogEntry']:
        if marker not in engine_cli: raise SystemExit(f'5.95 Engine pair contract missing: {marker}')
    for marker in ["const MANAGER_VERSION = '1.3.5';", "const PRODUCT_VERSION = '3.0.0-alpha.5.95';", "const BUNDLED_ENGINE_VERSION = '1.6.31';", "const MANAGED_CLI_VERSION = '1.10.0';", "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';"]:
        if marker not in manager: raise SystemExit(f'5.95 Manager target missing: {marker}')
    if '^1.251.0' in manager or '~1.251.0' in manager:
        raise SystemExit('5.95 model catalog pin must be exact')
    for marker in ['requestModelCategoryText(row)', 'modelCategory:modelCategoryTruth.modelCategory', "modelCategorySource:'llmgateway-model-catalog'"]:
        if marker not in ledger and marker not in MODEL_CATEGORY_PART.read_text(encoding='utf-8'):
            raise SystemExit(f'5.95 request category binding missing: {marker}')
    for marker in ['Model category catalog:', 'Model category fidelity:']:
        if marker not in diagnostics: raise SystemExit(f'5.95 diagnostics missing: {marker}')
    if sha256(ENGINE) != engine_sha or sha256(MANAGER) != manager_sha:
        raise SystemExit('5.95 generated artifact hash drift')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.95 bootstrap exact-byte preservation failed')
    if manifest.get('productVersion') != TARGET_VERSION or manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE or manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.95 manifest target mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != engine_sha or manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != manager_sha:
        raise SystemExit('5.95 manifest hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('managedModelCatalogVersion') != CATALOG_VERSION:
        raise SystemExit('5.95 manifest catalog identity missing')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.95 contracts changed')


spec = load_spec()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size
patch_plugin_identity(spec)
patch_engine_core()
patch_engine_cli_runtime()
write_model_category_part()
patch_plugin_ledger()
patch_bridge_io()
patch_diagnostics()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)
patch_manager(engine_sha)
sync_guidelines()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
manager_sha = sha256(MANAGER)
sync_manifest(engine_sha, manager_sha)
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target(engine_sha, manager_sha)
print(
    f'5.95 materialized: Plugin {old_plugin_bytes}->{LATEST.stat().st_size}; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} v{TARGET_ENGINE} SHA {engine_sha}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} v{TARGET_MANAGER} SHA {manager_sha}; '
    f'CLI {TARGET_CLI} + models {CATALOG_VERSION} exact pair; contracts 1/1; bootstrap exact {BASE_BOOTSTRAP_SHA}'
)
