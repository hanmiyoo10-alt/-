import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import {
  ACTION_RUNS,
  BRANCH_MAIN,
  ISSUE_485,
  MCP_PROTOCOL_VERSION,
  createGitHubJson,
  createRepoCockpitServer,
  readJson,
  repoPushRuns,
  repoSnapshot
} from '../src/server.mjs';

const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

function capsule({
  state = true,
  stateValue = 'CLEAR',
  main = true,
  mainSha = SHA,
  nativeProtection = true,
  convergence = true,
  production = true,
  unknown = true,
  unknownValue = 'NONE'
} = {}) {
  const authority = [
    ...(production
      ? ['Production MATCH — release-simcore abc123']
      : []),
    ...(nativeProtection
      ? ['native protection `ACTIVE` / protected `true`']
      : [])
  ].join('; ') || 'NONE';
  const rows = [
    ...(state ? [`- STATE: \`${stateValue}\``] : []),
    ...(main ? [`- MAIN: \`${mainSha}\` / Required PASS — run 123`] : []),
    '- CHANGE: LOW — fixture',
    '- WHY: `NONE`',
    '- NEXT: `NONE`',
    `- AUTHORITY: ${authority}`,
    ...(unknown ? [`- UNKNOWN: ${unknownValue}`] : [])
  ];
  const compat = convergence
    ? [
        '<!-- canonical-main-summary-compat:v1',
        'Convergence: `STABLE`',
        '-->'
      ].join('\n')
    : '<!-- canonical-main-summary-compat:v1\n-->';

  return [
    '## Canonical Operator Capsule',
    ...rows,
    '',
    compat,
    '',
    '<details>',
    '<summary>Operational details</summary>',
    '',
    '- Production authority observation: STALE_FIXTURE — ignored',
    '- Protection state: `INACTIVE`',
    '- GitHub branch protected: `false`',
    '',
    '</details>'
  ].join('\n');
}

function branch(sha = SHA, protectedValue = true) {
  return protectedValue === null
    ? { commit: { sha } }
    : { commit: { sha }, protected: protectedValue };
}

function issue(options = {}) {
  return {
    state: 'open',
    body: capsule(options)
  };
}

function sequence(rows) {
  const calls = [];
  const reader = async (url) => {
    calls.push(url);
    if (!rows.length) throw new Error('unexpected read');
    return rows.shift();
  };
  return { reader, calls };
}

function okJson(value) {
  return {
    ok: true,
    status: 200,
    json: async () => value
  };
}

function pushRun({
  id = 1,
  sha = SHA,
  event = 'push',
  name = 'SimCore CI'
} = {}) {
  return {
    id,
    name,
    path: '.github/workflows/simcore-ci.yml',
    event,
    head_sha: sha,
    head_branch: 'main',
    status: 'completed',
    conclusion: 'success',
    run_number: id,
    run_attempt: 1,
    html_url: `https://github.com/hanmiyoo10-alt/-/actions/runs/${id}`
  };
}

function pushInventory(runs) {
  return {
    total_count: runs.length,
    workflow_runs: runs
  };
}

function pushRunsUrl(sha = SHA) {
  return `${ACTION_RUNS}?head_sha=${sha}&event=push&per_page=100`;
}

async function listeningServer(options = {}) {
  const server = createRepoCockpitServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    server,
    base: `http://127.0.0.1:${port}`
  };
}

async function postJson(base, value) {
  const response = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof value === 'string' ? value : JSON.stringify(value)
  });
  return { response, body: await response.json() };
}

test('missing read token performs zero GitHub network calls', async () => {
  let calls = 0;
  const githubJson = createGitHubJson({
    token: '',
    fetchImpl: async () => {
      calls += 1;
      throw new Error('must not run');
    }
  });
  const result = await repoSnapshot({ githubJson });
  assert.equal(calls, 0);
  assert.equal(result.authority, 'BLOCKED_CAPABILITY');
  assert.deepEqual(result.unknown, ['github-read-auth']);
  assert.equal(result.error, 'GITHUB_READ_AUTH_REQUIRED');
});

test('dedicated read token is used without leaking into generic failures', async () => {
  const secret = 'test-only-secret';
  let authorization = null;
  const githubJson = createGitHubJson({
    token: secret,
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization;
      return { ok: false, status: 500 };
    }
  });
  const result = await repoSnapshot({ githubJson });
  assert.equal(authorization, `Bearer ${secret}`);
  assert.equal(result.authority, 'UNKNOWN');
  assert.equal(result.error, 'GITHUB_HTTP_500');
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test('rejected read credentials fail as BLOCKED_CAPABILITY', async () => {
  for (const status of [401, 403]) {
    const githubJson = createGitHubJson({
      token: 'test-only-secret',
      fetchImpl: async () => ({ ok: false, status })
    });
    const result = await repoSnapshot({ githubJson });
    assert.equal(result.authority, 'BLOCKED_CAPABILITY', status);
    assert.deepEqual(result.unknown, ['github-read-auth'], status);
    assert.equal(result.error, `GITHUB_HTTP_${status}`, status);
  }
});

test('stable capture parses the canonical #485 capsule and returns PASS', async () => {
  const { reader, calls } = sequence([
    branch(),
    issue(),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.deepEqual(calls, [BRANCH_MAIN, ISSUE_485, BRANCH_MAIN]);
  assert.equal(result.authority, 'PASS');
  assert.equal(result.main, SHA);
  assert.equal(result.production.state, 'MATCH');
  assert.deepEqual(result.protection.projected, {
    state: 'ACTIVE',
    protected: true
  });
  assert.deepEqual(result.unknown, []);
  assert.equal(result.sourceAgreement.directMainStable, true);
  assert.equal(result.sourceAgreement.mainShaAgrees, true);
});

test('only the bounded canonical capsule is parsed', async () => {
  const prefixed = issue();
  prefixed.body = [
    '- STATE: `INCIDENT`',
    `- MAIN: \`${SHA2}\` / Required FAIL — run 999`,
    '- AUTHORITY: Production BROKEN — stale; native protection `INACTIVE` / protected `false`',
    '- UNKNOWN: STALE',
    '',
    prefixed.body
  ].join('\n');

  const first = sequence([branch(), prefixed, branch()]);
  const firstResult = await repoSnapshot({ githubJson: first.reader });
  assert.equal(firstResult.authority, 'PASS');
  assert.equal(firstResult.health, 'CLEAR');
  assert.equal(firstResult.main, SHA);

  const missing = issue();
  missing.body = missing.body.replace('## Canonical Operator Capsule\n', '');
  const second = sequence([branch(), missing, branch()]);
  const secondResult = await repoSnapshot({ githubJson: second.reader });
  assert.equal(secondResult.authority, 'UNKNOWN');
  assert.ok(secondResult.unknown.includes('issue-485-state'));

  const duplicated = issue();
  duplicated.body += '\n\n## Canonical Operator Capsule\n- STATE: `CLEAR`';
  const third = sequence([branch(), duplicated, branch()]);
  const thirdResult = await repoSnapshot({ githubJson: third.reader });
  assert.equal(thirdResult.authority, 'UNKNOWN');
  assert.ok(thirdResult.unknown.includes('issue-485-state'));
});

test('canonical SETTLING convergence forms remain parseable', async () => {
  for (const line of [
    'Convergence: `SETTLING` — waiting for requiredCi (30s)',
    'Convergence: `SETTLING` / `STALE` — waiting for requiredCi, protection (31s)'
  ]) {
    const settling = issue();
    settling.body = settling.body.replace('Convergence: `STABLE`', line);
    const { reader } = sequence([branch(), settling, branch()]);
    const result = await repoSnapshot({ githubJson: reader });
    assert.equal(result.convergence, 'SETTLING', line);
    assert.equal(result.unknown.includes('convergence'), false, line);
  }
});

test('main movement during capture is UNKNOWN', async () => {
  const { reader } = sequence([
    branch(SHA),
    issue(),
    branch(SHA2)
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.equal(result.main, null);
  assert.ok(result.unknown.includes('main-changed-during-capture'));
});

test('incomplete capsule remains UNKNOWN even when rendered main is stale', async () => {
  const { reader } = sequence([
    branch(SHA2),
    issue({ mainSha: SHA, production: false }),
    branch(SHA2)
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('production-projection'));
  assert.equal(result.sourceAgreement.mainShaAgrees, false);
});

test('incomplete capsule remains UNKNOWN when protection also conflicts', async () => {
  const { reader } = sequence([
    branch(SHA, false),
    issue({ production: false }),
    branch(SHA, false)
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('production-projection'));
  assert.equal(result.protection.protected, false);
  assert.equal(result.protection.projected.protected, true);
});

test('closed operator issue is UNKNOWN', async () => {
  const closed = issue();
  closed.state = 'closed';
  const { reader } = sequence([branch(), closed, branch()]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('issue-485-invalid-state'));
});

test('pull-request-shaped operator issue is UNKNOWN', async () => {
  const prIssue = { ...issue(), pull_request: { url: 'fixture' } };
  const { reader } = sequence([branch(), prIssue, branch()]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('issue-485-invalid-state'));
});

test('missing operator STATE is UNKNOWN', async () => {
  const { reader } = sequence([
    branch(),
    issue({ state: false }),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('issue-485-state'));
});

test('invalid operator STATE is UNKNOWN', async () => {
  const { reader } = sequence([
    branch(),
    issue({ stateValue: 'BROKEN' }),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('issue-485-state'));
});

test('missing native-protection projection is UNKNOWN', async () => {
  const { reader } = sequence([
    branch(),
    issue({ nativeProtection: false }),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('native-protection-projection'));
});

test('remaining capsule and direct-protection completeness gaps fail closed', async () => {
  const cases = [
    {
      label: 'main-required',
      issueOptions: { main: false },
      secondBranch: branch(),
      expected: 'issue-485-main-sha'
    },
    {
      label: 'convergence',
      issueOptions: { convergence: false },
      secondBranch: branch(),
      expected: 'convergence'
    },
    {
      label: 'production',
      issueOptions: { production: false },
      secondBranch: branch(),
      expected: 'production-projection'
    },
    {
      label: 'unknown-field',
      issueOptions: { unknown: false },
      secondBranch: branch(),
      expected: 'issue-485-unknown-field'
    },
    {
      label: 'direct-protection',
      issueOptions: {},
      secondBranch: branch(SHA, null),
      expected: 'direct-protection'
    }
  ];

  for (const row of cases) {
    const { reader } = sequence([
      branch(),
      issue(row.issueOptions),
      row.secondBranch
    ]);
    const result = await repoSnapshot({ githubJson: reader });
    assert.equal(result.authority, 'UNKNOWN', row.label);
    assert.ok(result.unknown.includes(row.expected), row.label);
  }
});

test('non-NONE operator unknown evidence prevents PASS', async () => {
  const { reader } = sequence([
    branch(),
    issue({ unknownValue: 'PENDING' }),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.equal(result.authority, 'UNKNOWN');
  assert.ok(result.unknown.includes('PENDING'));
});

test('push-run explicit SHA skips main and returns bounded PASS inventory', async () => {
  const runs = [pushRun({ id: 11 }), pushRun({ id: 12, name: 'Proof Bundle' })];
  const { reader, calls } = sequence([pushInventory(runs)]);
  const result = await repoPushRuns({ githubJson: reader, sha: SHA.toUpperCase() });

  assert.deepEqual(calls, [pushRunsUrl()]);
  assert.equal(result.authority, 'PASS');
  assert.equal(result.sha, SHA);
  assert.equal(result.event, 'push');
  assert.equal(result.inventoryComplete, true);
  assert.equal(result.totalCount, 2);
  assert.equal(result.count, 2);
  assert.deepEqual(result.unknown, []);
  assert.deepEqual(result.runs.map((run) => run.id), [11, 12]);
  assert.deepEqual(result.runs.map((run) => run.event), ['push', 'push']);
  assert.ok(result.runs.every((run) => run.headSha === SHA));
  assert.equal(result.runs[0].workflowName, 'SimCore CI');
  assert.equal(result.runs[0].workflowPath, '.github/workflows/simcore-ci.yml');
  assert.equal(result.runs[0].url, 'https://github.com/hanmiyoo10-alt/-/actions/runs/11');
});

test('push-run omitted SHA resolves current main once before exact inventory', async () => {
  const { reader, calls } = sequence([
    branch(SHA),
    pushInventory([pushRun({ id: 21 })])
  ]);
  const result = await repoPushRuns({ githubJson: reader });

  assert.deepEqual(calls, [BRANCH_MAIN, pushRunsUrl()]);
  assert.equal(result.authority, 'PASS');
  assert.equal(result.sha, SHA);
  assert.equal(result.count, 1);
  assert.deepEqual(result.sources, [BRANCH_MAIN, pushRunsUrl()]);
});

test('push-run complete zero inventory is known zero', async () => {
  const { reader } = sequence([pushInventory([])]);
  const result = await repoPushRuns({ githubJson: reader, sha: SHA });

  assert.equal(result.authority, 'PASS');
  assert.equal(result.inventoryComplete, true);
  assert.equal(result.totalCount, 0);
  assert.equal(result.count, 0);
  assert.deepEqual(result.runs, []);
  assert.deepEqual(result.unknown, []);
});

test('push-run invalid input and malformed inventory fail closed', async () => {
  let calls = 0;
  const invalid = await repoPushRuns({
    sha: 'not-a-sha',
    githubJson: async () => {
      calls += 1;
      return {};
    }
  });
  assert.equal(calls, 0);
  assert.equal(invalid.authority, 'UNKNOWN');
  assert.equal(invalid.error, 'SHA_INVALID');

  const cases = [
    {
      label: 'incomplete',
      payload: { total_count: 2, workflow_runs: [pushRun()] },
      error: 'RUN_INVENTORY_INCOMPLETE'
    },
    {
      label: 'sha-mismatch',
      payload: pushInventory([pushRun({ sha: SHA2 })]),
      error: 'RUN_INVENTORY_SHA_MISMATCH'
    },
    {
      label: 'event-mismatch',
      payload: pushInventory([pushRun({ event: 'pull_request' })]),
      error: 'RUN_INVENTORY_EVENT_MISMATCH'
    },
    {
      label: 'malformed-run',
      payload: pushInventory([{ ...pushRun(), html_url: 'https://evil.example/run/1' }]),
      error: 'RUN_INVENTORY_MALFORMED'
    },
    {
      label: 'bound',
      payload: { total_count: 101, workflow_runs: [] },
      error: 'RUN_INVENTORY_BOUND_EXCEEDED'
    }
  ];

  for (const row of cases) {
    const { reader } = sequence([row.payload]);
    const result = await repoPushRuns({ githubJson: reader, sha: SHA });
    assert.equal(result.authority, 'UNKNOWN', row.label);
    assert.equal(result.inventoryComplete, false, row.label);
    assert.equal(result.error, row.error, row.label);
  }
});

test('push-run auth denial is BLOCKED_CAPABILITY and server errors stay UNKNOWN', async () => {
  for (const [status, expected] of [
    [403, 'BLOCKED_CAPABILITY'],
    [500, 'UNKNOWN']
  ]) {
    const githubJson = createGitHubJson({
      token: 'test-only-secret',
      fetchImpl: async () => ({ ok: false, status })
    });
    const result = await repoPushRuns({ githubJson, sha: SHA });
    assert.equal(result.authority, expected, status);
    assert.equal(result.error, `GITHUB_HTTP_${status}`, status);
    assert.doesNotMatch(JSON.stringify(result), /test-only-secret/);
  }
});

test('readJson preserves multibyte UTF-8 split across chunks', async () => {
  const raw = Buffer.from(JSON.stringify({
    jsonrpc: '2.0',
    id: 'é',
    method: 'ping'
  }));
  const marker = Buffer.from('é');
  const start = raw.indexOf(marker);
  assert.ok(start >= 0);
  const fakeRequest = {
    async *[Symbol.asyncIterator]() {
      yield raw.subarray(0, start + 1);
      yield raw.subarray(start + 1);
    }
  };
  const parsed = await readJson(fakeRequest);
  assert.equal(parsed.id, 'é');
});

test('health endpoint works without GitHub token or fetch', async (t) => {
  let fetchCalls = 0;
  const { server, base } = await listeningServer({
    token: '',
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('must not run');
    }
  });
  t.after(() => server.close());

  const response = await fetch(`${base}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'hanmiyoo-repo-cockpit-aggregator',
    version: '0.3.4'
  });
  assert.equal(fetchCalls, 0);
});

test('snapshot without token fails closed before network', async (t) => {
  let fetchCalls = 0;
  const { server, base } = await listeningServer({
    token: '',
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('must not run');
    }
  });
  t.after(() => server.close());

  const response = await fetch(`${base}/snapshot`);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.authority, 'BLOCKED_CAPABILITY');
  assert.equal(body.error, 'GITHUB_READ_AUTH_REQUIRED');
  assert.equal(fetchCalls, 0);
});

test('snapshot rate limit is shared by HTTP and MCP before extra GitHub reads', async (t) => {
  let fetchCalls = 0;
  const fetchImpl = async (url) => {
    fetchCalls += 1;
    return okJson(url === ISSUE_485 ? issue() : branch());
  };
  const { server, base } = await listeningServer({
    token: 'test-only-token',
    fetchImpl,
    snapshotMaxPerWindow: 1,
    snapshotWindowMs: 60_000,
    now: () => 0
  });
  t.after(() => server.close());

  const first = await fetch(`${base}/snapshot`);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).authority, 'PASS');
  assert.equal(fetchCalls, 3);

  const second = await fetch(`${base}/snapshot`);
  const secondBody = await second.json();
  assert.equal(second.status, 429);
  assert.equal(secondBody.authority, 'BLOCKED_CAPABILITY');
  assert.equal(secondBody.error, 'GITHUB_READ_RATE_LIMITED');
  assert.equal(fetchCalls, 3);

  const tool = await postJson(base, {
    jsonrpc: '2.0',
    id: 44,
    method: 'tools/call',
    params: { name: 'repo_snapshot', arguments: {} }
  });
  assert.equal(tool.response.status, 200);
  assert.equal(tool.body.result.isError, true);
  assert.equal(
    tool.body.result.structuredContent.error,
    'GITHUB_READ_RATE_LIMITED'
  );
  assert.equal(fetchCalls, 3);
});

test('untrusted MCP Origin is rejected before request dispatch', async (t) => {
  let fetchCalls = 0;
  const { server, base } = await listeningServer({
    token: 'test-only-token',
    fetchImpl: async (url) => {
      fetchCalls += 1;
      return okJson(url === ISSUE_485 ? issue() : branch());
    }
  });
  t.after(() => server.close());

  const blocked = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
      origin: 'https://evil.example'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 70,
      method: 'tools/call',
      params: { name: 'repo_snapshot', arguments: {} }
    })
  });
  assert.equal(blocked.status, 403);
  assert.deepEqual(await blocked.json(), { error: 'origin_not_allowed' });
  assert.equal(fetchCalls, 0);

  const trusted = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: new URL(base).origin
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 71,
      method: 'tools/list'
    })
  });
  assert.equal(trusted.status, 200);
  assert.equal((await trusted.json()).result.tools.length, 2);
  assert.equal(fetchCalls, 0);
});

test('tool arguments must match the advertised empty-object schema before reads', async (t) => {
  let fetchCalls = 0;
  const { server, base } = await listeningServer({
    token: 'test-only-token',
    fetchImpl: async (url) => {
      fetchCalls += 1;
      return okJson(url === ISSUE_485 ? issue() : branch());
    }
  });
  t.after(() => server.close());

  for (const argumentsValue of [null, [], 'bad', { extra: true }]) {
    const { response, body } = await postJson(base, {
      jsonrpc: '2.0',
      id: 72,
      method: 'tools/call',
      params: { name: 'repo_snapshot', arguments: argumentsValue }
    });
    assert.equal(response.status, 200);
    assert.equal(body.error.code, -32602);
    assert.equal(body.error.message, 'invalid_tool_arguments');
    assert.equal(fetchCalls, 0);
  }

  const valid = await postJson(base, {
    jsonrpc: '2.0',
    id: 73,
    method: 'tools/call',
    params: { name: 'repo_snapshot', arguments: {} }
  });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.body.result.structuredContent.authority, 'PASS');
  assert.equal(fetchCalls, 3);
});

test('push-run MCP validates arguments, routes reads, and rate-limits independently', async (t) => {
  let fetchCalls = 0;
  const fetchImpl = async (url) => {
    fetchCalls += 1;
    if (url === BRANCH_MAIN) return okJson(branch(SHA));
    if (url === ISSUE_485) return okJson(issue());
    if (url === pushRunsUrl()) return okJson(pushInventory([pushRun({ id: 31 })]));
    throw new Error(`unexpected url: ${url}`);
  };
  const { server, base } = await listeningServer({
    token: 'test-only-token',
    fetchImpl,
    snapshotMaxPerWindow: 1,
    pushRunMaxPerWindow: 1,
    snapshotWindowMs: 60_000,
    pushRunWindowMs: 60_000,
    now: () => 0
  });
  t.after(() => server.close());

  for (const argumentsValue of [
    null,
    [],
    'bad',
    { extra: true },
    { sha: 'bad' }
  ]) {
    const invalid = await postJson(base, {
      jsonrpc: '2.0',
      id: 76,
      method: 'tools/call',
      params: { name: 'repo_push_runs', arguments: argumentsValue }
    });
    assert.equal(invalid.response.status, 200);
    assert.equal(invalid.body.error.code, -32602);
    assert.equal(invalid.body.error.message, 'invalid_tool_arguments');
    assert.equal(fetchCalls, 0);
  }

  const first = await postJson(base, {
    jsonrpc: '2.0',
    id: 77,
    method: 'tools/call',
    params: { name: 'repo_push_runs', arguments: {} }
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.result.isError, false);
  assert.equal(first.body.result.structuredContent.authority, 'PASS');
  assert.equal(first.body.result.structuredContent.count, 1);
  assert.equal(fetchCalls, 2);

  const second = await postJson(base, {
    jsonrpc: '2.0',
    id: 78,
    method: 'tools/call',
    params: { name: 'repo_push_runs', arguments: { sha: SHA } }
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.result.isError, true);
  assert.equal(
    second.body.result.structuredContent.error,
    'GITHUB_PUSH_RUN_READ_RATE_LIMITED'
  );
  assert.equal(fetchCalls, 2);

  const snapshot = await fetch(`${base}/snapshot`);
  assert.equal(snapshot.status, 200);
  assert.equal((await snapshot.json()).authority, 'PASS');
  assert.equal(fetchCalls, 5);
});

test('unsupported MCP protocol header is rejected before snapshot reads', async (t) => {
  let fetchCalls = 0;
  const { server, base } = await listeningServer({
    token: 'test-only-token',
    fetchImpl: async (url) => {
      fetchCalls += 1;
      return okJson(url === ISSUE_485 ? issue() : branch());
    }
  });
  t.after(() => server.close());

  const blocked = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'mcp-protocol-version': '2099-01-01'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 74,
      method: 'tools/call',
      params: { name: 'repo_snapshot', arguments: {} }
    })
  });
  const blockedBody = await blocked.json();
  assert.equal(blocked.status, 400);
  assert.equal(blockedBody.error.code, -32600);
  assert.equal(fetchCalls, 0);

  const allowed = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'mcp-protocol-version': MCP_PROTOCOL_VERSION
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 75,
      method: 'tools/list'
    })
  });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).result.tools.length, 2);
  assert.equal(fetchCalls, 0);
});

test('public MCP tool surface exposes exactly two fixed read-only tools', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const { response, body } = await postJson(base, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    body.result.tools.map((tool) => tool.name),
    ['repo_snapshot', 'repo_push_runs']
  );

  const snapshot = body.result.tools[0];
  assert.deepEqual(snapshot.inputSchema, {
    type: 'object',
    properties: {},
    additionalProperties: false
  });

  const pushRuns = body.result.tools[1];
  assert.equal(pushRuns.inputSchema.type, 'object');
  assert.equal(pushRuns.inputSchema.additionalProperties, false);
  assert.equal(pushRuns.inputSchema.properties.sha.type, 'string');
  assert.equal(pushRuns.inputSchema.properties.sha.pattern, '^[0-9a-fA-F]{40}$');

  for (const tool of body.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
  }
});

test('initialize counter-offers only the supported handshake version', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const { response, body } = await postJson(base, {
    jsonrpc: '2.0',
    id: 2,
    method: 'initialize',
    params: {
      protocolVersion: '2099-01-01',
      capabilities: {},
      clientInfo: { name: 'fixture-client', version: '1.0.0' }
    }
  });
  assert.equal(response.status, 200);
  assert.equal(body.result.protocolVersion, MCP_PROTOCOL_VERSION);
});

test('initialize rejects incomplete required params', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const cases = [
    {},
    { protocolVersion: MCP_PROTOCOL_VERSION },
    { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {} },
    {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {}
    },
    {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: [],
      clientInfo: { name: 'fixture-client', version: '1.0.0' }
    }
  ];

  for (const params of cases) {
    const { response, body } = await postJson(base, {
      jsonrpc: '2.0',
      id: 3,
      method: 'initialize',
      params
    });
    assert.equal(response.status, 200);
    assert.equal(body.error.code, -32602);
  }
});

test('all JSON-RPC notifications receive no response body', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  for (const method of ['notifications/initialized', 'notifications/cancelled']) {
    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: {}
      })
    });
    assert.equal(response.status, 202, method);
    assert.equal(await response.text(), '', method);
  }
});

test('malformed JSON-RPC request objects return -32600 before dispatch', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const cases = [
    { id: 80, method: 'ping' },
    { jsonrpc: '1.0', id: 81, method: 'ping' },
    { jsonrpc: '2.0', id: true, method: 'ping' },
    { jsonrpc: '2.0', id: { bad: true }, method: 'ping' },
    { jsonrpc: '2.0', id: 82, method: 42 },
    { jsonrpc: '2.0', id: 83, method: 'ping', params: null },
    { jsonrpc: '2.0', method: 'notifications/cancelled', params: null }
  ];

  for (const value of cases) {
    const { response, body } = await postJson(base, value);
    assert.equal(response.status, 400);
    assert.equal(body.error.code, -32600);
  }
});

test('JSON null scalar and array requests return -32600 and server remains alive', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  for (const raw of ['null', '1', 'true', '"text"', '[]']) {
    const { response, body } = await postJson(base, raw);
    assert.equal(response.status, 400, raw);
    assert.equal(body.error.code, -32600, raw);
  }

  const { response, body } = await postJson(base, {
    jsonrpc: '2.0',
    id: 9,
    method: 'ping'
  });
  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    jsonrpc: '2.0',
    id: 9,
    result: {}
  });
});

test('malformed JSON returns parse error and server remains alive', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const { response, body } = await postJson(base, '{');
  assert.equal(response.status, 400);
  assert.equal(body.error.code, -32700);

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
});
