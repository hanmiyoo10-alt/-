import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.1') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v06902-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-06902-mamsholic-exact-brand-alias.py');
  assert(fs.existsSync(builder), 'v0.69.2 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06902-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.69.2 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('06902_BUILD_PASS'), `v0.69.2 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.69.2 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.69.2', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.69.2', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.69.2', 'Host identity');

    const loader = new BundleLoader(latest);
    const community = loader.load('community');
    equal(community.COMMUNITY_CLASSIFIER_VERSION, 3, 'classifier version frozen');
    equal(community.ALIAS_BACKFILL_ASSISTANT_LIMIT, 12, 'assistant migration bound frozen');
    equal(community.ALIAS_BACKFILL_MESSAGE_LIMIT, 48, 'message migration bound frozen');

    for (const header of ['맘스홀릭', '맘스홀릭 / 자유게시판', '맘스홀릭 / 육아 이야기']) {
      const info = community.platformInfo(header);
      equal(info.key, '맘카페', `${header} canonical key`);
      equal(info.group, '학부모/지역', `${header} group`);
      equal(info.source, 'alias-parent-local', `${header} source`);
    }

    const descriptor = community.platformInfo('맘스홀릭 / 예비맘·육아 수다방');
    equal(descriptor.key, '맘카페', 'descriptor target canonical key preserved');
    equal(descriptor.group, '학부모/지역', 'descriptor target group preserved');

    for (const [header, key] of [['맘카페 / 자유게시판', '맘카페'], ['네이버 카페 / 자유게시판', '네이버 카페']]) {
      const info = community.platformInfo(header);
      equal(info.key, key, `${header} exact key`);
      equal(info.group, '학부모/지역', `${header} exact group`);
      equal(info.source, 'exact', `${header} exact precedence`);
    }

    for (const header of ['맘스터치 / 자유게시판', '게임홀릭 / 수다방', '맘스홀릭몰 / 자유게시판']) {
      const info = community.platformInfo(header);
      equal(info.group, null, `${header} false-positive group`);
      equal(info.source, 'unknown', `${header} false-positive source`);
    }

    const three = [
      community.platformInfo('더쿠 / 스퀘어'),
      community.platformInfo('맘스홀릭 / 자유게시판'),
      community.platformInfo('에펨코리아 / 포텐터진 게시판'),
    ];
    equal(new Set(three.map((row) => row.group).filter(Boolean)).size, 3, 'target contributes third distinct group');
    assert(three.every((row) => row.group), `target integration contains unknown group: ${JSON.stringify(three)}`);

    equal((latest.match(/const COMMUNITY_CLASSIFIER_VERSION = 3;/g) || []).length, (ctx.source.match(/const COMMUNITY_CLASSIFIER_VERSION = 3;/g) || []).length, 'classifier identity count changed');
    equal((latest.match(/const PROMPT_COMPILER_VERSION = 3;/g) || []).length, (ctx.source.match(/const PROMPT_COMPILER_VERSION = 3;/g) || []).length, 'Prompt compiler changed');
    equal((latest.match(/const STATE_VERSION = 5;/g) || []).length, (ctx.source.match(/const STATE_VERSION = 5;/g) || []).length, 'STATE_VERSION changed');
    equal((latest.match(/const CORE_STATE_VERSION = 10;/g) || []).length, (ctx.source.match(/const CORE_STATE_VERSION = 10;/g) || []).length, 'CORE_STATE_VERSION changed');
    assert(latest.includes('SimCore.define("state-reconcile"'), 'M2-6 State Reconcile owner missing');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v06902-builder-executes-from-exact-v06901-source', status: 'PASS' },
        { id: 'v06902-runtime-identities-converged', status: 'PASS' },
        { id: 'v06902-latest-install-identical', status: 'PASS' },
        { id: 'v06902-mamsholic-canonical-alias-positive', status: 'PASS' },
        { id: 'v06902-existing-exact-family-precedence-preserved', status: 'PASS' },
        { id: 'v06902-false-positive-controls-preserved', status: 'PASS' },
        { id: 'v06902-three-group-integration-restored', status: 'PASS' },
        { id: 'v06902-classifier-migration-and-m2-frozen', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
