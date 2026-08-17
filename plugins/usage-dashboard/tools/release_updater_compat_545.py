from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-rc.1'
NEW_VERSION = '3.0.0-alpha.5.45'


def read(path: Path) -> str:
    return path.read_text()


def write(path: Path, text: str) -> None:
    path.write_text(text)


def replace_required(path: Path, old: str, new: str, minimum: int = 1) -> int:
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{path}: expected at least {minimum} matches for {old!r}, got {count}')
    write(path, text.replace(old, new))
    return count


# PocketRisu currently compares plugin versions by splitting on dots and Number().
# A prerelease transition such as alpha.5.44 -> rc.1 is therefore ordered backwards.
# Keep the RC productization code intact, but publish it under the next updater-compatible
# alpha build so existing alpha.5.44 installs can discover it with the normal + flow.
core_path = SRC / '00-runtime-core.part.js'
replace_required(core_path, OLD_VERSION, NEW_VERSION, minimum=2)

manager_path = RUNTIME / 'bridge-manager.cjs'
replace_required(manager_path, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';")

# Keep product metadata aligned and refresh the manager checksum after the product
# version-only manager edit. Engine/manager implementation versions remain frozen.
product_manifest_path = RUNTIME / 'product-manifest.json'
product_manifest = json.loads(read(product_manifest_path))
if product_manifest.get('productVersion') != OLD_VERSION:
    raise SystemExit(f'product manifest version drifted: {product_manifest.get("productVersion")}')
product_manifest['productVersion'] = NEW_VERSION
product_manifest['components']['plugin']['version'] = NEW_VERSION
product_manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manager = read(manager_path)
product_manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager.encode()).hexdigest()
if product_manifest['components']['bridge']['requiredVersion'] != '1.6.5':
    raise SystemExit('bridge version must stay frozen at 1.6.5')
if product_manifest['components']['bridgeManager']['version'] != '1.2.6':
    raise SystemExit('manager version must stay frozen at 1.2.6')
if product_manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('runtime contracts must stay frozen at v1')
write(product_manifest_path, json.dumps(product_manifest, indent=2) + '\n')

# Version-specific RC contract assertions should follow the compatibility build.
# General feature tests are intentionally left untouched unless they encode the exact
# previous product version.
for path in TESTS.rglob('*.cjs'):
    text = read(path)
    if OLD_VERSION in text:
        write(path, text.replace(OLD_VERSION, NEW_VERSION))

# Historical 5.43 -> 5.44 byte-parity remains unchanged; teach the forward gate that
# this one compatibility build is a valid post-5.44 product stage.
structural_path = TESTS / 'p5-structural-parity.cjs'
structural = read(structural_path)
needle = "assert.ok(/^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0', `unexpected post-5.44 version: ${version}`);"
replacement = "assert.ok(version === '3.0.0-alpha.5.45' || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0' || version === '3.0.1', `unexpected post-5.44 version: ${version}`);"
if needle not in structural:
    if NEW_VERSION not in structural:
        raise SystemExit('structural parity forward-version gate drifted')
else:
    structural = structural.replace(needle, replacement, 1)
    write(structural_path, structural)

print(f'prepared updater-compatible Local Usage Dashboard {NEW_VERSION} from {OLD_VERSION}')
