from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.3 Two-Turn Diagnostic Copy:\n// - Changes the manual diagnostic copy body from lineage-selected root/parent/current raw turns to the two most recent completed user→assistant turns: 직전 턴 + 최근 턴\n// - Keeps lineage/handoff/recurrence/cache/clock/warning metadata in the diagnostic header; root/parent remain metadata only rather than extra raw-response payloads\n// - Locates the two completed turns only when the user presses the button; no persistent response copy, storage schema, runtime prompt, or generation behavior change\n//\n"""

NEW_TAIL = """    const sections = [];
    let previousAssistantIndex = -1;
    const previousSearchBefore = currentUserIndex >= 0 ? currentUserIndex : latestAssistantIndex;
    for (let i = previousSearchBefore - 1; i >= 0; i--) {
      if (diagnosticAssistantRole(messages[i])) {
        previousAssistantIndex = i;
        break;
      }
    }
    const previousUserIndex = diagnosticUserBefore(
      messages,
      previousAssistantIndex >= 0 ? previousAssistantIndex : previousSearchBefore,
    );

    if (previousUserIndex >= 0 || previousAssistantIndex >= 0) {
      sections.push(diagnosticSection(
        '직전 턴 (RAW)',
        messages,
        previousUserIndex,
        previousAssistantIndex,
      ));
    } else {
      sections.push([
        '--- 직전 턴 (RAW) ---',
        'unavailable',
        '',
      ].join('\\n'));
    }

    sections.push(diagnosticSection(
      '최근 턴 (RAW)',
      messages,
      currentUserIndex,
      latestAssistantIndex,
      [`Current mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`],
    ));
    return lines.join('\\n') + sections.join('\\n');
  }
"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.2' not in text:
        raise SystemExit(f'{path}: expected 0.63.2 baseline')
    if 'function buildLastTurnDiagnosticReport(chat, state)' not in text:
        raise SystemExit(f'{path}: diagnostic report function missing')
    if '최근 턴 진단 복사' not in text:
        raise SystemExit(f'{path}: old button label missing')

    text = text.replace('//@version 0.63.2', '//@version 0.63.3', 1)
    text = text.replace('// v0.63.2 Release Channel Split:\n', CHANGELOG + '// v0.63.2 Release Channel Split:\n', 1)
    text = text.replace('<h1>⚙️ SimCore v0.63.2 <button id="copy-turn-diag">최근 턴 진단 복사</button>', '<h1>⚙️ SimCore v0.63.3 <button id="copy-turn-diag">최근 2턴 진단 복사</button>', 1)
    text = text.replace('[simcore/v0.63.2]', '[simcore/v0.63.3]')
    text = text.replace('diagnostic copy is manual/raw-only', 'diagnostic copy = previous + current completed turns, manual/raw-only', 1)

    fn_start = text.index('  function buildLastTurnDiagnosticReport(chat, state) {')
    sections_start = text.index('    const sections = [];', fn_start)
    copy_start = text.index('\n  async function copyLastTurnDiagnostic(chat, state) {', sections_start)
    text = text[:sections_start] + NEW_TAIL + text[copy_start:]

    fn_end = text.index('\n  async function copyLastTurnDiagnostic(chat, state) {', fn_start)
    report_block = text[fn_start:fn_end]
    if 'ROOT SOURCE TURN (RAW)' in report_block:
        raise SystemExit(f'{path}: root raw section survived replacement')
    if 'PARENT TURN (RAW)' in report_block:
        raise SystemExit(f'{path}: parent raw section survived replacement')
    for token in ['직전 턴 (RAW)', '최근 턴 (RAW)', '최근 2턴 진단 복사', '//@version 0.63.3']:
        if token not in text:
            raise SystemExit(f'{path}: missing token {token}')

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.3 two-turn diagnostic copy')
