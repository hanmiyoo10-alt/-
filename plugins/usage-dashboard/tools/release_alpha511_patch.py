from pathlib import Path
import hashlib
import json

OLD = '3.0.0-alpha.5.10'
NEW = '3.0.0-alpha.5.11'
ROOT = Path('plugins/usage-dashboard')


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    return text.replace(old, new, 1)

# Runtime core: version + short-lived mobile toggle suppression state.
core_path = ROOT / 'src/00-runtime-core.part.js'
core = read(core_path)
core = core.replace(f'//@version {OLD}', f'//@version {NEW}', 1)
core = core.replace(f"const VERSION = '{OLD}';", f"const VERSION = '{NEW}';", 1)
core = replace_once(
    core,
    "  let widgetMobileExpanded = false, widgetMobileViewport = false;",
    "  let widgetMobileExpanded = false, widgetMobileViewport = false, widgetMobileToggleBlockedUntil = 0;",
    'mobile toggle suppression state',
)
write(core_path, core)

# Settings runtime: collapse before and after fullscreen transition, with a tiny
# post-transition guard so the menu click cannot be replayed into the widget.
settings_path = ROOT / 'src/60-settings-runtime.part.js'
settings = read(settings_path)
old_open = "  async function openSettings() { widgetMobileExpanded=false; document.body.dataset.panelOpen='1'; renderSettings(); await renderWidget('panel-open'); await Risuai.showContainer('fullscreen'); }"
new_open = """  async function openSettings() {
    widgetMobileExpanded=false;
    widgetMobileToggleBlockedUntil=Date.now()+800;
    document.body.dataset.panelOpen='1';
    renderSettings();
    await renderWidget('panel-open');
    await Risuai.showContainer('fullscreen');
    widgetMobileExpanded=false;
    widgetMobileToggleBlockedUntil=Math.max(widgetMobileToggleBlockedUntil,Date.now()+250);
    await renderWidget('panel-open-settled');
  }"""
settings = replace_once(settings, old_open, new_open, 'settled panel-open collapse')
write(settings_path, settings)

# Floating widget: ignore only clicks arriving during the fullscreen transition.
# Normal user taps after the guard window keep the existing expand/collapse behavior.
widget_path = ROOT / 'src/70-floating-widget.part.js'
widget = read(widget_path)
widget = replace_once(
    widget,
    "    const toggleMobileWidget = async () => {\n      if (!widgetMobileViewport) return;\n      widgetMobileExpanded = !widgetMobileExpanded;",
    "    const toggleMobileWidget = async () => {\n      if (!widgetMobileViewport) return;\n      if (Date.now() < widgetMobileToggleBlockedUntil) { widgetMobileExpanded = false; return; }\n      widgetMobileExpanded = !widgetMobileExpanded;",
    'mobile toggle transition guard',
)
write(widget_path, widget)

# UI regression markers for the race fix.
test_path = ROOT / 'tests/p3-ui.cjs'
test = read(test_path)
anchor = "  \"await renderWidget('panel-open');\",\n"
addition = "  \"await renderWidget('panel-open');\",\n  'widgetMobileToggleBlockedUntil=Date.now()+800;',\n  \"await renderWidget('panel-open-settled');\",\n  'Date.now() < widgetMobileToggleBlockedUntil',\n"
if anchor not in test:
    raise SystemExit('missing p3-ui 5.10 marker anchor')
test = test.replace(anchor, addition, 1)
write(test_path, test)

# Runtime implementation versions stay fixed; only product identity advances.
manager_path = ROOT / 'runtime/bridge-manager.cjs'
manager = read(manager_path)
manager = manager.replace(f"const PRODUCT_VERSION = '{OLD}';", f"const PRODUCT_VERSION = '{NEW}';", 1)
write(manager_path, manager)

manifest_path = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW
manifest['components']['plugin']['version'] = NEW
manifest['components']['bridgeManager']['productVersion'] = NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
write(manifest_path, json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'patched {OLD} -> {NEW} mobile panel-open widget race')
