import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

function count(source, marker) {
  return source.split(marker).length - 1;
}

function moduleNames(source) {
  return [...source.matchAll(/SimCore\.define\("([^"]+)"\s*,\s*function/g)].map((m) => m[1]);
}

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function requireLines(source, name) {
  return [...moduleText(source, name).matchAll(/^const [^\n=]+ = require\('[^']+'\);$/gm)].map((m) => m[0]);
}

function assertIdentity(candidate) {
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.9', 'metadata identity');
  equal(candidate.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.9', 'runtime identity');
  equal(candidate.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.9', 'Host identity');
  equal(count(candidate, '// v0.70.9 Inline Planning Marker Hygiene Guard:'), 1, 'release-note source header identity');
  assert(candidate.includes("version: '0.70.9',\n    name: 'Inline Planning Marker Hygiene Guard',"), 'operator release-card identity');
}

function compatStubs() {
  return {
    './kernel': {
      stripControlTags: (value) => String(value ?? ''),
      scanKnowledgeBlocks: () => ({ blocks: [], malformed: false }),
      fingerprintText: (value) => `${String(value ?? '').length}:fixture`,
    },
    './lifecycle': { expectedCommunityBlocks: () => 0 },
    './time': {},
    './community': {
      communityBlocks: () => [],
      splitCommunity: () => [],
      platformInfo: () => ({ group: null }),
      sectionHeader: () => '',
    },
    './reaction': {},
    './structure': {
      responseEnvelopeIntegrity: () => ({
        safe: true,
        frameOk: true,
        communityOk: true,
        knowledgeOk: true,
        blocks: [],
        knowledge: { blocks: [], malformed: false },
      }),
    },
  };
}

function prepare(compat, content) {
  return compat.prepareOutput(content, { active: true, mode: 'A' });
}

function assertPreserved(compat, body, id) {
  const source = `# 응답\n${body}\n끝.`;
  const got = prepare(compat, source);
  equal(got.content, source, `${id} must remain byte-equivalent`);
  assert(!got.envelope.inlinePlanningProvenance, `${id} must not claim inline planning provenance`);
  assert(!(got.envelope.diagnostics || []).some((line) => String(line).includes('Inline planning compat = STRIPPED')), `${id} must not emit hygiene diagnostic`);
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'v0.70.9 builder fixture missing');
  equal(fixture.expected.runtimeMutation, 'INLINE_PLANNING_MARKER_HYGIENE_GUARD_ONLY', 'fixture runtime mutation contract');
  equal(fixture.expected.releaseSystemMutation, 'NONE', 'fixture release-system non-mutation contract');

  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.8', '0.70.9'].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07009-builder-source-not-active', status: 'PASS' }],
    };
  }

  let candidate = ctx.source;
  let predecessor = null;
  if (sourceVersion === '0.70.8') {
    predecessor = ctx.source;
    const root = process.cwd();
    const builder = path.resolve(root, 'products/simcore/tooling/build-07009-inline-planning-marker-hygiene-guard.py');
    assert(fs.existsSync(builder), 'v0.70.9 builder missing');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07009-builder-'));
    try {
      const pluginDir = path.join(tmp, 'plugins', 'simcore');
      fs.mkdirSync(pluginDir, { recursive: true });
      const latestPath = path.join(pluginDir, 'latest.js');
      const installPath = path.join(pluginDir, 'install.js');
      fs.writeFileSync(latestPath, ctx.source, 'utf8');
      fs.writeFileSync(installPath, ctx.source, 'utf8');

      const run = spawnSync('python3', [builder], {
        cwd: tmp,
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      });
      equal(run.status, 0, `v0.70.9 builder exit: ${run.stderr || run.stdout}`);
      assert(run.stdout.includes('07009_BUILD_PASS'), `v0.70.9 builder PASS marker missing: ${run.stdout}`);

      const latest = fs.readFileSync(latestPath, 'utf8');
      const install = fs.readFileSync(installPath, 'utf8');
      equal(latest, install, 'v0.70.9 latest/install identity');
      candidate = latest;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  assertIdentity(candidate);
  equal(count(candidate, "const INLINE_PLANNING_GRAMMAR = 'INLINE_INTERNAL_MEMO_V1';"), 1, 'reserved grammar owner cardinality');
  equal(count(candidate, 'function stripBoundedInlinePlanningMarkers(content)'), 1, 'bounded scanner owner cardinality');
  equal(count(candidate, 'function isInlinePlanningMarkerLine(line)'), 1, 'marker parser cardinality');
  equal(count(candidate, 'function parseMarkdownFenceLine(line)'), 1, 'fence parser cardinality');
  equal(count(candidate, 'Inline planning compat = STRIPPED'), 1, 'bounded diagnostic source cardinality');
  assert(candidate.includes('payload.length <= 512'), 'UTF-16 payload bound missing');
  assert(candidate.includes("rawPayload: 'NOT_RETAINED'"), 'non-retention provenance missing');
  assert(candidate.includes('const inlinePlanning = stripBoundedInlinePlanningMarkers(text);\n  text = inlinePlanning.content;\n  const envelope = canonicalizeResponseEnvelope(text, pending);'), 'cleanup must precede envelope canonicalization');

  const compat = new BundleLoader(candidate, { stubs: compatStubs() }).load('output-compat');

  const observedPayload = 'plan next paragraph';
  const positiveInput = `# 응답\n정상 문단.\n┣ internal_memo: ${observedPayload} ┫\n다음 정상 문단.`;
  const positive = prepare(compat, positiveInput);
  equal(positive.content, '# 응답\n정상 문단.\n다음 정상 문단.', 'observed standalone marker must be stripped');
  equal(positive.envelope.inlinePlanningProvenance?.status, 'STRIPPED', 'positive provenance status');
  equal(positive.envelope.inlinePlanningProvenance?.grammar, 'INLINE_INTERNAL_MEMO_V1', 'positive grammar provenance');
  equal(positive.envelope.inlinePlanningProvenance?.markers, 1, 'positive marker count');
  equal(positive.envelope.inlinePlanningProvenance?.rawPayload, 'NOT_RETAINED', 'positive payload non-retention');
  const positiveDiagnostics = (positive.envelope.diagnostics || []).join('\n');
  assert(positiveDiagnostics.includes('Inline planning compat = STRIPPED'), 'positive bounded diagnostic missing');
  assert(positiveDiagnostics.includes('Grammar = INLINE_INTERNAL_MEMO_V1'), 'positive diagnostic grammar missing');
  assert(positiveDiagnostics.includes('Markers = 1'), 'positive diagnostic marker count missing');
  assert(positiveDiagnostics.includes('Raw payload = NOT RETAINED'), 'positive diagnostic non-retention marker missing');
  assert(!JSON.stringify(positive.envelope).includes(observedPayload), 'removed memo payload must not survive in diagnostics/provenance');

  const multiple = prepare(compat, [
    '# 응답',
    '앞.',
    '┣ internal_memo: first private plan ┫',
    '중간.',
    '┣\tinternal_memo:\tsecond private plan\t┫',
    '뒤.',
  ].join('\n'));
  equal(multiple.content, '# 응답\n앞.\n중간.\n뒤.', 'multiple valid markers must all be stripped');
  equal(multiple.envelope.inlinePlanningProvenance?.markers, 2, 'multiple marker provenance count');
  assert(!JSON.stringify(multiple.envelope).includes('first private plan'), 'first payload must not be retained');
  assert(!JSON.stringify(multiple.envelope).includes('second private plan'), 'second payload must not be retained');

  const payload512 = 'x'.repeat(512);
  const exactBound = prepare(compat, `# 응답\n┣ internal_memo: ${payload512} ┫\n끝.`);
  equal(exactBound.content, '# 응답\n끝.', '512 UTF-16 payload must remain inside reserved removable grammar');
  equal(exactBound.envelope.inlinePlanningProvenance?.markers, 1, '512-bound marker count');

  assertPreserved(compat, [
    '```text',
    '┣ internal_memo: literal fenced example ┫',
    '```',
  ].join('\n'), 'backtick fenced marker');

  assertPreserved(compat, [
    '~~~text',
    '┣ internal_memo: literal tilde fenced example ┫',
    '~~~',
  ].join('\n'), 'tilde fenced marker');

  assertPreserved(compat, [
    '````text',
    '┣ internal_memo: marker before short close ┫',
    '```',
    '┣ internal_memo: still inside four-backtick fence ┫',
    '````',
  ].join('\n'), 'insufficient fence close');

  const negatives = [
    ['inline occurrence', 'prefix ┣ internal_memo: inline example ┫ suffix'],
    ['inline code', '`┣ internal_memo: literal inline code ┫`'],
    ['blockquote', '> ┣ internal_memo: quoted example ┫'],
    ['ordinary prose', 'This prose mentions internal_memo normally.'],
    ['wrong key', '┣ internal_memory: wrong key ┫'],
    ['wrong delimiter', '┏ internal_memo: wrong delimiter ┓'],
    ['empty payload', '┣ internal_memo:    ┫'],
    ['embedded right delimiter', '┣ internal_memo: left ┫ right ┫'],
    ['payload over bound', `┣ internal_memo: ${'x'.repeat(513)} ┫`],
  ];
  for (const [id, body] of negatives) assertPreserved(compat, body, id);

  const thoughts = prepare(compat, '<Thoughts>private reasoning wrapper</Thoughts>\n# 응답\n정상 문단.');
  equal(thoughts.content, '# 응답\n정상 문단.', 'existing complete THOUGHTS_COMPAT behavior unchanged');
  assert(!thoughts.envelope.inlinePlanningProvenance, 'Thoughts preamble must not be reclassified as inline planning');
  assert(!(thoughts.envelope.diagnostics || []).some((line) => String(line).includes('Inline planning compat = STRIPPED')), 'Thoughts preamble must not emit inline planning diagnostic');

  const ordinary = '# 응답\n정상 문단.\n다음 정상 문단.';
  const ordinaryOut = prepare(compat, ordinary);
  equal(ordinaryOut.content, ordinary, 'ordinary no-marker output byte-equivalent');
  assert(!ordinaryOut.envelope.inlinePlanningProvenance, 'ordinary no-marker output has no hygiene provenance');

  if (predecessor) {
    equal(JSON.stringify(moduleNames(candidate)), JSON.stringify(moduleNames(predecessor)), 'module inventory/order frozen');
    for (const name of moduleNames(predecessor)) {
      equal(JSON.stringify(requireLines(candidate, name)), JSON.stringify(requireLines(predecessor, name)), `${name} require graph frozen`);
    }
    for (const marker of [
      'JSON.stringify(state)',
      'await this.b.set(',
      'pluginStorage',
      'setChat(',
      'fetch(',
      'XMLHttpRequest',
      'setTimeout(',
      'setInterval(',
      'history.splice(',
      'messages.splice(',
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      "['OUT_STORAGE', n(detail.outSetMs)]",
      'fresh-exact-repeat-send-rewind',
    ]) {
      equal(count(candidate, marker), count(predecessor, marker), `${marker} frozen`);
    }
    equal(count(candidate, '// v0.70.9 Inline Planning Marker Hygiene Guard:'), 1, 'one v0.70.9 release-note header added');
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07009-identity', status: 'PASS' },
      { id: 'v07009-owner-positive', status: 'PASS' },
      { id: 'v07009-owner-multiple', status: 'PASS' },
      { id: 'v07009-fence-negative-controls', status: 'PASS' },
      { id: 'v07009-literal-negative-controls', status: 'PASS' },
      { id: 'v07009-payload-boundary', status: 'PASS' },
      { id: 'v07009-thoughts-compat-control', status: 'PASS' },
      { id: 'v07009-no-marker-equivalence', status: 'PASS' },
      { id: 'v07009-topology-frozen', status: 'PASS' },
      { id: 'v07009-latest-install', status: 'PASS' },
    ],
  };
}
