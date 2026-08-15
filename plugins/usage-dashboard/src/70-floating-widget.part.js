  function widgetHtml() {
    const d=state.data||{}, m=d.monthly, w=d.weekly, c=d.credits, a=d.activity, detailed=state.widgetMode==='detailed';
    const badge=connectionBadge();
    const mobileCollapsed = widgetMobileViewport && !widgetMobileExpanded;
    if (mobileCollapsed) {
      const monthlyValue = num(m?.remaining) ? money(m.remaining) : (num(m?.todayUsed) ? money(m.todayUsed,4) : '—');
      return `<div data-mobile-widget-summary="1" title="탭해서 사용량 펼치기" style="display:flex;align-items:center;justify-content:flex-end;gap:7px;min-height:24px;font:11px/1 system-ui,-apple-system,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;color:#f5f7fa;white-space:nowrap;cursor:pointer"><span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:2px 5px">${badge.label}</span><span style="color:#aeb5c0;font-weight:650">월간</span><b>${monthlyValue}</b><span style="color:#7f8792;font-size:10px">▾</span></div>`;
    }
    const main = b => detailed ? money(b?.remaining) : (num(b?.todayUsed) ? money(b.todayUsed,4) : money(b?.remaining));
    const row = (label,value,color) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:${color}">${esc(label)}</span><b>${value}</b></div>`;
    const remainingTimeText = value => {
      const timestamp = resetTimestamp(value);
      if (!Number.isFinite(timestamp)) return '—';
      const diff = timestamp - Date.now();
      if (diff <= 0) return '곧 초기화';
      const totalMinutes = Math.ceil(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`;
      if (hours > 0) return `${hours}시간 ${minutes}분`;
      return `${minutes}분`;
    };
    const tokenText = value => {
      if (!num(value)) return '—';
      const n = Number(value);
      if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
      if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
      if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 1 : 2)}K`;
      return `${Math.round(n)}`;
    };
    const monthlySub = detailed
      ? `오늘 ${money(m?.todayUsed,4)}${m?.resetAt ? ` · 월간 ${remainingTimeText(m.resetAt)}` : ''}`
      : '';
    const premiumSub = detailed
      ? `오늘 ${money(w?.todayUsed,4)}${w?.resetAt ? ` · 주간 ${remainingTimeText(w.resetAt)}` : ''}${num(w?.resetPasses) ? ` · 패스 ${Number(w.resetPasses)}장` : ''}`
      : '';
    const creditsSub = detailed
      ? `오늘 ${money(c?.todayUsed,4)}${num(c?.balance) ? ` · 잔액 ${money(c.balance)}` : ''}`
      : '';
    return `<div style="font:12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;color:#f5f7fa">
      <div data-drag-handle="1" style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab"></div>
      <div style="display:flex;justify-content:flex-end;margin:-2px 0 4px">
        <span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:1px 5px">${badge.label}</span>
      </div>
      ${row(detailed?'월간 남음':(m?.label||'월간'),main(m),'#aeb5c0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${monthlySub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${m?pct(100-Number(m.percent||0)):0}%;background:#c5f277"></i></div>
      ${row(detailed?'프리미엄 남음':(w?.label||'주간'),main(w),'#b7add0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${premiumSub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${w?pct(100-Number(w.percent||0)):0}%;background:#b9a6f8"></i></div>
      ${row(detailed?'크레딧':(c?.label||'Credits'),detailed?money(c?.balance):(num(c?.todayUsed)?money(c.todayUsed,4):money(c?.balance)),'#9fc9df')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${creditsSub}</div>`:''}
      ${detailed && a ? `<div style="color:#8e96a2;font-size:10px;font-weight:650;line-height:1.35;border-top:1px solid rgba(255,255,255,.09);margin-top:7px;padding-top:6px;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right">24h ${num(a.requests24h)?`${a.requests24h}회`:'—'} · ${money(a.cost24h,4)} · ${tokenText(a.totalTokens24h)} tok${state.lastSyncAt?` · LIVE ${age(state.lastSyncAt)} 동기화`:''}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:8px;color:#7f8792;font-size:10px;margin-top:5px">
        <span>${state.bridgeStatus==='error'?'마지막 정상값 유지':dataIsStale()?`스냅샷 ${age(d.fetchedAt)}`:'자동 갱신'}</span>
        <span>${age(state.lastSyncAt)} · ${VERSION}</span>
      </div>
    </div>`;
  }

  const widgetWidth = (mobile = false, expanded = false) => mobile
    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(176px,calc(100vw - 16px))')
    : (state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)');

  async function widgetMobileMode() {
    if (!rootBody) return false;
    try { return Number(await rootBody.clientWidth()) <= 600; } catch { return false; }
  }

  async function applyWidgetResponsiveLayout(mobile, expanded) {
    if (!widget) return;
    const layout = mobile ? (expanded ? 'mobile-expanded' : 'mobile-collapsed') : 'desktop';
    if (widgetRenderCache.layout === layout) return;
    if (mobile) {
      await widget.setStyle('left','auto');
      await widget.setStyle('top','auto');
      await widget.setStyle('right','8px');
      await widget.setStyle('bottom','88px');
      await widget.setStyle('border-radius',expanded?'11px':'999px');
      await widget.setStyle('padding',expanded?'5px 10px 8px':'6px 9px');
    } else {
      if (num(state.widgetX)&&num(state.widgetY)) {
        await widget.setStyle('left',`${state.widgetX}px`);
        await widget.setStyle('top',`${state.widgetY}px`);
        await widget.setStyle('right','auto');
        await widget.setStyle('bottom','auto');
      } else {
        await widget.setStyle('left','auto');
        await widget.setStyle('top','auto');
        await widget.setStyle('right','12px');
        await widget.setStyle('bottom','74px');
      }
      await widget.setStyle('border-radius','11px');
      await widget.setStyle('padding','5px 10px 8px');
    }
    widgetRenderCache.layout = layout;
  }

  async function ensureWidget() {
    if (widget) return;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return;
    const root = await Risuai.getRootDocument();
    rootBody = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = num(state.widgetX)&&num(state.widgetY)?`left:${state.widgetX}px;top:${state.widgetY}px;`:'right:12px;bottom:74px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:${widgetWidth()};max-width:calc(100vw - 16px);z-index:2147483000;background:#191b20;color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.24);padding:5px 10px 8px;box-sizing:border-box;user-select:none;touch-action:none;`);
    await rootBody.appendChild(widget);
    const down = async e => {
      if (widgetMobileViewport) { drag = null; return; }
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
    const toggleMobileWidget = async () => {
      if (!widgetMobileViewport) return;
      widgetMobileExpanded = !widgetMobileExpanded;
      await renderWidget('mobile-widget-toggle');
    };
    remoteListeners.push([widget,'pointerdown',await widget.addEventListener('pointerdown',down)],[widget,'click',await widget.addEventListener('click',toggleMobileWidget)],[root,'pointermove',await root.addEventListener('pointermove',move)],[root,'pointerup',await root.addEventListener('pointerup',up)],[root,'pointercancel',await root.addEventListener('pointercancel',up)]);
  }

  async function renderWidget(reason = 'ui') {
    const nowPerf = () => typeof performance?.now === 'function' ? performance.now() : Date.now();
    const startedPerf = nowPerf();
    const breakdown = {};
    performanceRuntime.activeRenderStartedPerf = startedPerf;
    performanceRuntime.activeRenderReason = String(reason || 'ui');
    performanceRuntime.lastRenderStartedPerf = startedPerf;
    performanceRuntime.lastRenderReason = String(reason || 'ui');
    try {
      let phaseStarted = nowPerf();
      await ensureWidget();
      breakdown.ensure = roundPerfMs(nowPerf() - phaseStarted);
      if (!widget) return;
      phaseStarted = nowPerf();
      const nextMobileViewport = await widgetMobileMode();
      if (widgetMobileViewport !== nextMobileViewport) {
        widgetMobileViewport = nextMobileViewport;
        widgetMobileExpanded = false;
        widgetRenderCache.layout = null;
        widgetRenderCache.width = null;
        widgetRenderCache.html = null;
      }
      await applyWidgetResponsiveLayout(widgetMobileViewport, widgetMobileExpanded);
      const nextWidth = widgetWidth(widgetMobileViewport, widgetMobileExpanded);
      const nextDisplay = state.widgetVisible===false?'none':'block';
      if (widgetRenderCache.width !== nextWidth) {
        await widget.setStyle('width',nextWidth);
        widgetRenderCache.width = nextWidth;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      if (widgetRenderCache.display !== nextDisplay) {
        await widget.setStyle('display',nextDisplay);
        widgetRenderCache.display = nextDisplay;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        const nextHtml = widgetHtml();
        if (widgetRenderCache.html !== nextHtml) {
          await widget.setInnerHTML(nextHtml);
          widgetRenderCache.html = nextHtml;
          performanceRuntime.widgetHtmlWrites += 1;
        } else {
          performanceRuntime.widgetHtmlSkips += 1;
        }
        breakdown.html = roundPerfMs(nowPerf() - phaseStarted);
      }
    } finally {
      const endedPerf = nowPerf();
      const duration = Math.max(0, endedPerf - startedPerf);
      breakdown.total = roundPerfMs(duration);
      performanceRuntime.lastRenderMs = roundPerfMs(duration);
      performanceRuntime.lastRenderEndedPerf = endedPerf;
      performanceRuntime.lastRenderBreakdown = {...breakdown};
      noteRenderSpike(duration, performanceRuntime.lastRenderReason, startedPerf, endedPerf, breakdown);
      performanceRuntime.activeRenderStartedPerf = 0;
      performanceRuntime.activeRenderReason = '';
    }
  }

  function resetTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (num(value)) {
    const n = Number(value);
    return n > 0 && n < 1000000000000 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function scheduleResetSync() {
  if (resetSyncTimer) clearTimeout(resetSyncTimer);
  resetSyncTimer = null;
  if (!state?.bridgeEnabled || !token || !state?.data) return;
  const now = Date.now();
  const resetCandidates = [
    resetTimestamp(state.data.monthly?.resetAt),
    resetTimestamp(state.data.weekly?.resetAt)
  ].filter(value => Number.isFinite(value) && value > now);
  if (!resetCandidates.length) return;
  const nextReset = Math.min(...resetCandidates);
  const delay = Math.min(2147480000, Math.max(1000, nextReset - now + 3000));
  resetSyncTimer = setTimeout(async () => {
    resetSyncTimer = null;
    if (nextReset - Date.now() > 5000) {
      scheduleResetSync();
      return;
    }
    await enqueueRefresh('reset', true);
  }, delay);
}

