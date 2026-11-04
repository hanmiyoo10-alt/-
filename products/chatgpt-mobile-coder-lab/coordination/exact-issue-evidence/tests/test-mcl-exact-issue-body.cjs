'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const owner = require('../mcl-exact-issue-body.cjs');
const lease = require('../../task-lease.cjs');

let count = 0;
async function test(name, fn) {
  await fn();
  count += 1;
  process.stdout.write('ok ' + count + ' - ' + name + '\n');
}

function packetBody(state = 'IN_PROGRESS', suffix = '') {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '## State',
    '`' + state + '`',
    '',
    '## Interaction stage',
    '',
    '- Current stage: `IMPLEMENTATION_PR`',
    '- Completed stage(s): `AUTHORITY_SCOPE`',
    '- Next stage: `VALIDATION_MERGE`',
    suffix,
  ].join('\n');
}

function ledgerBody() {
  return lease.renderLedger({
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 7,
    controllerPath: lease.CONTROLLER_PATH,
    controllerCommit: 'a'.repeat(40),
    packetRef: lease.OWNER_PACKET_REF,
    activeLeases: [],
    lastRelease: null,
  });
}

function clientFor(body, number = 4210) {
  return {
    async api(endpoint) {
      assert.equal(endpoint, '/issues/' + number);
      return {number, state: 'open', body};
    },
  };
}

(async () => {
  await test('packet without terminal LF is byte-identical', async () => {
    const body = packetBody();
    const result = await owner.readExact({kind:'packet', packetRef:'#4210', client:clientFor(body)});
    assert.equal(result.receipt.status, 'READY');
    assert.deepEqual(result.bytes, Buffer.from(body, 'utf8'));
    assert.equal(result.receipt.sha256, crypto.createHash('sha256').update(body).digest('hex'));
  });

  await test('one terminal LF is preserved exactly', async () => {
    const body = packetBody() + '\n';
    const result = await owner.readExact({kind:'packet', packetRef:'#4210', client:clientFor(body)});
    assert.deepEqual(result.bytes, Buffer.from(body, 'utf8'));
    assert.equal(result.bytes[result.bytes.length - 1], 10);
  });

  await test('multiple terminal whitespace bytes are preserved', async () => {
    const body = packetBody() + '\n \t\n';
    const result = await owner.readExact({kind:'packet', packetRef:'#4210', client:clientFor(body)});
    assert.deepEqual(result.bytes, Buffer.from(body, 'utf8'));
  });

  await test('UTF-8 multibyte body round-trips exactly', async () => {
    const body = packetBody('IN_PROGRESS', '한글🐈');
    const result = await owner.readExact({kind:'packet', packetRef:'#4210', client:clientFor(body)});
    assert.deepEqual(result.bytes, Buffer.from(body, 'utf8'));
    assert.equal(result.receipt.utf8Bytes, Buffer.byteLength(body, 'utf8'));
  });

  await test('ledger validates but is never re-rendered as transport', async () => {
    const body = ledgerBody();
    const result = await owner.readExact({kind:'ledger', client:clientFor(body, 2352)});
    assert.equal(result.receipt.status, 'READY');
    assert.deepEqual(result.bytes, Buffer.from(body, 'utf8'));
  });

  await test('invalid ledger fails closed without body bytes', async () => {
    const result = await owner.readExact({kind:'ledger', client:clientFor('bad', 2352)});
    assert.equal(result.receipt.status, 'BLOCKED');
    assert.equal(result.bytes, null);
  });

  await test('terminal packet is blocked', async () => {
    const body = packetBody('DONE');
    const result = await owner.readExact({kind:'packet', packetRef:'#4210', client:clientFor(body)});
    assert.equal(result.receipt.status, 'BLOCKED');
    assert(result.receipt.reasonCodes.includes('PACKET_TERMINAL'));
  });

  await test('dedicated fd receives exact bytes and stdout receipt excludes body', async () => {
    const body = packetBody('IN_PROGRESS', 'secret-looking body content');
    const temp = path.join(os.tmpdir(), 'mcl-exact-body-' + process.pid);
    const fd = fs.openSync(temp, 'w');
    try {
      const result = await owner.runCli(['packet','--packet','#4210'], {}, {client:clientFor(body), fd});
      assert.equal(result.code, 0);
      assert.deepEqual(fs.readFileSync(temp), Buffer.from(body, 'utf8'));
      assert(!result.text.includes('secret-looking body content'));
      const receipt = JSON.parse(result.text);
      assert.equal(receipt.status, 'PASS');
      assert.equal(receipt.bytesWritten, Buffer.byteLength(body, 'utf8'));
    } finally {
      fs.closeSync(fd);
      fs.rmSync(temp, {force:true});
    }
  });

  await test('missing exact output fd fails closed', async () => {
    const body = packetBody();
    const result = await owner.runCli(['packet','--packet','#4210'], {}, {client:clientFor(body), fd:-1});
    assert.equal(result.code, 2);
    assert(JSON.parse(result.text).reasonCodes.includes('EXACT_BODY_WRITE_FAILED'));
  });

  await test('CLI has no generic repository endpoint or output selector', async () => {
    for (const argv of [
      ['ledger','--repo','other/repo'],
      ['packet','--packet','#4210','--output','x'],
      ['packet','--packet','#4210','--jq','.body'],
    ]) {
      const result = await owner.runCli(argv, {}, {client:clientFor(packetBody())});
      assert.equal(result.code, 2);
    }
  });

  const source = fs.readFileSync(path.join(__dirname, '../mcl-exact-issue-body.cjs'), 'utf8');
  assert(!source.includes('--jq'));
  assert(!source.includes('.trim()'));
  assert(!source.includes('.trimEnd()'));
  assert(!source.includes('Buffer.concat'));
  console.log('ALL EXACT ISSUE BODY TESTS PASS');
})();
