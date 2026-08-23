import { equal, assert } from '../../tooling/assertions.mjs';

export async function runSuite({ loader, fixtures }) {
  const community = loader.load('community');
  const reaction = loader.load('reaction');
  const structure = loader.load('structure');
  assert(typeof structure.validateStructure === 'function', 'Structure judge surface missing');
  const fixture = fixtures[0];
  const assertions = [];
  for (const row of fixture.input.cases) {
    const units = community.commentUnits(row.text);
    assert(units.length >= 1, `${row.id} no logical unit`);
    if (row.kind) equal(units[0].kind, row.kind, `${row.id} unit kind`);
    const inspected = reaction.inspectCommentReactionLine(units[0].text);
    const expected = fixture.expected[row.id];
    if (expected === 'PASS') assert(inspected.ok, `${row.id} expected pass: ${JSON.stringify(inspected)}`);
    else {
      assert(!inspected.ok, `${row.id} expected failure`);
      equal(inspected.failureReason, expected, `${row.id} failureReason`);
    }
    assertions.push({ id: row.id, status: 'PASS' });
  }
  const units = community.commentUnits(fixture.input.section4Top1Reply);
  const top = units.filter((x) => x.kind === 'TOP').length;
  const reply = units.filter((x) => x.kind === 'REPLY').length;
  const failures = units.filter((x) => !reaction.inspectCommentReactionLine(x.text).ok).length;
  equal(units.length, fixture.expected.sectionCounts.units, '4+1 units');
  equal(top, fixture.expected.sectionCounts.top, '4+1 top');
  equal(reply, fixture.expected.sectionCounts.reply, '4+1 reply');
  equal(failures, fixture.expected.sectionCounts.failures, '4+1 reaction failures');
  assertions.push({ id: 'section-4-top-1-reply-valid', status: 'PASS' });
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
