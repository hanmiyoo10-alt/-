from pathlib import Path
import hashlib
import json

VERSION_OLD = '3.0.0-alpha.5.6'
VERSION_NEW = '3.0.0-alpha.5.7'
MANAGER_OLD = '1.2.1'
MANAGER_NEW = '1.2.2'


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {count}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))


# Product/plugin version bump. The deterministic builder updates latest.js and src manifest hashes.
replace_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    '//@version 3.0.0-alpha.5.6',
    '//@version 3.0.0-alpha.5.7',
)
replace_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    "const VERSION = '3.0.0-alpha.5.6';",
    "const VERSION = '3.0.0-alpha.5.7';",
)

manager_path = Path('plugins/usage-dashboard/runtime/bridge-manager.cjs')
manager = manager_path.read_text()
if manager.count("const MANAGER_VERSION = '1.2.1';") != 1:
    raise SystemExit('bridge-manager: manager version anchor mismatch')
if manager.count("const PRODUCT_VERSION = '3.0.0-alpha.5.6';") != 1:
    raise SystemExit('bridge-manager: product version anchor mismatch')
manager = manager.replace("const MANAGER_VERSION = '1.2.1';", "const MANAGER_VERSION = '1.2.2';", 1)
manager = manager.replace("const PRODUCT_VERSION = '3.0.0-alpha.5.6';", "const PRODUCT_VERSION = '3.0.0-alpha.5.7';", 1)

anchor = "const ENGINE_SERVICE_DIR = path.join(PREFIX, 'var/service', ENGINE_SERVICE);\n"
insert = anchor + "const TERMUX_EXEC_LD_PRELOAD = path.join(PREFIX, 'lib', 'libtermux-exec-ld-preload.so');\n"
if manager.count(anchor) != 1:
    raise SystemExit('bridge-manager: ENGINE_SERVICE_DIR anchor mismatch')
manager = manager.replace(anchor, insert, 1)

old_service = """function writeEngineService(candidate, down = true) {
  fs.mkdirSync(ENGINE_SERVICE_DIR, {recursive:true});
  const command = [candidate.exe, ...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs].map(shellQuote).join(' ');
  const run = `#!/data/data/com.termux/files/usr/bin/sh
cd ${shellQuote(candidate.cwd)}
exec ${command}
`;
  fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), run, {mode:0o700});
  fs.chmodSync(path.join(ENGINE_SERVICE_DIR, 'run'), 0o700);
  const downFile = path.join(ENGINE_SERVICE_DIR, 'down');
  if (down) fs.writeFileSync(downFile, ''); else { try { fs.unlinkSync(downFile); } catch (_) {} }
}
"""
new_service = """function engineServiceLdPreloadLine() {
  return fs.existsSync(TERMUX_EXEC_LD_PRELOAD) ? `export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}\\n` : '';
}
function engineServiceEnvironmentReady() {
  if (!fs.existsSync(TERMUX_EXEC_LD_PRELOAD)) return true;
  try {
    const run = fs.readFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), 'utf8');
    return run.includes(`export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}`);
  } catch (_) { return false; }
}
function writeEngineService(candidate, down = true) {
  fs.mkdirSync(ENGINE_SERVICE_DIR, {recursive:true});
  const command = [candidate.exe, ...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs].map(shellQuote).join(' ');
  const run = `#!/data/data/com.termux/files/usr/bin/sh
${engineServiceLdPreloadLine()}cd ${shellQuote(candidate.cwd)}
exec ${command}
`;
  fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), run, {mode:0o700});
  fs.chmodSync(path.join(ENGINE_SERVICE_DIR, 'run'), 0o700);
  const downFile = path.join(ENGINE_SERVICE_DIR, 'down');
  if (down) fs.writeFileSync(downFile, ''); else { try { fs.unlinkSync(downFile); } catch (_) {} }
}
"""
if manager.count(old_service) != 1:
    raise SystemExit('bridge-manager: writeEngineService block mismatch')
manager = manager.replace(old_service, new_service, 1)

old_bundle = """  const bundleReady = bundledEngineReady();
  const descriptorBundled = Boolean(descriptor && path.resolve(String(descriptor.script || '')) === path.resolve(BUNDLED_ENGINE_FILE));
  const engineBundled = Boolean(managed && descriptorBundled && bundleReady);
"""
new_bundle = """  const bundleReady = bundledEngineReady();
  const descriptorBundled = Boolean(descriptor && path.resolve(String(descriptor.script || '')) === path.resolve(BUNDLED_ENGINE_FILE));
  const serviceEnvironmentReady = engineServiceEnvironmentReady();
  const engineBundled = Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady);
"""
if manager.count(old_bundle) != 1:
    raise SystemExit('bridge-manager: engine bundle status block mismatch')
manager = manager.replace(old_bundle, new_bundle, 1)

old_status = """    engineBundleSha256:BUNDLED_ENGINE_SHA256,
    candidateSafe,
"""
new_status = """    engineBundleSha256:BUNDLED_ENGINE_SHA256,
    engineServiceEnvironmentReady:serviceEnvironmentReady,
    candidateSafe,
"""
if manager.count(old_status) != 1:
    raise SystemExit('bridge-manager: status payload anchor mismatch')
manager = manager.replace(old_status, new_status, 1)
manager_path.write_text(manager)

# Regression locks.
p = Path('plugins/usage-dashboard/tests/p5-bridge-manager.cjs')
t = p.read_text()
t = t.replace('Bridge Manager 1.2.1', 'Bridge Manager 1.2.2')
t = t.replace("const MANAGER_VERSION = '1.2.1';", "const MANAGER_VERSION = '1.2.2';")
marker = "assert.ok(manager.includes('processMatchesSpec(service.pid, descriptor)'), 'managed service process fallback missing');\n"
extra = marker + "assert.ok(manager.includes(\"const TERMUX_EXEC_LD_PRELOAD = path.join(PREFIX, 'lib', 'libtermux-exec-ld-preload.so');\"), 'Termux exec preload path missing');\nassert.ok(manager.includes('function engineServiceEnvironmentReady()'), 'engine service environment verifier missing');\nassert.ok(manager.includes('export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}'), 'engine service LD_PRELOAD export missing');\nassert.ok(manager.includes('bundleReady && serviceEnvironmentReady'), 'bad engine service environment must force bundle reconciliation');\n"
if t.count(marker) != 1:
    raise SystemExit('p5-bridge-manager marker mismatch')
t = t.replace(marker, extra, 1)
p.write_text(t)

p = Path('plugins/usage-dashboard/tests/p5-bundled-engine.cjs')
t = p.read_text()
t = t.replace("const MANAGER_VERSION = '1.2.1';", "const MANAGER_VERSION = '1.2.2';")
t = t.replace("manifest.components.bridgeManager.version,'1.2.1'", "manifest.components.bridgeManager.version,'1.2.2'")
marker = "assert.ok(manager.includes('async function syncBundledEngine()'));\n"
extra = marker + "assert.ok(manager.includes('function engineServiceEnvironmentReady()'));\nassert.ok(manager.includes('export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}'));\nassert.ok(manager.includes('bundleReady && serviceEnvironmentReady'));\n"
if t.count(marker) != 1:
    raise SystemExit('p5-bundled-engine marker mismatch')
t = t.replace(marker, extra, 1)
p.write_text(t)

manifest_path = Path('plugins/usage-dashboard/runtime/product-manifest.json')
manifest = json.loads(manifest_path.read_text())
if manifest.get('productVersion') != VERSION_OLD:
    raise SystemExit(f'product manifest version mismatch: {manifest.get("productVersion")}')
manifest['productVersion'] = VERSION_NEW
manifest['components']['plugin']['version'] = VERSION_NEW
manifest['components']['bridgeManager']['version'] = MANAGER_NEW
manifest['components']['bridgeManager']['productVersion'] = VERSION_NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'Local Usage patch staged: {VERSION_NEW} / manager {MANAGER_NEW}')
