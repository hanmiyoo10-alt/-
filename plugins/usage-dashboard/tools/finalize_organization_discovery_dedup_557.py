from pathlib import Path
import hashlib
import json

# Idempotent deployment retrigger marker: rerun the P19-validated 5.57 finalizer.
ROOT = Path('plugins/usage-dashboard')
RUNTIME = ROOT / 'runtime'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
EXPECTED_PRODUCT = '3.0.0-alpha.5.57'
EXPECTED_ENGINE = '1.6.11'
EXPECTED_MANAGER = '1.2.6'


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


engine = ENGINE.read_text()
if f"const VERSION = '{EXPECTED_ENGINE}';" not in engine:
    raise SystemExit(f'expected Bridge Engine {EXPECTED_ENGINE}')

failure_line = "    if (!organizations.length) throw new Error('No organizations found in CLI output');"
if failure_line not in engine:
    marker = """      source = 'LLMGateway CLI';
    }

    if (captured?.devPlanStatus) {"""
    replacement = """      source = 'LLMGateway CLI';
    }

    if (!organizations.length) throw new Error('No organizations found in CLI output');

    if (captured?.devPlanStatus) {"""
    engine = replace_once(engine, marker, replacement, 'organization empty-result failure contract')
    ENGINE.write_text(engine)

engine_sha = sha256_file(ENGINE)

manager = MANAGER.read_text()
if f"const MANAGER_VERSION = '{EXPECTED_MANAGER}';" not in manager:
    raise SystemExit(f'expected Bridge Manager {EXPECTED_MANAGER}')
if f"const PRODUCT_VERSION = '{EXPECTED_PRODUCT}';" not in manager:
    raise SystemExit(f'expected product {EXPECTED_PRODUCT} in manager')
if f"const BUNDLED_ENGINE_VERSION = '{EXPECTED_ENGINE}';" not in manager:
    raise SystemExit(f'expected bundled Engine {EXPECTED_ENGINE}')

prefix = "const BUNDLED_ENGINE_SHA256 = '"
start = manager.find(prefix)
if start < 0:
    raise SystemExit('manager bundled engine SHA marker missing')
end = manager.find("';", start + len(prefix))
if end < 0:
    raise SystemExit('manager bundled engine SHA terminator missing')
manager = manager[:start] + prefix + engine_sha + manager[end:]
MANAGER.write_text(manager)

manifest = json.loads(MANIFEST.read_text())
if manifest.get('productVersion') != EXPECTED_PRODUCT:
    raise SystemExit(f"expected manifest product {EXPECTED_PRODUCT}, got {manifest.get('productVersion')}")
components = manifest.get('components') or {}
if (components.get('bridge') or {}).get('requiredVersion') != EXPECTED_ENGINE:
    raise SystemExit('manifest Bridge Engine version mismatch')
if (components.get('bridgeManager') or {}).get('version') != EXPECTED_MANAGER:
    raise SystemExit('manifest Bridge Manager version mismatch')
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['sha256'] = sha256_file(MANAGER)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

guidelines = GUIDELINES.read_text()
contract_line = "- If capture and the plain fallback both contain no usable organization rows, preserve the prior `No organizations found in CLI output` failure instead of converting UNKNOWN/empty discovery into a successful empty result."
if contract_line not in guidelines:
    anchor = "- If account capture fails or does not contain usable organization rows, fall back to the prior plain `orgs list --json` path."
    if guidelines.count(anchor) != 1:
        raise SystemExit('5.57 organization fallback guideline anchor missing')
    guidelines = guidelines.replace(anchor, f'{anchor}\n{contract_line}', 1)
    GUIDELINES.write_text(guidelines)

print(
    f'finalized Local Usage Dashboard {EXPECTED_PRODUCT} organization discovery contract '
    f'(engine {EXPECTED_ENGINE}, manager {EXPECTED_MANAGER})'
)
