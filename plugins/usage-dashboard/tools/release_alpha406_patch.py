from pathlib import Path
import re

ROOT = Path('plugins/usage-dashboard/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version and partial-render telemetry.
p = ROOT / '00-runtime-core.part.js'
s = p.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.5', '//@version 3.0.0-alpha.4.6', 'metadata version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.5';", "const VERSION = '3.0.0-alpha.4.6';", 'runtime version')
s = replace_once(
    s,
    'panelRenderCoalesced:0,panelRenderSkippedClosed:0,widgetHtmlWrites:0,widgetHtmlSkips:0,widgetStyleWrites:0,widgetStyleSkips:0,runtimeState:',
    "panelRenderCoalesced:0,panelRenderSkippedClosed:0,widgetHtmlWrites:0,widgetHtmlSkips:0,widgetStyleWrites:0,widgetStyleSkips:0,panelPartialRenders:0,panelFullRenders:0,panelSectionWrites:0,panelSectionSkips:0,lastPanelRenderMode:'full',runtimeState:",
    'partial render counters',
)
p.write_text(s)


# 60 settings runtime: preserve the original module boundary and keep user renders full.
p = ROOT / '60-settings-runtime.part.js'
s = p.read_text()
pattern = re.compile(r"  function renderSettings\(\) \{\n.*?\n  \}\n\n  function bindSettings\(\) \{", re.S)
match = pattern.search(s)
if not match:
    raise SystemExit('renderSettings block not found')
replacement = r'''  function renderSettings() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    document.body.innerHTML = settingsHtml();
    bindSettings();
    performanceRuntime.panelFullRenders += 1;
    performanceRuntime.lastPanelRenderMode = 'full';
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  const PANEL_PARTIAL_SELECTORS = [
    '.grid > section.panel.metric',
    '.grid > section.panel.wide:not(.usage-primary):not(.activity-secondary):not(.analytics-panel)',
    '.grid > section.usage-primary',
    '.grid > section.activity-secondary',
    '.grid > section.analytics-panel',
  ];

  function patchPanelSections(nextHtml) {
    if (typeof DOMParser !== 'function') return false;
    const nextDoc = new DOMParser().parseFromString(nextHtml, 'text/html');
    const currentShell = document.querySelector('.shell');
    const nextShell = nextDoc.querySelector('.shell');
    if (!currentShell || !nextShell) return false;

    const staged = [];
    for (const selector of PANEL_PARTIAL_SELECTORS) {
      const currentNodes = Array.from(document.querySelectorAll(selector));
      const nextNodes = Array.from(nextDoc.querySelectorAll(selector));
      if (!currentNodes.length || currentNodes.length !== nextNodes.length) return false;
      for (let i = 0; i < currentNodes.length; i += 1) staged.push([currentNodes[i], nextNodes[i]]);
    }

    // Runtime Diagnostics is safe to refresh live. Local Bridge settings are
    // deliberately left untouched so typed-but-unsaved values are preserved.
    const currentAdvanced = Array.from(document.querySelectorAll('details.advanced-panel'));
    const nextAdvanced = Array.from(nextDoc.querySelectorAll('details.advanced-panel'));
    const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');
    const diagnosticsNext = nextAdvanced[1]?.querySelector('.advanced-body');
    if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext) {
      staged.push([diagnosticsCurrent, diagnosticsNext]);
    }

    let writes = 0;
    let skips = 0;
    for (const [currentNode, nextNode] of staged) {
      if (currentNode.innerHTML === nextNode.innerHTML) {
        skips += 1;
        continue;
      }
      currentNode.innerHTML = nextNode.innerHTML;
      writes += 1;
    }
    performanceRuntime.panelSectionWrites += writes;
    performanceRuntime.panelSectionSkips += skips;
    if (writes > 0) bindSettings();
    return true;
  }

  function renderSettingsPartial() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const nextHtml = settingsHtml();
    if (document.body?.dataset?.panelOpen === '1' && patchPanelSections(nextHtml)) {
      performanceRuntime.panelPartialRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'partial';
    } else {
      document.body.innerHTML = nextHtml;
      bindSettings();
      performanceRuntime.panelFullRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'full-fallback';
    }
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  function bindSettings() {'''
s = s[:match.start()] + replacement + s[match.end():]
p.write_text(s)


# 50 settings UI/runtime: only scheduled/idle refreshes use the partial renderer.
p = ROOT / '50-settings-ui.part.js'
s = p.read_text()
s = replace_once(
    s,
    "if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') renderSettings();",
    "if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') renderSettingsPartial();",
    'scheduled partial render',
)
p.write_text(s)


# 40 diagnostics: expose partial/full counts and section write savings.
p = ROOT / '40-diagnostics.part.js'
s = p.read_text()
needle = "      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,"
addition = needle + "\n      `Panel partial: mode ${performanceRuntime.lastPanelRenderMode || 'full'} · partial ${Number(performanceRuntime.panelPartialRenders || 0)} · full ${Number(performanceRuntime.panelFullRenders || 0)} · section writes ${Number(performanceRuntime.panelSectionWrites || 0)} · skips ${Number(performanceRuntime.panelSectionSkips || 0)}`,\n      `P4 partial: auto section patch · diagnostics live · settings preserved`,"
s = replace_once(s, needle, addition, 'partial diagnostics')
p.write_text(s)

print('alpha.4.6 P4 partial render patch applied')
