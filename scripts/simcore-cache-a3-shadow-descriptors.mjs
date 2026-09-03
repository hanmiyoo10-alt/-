import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const sourcePath = args[0] || 'fixtures/simcore/cache-a2-prompt-fixtures-v0701.json';
const mode = args[1] || '--print';
const targetPath = args[2] || null;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

const a2Text = fs.readFileSync(sourcePath, 'utf8');
const a2 = JSON.parse(a2Text);
assert(a2?.schema === 'SimCoreCacheA2ExactByteFixtureBaselineV1', `unexpected A2 schema: ${a2?.schema}`);
assert(Array.isArray(a2.fixtures) && a2.fixtures.length > 0, 'A2 fixtures missing');

const T1 = 'T1';
const T3 = 'T3';
const T5 = 'T5';
const MIXED = 'MIXED_T1_T5';

function splitLines(text) {
  const value = String(text || '');
  return value ? value.split('\n') : [];
}

function makeDescriptor({
  id,
  owner,
  semanticRole,
  stabilityClass,
  orderClass,
  text,
  breakAuthority,
  sourceReference,
  providerHintEligibility = 'UNDECIDED',
  canonicalizationPolicy = 'PRESERVE_A2_GOLDEN_BYTES',
}) {
  const serializedText = String(text || '');
  return {
    id,
    owner,
    semanticRole,
    stabilityClass,
    orderClass,
    modelVisibility: 'MODEL_VISIBLE',
    canonicalizationPolicy,
    semanticFingerprint: null,
    semanticFingerprintStatus: 'NOT_DERIVED_IN_A3_SHADOW',
    byteFingerprint: sha256(serializedText),
    byteLength: Buffer.byteLength(serializedText, 'utf8'),
    breakAuthority,
    providerHintEligibility,
    providerHintPolicy: 'NO_PROVIDER_TRANSPORT_DECISION_IN_A3',
    sourceReference,
    serializedText,
  };
}

function classifySlowLine(line, index, fixtureId) {
  const common = {
    orderClass: 'PHYSICAL_CURRENT_ORDER',
    text: line,
    sourceReference: `A2:${fixtureId}:slow:line:${index + 1}`,
  };
  if (line.startsWith('korean_age_offset=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T3_KOREAN_AGE_OFFSET', owner: 'SIMCORE_TIME_STATE', semanticRole: 'persisted Korean-age offset state', stabilityClass: T3, breakAuthority: 'Time/world-year progression or owned state repair' });
  }
  if (line.startsWith('current_korean_age=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T3_CURRENT_KOREAN_AGE_DERIVED', owner: 'SIMCORE_TIME_STATE', semanticRole: 'derived current Korean-age rule', stabilityClass: T3, breakAuthority: 'Owned Korean-age offset change' });
  }
  if (line.startsWith('world_year=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T3_WORLD_YEAR', owner: 'SIMCORE_TIME_STATE', semanticRole: 'persisted lifecycle-slow world year', stabilityClass: T3, breakAuthority: 'Time explicit or committed year transition' });
  }
  if (line.startsWith('secondary_configured=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T3_SECONDARY_CONFIGURATION', owner: 'SIMCORE_PROMPT_PROBE_CONFIGURATION', semanticRole: 'session/configuration secondary availability', stabilityClass: T3, breakAuthority: 'Owned secondary configuration change' });
  }
  if (line.startsWith('secondary_active=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T5_SECONDARY_ACTIVE', owner: 'SIMCORE_CURRENT_TURN', semanticRole: 'current-turn secondary activation', stabilityClass: T5, breakAuthority: 'Current user input plus configured activation keyword' });
  }
  if (line.startsWith('episode_no=')) {
    return makeDescriptor({ ...common, id: 'SIMCORE_T3_EPISODE_NO', owner: 'SIMCORE_LIFECYCLE_STATE', semanticRole: 'persisted lifecycle-slow episode number', stabilityClass: T3, breakAuthority: 'Lifecycle broadcast-start boundary or bounded bootstrap reconstruction' });
  }
  throw new Error(`unclassified A2 slow line for ${fixtureId}: ${line}`);
}

function classifyVolatile(text, fixtureId) {
  const lines = splitLines(text);
  if (!lines.length) return [];
  assert(lines[0]?.startsWith('mode='), `volatile mode anchor missing: ${fixtureId}`);
  assert(lines[1]?.startsWith('broadcast_locked='), `volatile broadcast anchor missing: ${fixtureId}`);
  assert(lines[2]?.startsWith('community_blocks_expected='), `volatile community-count anchor missing: ${fixtureId}`);
  assert(lines.at(-2)?.startsWith('final_required_blocks='), `volatile footer anchor missing: ${fixtureId}`);
  assert(lines.at(-1) === '[/SIMCORE CORE STATE]', `volatile close anchor missing: ${fixtureId}`);

  const descriptors = [];
  descriptors.push(makeDescriptor({
    id: 'SIMCORE_T5_MODE_STATE',
    owner: 'SIMCORE_LIFECYCLE_STATE',
    semanticRole: 'current execution mode, broadcast lock, and expected Community count',
    stabilityClass: T5,
    orderClass: 'PHYSICAL_CURRENT_ORDER',
    text: lines.slice(0, 3).join('\n'),
    breakAuthority: 'Current mode/lifecycle transition',
    sourceReference: `A2:${fixtureId}:volatile:mode-lines`,
  }));

  const middle = lines.slice(3, -2);
  const reactionIndex = middle.findIndex((line) => line.startsWith('reaction_max='));
  const conditional = reactionIndex >= 0 ? middle.slice(0, reactionIndex) : middle;
  const hot = reactionIndex >= 0 ? middle.slice(reactionIndex) : [];

  if (conditional.length) {
    descriptors.push(makeDescriptor({
      id: 'SIMCORE_T5_CONDITIONAL_GUIDANCE',
      owner: 'SIMCORE_CURRENT_CONTEXT_AUTHORITIES',
      semanticRole: 'conditionally present lifecycle, recurrence, lineage, evidence, time, and Community guidance',
      stabilityClass: T5,
      orderClass: 'PHYSICAL_CURRENT_ORDER',
      text: conditional.join('\n'),
      breakAuthority: 'Specific current semantic condition owner',
      sourceReference: `A2:${fixtureId}:volatile:conditional-lines`,
    }));
  }

  if (hot.length) {
    assert(hot.every((line) => line.startsWith('reaction_max=')), `unexpected hot line for ${fixtureId}: ${hot.join(' | ')}`);
    descriptors.push(makeDescriptor({
      id: 'SIMCORE_T5_HOT_REACTION_STATE',
      owner: 'SIMCORE_COMMUNITY_CURRENT_STATE',
      semanticRole: 'current Community reaction maxima',
      stabilityClass: T5,
      orderClass: 'PHYSICAL_CURRENT_ORDER',
      text: hot.join('\n'),
      breakAuthority: 'Current Community platform-max semantic state',
      sourceReference: `A2:${fixtureId}:volatile:hot-lines`,
    }));
  }

  descriptors.push(makeDescriptor({
    id: 'SIMCORE_MIXED_FINAL_REQUIRED_BLOCKS',
    owner: 'SIMCORE_PROMPT_COMPILER',
    semanticRole: 'stable footer framing with current Community-count value',
    stabilityClass: MIXED,
    orderClass: 'PHYSICAL_CURRENT_ORDER',
    text: lines.at(-2),
    breakAuthority: 'Current communityExpected value for dynamic field; prompt ABI owner for framing',
    sourceReference: `A2:${fixtureId}:volatile:footer-required-blocks`,
    providerHintEligibility: 'NO_SPLIT_CURRENTLY',
    canonicalizationPolicy: 'PRESERVE_MIXED_LINE_EXACTLY_UNTIL_SEPARATE_OWNED_REFACTOR',
  }));

  descriptors.push(makeDescriptor({
    id: 'SIMCORE_T1_CLOSING_FRAME_PHYSICAL_TAIL',
    owner: 'SIMCORE_PROMPT_COMPILER',
    semanticRole: 'stable SimCore core-state closing framing',
    stabilityClass: T1,
    orderClass: 'PHYSICAL_TAIL_DO_NOT_MOVE_IN_A3',
    text: lines.at(-1),
    breakAuthority: 'Explicit stable Prompt Cache ABI change only',
    sourceReference: `A2:${fixtureId}:volatile:closing-frame`,
    providerHintEligibility: 'SHADOW_ONLY_PHYSICALLY_AFTER_T5',
  }));

  return descriptors;
}

function withPhysicalRanges(segments) {
  let line = 1;
  let byte = 0;
  return segments.map((segment, index) => {
    const separatorBefore = index === 0 ? '' : '\n';
    const segmentStartByte = byte + Buffer.byteLength(separatorBefore, 'utf8');
    const segmentStartLine = line;
    const lineCount = splitLines(segment.serializedText).length;
    const segmentEndByteExclusive = segmentStartByte + Buffer.byteLength(segment.serializedText, 'utf8');
    const segmentEndLine = segmentStartLine + Math.max(0, lineCount - 1);
    byte = segmentEndByteExclusive;
    line = segmentEndLine + 1;
    return {
      ...segment,
      physicalOrder: index,
      separatorBefore,
      physicalByteRange: [segmentStartByte, segmentEndByteExclusive],
      physicalLineRange: [segmentStartLine, segmentEndLine],
    };
  });
}

function describeFixture(fixture) {
  const output = fixture?.output || {};
  const fullText = String(output.text || '');
  if (!fullText) {
    assert(String(output.stable?.text || '') === '' && String(output.slow?.text || '') === '' && String(output.volatile?.text || '') === '', `inactive tier mismatch: ${fixture.id}`);
    return {
      id: fixture.id,
      family: fixture.family,
      active: false,
      a2PromptSha256: output.sha256,
      reconstructedPromptSha256: sha256(''),
      exactByteEquivalent: output.sha256 === sha256(''),
      segments: [],
    };
  }

  const segments = [];
  const stableText = String(output.stable?.text || '');
  assert(stableText, `active fixture stable tier missing: ${fixture.id}`);
  segments.push(makeDescriptor({
    id: 'SIMCORE_T1_STABLE_CONTRACT',
    owner: 'SIMCORE_PROMPT_COMPILER',
    semanticRole: 'long-lived SimCore ABI core contract',
    stabilityClass: T1,
    orderClass: 'PHYSICAL_CURRENT_ORDER',
    text: stableText,
    breakAuthority: 'Explicit stable Prompt Cache ABI change only',
    sourceReference: `A2:${fixture.id}:stable`,
    providerHintEligibility: 'ARCHITECTURAL_CANDIDATE_ONLY',
  }));

  splitLines(output.slow?.text).forEach((line, index) => segments.push(classifySlowLine(line, index, fixture.id)));
  segments.push(...classifyVolatile(output.volatile?.text, fixture.id));

  const ranged = withPhysicalRanges(segments);
  const reconstructed = ranged.map((segment) => `${segment.separatorBefore}${segment.serializedText}`).join('');
  assert(reconstructed === fullText, `descriptor reconstruction drift: ${fixture.id}`);
  assert(sha256(reconstructed) === output.sha256, `descriptor SHA drift: ${fixture.id}`);
  assert(Buffer.byteLength(reconstructed, 'utf8') === output.byteLength, `descriptor byte-length drift: ${fixture.id}`);

  return {
    id: fixture.id,
    family: fixture.family,
    active: true,
    a2PromptSha256: output.sha256,
    reconstructedPromptSha256: sha256(reconstructed),
    exactByteEquivalent: reconstructed === fullText,
    reconstructedByteLength: Buffer.byteLength(reconstructed, 'utf8'),
    segmentCount: ranged.length,
    segments: ranged,
  };
}

const fixtures = a2.fixtures.map(describeFixture);
const active = fixtures.filter((fixture) => fixture.active);
const stableDescriptors = active.map((fixture) => fixture.segments.find((segment) => segment.id === 'SIMCORE_T1_STABLE_CONTRACT'));
const uniqueT1 = [...new Set(stableDescriptors.map((segment) => segment?.byteFingerprint))];
const unknownSemanticFingerprints = fixtures.flatMap((fixture) => fixture.segments).filter((segment) => segment.semanticFingerprint !== null);
const classCounts = fixtures.flatMap((fixture) => fixture.segments).reduce((acc, segment) => {
  acc[segment.stabilityClass] = (acc[segment.stabilityClass] || 0) + 1;
  return acc;
}, {});

assert(fixtures.every((fixture) => fixture.exactByteEquivalent), 'not all A3 fixtures are exact-byte equivalent');
assert(uniqueT1.length === 1, `A3 T1 descriptor drift: ${uniqueT1.join(',')}`);
assert(unknownSemanticFingerprints.length === 0, 'A3 must not self-declare semantic fingerprints');

const manifest = {
  schema: 'SimCoreCacheA3ShadowDescriptorBaselineV1',
  source: {
    authority: 'A2_GOLDEN_ORACLE',
    sourcePath,
    a2Schema: a2.schema,
    productionAuthority: a2.source?.authority || 'unknown',
    pluginVersion: a2.source?.pluginVersion || 'unknown',
    runtimeVersion: a2.source?.runtimeVersion || 'unknown',
    promptCompilerVersion: a2.source?.promptCompilerVersion ?? null,
    productionSourceSha256: a2.source?.sourceSha256 || 'unknown',
    a2GoldenSha256: sha256(a2Text),
  },
  invariants: {
    runtimeMutation: 'NONE',
    serializerConsolidation: 'NOT_JUSTIFIED_NO_OP',
    promptReordering: 'NONE',
    promptByteRewrite: 'NONE',
    semanticFingerprintAuthority: 'NOT_CLAIMED',
    providerCache: 'UNVERIFIED',
    providerHintDecision: 'NONE',
    reconstructionRule: 'CONCATENATE separatorBefore + serializedText IN physicalOrder',
  },
  summary: {
    fixtureCount: fixtures.length,
    activeFixtureCount: active.length,
    exactByteEquivalentCount: fixtures.filter((fixture) => fixture.exactByteEquivalent).length,
    uniqueActiveT1FingerprintCount: uniqueT1.length,
    activeT1ByteFingerprint: uniqueT1[0] || null,
    segmentStabilityClassCounts: classCounts,
  },
  descriptorContract: {
    name: 'PromptSegmentDescriptorV1_SHADOW',
    conceptualAuthority: 'docs/SIMCORE_CACHE_ARCHITECTURE_MASTER_DESIGN_2026-09-03.md',
    semanticFingerprintRule: 'null until derived from an authorized semantic-input contract; bytes alone do not prove semantic identity',
    providerHintRule: 'shadow metadata cannot authorize provider transport controls',
    physicalOrderRule: 'descriptor classification does not authorize prompt movement',
  },
  fixtures,
};

const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

if (mode === '--print') {
  process.stdout.write(rendered);
} else if (mode === '--write') {
  if (!targetPath) throw new Error('--write requires target path');
  fs.writeFileSync(targetPath, rendered, 'utf8');
  process.stdout.write(`wrote ${targetPath}\n`);
} else if (mode === '--verify') {
  if (!targetPath) throw new Error('--verify requires target path');
  const expected = fs.readFileSync(targetPath, 'utf8');
  if (expected !== rendered) throw new Error('CACHE-A3 shadow descriptor drift');
  process.stdout.write(`CACHE-A3 exact shadow descriptor PASS: ${targetPath}\n`);
} else {
  throw new Error(`unknown mode: ${mode}`);
}
