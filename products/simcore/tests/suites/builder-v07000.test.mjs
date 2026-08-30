import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

const RULES = [
  'current_input_task=primary_generation_authority',
  'prior_assistant_output=continuity_reference_context_not_current_task_authority',
  'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',
];

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.2') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v07000-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-07000-current-task-primacy-guard.py');
  assert(fs.existsSync(builder), 'v0.70.0 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07000-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.70.0 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07000_BUILD_PASS'), `v0.70.0 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.0 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.0', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.0', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.0', 'Host identity');

    const beforePrompt = moduleText(ctx.source, 'prompt');
    const afterPrompt = moduleText(latest, 'prompt');
    equal((beforePrompt.match(/const PROMPT_COMPILER_VERSION = 3;/g) || []).length, 1, 'parent Prompt compiler identity');
    equal((afterPrompt.match(/const PROMPT_COMPILER_VERSION = 4;/g) || []).length, 1, 'candidate Prompt compiler identity');

    for (const rule of RULES) {
      equal(afterPrompt.split(rule).length - 1, 1, `${rule} exactly once`);
      equal(beforePrompt.split(rule).length - 1, 0, `${rule} absent from parent`);
    }
    for (const rule of [
      'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
      'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
      'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',
    ]) {
      equal(afterPrompt.split(rule).length - 1, 1, `${rule} preserved exactly once`);
    }

    const normalizedExpectedPrompt = beforePrompt
      .replace('const PROMPT_COMPILER_VERSION = 3;', 'const PROMPT_COMPILER_VERSION = 4;')
      .replace(
        "    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',",
        "    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',\n" +
          "    'current_input_task=primary_generation_authority',\n" +
          "    'prior_assistant_output=continuity_reference_context_not_current_task_authority',\n" +
          "    'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',",
      );
    equal(afterPrompt, normalizedExpectedPrompt, 'Prompt module delta is compiler v4 plus exactly three stable rules');

    equal(moduleText(latest, 'community'), moduleText(ctx.source, 'community'), 'Community module byte-preserved');
    const loader = new BundleLoader(latest);
    const community = loader.load('community');
    equal(community.COMMUNITY_CLASSIFIER_VERSION, 3, 'Community classifier version frozen');
    for (const header of ['맘스홀릭', '맘스홀릭 / 자유게시판', '맘스홀릭 / 육아 이야기']) {
      const info = community.platformInfo(header);
      equal(info.key, '맘카페', `${header} canonical key preserved`);
      equal(info.group, '학부모/지역', `${header} group preserved`);
      equal(info.source, 'alias-parent-local', `${header} alias source preserved`);
    }
    for (const header of ['맘스터치 / 자유게시판', '게임홀릭 / 수다방', '맘스홀릭몰 / 자유게시판']) {
      const info = community.platformInfo(header);
      equal(info.source, 'unknown', `${header} negative alias control preserved`);
    }

    equal((latest.match(/const STATE_VERSION = 5;/g) || []).length, (ctx.source.match(/const STATE_VERSION = 5;/g) || []).length, 'STATE_VERSION frozen');
    equal((latest.match(/const CORE_STATE_VERSION = 10;/g) || []).length, (ctx.source.match(/const CORE_STATE_VERSION = 10;/g) || []).length, 'CORE_STATE_VERSION frozen');
    assert(latest.includes('SimCore.define("state-reconcile"'), 'M2-6 State Reconcile owner missing');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v07000-builder-executes-from-exact-v06902-source', status: 'PASS' },
        { id: 'v07000-runtime-identities-converged', status: 'PASS' },
        { id: 'v07000-latest-install-identical', status: 'PASS' },
        { id: 'v07000-prompt-compiler-v4-only', status: 'PASS' },
        { id: 'v07000-current-task-primacy-rules-exactly-once', status: 'PASS' },
        { id: 'v07000-existing-period-and-current-fact-authority-preserved', status: 'PASS' },
        { id: 'v07000-community-v06902-alias-byte-preserved', status: 'PASS' },
        { id: 'v07000-state-and-m2-6-frozen', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
