#!/usr/bin/env python3
from pathlib import Path

TARGETS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.64.0'
TO_VERSION = '0.64.1'

RELEASE_NOTE = '''// v0.64.1 Summary Scope Authority:
// - Follows paired real long-chat C-mode year-end summary evidence: an ANNUAL_ONLY request mixed/omitted target-year achievements, while an explicit 2029->2030 cumulative comparison reused an older historical value inside the same visible response and incompletely covered requested YoY deltas
// - Adds a deterministic request-scoped summary classifier in Lifecycle with three bounded results only: NONE, ANNUAL_ONLY, CUMULATIVE_YOY; ambiguous/multi-year requests fail closed to NONE
// - ANNUAL_ONLY makes the target year the achievement authority while allowing earlier facts only as labeled context/metadata and requiring cumulative counters to be labeled as year-end snapshots rather than prior achievements
// - CUMULATIVE_YOY requires the explicit previous-year baseline plus target-year-end current value, absolute delta and percentage delta for requested metrics; older lifetime/history values may be secondary context but cannot replace the requested previous-year baseline
// - Summary scope authority is serialized after Recurrence guidance so recurrence may preserve structure/style but cannot become factual authority for target-year or baseline values; Recurrence and Lineage implementations remain frozen
// - Adds Summary scope diagnostics (scope/target/comparison/authority/reason) without output-body parsing, semantic repair, persistent schema changes or new host/storage/network/timer calls
// - M2-2 Representation/Edit/Runtime Mirror/Deferred Mirror, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Structure/COMMUNITY, cache/history observers and provider-cache policy remain frozen
//
'''

SUMMARY_CLASSIFIER = r'''const SUMMARY_SCOPE_NONE = 'NONE';
const SUMMARY_SCOPE_ANNUAL_ONLY = 'ANNUAL_ONLY';
const SUMMARY_SCOPE_CUMULATIVE_YOY = 'CUMULATIVE_YOY';

function summaryYearMentions(input) {
  const years = [];
  const seen = new Set();
  const re = /(?:19|20|21)\d{2}/g;
  let m;
  while ((m = re.exec(String(input || '')))) {
    const year = Number(m[0]);
    if (!seen.has(year)) {
      seen.add(year);
      years.push(year);
    }
  }
  return years;
}

function summaryHasExplicitFullYearWindow(input, targetYear) {
  const text = String(input || '');
  const year = Number(targetYear);
  if (!Number.isInteger(year)) return false;
  const y = String(year);
  const dotted = new RegExp(`${y}\\s*\\.\\s*0?1\\s*\\.\\s*0?1\\s*\\.\\s*(?:~|〜|～|부터)\\s*12\\s*\\.\\s*31\\s*\\.?`);
  const korean = new RegExp(`${y}\\s*년\\s*0?1\\s*월\\s*0?1\\s*일\\s*(?:~|〜|～|부터)\\s*(?:${y}\\s*년\\s*)?12\\s*월\\s*31\\s*일`);
  return dotted.test(text) || korean.test(text);
}

function classifySummaryScope(input, mode = 'A') {
  const none = Object.freeze({
    scope: SUMMARY_SCOPE_NONE,
    targetYear: null,
    comparisonYear: null,
    authority: 'NONE',
    reason: 'INELIGIBLE',
  });
  if (String(mode || '') !== 'C') return none;

  const text = String(input || '');
  const years = summaryYearMentions(text);
  if (!years.length) return none;

  const targetYear = Math.max(...years);
  const comparisonYear = targetYear - 1;
  const hasPreviousYear = years.includes(comparisonYear);
  const explicitYoySignal = /(?:전년|전년도|작년)\s*대비|기준점|기준으로|증가(?:량|율|폭|수)|전년(?:도)?\s*말|비교/.test(text);
  if (hasPreviousYear && explicitYoySignal) {
    return Object.freeze({
      scope: SUMMARY_SCOPE_CUMULATIVE_YOY,
      targetYear,
      comparisonYear,
      authority: 'YEAR_END_BASELINE_COMPARE',
      reason: 'EXPLICIT_PREVIOUS_YEAR_BASELINE',
    });
  }

  const multiYearRange = /(?:19|20|21)\d{2}\s*(?:~|〜|～|–|—|-)\s*(?:19|20|21)\d{2}/.test(text);
  if (multiYearRange) return none;

  const annualSignal = /(?:성과\s*총정리|활동\s*성과|플랫폼별\s*성과|연말\s*결산|연말결산|한\s*해|연간\s*(?:활동|성과|결산)|수상\s*성과|총정리)/.test(text);
  if (!annualSignal) return none;

  return Object.freeze({
    scope: SUMMARY_SCOPE_ANNUAL_ONLY,
    targetYear,
    comparisonYear: null,
    authority: 'TARGET_YEAR',
    reason: summaryHasExplicitFullYearWindow(text, targetYear) ? 'BOUNDED_SINGLE_YEAR' : 'SINGLE_YEAR_SUMMARY',
  });
}
'''


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch(text):
    if f'//@version {FROM_VERSION}' not in text:
        if f'//@version {TO_VERSION}' in text and 'function classifySummaryScope' in text:
            return text
        raise SystemExit('unexpected source version')

    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TO_VERSION}', 'metadata version')
    text = one(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TO_VERSION}';", 'runtime version')
    text = one(text, '// v0.64.0 M2-2 Representation Ownership Split:', RELEASE_NOTE + '// v0.64.0 M2-2 Representation Ownership Split:', 'release note')

    lifecycle_marker = "  return { mode, wasLocked, hasContinue, hasEnd, hasStart, hasCommunity };\n}\n\nfunction prepareTurn(baseState, userText, promptProbe, sendIndex) {"
    lifecycle_replacement = "  return { mode, wasLocked, hasContinue, hasEnd, hasStart, hasCommunity };\n}\n\n" + SUMMARY_CLASSIFIER + "\nfunction prepareTurn(baseState, userText, promptProbe, sendIndex) {"
    text = one(text, lifecycle_marker, lifecycle_replacement, 'summary classifier insertion')

    text = one(
        text,
        "  const c = classifyMode(state, input);\n  const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);",
        "  const c = classifyMode(state, input);\n  const summaryScope = classifySummaryScope(input, c.mode);\n  const broadcastAirtimeIsNew = !!(c.hasStart && !c.wasLocked);",
        'summary classification call',
    )
    text = one(
        text,
        "    sendIndex,\n    mode: c.mode,\n    userText: input.slice(0, 16000),",
        "    sendIndex,\n    mode: c.mode,\n    summaryScope: summaryScope.scope,\n    summaryTargetYear: summaryScope.targetYear,\n    summaryComparisonYear: summaryScope.comparisonYear,\n    summaryAuthority: summaryScope.authority,\n    summaryScopeReason: summaryScope.reason,\n    userText: input.slice(0, 16000),",
        'pending summary metadata',
    )
    text = one(
        text,
        'module.exports = { classifyMode, prepareTurn, expectedCommunityBlocks };',
        'module.exports = { classifyMode, classifySummaryScope, prepareTurn, expectedCommunityBlocks };',
        'lifecycle summary export',
    )

    text = one(text, 'const PROMPT_COMPILER_VERSION = 2;', 'const PROMPT_COMPILER_VERSION = 3;', 'prompt compiler version')

    recurrence_block = """  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
"""
    summary_guidance = recurrence_block + """  if (p.summaryScope === 'ANNUAL_ONLY' && Number.isInteger(Number(p.summaryTargetYear))) {
    lines.push('summary_scope=ANNUAL_ONLY');
    lines.push(`summary_target_year=${Number(p.summaryTargetYear)}`);
    lines.push('summary_temporal_authority=TARGET_YEAR_ONLY');
    lines.push('target_year_achievement_authority=1;prior_year_achievement_as_target_year_achievement=forbidden');
    lines.push('historical_context_allowed=1;historical_context_must_be_labeled=1');
    lines.push('ongoing_role_prior_start_date_allowed_as_metadata=1;ongoing_role_target_year_activity_is_authoritative=1');
    lines.push('year_end_cumulative_snapshot_allowed=1;year_end_cumulative_snapshot_must_be_labeled=1');
    lines.push('do_not_replace_missing_target_year_achievement_with_older_achievement=1;requested_category_coverage_required=1');
  } else if (p.summaryScope === 'CUMULATIVE_YOY'
      && Number.isInteger(Number(p.summaryTargetYear))
      && Number.isInteger(Number(p.summaryComparisonYear))) {
    lines.push('summary_scope=CUMULATIVE_YOY');
    lines.push(`summary_target_year=${Number(p.summaryTargetYear)}`);
    lines.push(`summary_comparison_year=${Number(p.summaryComparisonYear)}`);
    lines.push('summary_temporal_authority=YEAR_END_BASELINE_COMPARE');
    lines.push('for_each_requested_metric_require=previous_value,current_value,absolute_delta,percentage_delta');
    lines.push('comparison_baseline_must_equal_requested_previous_year_end=1;older_historical_value_cannot_replace_comparison_baseline=1');
    lines.push('same_metric_baseline_consistency_required=1');
    lines.push('lifetime_origin_value_allowed_as_secondary_context=1;lifetime_growth_cannot_replace_requested_yoy_growth=1');
  }
  if (p.summaryScope && p.summaryScope !== 'NONE') {
    lines.push('summary_scope_authority_over_recurrence_factual_content=1;recurrence_is_structure_style_guidance_only=1');
    lines.push('reevaluate_summary_facts_from_current_target_scope=1');
  }
"""
    text = one(text, recurrence_block, summary_guidance, 'summary prompt guidance')

    text = one(
        text,
        "          registrySize: Number(pendingProbe.templateRegistrySize || 0),\n          bootstrap: snapshotDetail?.templateBootstrap || null,",
        "          registrySize: Number(pendingProbe.templateRegistrySize || 0),\n          summaryScope: pendingProbe.summaryScope || 'NONE',\n          summaryTargetYear: pendingProbe.summaryTargetYear == null ? null : Number(pendingProbe.summaryTargetYear),\n          summaryComparisonYear: pendingProbe.summaryComparisonYear == null ? null : Number(pendingProbe.summaryComparisonYear),\n          summaryAuthority: pendingProbe.summaryAuthority || 'NONE',\n          summaryScopeReason: pendingProbe.summaryScopeReason || 'INELIGIBLE',\n          bootstrap: snapshotDetail?.templateBootstrap || null,",
        'summary diagnostic probe capture',
    )

    recurrence_diag = "      `Template recurrence: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.eligible ? (recurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE'} · family ${recurrenceProbe.modeFamily || 'n/a'}` : 'n/a'}`,"
    summary_diag = "      `Summary scope: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.summaryScope || 'NONE'} · target ${recurrenceProbe.summaryTargetYear == null ? 'n/a' : Number(recurrenceProbe.summaryTargetYear)} · comparison ${recurrenceProbe.summaryComparisonYear == null ? 'n/a' : Number(recurrenceProbe.summaryComparisonYear)} · authority ${recurrenceProbe.summaryAuthority || 'NONE'} · reason ${recurrenceProbe.summaryScopeReason || 'INELIGIBLE'}` : 'n/a'}`,\n"
    text = one(text, recurrence_diag, summary_diag + recurrence_diag, 'summary diagnostic line')

    return text


for target in TARGETS:
    target.write_text(patch(target.read_text(encoding='utf-8')), encoding='utf-8')

latest = TARGETS[0].read_text(encoding='utf-8')
install = TARGETS[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('latest.js and install.js diverged')

for needle in (
    '//@version 0.64.1',
    "const SIMCORE_RUNTIME_VERSION = '0.64.1';",
    'v0.64.1 Summary Scope Authority',
    'function classifySummaryScope',
    'summaryScope: summaryScope.scope',
    'summary_scope=ANNUAL_ONLY',
    'summary_scope=CUMULATIVE_YOY',
    'summary_scope_authority_over_recurrence_factual_content=1',
    'Summary scope:',
    'Representation ownership: REPRESENTATION',
    'REPRESENTATION_FAST_RECONCILED',
    'USER_EDIT_CANDIDATE',
    'MANUAL_EDIT_REBUILT',
):
    if needle not in latest:
        raise SystemExit(f'missing post-patch marker: {needle}')

for forbidden in (
    'summary_scope_authority_over_lineage=',
    'resetLineageForSummary',
    'summaryPersistentState',
):
    if forbidden in latest:
        raise SystemExit(f'forbidden scope expansion: {forbidden}')

print('SimCore v0.64.1 Summary Scope Authority patch: OK')
