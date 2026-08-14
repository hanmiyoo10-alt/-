from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
manager_path = ROOT / 'runtime/bridge-manager.cjs'
manifest_path = ROOT / 'runtime/product-manifest.json'
test_path = ROOT / 'tests/p5-bridge-manager.cjs'

s = manager_path.read_text()

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 marker, got {count}')
    s = s.replace(old, new, 1)

one('manager version', "const MANAGER_VERSION = '1.1.0';", "const MANAGER_VERSION = '1.1.1';")
one('next temp extension', "  const nextFile = `${CURRENT_FILE}.next-${process.pid}`;", "  const nextFile = path.join(path.dirname(CURRENT_FILE), `bridge-manager.next-${process.pid}.cjs`);")
one('rollback temp extension', "  const nextFile = `${CURRENT_FILE}.rollback-${process.pid}`;", "  const nextFile = path.join(path.dirname(CURRENT_FILE), `bridge-manager.rollback-${process.pid}.cjs`);")
manager_path.write_text(s)

manifest = json.loads(manifest_path.read_text())
manifest['components']['bridgeManager']['version'] = '1.1.1'
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

t = test_path.read_text()
anchor = "assert.equal(manifest.components.bridgeManager.bootstrapSha256, hash(bootstrapPath));\n"
if anchor not in t:
    raise SystemExit('test anchor missing')
extra = anchor + "assert.ok(manager.includes(\"const MANAGER_VERSION = '1.1.1';\"), 'manager hotfix version missing');\nassert.ok(manager.includes('bridge-manager.next-${process.pid}.cjs'), 'self-update temp file must preserve .cjs extension');\nassert.ok(manager.includes('bridge-manager.rollback-${process.pid}.cjs'), 'rollback temp file must preserve .cjs extension');\nassert.ok(!manager.includes('`${CURRENT_FILE}.next-${process.pid}`'), 'unknown-extension self-update temp path regressed');\n"
t = t.replace(anchor, extra, 1)
test_path.write_text(t)

print('alpha.5.2 manager temp-extension hotfix prepared')
