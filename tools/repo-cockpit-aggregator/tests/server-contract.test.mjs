import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import {
  BRANCH_MAIN,
  ISSUE_485,
  createGitHubJson,
  createRepoCockpitServer,
  repoSnapshot
} from '../src/server.mjs';

const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

function capsule({
  state = true,
  stateValue = 'CLEAR',
  main = true,
  nativeProtection = true,
  convergence = true,
  production = true,
  unknown = true,
  unknownValue = 'NONE'
} = {}) {
  return [
    ...(state ? [`- STATE: \`${stateValue}\``] : []),
    ...(main ? [`- MAIN: \`${SHA}\` / Required PASS — run 123`] : []),
    ...(unknown ? [`- UNKNOWN: ${unknownValue}`] : []),
    ...(convergence ? ['Convergence: `STABLE`'] : []),
    ...(production
      ? ['Production authority: MATCH — release-simcore abc123']
      : []),
    ...(nativeProtection
      ? ['Native protection: `ACTIVE` / protected `true`']
      : [])
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

test('dedicated read token is used without leaking into failures', async () => {
  const secret = 'test-only-secret';
  let authorization = null;
  const githubJson = createGitHubJson({
    token: secret,
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization;
      return { ok: false, status: 403 };
    }
  });
  const result = await repoSnapshot({ githubJson });
  assert.equal(authorization, `Bearer ${secret}`);
  assert.equal(result.authority, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});

test('stable capture reads main then issue then main and returns PASS', async () => {
  const { reader, calls } = sequence([
    branch(),
    issue(),
    branch()
  ]);
  const result = await repoSnapshot({ githubJson: reader });
  assert.deepEqual(calls, [BRANCH_MAIN, ISSUE_485, BRANCH_MAIN]);
  assert.equal(result.authority, 'PASS');
  assert.equal(result.main, SHA);
  assert.deepEqual(result.unknown, []);
  assert.equal(result.sourceAgreement.directMainStable, true);
  assert.equal(result.sourceAgreement.mainShaAgrees, true);
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
    version: '0.3.3'
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

test('public MCP tool surface remains one fixed read-only tool', async (t) => {
  const { server, base } = await listeningServer({ token: '' });
  t.after(() => server.close());

  const { response, body } = await postJson(base, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  });
  assert.equal(response.status, 200);
  assert.equal(body.result.tools.length, 1);
  const tool = body.result.tools[0];
  assert.equal(tool.name, 'repo_snapshot');
  assert.deepEqual(tool.inputSchema, {
    type: 'object',
    properties: {},
    additionalProperties: false
  });
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.destructiveHint, false);
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
