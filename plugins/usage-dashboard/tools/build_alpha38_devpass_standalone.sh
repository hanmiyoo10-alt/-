#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SRC="$TMP/alpha37.js"
PATCHER="$TMP/patch.cjs"
OUT="${HOME}/storage/downloads/local_usage_dashboard_v3.0.0-alpha.3.8.js"
URL='https://raw.githubusercontent.com/hanmiyoo10-alt/-/0edef8c5900617f4ab2487a1043e2042f4096014/plugins/usage-dashboard/latest.js'
cat > "$PATCHER" <<'NODE'
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('usage: node patch-alpha37-to-alpha38.cjs <alpha3.7.js> <output.js>');
  process.exit(2);
}

let src = fs.readFileSync(input, 'utf8');
if (!src.includes('//@version 3.0.0-alpha.3.7') || !src.includes("const VERSION = '3.0.0-alpha.3.7';")) {
  throw new Error('입력 파일이 정확한 Local Usage Dashboard alpha.3.7이 아니야.');
}

function replaceOnce(label, pattern, replacement) {
  const before = src;
  src = src.replace(pattern, replacement);
  if (src === before) throw new Error(`${label} 패치 지점을 찾지 못했어.`);
}

replaceOnce('메타 버전', '//@version 3.0.0-alpha.3.7', '//@version 3.0.0-alpha.3.8');
replaceOnce('런타임 버전', "const VERSION = '3.0.0-alpha.3.7';", "const VERSION = '3.0.0-alpha.3.8';");

const newNormalize = `  function normalize(payload) {
    const r = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!r || typeof r !== 'object') throw new Error('snapshot 형식이 잘못됐어.');

    // DevPass Bridge v1.6.x compatibility adapter.
    // Keep the original generic local-JSON adapter below as a fallback.
    const ds = r.devpassStatus && typeof r.devpassStatus === 'object' ? r.devpassStatus : null;
    const ba = r.activity && typeof r.activity === 'object' ? r.activity : null;
    if (ds || r.__bridgeSnapshot || r.bridgeVersion) {
      const monthly = ds ? bucket({
        label:'DevPass 월간',
        used:ds.creditsUsed,
        limit:ds.creditsLimit,
        remaining:ds.creditsRemaining,
        resetAt:ds.expiresAt
      }, 'DevPass 월간') : null;
      const weekly = ds ? bucket({
        label:'Premium 주간',
        used:ds.premiumCreditsUsed,
        limit:ds.premiumWeeklyLimit,
        resetAt:ds.premiumWeekResetsAt
      }, 'Premium 주간') : null;
      const credits = ds && num(ds.regularCredits)
        ? {label:'Credits', balance:Number(ds.regularCredits), todayUsed:null}
        : null;
      const activity = ba ? {
        requests24h:num(ba.totalRequests)?Number(ba.totalRequests):null,
        cost24h:num(ba.totalCost)?Number(ba.totalCost):null,
        totalTokens24h:num(ba.totalTokens)?Number(ba.totalTokens):null,
        errorRate24h:num(ba.errorRate)?Number(ba.errorRate):null
      } : null;
      const out = {
        protocolVersion:Number(r.protocolVersion || 1),
        fetchedAt:r.fetchedAt || ds?.fetchedAt || ba?.fetchedAt || Date.now(),
        source:String(ba?.source || ds?.source || ('LLMGateway DevPass Bridge' + (r.bridgeVersion ? ' v' + r.bridgeVersion : ''))),
        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},
        monthly, weekly, credits, activity
      };
      if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('DevPass Bridge에 표시할 데이터가 없어.');
      return out;
    }

    const u = r.usage && typeof r.usage === 'object' ? r.usage : r;
    const credits = u.credits && typeof u.credits === 'object'
      ? {label:String(u.credits.label || 'Credits'), balance:num(u.credits.balance)?Number(u.credits.balance):null, todayUsed:num(u.credits.todayUsed)?Number(u.credits.todayUsed):null}
      : null;
    const activity = u.activity && typeof u.activity === 'object'
      ? {requests24h:num(u.activity.requests24h)?Number(u.activity.requests24h):null, cost24h:num(u.activity.cost24h)?Number(u.activity.cost24h):null, totalTokens24h:num(u.activity.totalTokens24h)?Number(u.activity.totalTokens24h):null, errorRate24h:num(u.activity.errorRate24h)?Number(u.activity.errorRate24h):null}
      : null;
    const out = {
      protocolVersion: Number(r.protocolVersion || 1), fetchedAt: r.fetchedAt || Date.now(),
      source: String(r.source || 'Local Bridge'), health: r.health && typeof r.health === 'object' ? r.health : null,
      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity
    };
    if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('표시할 usage 데이터가 없어.');
    return out;
  }`;

replaceOnce(
  'DevPass snapshot adapter',
  /  function normalize\(payload\) \{[\s\S]*?\n  \}\n\n  async function persist\(\)/,
  `${newNormalize}\n\n  async function persist()`
);

replaceOnce(
  'Bridge 인증 헤더',
  "headers:{Accept:'application/json','X-Local-Bridge-Key':token,'Cache-Control':'no-cache'}",
  "headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}"
);

replaceOnce(
  '월간/주간 compact fallback',
  "const main = b => detailed ? money(b?.remaining) : money(b?.todayUsed,4);",
  "const main = b => detailed ? money(b?.remaining) : (num(b?.todayUsed) ? money(b.todayUsed,4) : money(b?.remaining));"
);

replaceOnce(
  'Credits compact fallback',
  "${row(c?.label||'Credits',detailed?money(c?.balance):money(c?.todayUsed,4),'#9fc9df')}",
  "${row(c?.label||'Credits',detailed?money(c?.balance):(num(c?.todayUsed)?money(c.todayUsed,4):money(c?.balance)),'#9fc9df')}"
);

// Make diagnostics tell us which compatibility path this test build targets.
replaceOnce('진단 어댑터 이름', '`Adapter: local-json-v1`', "`Adapter: devpass-bridge-v1.6.x + local-json-v1`");

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, src);
console.log(output);
NODE

echo '[1/3] alpha.3.7 원본 받는 중...'
curl -fLsS --retry 2 --connect-timeout 15 "$URL" -o "$SRC"
echo '[2/3] DevPass Bridge 1.6.x 호환 패치 적용 중...'
node "$PATCHER" "$SRC" "$OUT" >/dev/null
echo '[3/3] JavaScript 문법 검사 중...'
node --check "$OUT" >/dev/null
printf '완료: %s\n' "$OUT"
printf '버전: '; grep -m1 '^//@version ' "$OUT" | sed 's#^//@version ##'
printf 'Bridge headers: '; grep -o "X-Local-Bridge-Key\|X-DevPass-Bridge-Key" "$OUT" | sort -u | tr '\n' ' '; echo
