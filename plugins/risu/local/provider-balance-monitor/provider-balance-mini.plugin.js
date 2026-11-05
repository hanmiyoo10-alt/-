//@name Provider_Balance_Mini
//@display-name AI Balance Mini (Experimental)
//@api 3.0
//@version 0.1.0-dev.1

(async () => {
  const Risuai = globalThis.Risuai;
  if (!Risuai) return;

  const COLLECTOR = 'http://127.0.0.1:39221';
  const STATE_KEY = 'provider-balance-mini-floating-state-v1';
  const POLL_MS = 120000;
  const WIDTH = 178;
  let store = null;
  let root = null;
  let body = null;
  let widget = null;
  let timer = null;
  let drag = null;
  let disposed = false;
  let listeners = [];
  let state = {
    x: null,
    y: null,
    status: 'loading',
    fetchedAt: null,
    providers: {}
  };

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const provider = id => state.providers?.[id] || {};
  const valueText = id => {
    const p = provider(id);
    if (p.status === 'unlimited') return '∞';
    if (finite(p.remainingPercent)) return `${Math.round(Number(p.remainingPercent))}%`;
    if (finite(p.remaining)) return String(Math.max(0, Number(p.remaining)));
    return '—';
  };
  const detailText = id => {
    const p = provider(id);
    if (finite(p.remaining) && finite(p.limit) && Number(p.limit) >= 0) return `${Math.round(Number(p.remaining))}/${Math.round(Number(p.limit))}`;
    if (p.status === 'auth-required') return 'AUTH';
    if (p.fidelity === 'observed') return 'LIVE';
    return 'UNKNOWN';
  };
  const dotColor = id => {
    const p = provider(id);
    if (p.fidelity === 'observed') return '#9adf72';
    if (p.status === 'auth-required') return '#f2bf69';
    return '#7b8492';
  };
  const ageText = () => {
    const t = Date.parse(state.fetchedAt || '');
    if (!Number.isFinite(t)) return state.status === 'error' ? 'ERR' : '…';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m`;
  };
  const row = (id, short, label) => `<div style="display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:5px;min-height:22px">
    <span style="display:flex;align-items:center;gap:4px;font-weight:850;color:#d7dce3"><i style="width:6px;height:6px;border-radius:50%;background:${dotColor(id)}"></i>${short}</span>
    <span style="overflow:hidden;text-overflow:ellipsis;color:#aeb6c2;font-size:10px">${esc(label)}</span>
    <span style="display:flex;align-items:baseline;gap:4px"><b style="font-size:12px;color:#f7f9fb;font-variant-numeric:tabular-nums">${esc(valueText(id))}</b><small style="font-size:8px;color:#77808e">${esc(detailText(id))}</small></span>
  </div>`;

  function html() {
    return `<div style="font:10px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:#f4f6f8;user-select:none">
      <div style="display:grid;grid-template-columns:24px 1fr 28px;align-items:center;min-height:24px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:3px">
        <span data-drag="1" style="display:grid;place-items:center;height:24px;color:#77808e;font-size:13px;font-weight:900;cursor:grab;touch-action:none">≡</span>
        <b style="font-size:10px;letter-spacing:.02em;color:#dfe4ea">AI 잔량 <small style="font-size:8px;color:${state.status === 'error' ? '#e88383' : '#7f8997'}">${ageText()}</small></b>
        <span data-refresh="1" style="display:grid;place-items:center;height:24px;color:${state.status === 'loading' ? '#a6d5ff' : '#9ca5b1'};font-size:14px;font-weight:900;cursor:pointer">↻</span>
      </div>
      ${row('copilot','C','Copilot')}
      ${row('vertex','V','Vertex')}
      ${row('ais','A','AI Studio')}
    </div>`;
  }

  async function persistPosition() {
    if (!store) return;
    await store.setItem(STATE_KEY, { x: state.x, y: state.y });
  }

  async function addRemote(target, type, handler) {
    const id = await target.addEventListener(type, handler);
    listeners.push([target, type, id]);
  }

  async function ensureWidget() {
    if (widget) return true;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return false;
    root = await Risuai.getRootDocument();
    body = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = finite(state.x) && finite(state.y) ? `left:${state.x}px;top:${state.y}px;` : 'right:8px;bottom:88px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:${WIDTH}px;max-width:calc(100vw - 16px);z-index:2147483000;background:rgba(24,27,32,.96);color:#f4f6f8;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.25);padding:4px 7px 6px;box-sizing:border-box;backdrop-filter:blur(8px);touch-action:manipulation;`);
    await body.appendChild(widget);

    const down = async e => {
      if (!finite(e.clientX) || !finite(e.clientY)) return;
      const rect = await widget.getBoundingClientRect();
      const lx = Number(e.clientX) - Number(rect.left || 0);
      const ly = Number(e.clientY) - Number(rect.top || 0);
      if (lx > 34 || ly > 30) return;
      drag = {
        pointerId: e.pointerId ?? null,
        ox: Number(e.clientX) - Number(rect.left || 0),
        oy: Number(e.clientY) - Number(rect.top || 0),
        maxX: Math.max(8, Number(await body.clientWidth()) - Number(rect.width || WIDTH) - 8),
        maxY: Math.max(8, Number(await body.clientHeight()) - Number(rect.height || 90) - 8)
      };
    };
    const move = async e => {
      if (!drag || !finite(e.clientX) || !finite(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      state.x = Math.max(8, Math.min(drag.maxX, Number(e.clientX) - drag.ox));
      state.y = Math.max(8, Math.min(drag.maxY, Number(e.clientY) - drag.oy));
      await widget.setStyle('left', `${state.x}px`);
      await widget.setStyle('top', `${state.y}px`);
      await widget.setStyle('right', 'auto');
      await widget.setStyle('bottom', 'auto');
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      drag = null;
      await persistPosition();
    };
    const click = async e => {
      if (!finite(e.clientX) || !finite(e.clientY)) return;
      const rect = await widget.getBoundingClientRect();
      const lx = Number(e.clientX) - Number(rect.left || 0);
      const ly = Numer(e.clientY) - Number(rect.top || 0);
      if (lx >= Number(rect.width || WIDTH) - 36 && ly <= 32) await refresh(true);
    };
    await addRemote(widget, 'pointerdown', down);
    await addRemote(widget, 'click', click);
    await addRemote(root, 'pointermove', move);
    await addRemote(root, 'pointerup', up);
    await addRemote(root, 'pointercancel', up);
    return true;
  }

  async function render() {
    if (disposed || !(await ensureWidget())) return;
    await widget.setInnerHTML(html());
  }

  async function fetchSnapshot(force = false) {
    const response = await Risuai.nativeFetch(`${COLLECTOR}/v1/balances${force ? '?refresh=1' : ''}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`collector-${response.status}`);
    const data = await response.json();
    if (!data || data.version !== 1 || !data.providers) throw new Error('collector-contract');
    state.providers = data.providers;
    state.fetchedAt = data.fetchedAt || new Date().toISOString();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (disposed) return;
    timer = setTimeout(async () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') await refresh(false);
      else schedule();
    }, POLL_MS);
  }

  async function refresh(force = false) {
    if (disposed) return;
    state.status = 'loading';
    await render();
    try {
      await fetchSnapshot(force);
      state.status = 'ok';
    } catch {
      state.status = 'error';
    }
    await render();
    schedule();
  }

  try {
    store = await Risuai.getLocalPluginStorage();
    const saved = await store.getItem(STATE_KEY);
    if (saved && typeof saved === 'object') {
      if (finite(saved.x)) state.x = Number(saved.x);
      if (finite(saved.y)) state.y = Number(saved.y);
    }
    await render();
    await refresh(false);
    await Risuai.onUnload(async () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      for (const [target, type, id] of listeners.splice(0)) {
        try { await target.removeEventListener(type, id); } catch {}
      }
      if (widget) {
        try { await widget.remove(); } catch {}
      }
      widget = null;
    });
  } catch (error) {
    console.log(`[Provider Balance Mini] init failed: ${String(error?.message || error).slice(0, 120)}`);
  }
})();
