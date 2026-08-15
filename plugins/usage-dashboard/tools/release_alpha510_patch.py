from pathlib import Path
import hashlib
import json

OLD = '3.0.0-alpha.5.9'
NEW = '3.0.0-alpha.5.10'
ROOT = Path('plugins/usage-dashboard')


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    return text.replace(old, new, 1)

# Runtime core: product version + ephemeral responsive widget runtime state.
core_path = ROOT / 'src/00-runtime-core.part.js'
core = read(core_path)
core = core.replace(f'//@version {OLD}', f'//@version {NEW}', 1)
core = core.replace(f"const VERSION = '{OLD}';", f"const VERSION = '{NEW}';", 1)
core = replace_once(
    core,
    "  let widget = null, rootBody = null, drag = null;\n  let widgetRenderCache = {html:null,width:null,display:null};",
    "  let widget = null, rootBody = null, drag = null;\n  let widgetMobileExpanded = false, widgetMobileViewport = false;\n  let widgetRenderCache = {html:null,width:null,display:null,layout:null};",
    'widget responsive runtime state',
)
write(core_path, core)

# Settings runtime: opening Usage always returns mobile overlay to its safe collapsed state.
settings_path = ROOT / 'src/60-settings-runtime.part.js'
settings = read(settings_path)
settings = replace_once(
    settings,
    "      drag = null;\n      await persist();",
    "      drag = null;\n      widgetRenderCache.layout = null;\n      await persist();",
    'reset position layout cache',
)
settings = replace_once(
    settings,
    "  async function openSettings() { document.body.dataset.panelOpen='1'; renderSettings(); await Risuai.showContainer('fullscreen'); }",
    "  async function openSettings() { widgetMobileExpanded=false; document.body.dataset.panelOpen='1'; renderSettings(); await renderWidget('panel-open'); await Risuai.showContainer('fullscreen'); }",
    'panel-open mobile collapse',
)
write(settings_path, settings)

# Floating widget: mobile-only safe collapsed pill + tap expansion; desktop behavior stays intact.
widget_path = ROOT / 'src/70-floating-widget.part.js'
widget = read(widget_path)
widget = replace_once(widget, "  function widgetHtml() {", "  function widgetHtml(mobileCollapsed = false) {", 'widgetHtml signature')
widget = replace_once(
    widget,
    "    const badge=connectionBadge();\n    const main = b => detailed ? money(b?.remaining) : (num(b?.todayUsed) ? money(b.todayUsed,4) : money(b?.remaining));",
    "    const badge=connectionBadge();\n    if (mobileCollapsed) {\n      const monthlyValue = num(m?.remaining) ? money(m.remaining) : (num(m?.todayUsed) ? money(m.todayUsed,4) : '—');\n      return `<div data-mobile-widget-summary=\"1\" title=\"탭해서 사용량 펼치기\" style=\"display:flex;align-items:center;justify-content:flex-end;gap:7px;min-height:24px;font:11px/1 system-ui,-apple-system,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;color:#f5f7fa;white-space:nowrap;cursor:pointer\"><span style=\"font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:2px 5px\">${badge.label}</span><span style=\"color:#aeb5c0;font-weight:650\">월간</span><b>${monthlyValue}</b><span style=\"color:#7f8792;font-size:10px\">▾</span></div>`;\n    }\n    const main = b => detailed ? money(b?.remaining) : (num(b?.todayUsed) ? money(b.todayUsed,4) : money(b?.remaining));",
    'mobile collapsed html',
)
widget = replace_once(
    widget,
    "  const widgetWidth = () => state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)';\n\n  async function ensureWidget() {",
    "  const widgetWidth = (mobile = false, expanded = false) => mobile\n    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(176px,calc(100vw - 16px))')\n    : (state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)');\n\n  async function widgetMobileMode() {\n    if (!rootBody) return false;\n    try { return Number(await rootBody.clientWidth()) <= 600; } catch { return false; }\n  }\n\n  async function applyWidgetResponsiveLayout(mobile, expanded) {\n    if (!widget) return;\n    const layout = mobile ? (expanded ? 'mobile-expanded' : 'mobile-collapsed') : 'desktop';\n    if (widgetRenderCache.layout === layout) return;\n    if (mobile) {\n      await widget.setStyle('left','auto');\n      await widget.setStyle('top','auto');\n      await widget.setStyle('right','8px');\n      await widget.setStyle('bottom','88px');\n      await widget.setStyle('border-radius',expanded?'11px':'999px');\n      await widget.setStyle('padding',expanded?'5px 10px 8px':'6px 9px');\n    } else {\n      if (num(state.widgetX)&&num(state.widgetY)) {\n        await widget.setStyle('left',`${state.widgetX}px`);\n        await widget.setStyle('top',`${state.widgetY}px`);\n        await widget.setStyle('right','auto');\n        await widget.setStyle('bottom','auto');\n      } else {\n        await widget.setStyle('left','auto');\n        await widget.setStyle('top','auto');\n        await widget.setStyle('right','12px');\n        await widget.setStyle('bottom','74px');\n      }\n      await widget.setStyle('border-radius','11px');\n      await widget.setStyle('padding','5px 10px 8px');\n    }\n    widgetRenderCache.layout = layout;\n  }\n\n  async function ensureWidget() {",
    'responsive width/layout helpers',
)
widget = replace_once(
    widget,
    "    const down = async e => {\n      if (!num(e.clientX)||!num(e.clientY)) return;",
    "    const down = async e => {\n      if (widgetMobileViewport) { drag = null; return; }\n      if (!num(e.clientX)||!num(e.clientY)) return;",
    'disable mobile drag',
)
widget = replace_once(
    widget,
    "    const up = async e => {\n      if (!drag) return;\n      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;\n      drag=null;\n      await persist();\n    };\n    remoteListeners.push([widget,'pointerdown',await widget.addEventListener('pointerdown',down)],[root,'pointermove',await root.addEventListener('pointermove',move)],[root,'pointerup',await root.addEventListener('pointerup',up)],[root,'pointercancel',await root.addEventListener('pointercancel',up)]);",
    "    const up = async e => {\n      if (!drag) return;\n      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;\n      drag=null;\n      await persist();\n    };\n    const toggleMobileWidget = async () => {\n      if (!widgetMobileViewport) return;\n      widgetMobileExpanded = !widgetMobileExpanded;\n      await renderWidget('mobile-widget-toggle');\n    };\n    remoteListeners.push([widget,'pointerdown',await widget.addEventListener('pointerdown',down)],[widget,'click',await widget.addEventListener('click',toggleMobileWidget)],[root,'pointermove',await root.addEventListener('pointermove',move)],[root,'pointerup',await root.addEventListener('pointerup',up)],[root,'pointercancel',await root.addEventListener('pointercancel',up)]);",
    'mobile tap toggle',
)
widget = replace_once(
    widget,
    "      phaseStarted = nowPerf();\n      const nextWidth = widgetWidth();\n      const nextDisplay = state.widgetVisible===false?'none':'block';",
    "      phaseStarted = nowPerf();\n      const nextMobileViewport = await widgetMobileMode();\n      if (widgetMobileViewport !== nextMobileViewport) {\n        widgetMobileViewport = nextMobileViewport;\n        widgetMobileExpanded = false;\n        widgetRenderCache.layout = null;\n        widgetRenderCache.width = null;\n        widgetRenderCache.html = null;\n      }\n      await applyWidgetResponsiveLayout(widgetMobileViewport, widgetMobileExpanded);\n      const nextWidth = widgetWidth(widgetMobileViewport, widgetMobileExpanded);\n      const nextDisplay = state.widgetVisible===false?'none':'block';",
    'responsive render phase',
)
widget = replace_once(
    widget,
    "        const nextHtml = widgetHtml();",
    "        const nextHtml = widgetHtml(widgetMobileViewport && !widgetMobileExpanded);",
    'responsive widget html call',
)
write(widget_path, widget)

# UI regression lock for the mobile behavior.
test_path = ROOT / 'tests/p3-ui.cjs'
test = read(test_path)
anchor = "  'UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed',\n"
addition = "  'UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed',\n  'data-mobile-widget-summary=\\\"1\\\"',\n  'function widgetMobileMode()',\n  \"return Number(await rootBody.clientWidth()) <= 600;\",\n  'async function applyWidgetResponsiveLayout(mobile, expanded)',\n  \"bottom','88px'\",\n  'widgetMobileExpanded = !widgetMobileExpanded;',\n  \"await renderWidget('panel-open');\",\n"
if anchor not in test:
    raise SystemExit('missing p3-ui marker anchor')
test = test.replace(anchor, addition, 1)
write(test_path, test)

# Manager behavior is unchanged; only advance product identity so the existing
# automatic reconciliation reaches the same product version as the UI plugin.
manager_path = ROOT / 'runtime/bridge-manager.cjs'
manager = read(manager_path)
manager = manager.replace(f"const PRODUCT_VERSION = '{OLD}';", f"const PRODUCT_VERSION = '{NEW}';", 1)
write(manager_path, manager)

# Product manifest: Engine and Manager implementation versions remain unchanged.
manifest_path = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW
manifest['components']['plugin']['version'] = NEW
manifest['components']['bridgeManager']['productVersion'] = NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
write(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'patched {OLD} -> {NEW} mobile floating widget')
