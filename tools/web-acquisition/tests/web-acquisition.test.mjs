import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { acquireRenderedPage } from '../lib/render.mjs';
import { TargetPolicyError, validateTarget } from '../lib/policy.mjs';

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await fn(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function assertPolicyCode(error, code) {
  return error instanceof TargetPolicyError && error.code === code;
}

const cliPath = fileURLToPath(new URL('../cli.mjs', import.meta.url));
test('target policy rejects unsafe schemes and credentials', async () => {
  await assert.rejects(() => validateTarget('file:///etc/passwd'),
    (error) => assertPolicyCode(error, 'TARGET_UNSAFE_SCHEME'));
  await assert.rejects(() => validateTarget('https://user:pass@example.com/'),
    (error) => assertPolicyCode(error, 'TARGET_CREDENTIALS_FORBIDDEN'));
});

test('target policy blocks private targets unless test mode is explicit', async () => {
  await assert.rejects(() => validateTarget('http://127.0.0.1/'),
    (error) => assertPolicyCode(error, 'TARGET_PRIVATE_NETWORK'));
  await assert.rejects(() => validateTarget('http://127.0.0.1/', { allowPrivate: true }),
    (error) => assertPolicyCode(error, 'TARGET_PRIVATE_NETWORK'));
  const allowed = await validateTarget('http://127.0.0.1/', { testMode: true, allowPrivate: true });
  assert.equal(allowed.hostname, '127.0.0.1');
});

test('CLI private-target switch is blocked without explicit test environment', () => {
  const run = spawnSync(process.execPath,
    [cliPath, '--test-allow-private', 'http://127.0.0.1/'],
    { encoding: 'utf8' });
  const result = JSON.parse(run.stdout.trim());
  assert.equal(run.status, 2);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.failureReason, 'TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV');
});
test('renders JavaScript content with provenance on an explicit local fixture', async () => {
  await withServer((request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end('<title>fixture</title><body>WAIT<script>' +
      "setTimeout(()=>document.body.textContent='JS_RENDERED_OK',50)" +
      '</script></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    const result = await acquireRenderedPage(url, {
      testMode: true, allowPrivate: true, renderWaitMs: 150,
    });
    assert.equal(result.status, 'OK');
    assert.equal(result.method, 'PLAYWRIGHT_RENDER');
    assert.equal(result.requestedUrl, url);
    assert.equal(result.finalUrl, url);
    assert.match(result.text, /JS_RENDERED_OK/);
    assert.equal(result.rendered, true);
  });
});

test('empty rendered content is not reported as successful evidence', async () => {
  await withServer((_request, response) => response.end('<html><body></body></html>'),
    async (port) => {
      const result = await acquireRenderedPage(`http://127.0.0.1:${port}/`,
        { testMode: true, allowPrivate: true, renderWaitMs: 20 });
      assert.equal(result.status, 'PARTIAL');
      assert.equal(result.failureReason, 'EMPTY_RENDERED_CONTENT');
    });
});
test('separate acquisitions do not reuse local storage state', async () => {
  await withServer((request, response) => {
    const shouldSet = new URL(request.url, 'http://fixture').searchParams.has('set');
    response.setHeader('content-type', 'text/html');
    response.end(`<body><script>
      ${shouldSet ? "localStorage.setItem('u26','SECRET');" : ''}
      document.body.textContent = localStorage.getItem('u26') || 'CLEAN';
    </script></body>`);
  }, async (port) => {
    const base = `http://127.0.0.1:${port}/state`;
    const first = await acquireRenderedPage(`${base}?set=1`, {
      testMode: true, allowPrivate: true, renderWaitMs: 30,
    });
    const second = await acquireRenderedPage(base, {
      testMode: true, allowPrivate: true, renderWaitMs: 30,
    });
    assert.match(first.text, /SECRET/);
    assert.match(second.text, /CLEAN/);
    assert.doesNotMatch(second.text, /SECRET/);
  });
});

test('browser launch failure remains explicit', async () => {
  const result = await acquireRenderedPage('http://127.0.0.1:9/', {
    testMode: true, allowPrivate: true,
    launchOptions: { executablePath: '/definitely/missing/chromium' },
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.failureReason, 'BROWSER_UNAVAILABLE');
});
test('redirect to a private destination is blocked before that target is reached', async () => {
  let privateReached = false;
  await withServer((request, response) => {
    if ((request.headers.host ?? '').startsWith('private.test')) privateReached = true;
    if (request.url === '/start') {
      response.writeHead(302, { location: `http://private.test:${response.socket.localPort}/private` });
      response.end();
    } else response.end('<body>SHOULD_NOT_REACH</body>');
  }, async (port) => {
    const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
    const result = await acquireRenderedPage(`http://public.test:${port}/start`, {
      lookup, testMode: true, testPrivateHosts: ['public.test'],
      timeoutMs: 5_000, renderWaitMs: 10,
    });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, 'TARGET_PRIVATE_NETWORK');
    assert.equal(privateReached, false);
  });
});

test('blocked credential URLs redact credential material from provenance', async () => {
  const result = await acquireRenderedPage('https://user:secret@example.com/');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.failureReason, 'TARGET_CREDENTIALS_FORBIDDEN');
  assert.equal(result.requestedUrl, 'https://example.com/');
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test('cloud metadata address is blocked by default', async () => {
  await assert.rejects(
    () => validateTarget('http://169.254.169.254/latest/meta-data/'),
    (error) => assertPolicyCode(error, 'TARGET_PRIVATE_NETWORK'),
  );
});

test('CLI accepts exactly one URL per operation', () => {
  const run = spawnSync(process.execPath,
    [cliPath, 'https://example.com/', 'https://example.org/'],
    { encoding: 'utf8' });
  const result = JSON.parse(run.stdout.trim());
  assert.equal(run.status, 2);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failureReason, 'CLI_REQUIRES_EXACTLY_ONE_URL');
});

test('private subresource attempt makes the whole acquisition fail closed', async () => {
  let privateReached = false;
  await withServer((request, response) => {
    if ((request.headers.host ?? '').startsWith('private.test')) privateReached = true;
    response.setHeader('content-type', 'text/html');
    response.end(`<body>PUBLIC_OK<img src="http://private.test:${response.socket.localPort}/pixel"></body>`);
  }, async (port) => {
    const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
    const result = await acquireRenderedPage(`http://public.test:${port}/`, {
      lookup, testMode: true, testPrivateHosts: ['public.test'], renderWaitMs: 100,
    });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, 'TARGET_PRIVATE_NETWORK');
    assert.equal(privateReached, false);
  });
});
