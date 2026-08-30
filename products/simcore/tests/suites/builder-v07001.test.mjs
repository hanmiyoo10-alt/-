import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function count(source, marker) {
  return source.split(marker).length - 1;
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.0') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v07001-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-07001-cold-first-turn-tail-attribution.py');
  assert(fs.existsSync(builder), 'v0.70.1 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07001-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.70.1 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07001_BUILD_PASS'), `v0.70.1 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.1 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.1', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.1', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.1', 'Host identity');

    for (const name of ['prompt', 'community', 'runtime-session', 'store', 'lifecycle', 'representation', 'edit-reconcile', 'output-finalize', 'runtime-mirror']) {
      equal(moduleText(latest, name), moduleText(ctx.source, name), `${name} module byte-preserved`);
    }

    for (const marker of [
      'const PROMPT_COMPILER_VERSION = 4;',
      'current_input_task=primary_generation_authority',
      'prior_assistant_output=continuity_reference_context_not_current_task_authority',
      'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      'SimCore.define("state-reconcile"',
    ]) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} frozen`);
    }

    for (const marker of ['await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice(']) {
      equal(count(latest, marker), count(ctx.source, marker), `${marker} side-effect surface frozen`);
    }
    equal(
      count(latest, "messages.push({ role: 'system', content: result.promptBlock });"),
      count(ctx.source, "messages.push({ role: 'system', content: result.promptBlock });"),
      'runtime prompt insertion count frozen',
    );

    const loader = new BundleLoader(latest);
    const ops = loader.load('ops');
    equal(ops.timingCheckpoint(() => 12.5), 12.5, 'checkpoint returns finite monotonic reading');
    equal(ops.timingCheckpoint(() => { throw new Error('synthetic checkpoint failure'); }), null, 'checkpoint failure is contained');
    equal(ops.timingSpan(10, 13.25), 3.25, 'checkpoint span measured');
    equal(ops.timingSpan(13.25, 10), null, 'negative checkpoint span fails closed');
    equal(ops.timingSpan(null, 10), null, 'missing checkpoint span fails closed');

    const bounded = ops.postOnSendAttribution(10, [1, 2, 3, 1]);
    equal(bounded.confidence, 'BOUNDED', 'valid attribution is bounded');
    equal(bounded.checkpointFailure, false, 'valid attribution does not report checkpoint failure');
    equal(bounded.totalMs, 10, 'previous total remains authoritative');
    equal(bounded.namedMs, 7, 'named tail sum');
    equal(bounded.unattributedMs, 3, 'bounded unattributed remainder');
    equal(bounded.namedMs + bounded.unattributedMs, bounded.totalMs, 'tail accounting closes exactly');

    const checkpointFailure = ops.postOnSendAttribution(10, [1, null, 3, 1]);
    equal(checkpointFailure.confidence, 'UNRESOLVED', 'missing checkpoint degrades attribution');
    equal(checkpointFailure.checkpointFailure, true, 'missing checkpoint marked fail-closed');
    equal(checkpointFailure.namedMs, null, 'missing checkpoint never invents named ownership');

    const impossible = ops.postOnSendAttribution(2, [1, 2, 3, 1]);
    equal(impossible.confidence, 'UNRESOLVED', 'impossible timing closure fails closed');
    equal(impossible.checkpointFailure, true, 'impossible timing closure marked fail-closed');

    assert(latest.includes('postOnSendHistoryStabilizationMs'), 'history stabilization checkpoint missing');
    assert(latest.includes('postOnSendPromptAccountingMs'), 'prompt accounting checkpoint missing');
    assert(latest.includes('cacheCandidateMs'), 'cache candidate checkpoint missing');
    assert(latest.includes('Post-onSend attribution:'), 'tail attribution diagnostic line missing');
    assert(latest.includes("first-request ${requestBreakdown.sessionPath || 'n/a'}"), 'cold/warm path attribution missing');
    assert(latest.includes("confidence ${requestBreakdown.postOnSendAttributionConfidence || 'UNRESOLVED'}"), 'confidence attribution missing');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v07001-builder-executes-from-exact-v07000-source', status: 'PASS' },
        { id: 'v07001-runtime-identities-converged', status: 'PASS' },
        { id: 'v07001-latest-install-identical', status: 'PASS' },
        { id: 'v07001-frozen-semantic-modules-byte-preserved', status: 'PASS' },
        { id: 'v07001-request-order-and-side-effect-surfaces-frozen', status: 'PASS' },
        { id: 'v07001-checkpoint-failure-contained', status: 'PASS' },
        { id: 'v07001-bounded-tail-accounting-closes', status: 'PASS' },
        { id: 'v07001-impossible-attribution-fails-closed', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
