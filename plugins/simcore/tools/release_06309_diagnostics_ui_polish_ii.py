from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.9 Diagnostics UI Polish II:\n// - UI-only readability pass: adds an overall HEALTHY/CHECK/REGRESSION badge, EDIT CLEAN/REBUILT status, clearer source-idle labeling, and directional frame icons\n// - Collapses the dense secondary metric grid into a default-closed Advanced diagnostics section and visually dims standby/n/a metrics when the panel is opened\n// - Generalizes the old Long-Chat Regression Probe panel footer to Diagnostic Tools while keeping the manual diagnostic-copy behavior unchanged\n// - All display-only classification/counting runs after the existing panel DOM is rendered; no timer, polling, observer, request-path work, storage/API call, prompt line, or state field is added\n// - Keeps all 15 internal modules byte-identical to v0.63.8 and preserves runtime semantics, generation guidance, cache-prefix behavior, Recovery, Source Lock, Period Continuity, and diagnostics\n//\n"""

CALC_OLD = """      const panelPerfTopLabel = panelPerfTop ? (panelPerfLabelMap[panelPerfTop[0]] || panelPerfTop[0].replace(/Ms$/, '')) : 'n/a';\n"""
CALC_NEW = CALC_OLD + """      const panelHealthLabel = !panelFrameOk ? 'REGRESSION' : (panelWarningCount > 0 ? 'CHECK' : 'HEALTHY');\n      const panelHealthClass = !panelFrameOk ? 'bad' : (panelWarningCount > 0 ? 'warn' : 'good');\n      const panelEditPath = String(lastPerf?.editDetail?.path || '');\n      const panelEditRebuilt = panelEditPath === 'manual-edit-rebuilt';\n      const panelEditLabel = !lastPerf ? 'n/a' : (panelEditRebuilt ? 'REBUILT' : 'CLEAN');\n      const panelEditClass = !lastPerf ? 'neutral' : (panelEditRebuilt ? 'warn' : 'good');\n      const panelSourceLabel = panelSourceLock ? 'LOCK' : (lastCommunitySourceHandoffProbe?.newSource ? 'NEW' : '—');\n      const panelSourceClass = (panelSourceLock || lastCommunitySourceHandoffProbe?.newSource) ? 'good' : 'neutral';\n      const panelFrameStepUi = (step) => {\n        const value = String(step || 'n/a');\n        if (value === 'ADVANCED') return '↑ ADVANCED';\n        if (value === 'SAME') return '━ SAME';\n        if (value === 'REGRESSED') return '↓ REGRESSED';\n        if (value === 'RESET_AFTER_VOLUME_ADVANCE') return '↻ RESET';\n        return `· ${value}`;\n      };\n      const panelChapterStep = (Number.isFinite(panelFrameProbe.previous.volume) && Number.isFinite(panelFrameProbe.current.volume)\n        && panelFrameProbe.current.volume > panelFrameProbe.previous.volume && Number.isFinite(panelFrameProbe.previous.chapter)\n        && Number.isFinite(panelFrameProbe.current.chapter) && panelFrameProbe.current.chapter < panelFrameProbe.previous.chapter)\n        ? 'RESET_AFTER_VOLUME_ADVANCE' : diagnosticStepLabel(panelFrameProbe.previous.chapter, panelFrameProbe.current.chapter);\n"""

STYLE_OLD = ".compact{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.metric{background:#0e1628;border:1px solid #23314d;border-radius:9px;padding:9px 10px}"
STYLE_NEW = ".compact{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.metric{background:#0e1628;border:1px solid #23314d;border-radius:9px;padding:9px 10px;transition:opacity .15s ease,border-color .15s ease}.metric.dim{opacity:.42}.overall-chip{font-size:12px;padding:7px 10px}.advanced-count{font-weight:500;color:#8291ad;font-size:11px;margin-left:5px}.crumb.root{border-color:#385781}.crumb.current{border-color:#285c4b;color:#b7efd5}.crumb.mutedcrumb{opacity:.55}.frame-step.regressed{color:#ffb3c0;font-weight:800}"

HEADER_OLD = """<div><div class=\"title\">⚙️ SimCore v0.63.8</div><div class=\"subtitle\">Diagnostics UI Polish · runtime semantics unchanged</div></div>\n"""
HEADER_NEW = """<div><div class=\"title\">⚙️ SimCore v0.63.9</div><div class=\"subtitle\">Diagnostics UI Polish II · runtime semantics unchanged</div></div>\n"""

HEALTH_OLD = """<div class=\"health\">\n<span class=\"chip neutral\">MODE ${escapeHtml(panelModeLabel)}</span>\n<span class=\"chip ${panelWarningCount === 0 ? 'good' : 'bad'}\">WARN ${panelWarningCount}</span>\n<span class=\"chip ${panelSourceLock ? 'good' : 'neutral'}\">SOURCE ${panelSourceLock ? 'LOCK' : 'STANDBY'}</span>\n<span class=\"chip ${panelFrameOk ? 'good' : 'bad'}\">FRAME ${panelFrameOk ? 'OK' : escapeHtml(panelFrameProbe.regression)}</span>\n<span class=\"chip ${panelPrefixClass}\">PREFIX ${escapeHtml(promptCacheLabel)}</span>\n</div>\n"""
HEALTH_NEW = """<div class=\"health\">\n<span class=\"chip overall-chip ${panelHealthClass}\">● ${panelHealthLabel}</span>\n<span class=\"chip neutral\">MODE ${escapeHtml(panelModeLabel)}</span>\n<span class=\"chip ${panelWarningCount === 0 ? 'good' : 'bad'}\">WARN ${panelWarningCount}</span>\n<span class=\"chip ${panelSourceClass}\">SOURCE ${escapeHtml(panelSourceLabel)}</span>\n<span class=\"chip ${panelFrameOk ? 'good' : 'bad'}\">FRAME ${panelFrameOk ? 'OK' : escapeHtml(panelFrameProbe.regression)}</span>\n<span class=\"chip ${panelEditClass}\">EDIT ${escapeHtml(panelEditLabel)}</span>\n<span class=\"chip ${panelPrefixClass}\">PREFIX ${escapeHtml(promptCacheLabel)}</span>\n</div>\n"""

BREADCRUMB_OLD = """<div class=\"breadcrumb\"><span class=\"crumb\">ROOT ${escapeHtml(panelRootLabel)}</span><span class=\"arrow\">→</span><span class=\"crumb\">PARENT ${escapeHtml(panelParentLabel)}</span><span class=\"arrow\">→</span><span class=\"crumb\">${escapeHtml(panelCurrentLabel)}</span></div>\n"""
BREADCRUMB_NEW = """<div class=\"breadcrumb\"><span class=\"crumb root ${panelRootLabel === 'UNSEEDED' ? 'mutedcrumb' : ''}\">ROOT ${escapeHtml(panelRootLabel)}</span><span class=\"arrow\">→</span><span class=\"crumb ${panelParentLabel === 'none' ? 'mutedcrumb' : ''}\">PARENT ${escapeHtml(panelParentLabel)}</span><span class=\"arrow\">→</span><span class=\"crumb current\">${escapeHtml(panelCurrentLabel)}</span></div>\n"""

FRAME_OLD = """<div class=\"frame-cell\"><div class=\"k\">Volume</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.volume)} → ${panelFrameValue(panelFrameProbe.current.volume)}</div><div class=\"frame-step\">${escapeHtml(diagnosticStepLabel(panelFrameProbe.previous.volume, panelFrameProbe.current.volume))}</div></div>\n<div class=\"frame-cell\"><div class=\"k\">Chapter</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.chapter)} → ${panelFrameValue(panelFrameProbe.current.chapter)}</div><div class=\"frame-step\">${escapeHtml((Number.isFinite(panelFrameProbe.previous.volume) && Number.isFinite(panelFrameProbe.current.volume) && panelFrameProbe.current.volume > panelFrameProbe.previous.volume && Number.isFinite(panelFrameProbe.previous.chapter) && Number.isFinite(panelFrameProbe.current.chapter) && panelFrameProbe.current.chapter < panelFrameProbe.previous.chapter) ? 'RESET_AFTER_VOLUME_ADVANCE' : diagnosticStepLabel(panelFrameProbe.previous.chapter, panelFrameProbe.current.chapter))}</div></div>\n<div class=\"frame-cell\"><div class=\"k\">Chatindex</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.chatindex)} → ${panelFrameValue(panelFrameProbe.current.chatindex)}</div><div class=\"frame-step\">${escapeHtml(diagnosticStepLabel(panelFrameProbe.previous.chatindex, panelFrameProbe.current.chatindex))}</div></div>\n"""
FRAME_NEW = """<div class=\"frame-cell\"><div class=\"k\">Volume</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.volume)} → ${panelFrameValue(panelFrameProbe.current.volume)}</div><div class=\"frame-step ${diagnosticStepLabel(panelFrameProbe.previous.volume, panelFrameProbe.current.volume) === 'REGRESSED' ? 'regressed' : ''}\">${escapeHtml(panelFrameStepUi(diagnosticStepLabel(panelFrameProbe.previous.volume, panelFrameProbe.current.volume)))}</div></div>\n<div class=\"frame-cell\"><div class=\"k\">Chapter</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.chapter)} → ${panelFrameValue(panelFrameProbe.current.chapter)}</div><div class=\"frame-step ${panelChapterStep === 'REGRESSED' ? 'regressed' : ''}\">${escapeHtml(panelFrameStepUi(panelChapterStep))}</div></div>\n<div class=\"frame-cell\"><div class=\"k\">Chatindex</div><div class=\"v\">${panelFrameValue(panelFrameProbe.previous.chatindex)} → ${panelFrameValue(panelFrameProbe.current.chatindex)}</div><div class=\"frame-step ${diagnosticStepLabel(panelFrameProbe.previous.chatindex, panelFrameProbe.current.chatindex) === 'REGRESSED' ? 'regressed' : ''}\">${escapeHtml(panelFrameStepUi(diagnosticStepLabel(panelFrameProbe.previous.chatindex, panelFrameProbe.current.chatindex)))}</div></div>\n"""

ADV_START_OLD = """<div class=\"card compact\">\n<div class=\"metric\"><div class=\"k\">Current snapshot path</div>"""
ADV_START_NEW = """<details class=\"card\" id=\"advanced-diagnostics\"><summary>Advanced diagnostics <span class=\"advanced-count\" id=\"advanced-count\"></span></summary><div class=\"detail-body compact\" id=\"advanced-grid\">\n<div class=\"metric\"><div class=\"k\">Current snapshot path</div>"""

ADV_END_OLD = """<div class=\"metric\"><div class=\"k\">output</div><div class=\"v\">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n</div>\n${lastCore.issues.length ?"""
ADV_END_NEW = """<div class=\"metric\"><div class=\"k\">output</div><div class=\"v\">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n</div></details>\n${lastCore.issues.length ?"""

FOOTER_OLD = """<div class=\"card muted\">Long-Chat Regression Probe · frame continuity + recurrence-history match are computed only for manual diagnostic copy; runtime prompt/generation behavior unchanged</div>\n</div>`;\n      const copyTurnDiagButton = document.getElementById('copy-turn-diag');\n"""
FOOTER_NEW = """<div class=\"card muted\"><strong>Diagnostic Tools</strong> · frame continuity + recurrence-history match run only for manual diagnostic copy; runtime prompt/generation behavior unchanged</div>\n</div>`;\n      const advancedGrid = document.getElementById('advanced-grid');\n      const advancedCount = document.getElementById('advanced-count');\n      if (advancedGrid) {\n        const metrics = Array.from(advancedGrid.querySelectorAll('.metric'));\n        let standby = 0;\n        for (const metric of metrics) {\n          const value = String(metric.querySelector('.v')?.textContent || '').trim();\n          const isStandby = value === 'n/a' || value === 'OFF' || value === 'NO REQUEST DATA' || value.startsWith('STANDBY');\n          if (isStandby) { metric.classList.add('dim'); standby += 1; }\n        }\n        if (advancedCount) advancedCount.textContent = `· ${metrics.length - standby} active · ${standby} standby`;\n      }\n      const copyTurnDiagButton = document.getElementById('copy-turn-diag');\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.8' not in text:
        raise SystemExit(f'{path}: expected 0.63.8 baseline')
    if '// v0.63.9 Diagnostics UI Polish II:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.8', '//@version 0.63.9', 1)
    anchor = '// v0.63.8 Diagnostics UI Polish:\n'
    if text.count(anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(anchor, CHANGELOG + anchor, 1)

    for old, new, label in [
        (CALC_OLD, CALC_NEW, 'panel calculations'),
        (STYLE_OLD, STYLE_NEW, 'panel styles'),
        (HEADER_OLD, HEADER_NEW, 'panel header'),
        (HEALTH_OLD, HEALTH_NEW, 'health chips'),
        (BREADCRUMB_OLD, BREADCRUMB_NEW, 'lineage breadcrumb'),
        (FRAME_OLD, FRAME_NEW, 'frame cards'),
        (ADV_START_OLD, ADV_START_NEW, 'advanced start'),
        (ADV_END_OLD, ADV_END_NEW, 'advanced end'),
        (FOOTER_OLD, FOOTER_NEW, 'diagnostic footer/postrender'),
    ]:
        if text.count(old) != 1:
            raise SystemExit(f'{path}: {label} anchor drift ({text.count(old)})')
        text = text.replace(old, new, 1)

    text = text.replace("'Version: 0.63.8'", "'Version: 0.63.9'", 1)
    # Any remaining visible runtime label should follow the installed version; comments keep historical versions.
    text = text.replace('SimCore v0.63.8', 'SimCore v0.63.9')

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.9 latest.js/install.js (panel UI only)')
