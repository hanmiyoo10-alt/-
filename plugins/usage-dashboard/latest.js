//@name local_usage_dashboard_modular
//@display-name Local Usage Dashboard
//@version 3.0.0-alpha.3.3
//@api 3.0
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/usage-dashboard/latest.js

(async () => {
  'use strict';

  const VERSION = '3.0.0-alpha.3.3';
  const UPDATE_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/usage-dashboard/latest.js';
  const STATE_KEY = 'local-usage-dashboard-v3';
  const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';
  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';
  const DEFAULTS = {
    bridgeBase: DEFAULT_BRIDGE, bridgeEnabled: false, bridgeStatus: 'off', bridgeError: '',
    refreshMs: 15000, backgroundPause: true, syncOnFocus: true,
    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,
    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,
    data: null
  };

  let store, state, token = '', refreshTimer = null, refreshInFlight = null;
  let widget = null, rootBody = null, drag = null;
  const uiParts = [], remoteListeners = [], domListeners = [];

  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const money = (v, d = 2) => num(v) ? `$${Number(v).toFixed(d)}` : '—';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const pct = v => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : 0;

  function age(ts) {
    if (!num(ts)) return '대기';
    const s = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
    if (s < 5) return '방금';
    if (s < 60) return `${s}초 전`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`;
  }

  function connectionBadge() {
    if (state.bridgeStatus === 'connected') return {label:'LIVE', color:'#c5f277'};
    if (state.bridgeStatus === 'error') return {label:'OFFLINE', color:'#ff9b95'};
    return {label:'WAIT', color:'#ffd27d'};
  }

  function normalizeBridgeBase(value) {
    const u = new URL(String(value || DEFAULT_BRIDGE).trim());
    const h = String(u.hostname || '').toLowerCase();
    if (!['http:','https:'].includes(u.protocol)) throw new Error('Bridge는 http(s)만 사용할 수 있어.');
    if (!['127.0.0.1','localhost','::1','[::1]'].includes(h)) throw new Error('localhost/127.0.0.1 Bridge만 허용해.');
    return u.origin;
  }

  function bucket(raw, label) {
    if (!raw || typeof raw !== 'object') return null;
    const used = num(raw.used) ? Number(raw.used) : null;
    const limit = num(raw.limit) ? Number(raw.limit) : null;
    const remaining = num(raw.remaining) ? Number(raw.remaining) : (num(used) && num(limit) ? Math.max(0, limit - used) : null);
    const percent = num(raw.percent) ? pct(raw.percent) : (num(used) && num(limit) && limit > 0 ? pct(used / limit * 100) : null);
    return {label:String(raw.label || label), used, limit, remaining, percent, todayUsed:num(raw.todayUsed)?Number(raw.todayUsed):null, resetAt:raw.resetAt ?? null};
  }

  function normalize(payload) {
    const r = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!r || typeof r !== 'object') throw new Error('snapshot 형식이 잘못됐어.');
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
  }

  async function persist() { await store.setItem(STATE_KEY, {...state}); }

  async function fetchSnapshot() {
    if (!token) throw new Error('Bridge Token을 먼저 저장해 줘.');
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/snapshot`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Bridge HTTP ${res.status}: ${text.slice(0,120)}`);
    try { return normalize(JSON.parse(text)); }
    catch (e) { if (e instanceof SyntaxError) throw new Error('Bridge 응답이 JSON이 아니야.'); throw e; }
  }

  async function refresh(reason = 'manual', silent = false) {
    if (!state.bridgeEnabled) return;
    if (refreshInFlight) return refreshInFlight;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    const started = Date.now();
    refreshInFlight = (async () => {
      try {
        state.data = await fetchSnapshot();
        state.bridgeStatus = 'connected';
        state.bridgeError = '';
        state.lastSyncAt = Date.now();
        state.lastSyncDurationMs = state.lastSyncAt - started;
        state.lastRefreshReason = reason;
        state.refreshCount = Number(state.refreshCount || 0) + 1;
        await persist();
        await renderWidget();
        if (document.body?.dataset?.panelOpen === '1') renderSettings();
      } catch (e) {
        // Keep the last successful snapshot in state.data; only status changes.
        state.bridgeStatus = 'error';
        state.bridgeError = e?.message || String(e);
        state.lastRefreshReason = reason;
        await persist();
        if (!silent) console.log(`[Local Usage Dashboard] ${state.bridgeError}`);
        if (document.body?.dataset?.panelOpen === '1') renderSettings();
      }
    })();
    try { await refreshInFlight; } finally { refreshInFlight = null; }
  }

  function diagText() {
    const d = state.data || {}, h = d.health || {};
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,
      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}`,
      `Source: ${d.source || '—'}`,
      `Adapter: local-json-v1`,
      `Health: ${h.status || '—'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,
      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,
      `Reason: ${state.lastRefreshReason || '—'}`,
      `Success count: ${Number(state.refreshCount || 0)}`,
      `Error: ${state.bridgeError || 'none'}`,
      `Updater: ${UPDATE_URL}`
    ].join('\n');
  }

  async function copyDiag() {
    try { if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(diagText()); return true; } } catch (_) {}
    return false;
  }

  function card(title, b, cls='') {
    if (!b) return `<section class="panel metric ${cls}"><small>${esc(title)}</small><strong>—</strong><p>데이터 없음</p></section>`;
    return `<section class="panel metric ${cls}"><small>${esc(b.label || title)}</small><strong>${money(b.used)} <em>/ ${money(b.limit)}</em></strong><div class="bar"><i style="width:${pct(b.percent)}%"></i></div><p>남음 ${money(b.remaining)}${num(b.todayUsed)?` · 오늘 ${money(b.todayUsed,4)}`:''}</p></section>`;
  }

  function settingsHtml() {
    const d = state.data || {}, c = d.credits, a = d.activity, h = d.health || {};
    return `<style>
      :root{color-scheme:dark;--b:#101114;--p:#191b20;--p2:#21242a;--l:#2c3037;--t:#f5f6f8;--m:#969da8;--g:#c5f277;--v:#b9a6f8;--c:#9fd7ee;--e:#ff9b95}
      *{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{width:min(900px,100%);margin:auto;padding:14px}
      header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}h1{margin:0;font-size:23px}.muted,p{color:var(--m);font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .panel{background:var(--p);border:1px solid var(--l);border-radius:13px;padding:13px}.metric{min-height:135px;display:flex;flex-direction:column}.metric small{color:var(--m);font-weight:700}.metric strong{font-size:24px;margin-top:9px}.metric em{font-style:normal;color:var(--m);font-size:12px}.metric p{margin-top:auto;margin-bottom:0}.bar{height:5px;background:#2d3138;border-radius:99px;overflow:hidden;margin:11px 0}.bar i{display:block;height:100%;background:var(--g)}.weekly .bar i{background:var(--v)}.wide{grid-column:1/-1}
      .minis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.mini{background:var(--p2);border-radius:9px;padding:9px}.mini span{display:block;color:var(--m);font-size:10px}.mini b{display:block;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      label{display:grid;gap:5px;margin-top:9px}label span{color:var(--m);font-size:11px}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;background:#111318;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:9px}textarea{min-height:62px}
      button{background:#25282f;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:8px 11px;font-weight:650}button.primary{background:var(--g);border-color:var(--g);color:#15170f}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.warn{color:var(--e)}
      @media(max-width:680px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.minis{grid-template-columns:1fr 1fr}}
    </style><div class="shell"><header><div><div class="muted">MODULAR CORE · v${VERSION}</div><h1>Local Usage Dashboard</h1></div><button id="close">닫기</button></header><main class="grid">
      ${card('월간',d.monthly)}${card('주간',d.weekly,'weekly')}
      <section class="panel metric"><small>${esc(c?.label || 'Credits')}</small><strong>${money(c?.balance)}</strong><p>${num(c?.todayUsed)?`오늘 ${money(c.todayUsed,4)} · `:''}${esc(d.source || 'Local Bridge')}</p></section>
      <section class="panel wide"><b>24h Activity</b><div class="minis"><div class="mini"><span>요청</span><b>${num(a?.requests24h)?`${a.requests24h}회`:'—'}</b></div><div class="mini"><span>비용</span><b>${money(a?.cost24h,4)}</b></div><div class="mini"><span>토큰</span><b>${num(a?.totalTokens24h)?Number(a.totalTokens24h).toLocaleString():'—'}</b></div><div class="mini"><span>오류율</span><b>${num(a?.errorRate24h)?`${Number(a.errorRate24h).toFixed(1)}%`:'—'}</b></div></div></section>
      <section class="panel wide"><b>Local Bridge</b>
        <label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
        <label><span>Bridge Token</span><textarea id="bridge-token" placeholder="저장된 값은 다시 표시하지 않음"></textarea></label>
        <label><span>갱신 주기</span><select id="refresh-ms">${[[15000,'15초'],[30000,'30초'],[60000,'1분'],[300000,'5분'],[0,'수동']].map(([v,l])=>`<option value="${v}" ${Number(state.refreshMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>미니 위젯</span><select id="widget-mode"><option value="compact" ${state.widgetMode!=='detailed'?'selected':''}>간편 · 오늘 사용량</option><option value="detailed" ${state.widgetMode==='detailed'?'selected':''}>상세 · 남은 양 + 오늘 사용량</option></select></label>
        <div class="actions"><button class="primary" id="connect">저장하고 연결</button><button id="refresh">지금 새로고침</button><button id="toggle">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button></div>
        <p>상태 ${esc(state.bridgeStatus)} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class="warn">${esc(state.bridgeError)}</p>`:''}
      </section>
      <section class="panel wide"><b>Runtime Diagnostics</b><div class="minis"><div class="mini"><span>Protocol</span><b>${num(d.protocolVersion)?`v${d.protocolVersion}`:'—'}</b></div><div class="mini"><span>Health</span><b>${esc(h.status || '—')}</b></div><div class="mini"><span>원인</span><b>${esc(state.lastRefreshReason || '—')}</b></div><div class="mini"><span>성공</span><b>${Number(state.refreshCount||0)}회</b></div></div><p>Updater · GitHub HTTPS · ${VERSION}</p><div class="actions"><button id="copy-diag">진단 복사</button></div></section>
    </main></div>`;
  }

  function renderSettings() { document.body.innerHTML = settingsHtml(); bindSettings(); }

  function bindSettings() {
    const q = s => document.querySelector(s);
    if (q('#close')) q('#close').onclick = () => Risuai.hideContainer();
    if (q('#connect')) q('#connect').onclick = async () => {
      try {
        state.bridgeBase = normalizeBridgeBase(q('#bridge-base')?.value || DEFAULT_BRIDGE);
        state.refreshMs = Number(q('#refresh-ms')?.value ?? state.refreshMs);
        state.widgetMode = q('#widget-mode')?.value === 'detailed' ? 'detailed' : 'compact';
        const entered = String(q('#bridge-token')?.value || '').trim();
        if (entered) { token = entered; await store.setItem(TOKEN_KEY, token); }
        if (!token) throw new Error('Bridge Token이 필요해.');
        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; await persist(); scheduleRefresh(); await refresh('connect');
      } catch (e) { state.bridgeStatus='error'; state.bridgeError=e?.message||String(e); await persist(); renderSettings(); }
    };
    if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');
    if (q('#toggle')) q('#toggle').onclick = async () => { state.widgetVisible = state.widgetVisible === false; await persist(); await renderWidget(); renderSettings(); };
    if (q('#widget-mode')) q('#widget-mode').onchange = async e => { state.widgetMode = e.target.value === 'detailed' ? 'detailed' : 'compact'; await persist(); await renderWidget(); };
    if (q('#copy-diag')) q('#copy-diag').onclick = async e => { const b=e.currentTarget, old=b.textContent; b.textContent=(await copyDiag())?'복사됨 ✓':'복사 실패'; setTimeout(()=>b.textContent=old,1200); };
  }

  async function openSettings() { document.body.dataset.panelOpen='1'; renderSettings(); await Risuai.showContainer('fullscreen'); }

  function widgetHtml() {
    const d=state.data||{}, m=d.monthly, w=d.weekly, c=d.credits, detailed=state.widgetMode==='detailed';
    const badge=connectionBadge();
    const main = b => detailed ? money(b?.remaining) : money(b?.todayUsed,4);
    const row = (label,value,color) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:${color}">${esc(label)}</span><b>${value}</b></div>`;
    return `<div style="font:12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;color:#f5f7fa">
      <div data-drag-handle="1" style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab"></div>
      <div style="display:flex;justify-content:flex-end;margin:-2px 0 4px">
        <span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:1px 5px">${badge.label}</span>
      </div>
      ${row(m?.label||'월간',main(m),'#aeb5c0')}${detailed?`<div style="color:#7f8792;font-size:10px">오늘 ${money(m?.todayUsed,4)}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${m?pct(100-Number(m.percent||0)):0}%;background:#c5f277"></i></div>
      ${row(w?.label||'주간',main(w),'#b7add0')}${detailed?`<div style="color:#7f8792;font-size:10px">오늘 ${money(w?.todayUsed,4)}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${w?pct(100-Number(w.percent||0)):0}%;background:#b9a6f8"></i></div>
      ${row(c?.label||'Credits',detailed?money(c?.balance):money(c?.todayUsed,4),'#9fc9df')}${detailed?`<div style="color:#7f8792;font-size:10px">오늘 ${money(c?.todayUsed,4)}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:8px;color:#7f8792;font-size:10px;margin-top:5px">
        <span>${state.bridgeStatus==='error'?'마지막 정상값 유지':'자동 갱신'}</span>
        <span>${age(state.lastSyncAt)} · ${VERSION}</span>
      </div>
    </div>`;
  }

  async function ensureWidget() {
    if (widget) return;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return;
    const root = await Risuai.getRootDocument();
    rootBody = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = num(state.widgetX)&&num(state.widgetY)?`left:${state.widgetX}px;top:${state.widgetY}px;`:'right:12px;bottom:74px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:184px;max-width:calc(100vw - 16px);z-index:2147483000;background:#191b20;color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.24);padding:5px 10px 8px;box-sizing:border-box;user-select:none;touch-action:none;`);
    await rootBody.appendChild(widget);
    const down = async e => {
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r=await widget.getBoundingClientRect();

      // Drag can begin only from the thin handle at the top of the widget.
      // This prevents normal taps/clicks on the widget or surrounding UI from
      // accidentally starting a drag session.
      const localY = Number(e.clientY) - r.top;
      if (localY < 0 || localY > 18) {
        drag = null;
        return;
      }

      drag={
        pointerId: e.pointerId ?? null,
        ox:Number(e.clientX)-r.left,
        oy:Number(e.clientY)-r.top,
        maxX:Math.max(8,(await rootBody.clientWidth())-r.width-8),
        maxY:Math.max(8,(await rootBody.clientHeight())-r.height-8)
      };
    };
    const move = async e => {
      if (!drag||!num(e.clientX)||!num(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      state.widgetX=Math.max(8,Math.min(drag.maxX,Number(e.clientX)-drag.ox));
      state.widgetY=Math.max(8,Math.min(drag.maxY,Number(e.clientY)-drag.oy));
      await widget.setStyle('left',`${state.widgetX}px`);
      await widget.setStyle('top',`${state.widgetY}px`);
      await widget.setStyle('right','auto');
      await widget.setStyle('bottom','auto');
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      drag=null;
      await persist();
    };
    remoteListeners.push([widget,'pointerdown',await widget.addEventListener('pointerdown',down)],[root,'pointermove',await root.addEventListener('pointermove',move)],[root,'pointerup',await root.addEventListener('pointerup',up)],[root,'pointercancel',await root.addEventListener('pointercancel',up)]);
  }

  async function renderWidget() {
    await ensureWidget(); if (!widget) return;
    await widget.setStyle('display',state.widgetVisible===false?'none':'block');
    if (state.widgetVisible!==false) await widget.setInnerHTML(widgetHtml());
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;
    const ms=Math.max(0,Number(state.refreshMs)||0);
    if (!ms||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;
    refreshTimer=setTimeout(async()=>{try{await refresh('timer',true);}finally{scheduleRefresh();}},ms);
  }

  function installLifecycle() {
    const vis=()=>{if(document.visibilityState==='visible'){scheduleRefresh();if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);}else if(state.backgroundPause!==false&&refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}};
    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);
  }

  try {
    store=await Risuai.getLocalPluginStorage();
    state={...DEFAULTS,...((await store.getItem(STATE_KEY))||{})};
    try{state.bridgeBase=normalizeBridgeBase(state.bridgeBase);}catch(_){state.bridgeBase=DEFAULT_BRIDGE;state.bridgeEnabled=false;}
    token=String((await store.getItem(TOKEN_KEY))||'').trim();
    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));
    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'$',iconType:'html',location:'hamburger',id:'local-usage-dashboard-button-v3'},openSettings));
    await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)refresh('init',true);
    await Risuai.onUnload(async()=>{
      if(refreshTimer)clearTimeout(refreshTimer);
      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}
      for(const [t,ty,fn] of domListeners.splice(0)){try{t.removeEventListener(ty,fn);}catch(_){}}
      if(widget){try{await widget.remove();}catch(_){}}
      for(const p of uiParts)if(p?.id){try{await Risuai.unregisterUIPart(p.id);}catch(_){}}
    });
  } catch(e) { console.log(`[Local Usage Dashboard] init failed: ${e?.message||e}`); }
})();