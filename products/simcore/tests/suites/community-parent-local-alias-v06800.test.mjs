import { equal, assert } from '../../tooling/assertions.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.68.0') {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v06800-target-not-active-on-predecessor', status: 'PASS' }],
    };
  }

  const community = ctx.loader.load('community');
  const kernel = ctx.loader.load('kernel');
  const sessionModule = ctx.loader.load('session');
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  equal(community.COMMUNITY_CLASSIFIER_VERSION, 3, 'v0.68 classifier version');
  equal(community.ALIAS_BACKFILL_ASSISTANT_LIMIT, 12, 'assistant migration bound');
  equal(community.ALIAS_BACKFILL_MESSAGE_LIMIT, 48, 'message migration bound');
  pass('classifier-v3-bounds-preserved');

  const target = community.platformInfo('맘스홀릭 / 예비맘·육아 수다방');
  equal(target.key, '맘카페', 'target canonical key');
  equal(target.group, '학부모/지역', 'target group');
  equal(target.source, 'alias-parent-local', 'target source');
  pass('descriptor-parent-community-positive');

  for (const [header, id] of [
    ['맘스터치 / 자유게시판', 'momstouch-negative'],
    ['게임홀릭 / 수다방', 'gameholic-negative'],
  ]) {
    const info = community.platformInfo(header);
    equal(info.group, null, `${id} group`);
    equal(info.source, 'unknown', `${id} source`);
    pass(id);
  }

  const existing = community.platformInfo('분당맘 카페');
  equal(existing.key, '맘카페', 'existing first-segment alias key');
  equal(existing.group, '학부모/지역', 'existing first-segment alias group');
  equal(existing.source, 'alias-parent-local', 'existing first-segment alias source');
  pass('existing-first-segment-positive-preserved');

  const exact = community.platformInfo('맘카페 / 자유게시판');
  equal(exact.key, '맘카페', 'exact family key');
  equal(exact.group, '학부모/지역', 'exact family group');
  equal(exact.source, 'exact', 'exact family precedence');
  pass('exact-family-precedence-preserved');

  const three = [
    community.platformInfo('더쿠 / 스퀘어'),
    community.platformInfo('맘스홀릭 / 예비맘·육아 수다방'),
    community.platformInfo('에펨코리아 / 포텐터진 게시판'),
  ];
  equal(new Set(three.map((row) => row.group).filter(Boolean)).size, 3, 'three-platform distinct recognized groups');
  assert(three.every((row) => row.group), `three-platform fixture contains unknown group: ${JSON.stringify(three)}`);
  pass('structure-input-three-distinct-groups');

  const state = kernel.initialState();
  state.community.classifierVersion = 2;
  state.community.platformMax = {};
  const session = new sessionModule.CoreRulesetSession({});
  session.current = state;
  const messages = [{
    role: 'assistant',
    data: '<COMMUNITY>\n[맘스홀릭 / 예비맘·육아 수다방]\n- 익명: 테스트 [RT 120]\n</COMMUNITY>',
  }];
  const migrated = session.migrateCommunityClassifierIfNeeded(messages, 0);
  equal(migrated.skipped, false, 'v2 to v3 migration must execute');
  equal(migrated.version, 3, 'migration target version');
  equal(session.current.community.classifierVersion, 3, 'state classifier version');
  equal(session.current.community.platformMax['맘카페'], 120, 'target alias reaction max backfill');
  assert((migrated.aliasSections || 0) >= 1, 'target alias migration section not observed');
  assert((migrated.assistantScanned || 0) <= 12, 'assistant scan cap exceeded');
  assert((migrated.messagesVisited || 0) <= 48, 'message scan cap exceeded');
  pass('bounded-v2-to-v3-target-backfill');

  const second = session.migrateCommunityClassifierIfNeeded(messages, 0);
  equal(second.skipped, true, 'second migration must skip idempotently');
  equal(second.version, 3, 'second migration version');
  equal(session.current.community.platformMax['맘카페'], 120, 'idempotent max retained');
  pass('migration-idempotent-second-call');

  assert(!ctx.source.includes(' (already v2)'), 'stale v2 migration diagnostic must be absent');
  assert(ctx.source.includes(' (already v3)'), 'v3 migration diagnostic missing');
  pass('migration-diagnostic-version-converged');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
