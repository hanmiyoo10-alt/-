import { equal, assert, deepEqual } from '../../tooling/assertions.mjs';

function expectedFor(fixture, id) {
  const row = fixture.expected[id];
  assert(row && typeof row === 'object', `${id} expected row missing`);
  return row;
}

function assertOptional(actual, expected, key, id) {
  if (Object.prototype.hasOwnProperty.call(expected, key)) {
    equal(actual[key], expected[key], `${id} ${key}`);
  }
}

export async function runSuite({ loader, fixtures }) {
  const frame = loader.load('frame');
  const structure = loader.load('structure');

  for (const name of [
    'parseFrame',
    'capturePreviousFrame',
    'enforceContinuity',
    'rewriteVolumeNumber',
    'rewriteChapterNumber',
    'rewriteChatindexNumber',
  ]) assert(typeof frame[name] === 'function', `Frame.${name} missing`);
  assert(typeof structure.responseEnvelopeScope === 'function', 'Structure.responseEnvelopeScope missing');

  const fixture = fixtures[0];
  const assertions = [];

  for (const row of fixture.input.parseCases) {
    const expected = expectedFor(fixture, row.id);
    const actual = frame.parseFrame(row.content);
    equal(actual.volume, expected.volume, `${row.id} volume`);
    equal(actual.chapter, expected.chapter, `${row.id} chapter`);
    equal(actual.chapterTitle, expected.chapterTitle, `${row.id} chapterTitle`);
    equal(actual.chatindex, expected.chatindex, `${row.id} chatindex`);
    assertions.push({ id: row.id, status: 'PASS' });
  }

  for (const row of fixture.input.captureCases) {
    const expected = expectedFor(fixture, row.id);
    const actual = frame.capturePreviousFrame(row.messages, row.sendIndex);
    if (expected.null) {
      equal(actual, null, `${row.id} must fail closed at nearest unframed assistant`);
    } else {
      assert(actual && typeof actual === 'object', `${row.id} capture missing`);
      equal(actual.sourceAssistantIndex, expected.sourceAssistantIndex, `${row.id} sourceAssistantIndex`);
      equal(actual.volume, expected.volume, `${row.id} volume`);
      equal(actual.chapter, expected.chapter, `${row.id} chapter`);
      equal(actual.chapterTitle, expected.chapterTitle, `${row.id} chapterTitle`);
      equal(actual.chatindex, expected.chatindex, `${row.id} chatindex`);
    }
    assertions.push({ id: row.id, status: 'PASS' });
  }

  for (const row of fixture.input.continuityCases) {
    const expected = expectedFor(fixture, row.id);
    const previous = frame.parseFrame(row.previous);
    const actual = frame.enforceContinuity(row.content, previous);
    const probe = actual.probe;
    const reparsed = frame.parseFrame(actual.content);

    equal(probe.applied, expected.applied, `${row.id} applied`);
    equal(probe.sequenceStatus, expected.sequenceStatus, `${row.id} sequenceStatus`);
    equal(probe.volumeSignal, expected.volumeSignal, `${row.id} volumeSignal`);
    equal(probe.chapterSignal, expected.chapterSignal, `${row.id} chapterSignal`);
    deepEqual(probe.repairs, expected.repairs, `${row.id} repairs`);
    deepEqual(probe.output, expected.output, `${row.id} probe.output`);
    equal(reparsed.volume, expected.output.volume, `${row.id} reparsed volume`);
    equal(reparsed.chapter, expected.output.chapter, `${row.id} reparsed chapter`);
    equal(reparsed.chatindex, expected.output.chatindex, `${row.id} reparsed chatindex`);
    if (Object.prototype.hasOwnProperty.call(expected, 'chapterTitle')) {
      equal(reparsed.chapterTitle, expected.chapterTitle, `${row.id} reparsed chapterTitle`);
    }
    if (!expected.applied) equal(actual.content, row.content, `${row.id} changed unexpectedly`);
    assertions.push({ id: row.id, status: 'PASS' });
  }

  for (const row of fixture.input.envelopeCases) {
    const expected = expectedFor(fixture, row.id);
    const actual = structure.responseEnvelopeScope(row.content);
    assertOptional(actual, expected, 'frameOk', row.id);
    assertOptional(actual, expected, 'orderOk', row.id);
    assertOptional(actual, expected, 'timestampMarkerFound', row.id);
    assertOptional(actual, expected, 'timestampValid', row.id);
    assertOptional(actual, expected, 'timestamp', row.id);
    assertions.push({ id: row.id, status: 'PASS' });
  }

  equal(assertions.length, 20, 'frame frozen case count');
  equal(fixture.meta.caseCount, 20, 'frame fixture metadata case count');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
