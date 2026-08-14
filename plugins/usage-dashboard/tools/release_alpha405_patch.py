from pathlib import Path

ROOT = Path('plugins/usage-dashboard/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version, counters/cache state, and closed-panel scheduler guard.
p = ROOT / '00-runtime-core.part.js'
s = p.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.4', '//@version 3.0.0-alpha.4.5', 'metadata version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.4';", "const VERSION = '3.0.0-alpha.4.5';", 'runtime version')
s = replace_once(
    s,
    "let widget = null, rootBody = null, drag = null;",
    "let widget = null, rootBody = null, drag = null;\n  let widgetRenderCache = {html:null,width:null,display:null};",
    'widget render cache state',
)
s = replace_once(
    s,
    'panelRenderCoalesced:0,runtimeState:',
    'panelRenderCoalesced:0,panelRenderSkippedClosed:0,widgetHtmlWrites:0,widgetHtmlSkips:0,widgetStyleWrites:0,widgetStyleSkips:0,runtimeState:',
    'render counters',
)
s = replace_once(
    s,
    "if (document.body?.dataset?.panelOpen !== '1') return;",
    "if (document.body?.dataset?.panelOpen !== '1') {\n      performanceRuntime.panelRenderSkippedClosed += 1;\n      return;\n    }",
    'closed panel render guard',
)
p.write_text(s)

# 60 settings runtime: closing the fullscreen panel must stop background panel renders.
p = ROOT / '60-settings-runtime.part.js'
s = p.read_text()
s = replace_once(
    s,
    "if (q('#close')) q('#close').onclick = () => Risuai.hideContainer();",
    "if (q('#close')) q('#close').onclick = () => { document.body.dataset.panelOpen='0'; Risuai.hideContainer(); };",
    'panel close state',
)
p.write_text(s)

# 70 floating widget: avoid repeated bridge DOM writes when width/display/html did not change.
p = ROOT / '70-floating-widget.part.js'
s = p.read_text()
old = """      phaseStarted = nowPerf();
      await widget.setStyle('width',widgetWidth());
      await widget.setStyle('display',state.widgetVisible===false?'none':'block');
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        await widget.setInnerHTML(widgetHtml());
        breakdown.html = roundPerfMs(nowPerf() - phaseStarted);
      }
"""
new = """      phaseStarted = nowPerf();
      const nextWidth = widgetWidth();
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
"""
s = replace_once(s, old, new, 'widget DOM dedup')
p.write_text(s)

# 40 diagnostics: expose P4 counters so runtime verification is possible.
p = ROOT / '40-diagnostics.part.js'
s = p.read_text()
needle = "      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,"
replacement = needle + "\n      `Render cache: widget html writes ${Number(performanceRuntime.widgetHtmlWrites || 0)} · skips ${Number(performanceRuntime.widgetHtmlSkips || 0)} · style writes ${Number(performanceRuntime.widgetStyleWrites || 0)} · skips ${Number(performanceRuntime.widgetStyleSkips || 0)} · closed panel skips ${Number(performanceRuntime.panelRenderSkippedClosed || 0)}`,\n      `P4 render: closed-panel skip · widget DOM dedup`,"
s = replace_once(s, needle, replacement, 'P4 diagnostics')
p.write_text(s)

print('alpha.4.5 P4 render patch applied')
