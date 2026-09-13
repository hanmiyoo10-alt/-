import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { acquirePage } from '../lib/acquire.mjs';
import {
  REVEAL_TOTAL_BUDGET_MS,
  RevealPlanError,
  executeRevealPlan,
  loadRevealPlanFile,
  normalizeRevealPlan,
} from '../lib/reveal.mjs';
import { main, parseArgs } from '../reveal-cli.mjs';

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
function reveal(url, plan, extra = {}) {
  return acquirePage(url, {
    mode: 'boundedReveal',
    plan,
    testMode: true,
    allowPrivate: true,
    renderWaitMs: 20,
    timeoutMs: 5_000,
    ...extra,
  });
}

function one(type, selector, timeoutMs = 2_000) {
  return { version: 1, actions: [{ type, selector, timeoutMs }] };
}

async function tempPlan(plan = one('clickReveal', '#reveal')) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'web-acq-reveal-'));
  const file = path.join(dir, 'plan.json');
  await writeFile(file, JSON.stringify(plan));
  return { dir, file };
}

const cliPath = fileURLToPath(new URL('../reveal-cli.mjs', import.meta.url));

test('accordion reveal exposes hidden evidence with bounded provenance', async () => {
  await withServer((_request, response) => {
    response.end('<body><button id="reveal" type="button" onclick="answer.hidden=false">Open</button><div id="answer" hidden>REVEAL_OK</div></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    const result = await reveal(url, one('clickReveal', '#reveal'));
    assert.equal(result.status, 'OK');
    assert.equal(result.method, 'PLAYWRIGHT_BOUNDED_REVEAL');
    assert.equal(result.actionsRequested, 1);
    assert.equal(result.actionsExecuted, 1);
    assert.equal(result.actionResults[0].status, 'OK');
    assert.match(result.text, /REVEAL_OK/);
    assert.deepEqual(result.blockedEffects, []);
    assert(result.warnings.includes('REVEAL_GET_HEAD_EFFECTS_REMAIN_SITE_CONTROLLED'));
  });
});

test('tab reveal changes visible evidence without general browser authority', async () => {
  await withServer((_request, response) => {
    response.end('<body><div role="tab" id="tab" onclick="panel.hidden=false">Tab</div><div id="panel" hidden>TAB_OK</div></body>');
  }, async (port) => {
    const result = await reveal(`http://127.0.0.1:${port}/`, one('clickReveal', '#tab'));
    assert.equal(result.status, 'OK');
    assert.match(result.text, /TAB_OK/);
    assert.equal(result.actionsExecuted, 1);
  });
});

test('waitFor observes visible state only and completes finitely', async () => {
  await withServer((_request, response) => {
    response.end('<body><div id="later" hidden>WAIT_OK</div><script>setTimeout(()=>later.hidden=false,40)</script></body>');
  }, async (port) => {
    const result = await reveal(`http://127.0.0.1:${port}/`, one('waitFor', '#later', 500));
    assert.equal(result.status, 'OK');
    assert.equal(result.actionResults[0].type, 'waitFor');
    assert.match(result.text, /WAIT_OK/);
  });
});
test('selector determinism fails on zero, duplicates, invisibility, and non-CSS selector syntax', async () => {
  await withServer((_request, response) => {
    response.end('<body><button id="visible" type="button">Open</button><button class="dup" type="button">A</button><button class="dup" hidden type="button">B</button><button id="hidden" hidden type="button">H</button></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    const cases = [
      ['#missing', 'REVEAL_SELECTOR_NOT_FOUND'],
      ['.dup', 'REVEAL_SELECTOR_AMBIGUOUS'],
      ['#hidden', 'REVEAL_SELECTOR_NOT_VISIBLE'],
      ['text=Open', 'REVEAL_PLAN_INVALID'],
    ];
    for (const [selector, reason] of cases) {
      const result = await reveal(url, one('clickReveal', selector, 300));
      assert.equal(result.status, 'FAILED');
      assert.equal(result.failureReason, reason);
      assert.equal(result.actionsExecuted, 0);
    }
  });
});

test('waitFor preserves unique-selector semantics while waiting for visibility', async () => {
  await withServer((_request, response) => {
    response.end('<body><div class="dup">A</div><div class="dup">B</div><div id="hidden" hidden>H</div></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    const ambiguous = await reveal(url, one('waitFor', '.dup', 100));
    assert.equal(ambiguous.failureReason, 'REVEAL_SELECTOR_AMBIGUOUS');
    const invisible = await reveal(url, one('waitFor', '#hidden', 100));
    assert.equal(invisible.failureReason, 'REVEAL_SELECTOR_NOT_VISIBLE');
  });
});

test('details summary is an allowed bounded reveal controller', async () => {
  await withServer((_request, response) => {
    response.end('<body><details><summary id="sum">Open</summary><div>SUMMARY_OK</div></details></body>');
  }, async (port) => {
    const result = await reveal(`http://127.0.0.1:${port}/`, one('clickReveal', '#sum'));
    assert.equal(result.status, 'OK');
    assert.match(result.text, /SUMMARY_OK/);
  });
});

test('unsafe control classes are rejected before click while explicit form type=button is allowed', async () => {
  await withServer((_request, response) => {
    response.end('<body><a id="link" href="/next">link</a><input id="input"><textarea id="ta"></textarea><select id="sel"><option>x</option></select><div id="edit" contenteditable>edit</div><form><button id="submit">submit</button><button id="reset" type="reset">reset</button><input id="file" type="file"><button id="fa" type="button" formaction="/next">fa</button><button id="safe" type="button" onclick="out.hidden=false">safe</button></form><button id="dl" type="button" download onclick="out.hidden=false">dl</button><div id="out" hidden>SAFE_OK</div></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    for (const selector of ['#link', '#input', '#ta', '#sel', '#edit', '#submit', '#reset', '#file', '#fa', '#dl']) {
      const result = await reveal(url, one('clickReveal', selector));
      assert.equal(result.status, 'BLOCKED', selector);
      assert.equal(result.failureReason, 'REVEAL_CONTROL_FORBIDDEN', selector);
      assert.equal(result.actionsExecuted, 0, selector);
    }
    const safe = await reveal(url, one('clickReveal', '#safe'));
    assert.equal(safe.status, 'OK');
    assert.match(safe.text, /SAFE_OK/);
  });
});
test('action-triggered non-GET methods are blocked before continuation', async () => {
  const reached = [];
  await withServer((request, response) => {
    if (request.url === '/mutate') reached.push(request.method);
    const id = new URL(request.url, 'http://fixture').searchParams.get('m') ?? 'POST';
    response.end(`<body><button id="go" type="button" onclick="fetch('/mutate',{method:'${id}'})">go</button></body>`);
  }, async (port) => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = await reveal(`http://127.0.0.1:${port}/?m=${method}`, one('clickReveal', '#go'));
      assert.equal(result.status, 'BLOCKED');
      assert.equal(result.failureReason, 'REVEAL_METHOD_FORBIDDEN');
      assert.equal(result.blockedEffects[0].method, method);
    }
    assert.deepEqual(reached, []);
  });
});

test('second top-level navigation is blocked before the destination completes', async () => {
  let nextReached = false;
  await withServer((request, response) => {
    if (request.url === '/next') nextReached = true;
    response.end(request.url === '/next'
      ? '<body>NEXT</body>'
      : '<body><button id="go" type="button" onclick="location.href=\'/next\'">go</button></body>');
  }, async (port) => {
    const result = await reveal(`http://127.0.0.1:${port}/`, one('clickReveal', '#go'));
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, 'REVEAL_TOP_LEVEL_NAVIGATION_FORBIDDEN');
    assert.equal(nextReached, false);
  });
});

test('popup and dialog attempts cannot remain OK', async () => {
  await withServer((_request, response) => {
    response.end('<body><button id="popup" type="button" onclick="window.open(\'/popup\')">popup</button><button id="dialog" type="button" onclick="alert(\'x\')">dialog</button></body>');
  }, async (port) => {
    const url = `http://127.0.0.1:${port}/`;
    const popup = await reveal(url, one('clickReveal', '#popup'));
    assert.equal(popup.status, 'BLOCKED');
    assert.equal(popup.failureReason, 'REVEAL_POPUP_FORBIDDEN');
    const dialog = await reveal(url, one('clickReveal', '#dialog'));
    assert.equal(dialog.status, 'BLOCKED');
    assert.equal(dialog.failureReason, 'REVEAL_DIALOG_FORBIDDEN');
  });
});
test('download attempt is recorded and no artifact is persisted', async () => {
  const downloadsPath = await mkdtemp(path.join(os.tmpdir(), 'web-acq-downloads-'));
  await withServer((request, response) => {
    if (request.url === '/file') {
      response.setHeader('content-disposition', 'attachment; filename="x.txt"');
      response.end('DOWNLOAD_BODY');
      return;
    }
    response.end('<body><button id="go" type="button" onclick="const a=document.createElement(\'a\');a.href=\'/file\';a.download=\'x.txt\';a.click()">go</button></body>');
  }, async (port) => {
    const result = await reveal(`http://127.0.0.1:${port}/`, one('clickReveal', '#go'), {
      launchOptions: { downloadsPath },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, 'REVEAL_DOWNLOAD_FORBIDDEN');
    assert.deepEqual(await readdir(downloadsPath), []);
  });
});

test('plan bounds reject oversize, excess actions, unknown fields/types and timeout overflow', async () => {
  assert.throws(() => normalizeRevealPlan({ version: 1, actions: Array.from({ length: 6 }, () => ({ type: 'waitFor', selector: '#x' })) }),
    (error) => error instanceof RevealPlanError && error.code === 'REVEAL_ACTION_LIMIT_EXCEEDED');
  for (const plan of [
    { version: 1, actions: [{ type: 'script', selector: '#x' }] },
    { version: 1, actions: [{ type: 'waitFor', selector: '#x', timeoutMs: 5001 }] },
    { version: 1, actions: [{ type: 'waitFor', selector: '#x', extra: true }] },
    { version: 1, actions: [{ type: 'waitFor', selector: 'button >> nth=0' }] },
  ]) assert.throws(() => normalizeRevealPlan(plan), RevealPlanError);
  const { file } = await tempPlan();
  await writeFile(file, JSON.stringify({ value: 'X'.repeat(17 * 1024) }));
  await assert.rejects(loadRevealPlanFile(file),
    (error) => error instanceof RevealPlanError && error.code === 'REVEAL_PLAN_TOO_LARGE');
});

test('total interaction budget fails closed without waiting for an unbounded workflow', async () => {
  const originalNow = Date.now;
  let calls = 0;
  Date.now = () => (calls++ === 0 ? 0 : REVEAL_TOTAL_BUDGET_MS + 1);
  try {
    const effectGuard = { firstBlockedReason: () => null };
    const outcome = await executeRevealPlan({}, one('waitFor', '#never'), effectGuard);
    assert.equal(outcome.ok, false);
    assert.equal(outcome.failureReason, 'REVEAL_ACTION_TIMEOUT');
    assert.equal(outcome.actionsExecuted, 0);
  } finally {
    Date.now = originalNow;
  }
});
test('separate reveal acquisitions do not reuse cookie or local storage state', async () => {
  await withServer((request, response) => {
    const set = new URL(request.url, 'http://fixture').searchParams.has('set');
    response.end(`<body><button id="go" type="button" onclick="${set ? "localStorage.setItem('u26v4','SECRET');document.cookie='u26v4=SECRET; path=/'" : "out.textContent=(localStorage.getItem('u26v4')||'CLEAN')+'|'+(document.cookie||'NO_COOKIE');out.hidden=false"}">go</button><div id="out" hidden></div></body>`);
  }, async (port) => {
    const base = `http://127.0.0.1:${port}/state`;
    const first = await reveal(`${base}?set=1`, one('clickReveal', '#go'));
    const second = await reveal(base, one('clickReveal', '#go'));
    assert.equal(first.status, 'OK');
    assert.equal(second.status, 'OK');
    assert.match(second.text, /CLEAN\|NO_COOKIE/);
    assert.doesNotMatch(second.text, /SECRET/);
  });
});

test('CLI parser requires one URL and one plan file with test-private gating', async () => {
  assert.throws(() => parseArgs([]), /CLI_REQUIRES_EXACTLY_ONE_URL/);
  assert.throws(() => parseArgs(['https://a.test', 'https://b.test', '--plan-file', 'p.json']), /CLI_REQUIRES_EXACTLY_ONE_URL/);
  assert.throws(() => parseArgs(['https://a.test']), /CLI_PLAN_FILE_REQUIRED/);
  const parsed = parseArgs(['https://a.test', '--plan-file', 'p.json']);
  assert.equal(parsed.url, 'https://a.test');
  const blocked = await main(['--test-allow-private', '--plan-file', 'p.json', 'http://127.0.0.1/'], {
    env: {}, loadRevealPlanFile: async () => one('waitFor', 'body'), write: () => {},
  });
  assert.equal(blocked.output.status, 'BLOCKED');
  assert.equal(blocked.output.failureReason, 'TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV');
});

test('CLI main emits exactly one JSON line for deterministic reveal success', async () => {
  const { file, dir } = await tempPlan(one('waitFor', '#done'));
  let stdout = '';
  const fakeResult = { status: 'OK', method: 'PLAYWRIGHT_BOUNDED_REVEAL', actionsRequested: 1, actionsExecuted: 1, actionResults: [{ status: 'OK' }], blockedEffects: [], rendered: true, text: 'CLI_REVEAL_OK', links: [], warnings: [], truncated: false, failureReason: null };
  const run = await main(['https://example.test/', '--plan-file', file], {
    acquirePage: async () => fakeResult,
    write: (text) => { stdout += text; },
  });
  assert.equal(run.exitCode, 0);
  assert.equal(stdout.trim().split('\n').length, 1);
  assert.equal(JSON.parse(stdout).text, 'CLI_REVEAL_OK');
  await rm(dir, { recursive: true, force: true });
});
test('real reveal CLI child emits one JSON line on a deterministic local fixture', async () => {
  const { file, dir } = await tempPlan(one('clickReveal', '#go'));
  try {
    await withServer((_request, response) => {
      response.end('<body><button id="go" type="button" onclick="out.hidden=false">go</button><div id="out" hidden>CLI_REVEAL_OK</div></body>');
    }, async (port) => {
      const child = await new Promise((resolve, reject) => {
        const handle = spawn(process.execPath, [cliPath, '--test-allow-private', '--plan-file', file, `http://127.0.0.1:${port}/`], {
          env: { ...process.env, WEB_ACQUISITION_TEST_MODE: '1' },
        });
        let stdout = '';
        let stderr = '';
        handle.stdout.setEncoding('utf8');
        handle.stderr.setEncoding('utf8');
        handle.stdout.on('data', (chunk) => { stdout += chunk; });
        handle.stderr.on('data', (chunk) => { stderr += chunk; });
        handle.once('error', reject);
        handle.once('close', (code) => resolve({ code, stdout, stderr }));
      });
      assert.equal(child.code, 0);
      assert.equal(child.stderr, '');
      assert.equal(child.stdout.trim().split('\n').length, 1);
      const parsed = JSON.parse(child.stdout);
      assert.equal(parsed.status, 'OK');
      assert.equal(parsed.method, 'PLAYWRIGHT_BOUNDED_REVEAL');
      assert.equal(parsed.actionsExecuted, 1);
      assert.match(parsed.text, /CLI_REVEAL_OK/);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});