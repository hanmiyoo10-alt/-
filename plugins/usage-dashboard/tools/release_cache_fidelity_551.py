from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.50'
NEW_VERSION = '3.0.0-alpha.5.51'
OLD_ENGINE = '1.6.6'
NEW_ENGINE = '1.6.7'
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


# Keep the 5.50 independent observer architecture. 5.51 only improves the
# fidelity of the already-sanitized LLMGateway /logs cache counters.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE}';",
    'required bridge engine version',
)

# LLMGateway's public log schema exposes cachedTokens/cacheWriteTokens plus the
# 5m/1h write split. Promote cachedTokens to explicit Read only when the object
# is clearly a log row (request identity + timestamp + log cache fields). This
# preserves 5.50's conservative behavior for generic usage objects.
engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE}';", f"const VERSION = '{NEW_ENGINE}';", 'bridge engine version')
replace_once(
    engine,
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v8');",
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v9');",
    'capture tap marker',
)
replace_once(
    engine,
    """    const totalTokens = cacheNumber(usage, ['totalTokens','total_tokens','totalTokenCount','total_token_count']);

    const explicitRead = cacheNumber(usage, ['cacheReadInputTokens','cache_read_input_tokens']);
    let explicitWrite = cacheNumber(usage, ['cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens','input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens']);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cache_creation.ephemeral_1h_input_tokens']);""",
    """    const totalTokens = cacheNumber(usage, ['totalTokens','total_tokens','totalTokenCount','total_token_count']);

    const hasRequestIdentity = ['requestId','request_id','id'].some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const hasRequestTimestamp = ['createdAt','created_at','timestamp'].some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const hasLlmGatewayLogCacheField = ['cachedTokens','cacheWriteTokens','cacheWrite5mTokens','cacheWrite1hTokens']
      .some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const llmgatewayLogCacheShape = hasRequestIdentity && hasRequestTimestamp && hasLlmGatewayLogCacheField;

    const explicitRead = cacheNumber(usage, [
      'cacheReadInputTokens','cache_read_input_tokens',
      ...(llmgatewayLogCacheShape ? ['cachedTokens'] : [])
    ]);
    let explicitWrite = cacheNumber(usage, ['cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens','input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens']);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','cache_creation.ephemeral_5m_input_tokens','prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','cache_creation.ephemeral_1h_input_tokens','prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens']);""",
    'LLMGateway log cache field extraction',
)
replace_once(
    engine,
    """    let source = '';
    if (explicitRead !== null || cachePath(usage, 'cache_creation') || cachePath(usage, 'cache_creation_input_tokens') !== undefined) source = 'anthropic-usage';
    else if (geminiCached !== null || cachePath(usage, 'promptTokenCount') !== undefined || cachePath(usage, 'prompt_token_count') !== undefined) source = 'gemini-usage';
    else if (cachePath(usage, 'prompt_tokens_details') || cachePath(usage, 'prompt_tokens') !== undefined) source = 'openai-chat-usage';
    else if (cachePath(usage, 'input_tokens_details') || cachePath(usage, 'input_tokens') !== undefined) source = 'openai-responses-usage';
    else if (cachePath(usage, 'cachedTokens') !== undefined || cachePath(usage, 'cacheWriteTokens') !== undefined || cachePath(usage, 'cached_tokens') !== undefined || cachePath(usage, 'cache_write_tokens') !== undefined) source = 'llmgateway-usage';
    else if (explicitCached !== null || explicitWrite !== null) source = 'normalized-usage';

    let cachedInputTokens = explicitCached;""",
    """    let source = '';
    if (llmgatewayLogCacheShape) source = 'llmgateway-log-cache-v1';
    else if (cachePath(usage, 'cache_read_input_tokens') !== undefined || cachePath(usage, 'cache_creation') || cachePath(usage, 'cache_creation_input_tokens') !== undefined) source = 'anthropic-usage';
    else if (geminiCached !== null || cachePath(usage, 'promptTokenCount') !== undefined || cachePath(usage, 'prompt_token_count') !== undefined) source = 'gemini-usage';
    else if (cachePath(usage, 'prompt_tokens_details') || cachePath(usage, 'prompt_tokens') !== undefined) source = 'openai-chat-usage';
    else if (cachePath(usage, 'input_tokens_details') || cachePath(usage, 'input_tokens') !== undefined) source = 'openai-responses-usage';
    else if (cachePath(usage, 'cachedTokens') !== undefined || cachePath(usage, 'cacheWriteTokens') !== undefined || cachePath(usage, 'cached_tokens') !== undefined || cachePath(usage, 'cache_write_tokens') !== undefined) source = 'llmgateway-usage';
    else if (explicitCached !== null || explicitWrite !== null) source = 'normalized-usage';

    let cachedInputTokens = llmgatewayLogCacheShape && (explicitRead !== null || explicitWrite !== null)
      ? Number(explicitRead || 0) + Number(explicitWrite || 0)
      : explicitCached;""",
    'LLMGateway log source and cached-total semantics',
)

# Expose the fidelity bump in diagnostics while keeping gateway-response HIT
# separate from provider prompt-cache token reads.
diag = SRC / '40-diagnostics.part.js'
replace_once(diag, 'parser provider-usage-v1', 'parser provider-usage-v2', 'cache parser diagnostic version')
replace_once(
    diag,
    'Cache semantics: request HIT rate != token Read ratio · cached total != explicit Read · unknown stays unknown · source request metadata / Bridge aggregates / independent provider usage parser',
    'Cache semantics: request HIT rate = gateway replay only · LLMGateway cachedTokens = provider cache Read · cached total = Read + Write when both are known · unknown stays unknown · source request metadata / Bridge aggregates / independent provider usage parser',
    'cache semantics diagnostic',
)

# Product/runtime contract bump. Manager stays 1.2.6; only its bundled product
# descriptor changes so it can adopt Bridge Engine 1.6.7 safely.
manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE}';", 'manager bundled engine version')

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

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE}, manager {MANAGER_VERSION}) with LLMGateway log cache fidelity v1')
