#!/usr/bin/env python3
from pathlib import Path

TARGETS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.64.1'
TO_VERSION = '0.64.2'

RELEASE_NOTE = '''// v0.64.2 Diagnostic Copy Resilience:
// - Separates one-time diagnostic report construction from clipboard transport so report-builder failures and clipboard failures no longer collapse into one boolean result
// - Builds the report exactly once, then reuses the identical immutable string for the primary Clipboard API and the browser-local textarea fallback
// - Adds four bounded results only: COPIED, COPIED_FALLBACK, REPORT_BUILD_FAILED and CLIPBOARD_WRITE_FAILED
// - Adds a user-click-only temporary-textarea fallback with unconditional DOM cleanup and best-effort focus restoration; no background task, timer loop, network call or host chat write is introduced
// - Keeps only bounded memory telemetry (status, length, API availability, error names and timestamp); raw reports and exception messages are never retained
// - Leaves buildLastTurnDiagnosticReport byte-identical and does not speculate about the earlier B_END failure; a future REPORT_BUILD_FAILED result is the gate for a separate builder-repair mini
// - Request/output hot paths, M2-2 behavior, Summary Scope, Broadcast/Time/Frame, Representation/Edit/Runtime Mirror/Deferred Mirror, Recovery, Lineage/Handoff/Recurrence/Evidence/Structure/Community/Reaction, Prompt, Store and persistent schema remain frozen
//
'''

OLD_COPY = '''  async function copyLastTurnDiagnostic(chat, state) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(buildLastTurnDiagnosticReport(chat, state));
        return true;
      }
    } catch (_) {}
    return false;
  }
'''

NEW_COPY = '''  function diagnosticCopyErrorName(error) {
    const name = String(error?.name || 'Error').replace(/[^A-Za-z0-9_$.-]+/g, '_').slice(0, 80);
    return name || 'Error';
  }

  function diagnosticCopyResult(status, detail = {}) {
    return Object.freeze({
      ok: status === 'COPIED' || status === 'COPIED_FALLBACK',
      status,
      reportChars: Math.max(0, Number(detail.reportChars || 0)),
      primaryAvailable: !!detail.primaryAvailable,
      primaryErrorName: detail.primaryErrorName || null,
      fallbackAttempted: !!detail.fallbackAttempted,
      fallbackErrorName: detail.fallbackErrorName || null,
    });
  }

  function fallbackCopyText(reportText) {
    if (typeof document === 'undefined'
        || !document.body
        || typeof document.createElement !== 'function'
        || typeof document.execCommand !== 'function') return false;

    const activeElement = document.activeElement || null;
    const textarea = document.createElement('textarea');
    let appended = false;
    try {
      textarea.value = reportText;
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      textarea.tabIndex = -1;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      appended = true;
      try { textarea.focus({ preventScroll: true }); } catch (_) { textarea.focus(); }
      textarea.select();
      if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(0, reportText.length);
      }
      return document.execCommand('copy') === true;
    } finally {
      if (appended && textarea.parentNode) textarea.parentNode.removeChild(textarea);
      if (activeElement
          && activeElement !== textarea
          && activeElement.isConnected !== false
          && typeof activeElement.focus === 'function') {
        try { activeElement.focus({ preventScroll: true }); } catch (_) {
          try { activeElement.focus(); } catch (_) {}
        }
      }
    }
  }

  async function runDiagnosticCopy(buildReport, primaryCopy, fallbackCopy) {
    const primaryAvailable = typeof primaryCopy === 'function';
    let reportText;
    try {
      reportText = String(buildReport());
    } catch (_) {
      return diagnosticCopyResult('REPORT_BUILD_FAILED', { primaryAvailable });
    }

    const reportChars = reportText.length;
    let primaryErrorName = null;
    if (primaryAvailable) {
      try {
        await primaryCopy(reportText);
        return diagnosticCopyResult('COPIED', { reportChars, primaryAvailable });
      } catch (error) {
        primaryErrorName = diagnosticCopyErrorName(error);
      }
    }

    let fallbackErrorName = null;
    const fallbackAttempted = typeof fallbackCopy === 'function';
    if (fallbackAttempted) {
      try {
        if (await fallbackCopy(reportText)) {
          return diagnosticCopyResult('COPIED_FALLBACK', {
            reportChars,
            primaryAvailable,
            primaryErrorName,
            fallbackAttempted,
          });
        }
        fallbackErrorName = 'CopyCommandFalse';
      } catch (error) {
        fallbackErrorName = diagnosticCopyErrorName(error);
      }
    } else {
      fallbackErrorName = 'Unavailable';
    }

    return diagnosticCopyResult('CLIPBOARD_WRITE_FAILED', {
      reportChars,
      primaryAvailable,
      primaryErrorName,
      fallbackAttempted,
      fallbackErrorName,
    });
  }

  function diagnosticCopyButtonText(result) {
    switch (result?.status) {
      case 'COPIED': return '복사됨 ✓';
      case 'COPIED_FALLBACK': return '복사됨 (대체 방식) ✓';
      case 'REPORT_BUILD_FAILED': return '진단 생성 실패';
      default: return '클립보드 복사 실패';
    }
  }

  async function copyLastTurnDiagnostic(chat, state) {
    const primaryCopy = typeof navigator !== 'undefined' && navigator.clipboard?.writeText
      ? (reportText) => navigator.clipboard.writeText(reportText)
      : null;
    const result = await runDiagnosticCopy(
      () => buildLastTurnDiagnosticReport(chat, state),
      primaryCopy,
      fallbackCopyText,
    );
    lastDiagnosticCopyProbe = Object.freeze({
      status: result.status,
      reportChars: result.reportChars,
      primaryAvailable: result.primaryAvailable,
      primaryErrorName: result.primaryErrorName,
      fallbackAttempted: result.fallbackAttempted,
      fallbackErrorName: result.fallbackErrorName,
      at: Date.now(),
    });
    console.log(SIMCORE_LOG_PREFIX + ' diagnostic copy:', lastDiagnosticCopyProbe);
    return result;
  }
'''

OLD_UI = """        copyTurnDiagButton.textContent = (await copyLastTurnDiagnostic(chat, s)) ? '복사됨 ✓' : '복사 실패';"""
NEW_UI = """        copyTurnDiagButton.textContent = diagnosticCopyButtonText(await copyLastTurnDiagnostic(chat, s));"""


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch(text):
    if f'//@version {FROM_VERSION}' not in text:
        if f'//@version {TO_VERSION}' in text and "status === 'COPIED_FALLBACK'" in text:
            return text
        raise SystemExit('unexpected source version')

    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TO_VERSION}', 'metadata version')
    text = one(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TO_VERSION}';", 'runtime version')
    text = one(text, '// v0.64.1 Summary Scope Authority:', RELEASE_NOTE + '// v0.64.1 Summary Scope Authority:', 'release note')
    text = one(text, '  let lastDiagnosticRequestProbe = null;', '  let lastDiagnosticRequestProbe = null;\n  let lastDiagnosticCopyProbe = null;', 'copy probe declaration')
    text = one(text, OLD_COPY, NEW_COPY, 'diagnostic copy orchestration')
    text = one(text, OLD_UI, NEW_UI, 'diagnostic copy button status')
    text = one(text, '    lastDiagnosticRequestProbe = null;\n    representationRegistry.clear();', '    lastDiagnosticRequestProbe = null;\n    lastDiagnosticCopyProbe = null;\n    representationRegistry.clear();', 'copy probe unload reset')
    return text


for target in TARGETS:
    target.write_text(patch(target.read_text(encoding='utf-8')), encoding='utf-8')

latest = TARGETS[0].read_text(encoding='utf-8')
install = TARGETS[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('latest.js and install.js diverged')

for needle in (
    '//@version 0.64.2',
    "const SIMCORE_RUNTIME_VERSION = '0.64.2';",
    'v0.64.2 Diagnostic Copy Resilience',
    'function fallbackCopyText',
    'async function runDiagnosticCopy',
    "diagnosticCopyResult('REPORT_BUILD_FAILED'",
    "diagnosticCopyResult('CLIPBOARD_WRITE_FAILED'",
    "case 'COPIED_FALLBACK': return '복사됨 (대체 방식) ✓';",
    'lastDiagnosticCopyProbe = Object.freeze',
    'Representation ownership: REPRESENTATION',
    'REPRESENTATION_FAST_RECONCILED',
    'USER_EDIT_CANDIDATE',
    'MANUAL_EDIT_REBUILT',
    'summary_scope=ANNUAL_ONLY',
    'summary_scope=CUMULATIVE_YOY',
):
    if needle not in latest:
        raise SystemExit(f'missing post-patch marker: {needle}')

for forbidden in (
    'lastDiagnosticCopyProbe = await pluginStorage',
    'pluginStorage.setItem(lastDiagnosticCopyProbe',
    'setChat(lastDiagnosticCopyProbe',
):
    if forbidden in latest:
        raise SystemExit(f'forbidden copy-probe persistence: {forbidden}')

print('SimCore v0.64.2 Diagnostic Copy Resilience patch: OK')
