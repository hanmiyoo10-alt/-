from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

TARGET = '3.0.0-alpha.3.35'
SOURCE = '3.0.0-alpha.3.34'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.35')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.34 or alpha.3.35')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', f'//@version {SOURCE}', f'//@version {TARGET}')
one('runtime version', f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';")

widget_mode_line = '''        <label><span>미니 위젯</span><select id="widget-mode"><option value="compact" ${state.widgetMode!=='detailed'?'selected':''}>간편 · 오늘 사용량</option><option value="detailed" ${state.widgetMode==='detailed'?'selected':''}>상세 · 남은 양 + 오늘 사용량</option></select></label>'''
performance_ui = widget_mode_line + '''
        <label style="margin-top:10px"><span><input id="sync-on-focus" type="checkbox" ${state.syncOnFocus !== false ? 'checked' : ''} style="width:auto;margin-right:7px">앱/탭 복귀 시 부드럽게 동기화 · 첫 조작 우선</span></label>
        <label style="margin-top:8px"><span><input id="performance-guard" type="checkbox" ${state.performanceGuard !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Performance Guard · 느려지면 자동으로 갱신 간격 완화</span></label>
        <label style="margin-top:8px"><span><input id="adaptive-refresh" type="checkbox" ${state.adaptiveRefresh !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Adaptive refresh · 빠르게 회복되면 원래 주기로 복귀</span></label>
        <label style="margin-top:8px"><span><input id="background-pause" type="checkbox" ${state.backgroundPause !== false ? 'checked' : ''} style="width:auto;margin-right:7px">백그라운드에서는 자동 갱신 일시정지</span></label>
        <div class="actions"><button id="save-performance">성능 설정 저장</button></div>'''
one('performance settings ui', widget_mode_line, performance_ui)

bind_anchor = "    if (q('#stale-ms')) q('#stale-ms').onchange = async e => { state.staleAfterMs = Math.max(0, Number(e.target.value)||0); state.stalePolicyV37Migrated = true; await persist(); await renderWidget(); renderSettings(); };"
performance_bind = '''    if (q('#save-performance')) q('#save-performance').onclick = async () => {
      state.syncOnFocus = q('#sync-on-focus')?.checked !== false;
      state.performanceGuard = q('#performance-guard')?.checked !== false;
      state.adaptiveRefresh = q('#adaptive-refresh')?.checked !== false;
      state.backgroundPause = q('#background-pause')?.checked !== false;
      if (state.performanceGuard === false || state.adaptiveRefresh === false) {
        performanceRuntime.adaptiveMultiplier = 1;
        performanceRuntime.mode = 'normal';
        performanceRuntime.slowRefreshes = 0;
        performanceRuntime.fastRefreshes = 0;
      }
      if (!state.syncOnFocus) cancelResumeRefresh();
      if (state.backgroundPause !== false && document.visibilityState === 'hidden') {
        stopUiStallProbe();
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
      } else {
        startUiStallProbe();
        scheduleRefresh();
      }
      updateRuntimeState('settings');
      await persist();
      renderSettings();
    };
'''
one('performance settings bind', bind_anchor, performance_bind + bind_anchor)

diag_guard = "      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)} · timer-only`,"
diag_settings = diag_guard + "\n      `Performance settings: focus ${state.syncOnFocus === false ? 'off' : 'on'} · guard ${state.performanceGuard === false ? 'off' : 'on'} · adaptive ${state.adaptiveRefresh === false ? 'off' : 'on'} · background pause ${state.backgroundPause === false ? 'off' : 'on'}`,"
one('performance settings diagnostics', diag_guard, diag_settings)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.35 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'id="sync-on-focus"',
    'id="performance-guard"',
    'id="adaptive-refresh"',
    'id="background-pause"',
    'id="save-performance"',
    "q('#save-performance')",
    'Performance settings:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
