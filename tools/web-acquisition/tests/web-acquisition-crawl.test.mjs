import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { crawlRenderedSite } from '../lib/crawl.mjs';

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

const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
const crawlCliPath = fileURLToPath(new URL('../crawl-cli.mjs', import.meta.url));

function url(port, path = '/') {
  return `http://public.test:${port}${path}`;
}

function options(extra = {}) {
  return {
    lookup,
    testMode: true,
    testPrivateHosts: ['public.test'],
    renderWaitMs: 100,
    timeoutMs: 5_000,
    ...extra,
  };
}

function runCli(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [crawlCliPath, ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}
test('rendered same-origin graph is deduped and robots is guarded once', async () => {
  let robotsRequests = 0;
  let blockedReached = false;
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') {
      robotsRequests += 1;
      response.end('User-agent: *\nDisallow: /blocked\n');
      return;
    }
    response.setHeader('content-type', 'text/html');
    if (path === '/') {
      response.end(`<body>ROOT<div id="links"></div><script>
        setTimeout(() => links.innerHTML =
          '<a href="/a#one">A1</a><a href="/a#two">A2</a>' +
          '<a href="/blocked">BLOCKED</a>' +
          '<a href="http://other.test:${response.socket.localPort}/outside">OUT</a>', 20);
      </script></body>`);
    } else if (path === '/a') response.end('<body>A<a href="/b">B</a></body>');
    else if (path === '/b') response.end('<body>B</body>');
    else if (path === '/blocked') { blockedReached = true; response.end('<body>NO</body>'); }
    else response.end('<body>OTHER</body>');
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 2 }));
    assert.equal(result.status, 'OK');
    assert.equal(result.visitedCount, 3);
    assert.deepEqual(result.pages.map((page) => page.depth), [0, 1, 2]);
    assert.deepEqual(result.pages.map((page) => new URL(page.requestedUrl).pathname), ['/', '/a', '/b']);
    assert(result.skipped.some((item) => item.reason === 'DUPLICATE'));
    assert(result.skipped.some((item) => item.reason === 'ROBOTS_DISALLOWED'));
    assert(result.skipped.some((item) => item.reason === 'CROSS_ORIGIN'));
    assert.equal(robotsRequests, 1);
    assert.equal(blockedReached, false);
  });
});
test('depth exhaustion is explicit PARTIAL evidence', async () => {
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    response.end(path === '/' ? '<body>ROOT<a href="/a">A</a></body>' : '<body>A</body>');
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 0 }));
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.visitedCount, 1);
    assert.equal(result.truncated, true);
    assert(result.skipped.some((item) => item.reason === 'DEPTH_LIMIT'));
    assert(result.warnings.includes('DEPTH_LIMIT_REACHED'));
    assert.equal(result.failureReason, 'CRAWL_LIMIT_REACHED');
  });
});

test('page cap is finite and reports the skipped eligible page', async () => {
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    if (path === '/') return response.end('<body>ROOT<a href="/a">A</a><a href="/b">B</a></body>');
    response.end(`<body>${path}</body>`);
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 1, maxPages: 2 }));
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.visitedCount, 2);
    assert.equal(result.truncated, true);
    assert(result.skipped.some((item) => item.reason === 'PAGE_LIMIT'));
    assert(result.warnings.includes('PAGE_LIMIT_REACHED'));
  });
});
test('aggregate text budget truncation cannot look complete', async () => {
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    response.end(`<body>${'X'.repeat(200)}</body>`);
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({
      maxDepth: 0,
      maxPages: 1,
      aggregateTextLimit: 20,
    }));
    assert.equal(result.status, 'PARTIAL');
    assert.equal(result.truncated, true);
    assert(result.pages[0].text.length <= 20);
    assert(result.pages[0].warnings.includes('AGGREGATE_TEXT_TRUNCATED'));
    assert(result.warnings.includes('AGGREGATE_TEXT_LIMIT_REACHED'));
  });
});

test('child partial evidence survives aggregate disposition', async () => {
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    if (path === '/') return response.end('<body>ROOT<a href="/empty">EMPTY</a></body>');
    response.end('<html><body></body></html>');
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 1 }));
    assert.equal(result.status, 'PARTIAL');
    const child = result.pages.find((page) => new URL(page.requestedUrl).pathname === '/empty');
    assert.equal(child.status, 'PARTIAL');
    assert.equal(child.failureReason, 'EMPTY_RENDERED_CONTENT');
    assert.equal(result.failureReason, 'EMPTY_RENDERED_CONTENT');
  });
});
test('robots can block the seed before browser acquisition', async () => {
  let pageReached = false;
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nDisallow: /\n');
    pageReached = true;
    response.end('<body>NO</body>');
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options());
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, 'ROBOTS_DISALLOWED');
    assert.equal(result.visitedCount, 0);
    assert.equal(pageReached, false);
  });
});

test('crawl storage is non-durable in the repository worktree', async () => {
  assert.equal(existsSync(new URL('../storage', import.meta.url)), false);
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    response.end('<body>STATELESS</body>');
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 0, maxPages: 1 }));
    assert.equal(result.status, 'OK');
  });
  assert.equal(existsSync(new URL('../storage', import.meta.url)), false);
});

test('successful crawl CLI stdout is exactly one JSON line', async () => {
  await withServer((request, response) => {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    response.end('<body>CLI_OK</body>');
  }, async (port) => {
    const run = await runCli([
      '--test-allow-private', '--max-depth', '0', '--max-pages', '1',
      'http://127.0.0.1:' + port + '/',
    ], { WEB_ACQUISITION_TEST_MODE: '1' });
    assert.equal(run.code, 0);
    assert.equal(run.stderr, '');
    const lines = run.stdout.trimEnd().split('\n');
    assert.equal(lines.length, 1);
    const result = JSON.parse(lines[0]);
    assert.equal(result.status, 'OK');
    assert.match(result.pages[0].text, /CLI_OK/);
  });
});

test('crawl CLI private target switch requires explicit test environment', () => {
  const run = spawnSync(process.execPath,
    [crawlCliPath, '--test-allow-private', 'http://127.0.0.1/'],
    { encoding: 'utf8' });
  const result = JSON.parse(run.stdout.trim());
  assert.equal(run.status, 2);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.failureReason, 'TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV');
});

test('unsafe and credential candidates preserve policy evidence without cross-origin acquisition', async () => {
  let crossOriginReached = false;
  await withServer((request, response) => {
    const host = request.headers.host ?? '';
    if (host.startsWith('other.test')) crossOriginReached = true;
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/robots.txt') return response.end('User-agent: *\nAllow: /\n');
    const port = response.socket.localPort;
    response.end(`<body>ROOT
      <a href="javascript:alert(1)">BAD</a>
      <a href="http://user:secret@public.test:${port}/cred">CRED</a>
      <a href="http://other.test:${port}/outside">OUT</a>
    </body>`);
  }, async (port) => {
    const result = await crawlRenderedSite(url(port), options({ maxDepth: 1 }));
    assert.equal(result.status, 'OK');
    assert(result.skipped.some((item) => item.reason === 'TARGET_UNSAFE_SCHEME'));
    assert(result.skipped.some((item) => item.reason === 'TARGET_CREDENTIALS_FORBIDDEN'));
    assert(result.skipped.some((item) => item.reason === 'CROSS_ORIGIN'));
    assert.equal(JSON.stringify(result).includes('secret'), false);
    assert.equal(crossOriginReached, false);
  });
});
