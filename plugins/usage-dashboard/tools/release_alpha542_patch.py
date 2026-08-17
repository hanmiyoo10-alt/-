from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Plugin/product bump only. Engine 1.6.5 and Manager 1.2.6 semantic versions stay frozen.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.41', '//@version 3.0.0-alpha.5.42', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.41';", "const VERSION = '3.0.0-alpha.5.42';", 'runtime version')
if "const REQUIRED_BRIDGE_VERSION = '1.6.5';" not in core:
    raise SystemExit('required bridge version drifted from 1.6.5')
write(core_path, core)


# Preserve the DevPass fields Engine 1.6.5 already provides instead of dropping them
# in the plugin adapter. Internal org/project identifiers remain intentionally omitted.
usage_path = SRC / '10-usage-data.part.js'
usage = read(usage_path)
old_account = '''      const devpassAccount = ds ? {
        plan:String(ds.plan || 'none'),
        pendingTier:ds.pendingTier === null || ds.pendingTier === undefined ? '' : String(ds.pendingTier),
        serviceTier:String(ds.serviceTier || 'default'),
        routingStrategy:String(ds.routingStrategy || 'auto'),
        paygEnabled:ds.paygEnabled === true,
        hasPersonalOrg:typeof ds.hasPersonalOrg === 'boolean' ? ds.hasPersonalOrg : null,
        source:String(ds.source || '')
      } : null;
'''
new_account = '''      const devpassAccount = ds ? {
        plan:String(ds.plan || 'none'),
        cycle:ds.cycle === null || ds.cycle === undefined ? '' : String(ds.cycle),
        billingCycleStart:ds.billingCycleStart || null,
        expiresAt:ds.expiresAt || null,
        cancelled:ds.cancelled === true,
        pendingTier:ds.pendingTier === null || ds.pendingTier === undefined ? '' : String(ds.pendingTier),
        serviceTier:String(ds.serviceTier || 'default'),
        routingStrategy:String(ds.routingStrategy || 'auto'),
        paygEnabled:ds.paygEnabled === true,
        hasPersonalOrg:typeof ds.hasPersonalOrg === 'boolean' ? ds.hasPersonalOrg : null,
        hasBillingHistory:typeof ds.hasBillingHistory === 'boolean' ? ds.hasBillingHistory : null,
        resetPasses:num(ds.resetPasses) ? Number(ds.resetPasses) : null,
        includedResetPasses:num(ds.includedResetPasses) ? Number(ds.includedResetPasses) : null,
        includedResetPassesRemaining:num(ds.includedResetPassesRemaining) ? Number(ds.includedResetPassesRemaining) : null,
        resetPassPrice:num(ds.resetPassPrice) ? Number(ds.resetPassPrice) : null,
        regularCredits:num(ds.regularCredits) ? Number(ds.regularCredits) : null,
        source:String(ds.source || '')
      } : null;
'''
usage = replace_once(usage, old_account, new_account, 'DevPass account adapter parity')
write(usage_path, usage)


# DevPass tab: replace the small 5.41 account metadata strip with two explicit parity
# boxes so plan/account state and Reset Pass/PAYG details are readable without mixing
# them into the 24h usage metrics.
ui_path = SRC / '50-settings-ui.part.js'
ui = read(ui_path)
old_parity = '''    const devpassParityExtra = devpassAccount
      ? `<div class="mini"><span>Service tier</span><b>${esc(String(devpassAccount.serviceTier || '—').toUpperCase())}</b></div><div class="mini"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div><div class="mini"><span>Pending tier</span><b>${esc(String(devpassAccount.pendingTier || '—'))}</b></div><div class="mini"><span>Personal org</span><b>${devpassAccount.hasPersonalOrg === null ? '—' : devpassAccount.hasPersonalOrg ? '있음' : '없음'}</b></div>`
      : '';
'''
new_parity = '''    const devpassAccountStatus = !devpassAccount
      ? '—'
      : devpassAccount.cancelled
        ? '취소 예정'
        : String(devpassAccount.plan || 'none') !== 'none'
          ? 'ACTIVE'
          : '—';
    const devpassIncludedPassText = num(devpassAccount?.includedResetPassesRemaining)
      ? (num(devpassAccount?.includedResetPasses)
        ? `${Number(devpassAccount.includedResetPassesRemaining)} / ${Number(devpassAccount.includedResetPasses)}장`
        : `${Number(devpassAccount.includedResetPassesRemaining)}장`)
      : '—';
    const devpassAccountDetailHtml = devpassAccount
      ? `<div class="usage-detail-grid devpass-account-parity">
          <div class="usage-detail-box"><div class="recent-head"><h3>DevPass account</h3><span>${esc(devpassAccountStatus)}</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(String(devpassAccount.plan || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(String(devpassAccount.cycle || '—'))}</b></div>
            <div class="mini"><span>Status</span><b>${esc(devpassAccountStatus)}</b></div>
            <div class="mini"><span>Service tier</span><b>${esc(String(devpassAccount.serviceTier || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div>
            <div class="mini"><span>Pending tier</span><b>${esc(String(devpassAccount.pendingTier || '—'))}</b></div>
            <div class="mini"><span>Personal org</span><b>${devpassAccount.hasPersonalOrg === null ? '—' : devpassAccount.hasPersonalOrg ? '있음' : '없음'}</b></div>
            <div class="mini"><span>Billing history</span><b>${devpassAccount.hasBillingHistory === null ? '—' : devpassAccount.hasBillingHistory ? '있음' : '없음'}</b></div>
          </div></div>
          <div class="usage-detail-box"><div class="recent-head"><h3>Reset Pass · PAYG</h3><span>${devpassAccount.paygEnabled ? 'PAYG ON' : 'PAYG OFF'}</span></div><div class="minis">
            <div class="mini purple"><span>총 사용 가능</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>
            <div class="mini purple"><span>구매/보유 패스</span><b>${num(devpassAccount.resetPasses) ? `${Number(devpassAccount.resetPasses)}장` : '—'}</b></div>
            <div class="mini purple"><span>기본 패스 남음</span><b>${esc(devpassIncludedPassText)}</b></div>
            <div class="mini"><span>Reset Pass 가격</span><b>${money(devpassAccount.resetPassPrice)}</b></div>
            <div class="mini"><span>PAYG overflow</span><b>${devpassAccount.paygEnabled ? '켜짐' : '꺼짐'}</b></div>
            <div class="mini cyan"><span>Regular Credits</span><b>${money(devpassAccount.regularCredits)}</b></div>
          </div></div>
        </div>`
      : '';
'''
ui = replace_once(ui, old_parity, new_parity, 'DevPass account detail HTML')
ui = replace_once(
    ui,
    '''      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>${devpassParityExtra}`
''',
    '''      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>`
''',
    'remove duplicate DevPass parity minis',
)
ui = replace_once(
    ui,
    '''        </div>${scopeUsageDetailsHtml(scopeActivity)}` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
''',
    '''        </div>${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${scopeUsageDetailsHtml(scopeActivity)}` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
''',
    'insert DevPass parity boxes',
)
write(ui_path, ui)


# Diagnostics expose the newly preserved account fields so mobile validation can
# distinguish missing upstream values from UI rendering problems.
diag_path = SRC / '40-diagnostics.part.js'
diag = read(diag_path)
old_diag = "      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,\n"
new_diag = old_diag + "      `DevPass account detail: plan ${diagAccount?.plan || '—'} · cycle ${diagAccount?.cycle || '—'} · status ${!diagAccount ? '—' : diagAccount.cancelled ? 'cancelled' : String(diagAccount.plan || 'none') !== 'none' ? 'active' : '—'} · reset total ${num(d.weekly?.resetPasses) ? Number(d.weekly.resetPasses) : '—'} · purchased ${num(diagAccount?.resetPasses) ? Number(diagAccount.resetPasses) : '—'} · included remaining ${num(diagAccount?.includedResetPassesRemaining) ? Number(diagAccount.includedResetPassesRemaining) : '—'} · price ${money(diagAccount?.resetPassPrice)} · PAYG ${diagAccount?.paygEnabled ? 'on' : 'off'} · regular credits ${money(diagAccount?.regularCredits)}`,\n"
diag = replace_once(diag, old_diag, new_diag, 'DevPass account diagnostics')
write(diag_path, diag)


# Keep the 5.41 service-tier regression active on 5.42 by moving its exact product
# assertions forward. The service tier implementation itself is intentionally untouched.
service_test_path = TESTS / 'p5-service-tier-fidelity.cjs'
service_test = read(service_test_path)
count_541 = service_test.count('3.0.0-alpha.5.41')
if count_541 < 4:
    raise SystemExit(f'service tier regression version markers drifted: {count_541}')
service_test = service_test.replace('3.0.0-alpha.5.41', '3.0.0-alpha.5.42')
write(service_test_path, service_test)


# Dedicated DevPass account/Reset Pass/PAYG parity regression.
account_test = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const usage = fs.readFileSync(`${root}/src/10-usage-data.part.js`, 'utf8');
const ui = fs.readFileSync(`${root}/src/50-settings-ui.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(source.includes('//@version 3.0.0-alpha.5.42'));
for (const marker of [
  'cycle:ds.cycle',
  'billingCycleStart:ds.billingCycleStart',
  'expiresAt:ds.expiresAt',
  'cancelled:ds.cancelled === true',
  'hasBillingHistory:',
  'resetPasses:num(ds.resetPasses)',
  'includedResetPasses:num(ds.includedResetPasses)',
  'includedResetPassesRemaining:num(ds.includedResetPassesRemaining)',
  'resetPassPrice:num(ds.resetPassPrice)',
  'regularCredits:num(ds.regularCredits)',
]) assert.ok(usage.includes(marker), `missing DevPass account adapter field: ${marker}`);

for (const marker of [
  'DevPass account',
  'Reset Pass · PAYG',
  '<span>Plan</span>',
  '<span>Cycle</span>',
  '<span>Status</span>',
  '<span>Service tier</span>',
  '<span>Routing</span>',
  '<span>Pending tier</span>',
  '<span>Personal org</span>',
  '<span>Billing history</span>',
  '<span>총 사용 가능</span>',
  '<span>구매/보유 패스</span>',
  '<span>기본 패스 남음</span>',
  '<span>Reset Pass 가격</span>',
  '<span>PAYG overflow</span>',
  '<span>Regular Credits</span>',
]) assert.ok(ui.includes(marker), `missing DevPass parity UI marker: ${marker}`);

assert.ok(ui.includes("dashboardView === 'devpass' ? devpassAccountDetailHtml : ''"), 'DevPass parity boxes must be scoped to DevPass tab');
assert.ok(diagnostics.includes('DevPass account detail:'), 'DevPass account detail diagnostics missing');
assert.ok(!ui.includes('<span>Organization ID</span>') && !ui.includes('<span>Project ID</span>'), 'internal identifiers must remain hidden');
assert.ok(engine.includes("const VERSION = '1.6.5';"), 'Engine semantic version should remain 1.6.5');
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"), 'Manager semantic version should remain 1.2.6');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log('usage-dashboard P5 DevPass account detail parity: OK · 3.0.0-alpha.5.42');
'''
write(TESTS / 'p5-devpass-account-parity.cjs', account_test)


# Manager product metadata follows the plugin product, while its semantic version and
# bundled Engine 1.6.5 stay unchanged.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.41';", "const PRODUCT_VERSION = '3.0.0-alpha.5.42';", 'manager product version')
if "const MANAGER_VERSION = '1.2.6';" not in manager:
    raise SystemExit('manager semantic version drifted')
if "const BUNDLED_ENGINE_VERSION = '1.6.5';" not in manager:
    raise SystemExit('bundled Engine semantic version drifted')
write(manager_path, manager)
manager_sha = sha256(manager_path)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != '3.0.0-alpha.5.41':
    raise SystemExit(f"unexpected manifest product version: {manifest.get('productVersion')}")
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != '1.6.5':
    raise SystemExit('manifest Engine requirement drifted')
manifest['productVersion'] = '3.0.0-alpha.5.42'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.42'
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.42'
manifest['components']['bridgeManager']['sha256'] = manager_sha
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('prepared Local Usage Dashboard 3.0.0-alpha.5.42 DevPass account detail parity')
