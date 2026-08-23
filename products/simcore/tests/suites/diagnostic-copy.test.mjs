import { assert, equal } from '../../tooling/assertions.mjs';
import { loadFunctions } from '../../tooling/bundle-loader.mjs';
import { createDiagnosticDom } from '../../tooling/test-context.mjs';

export async function runSuite({ source, fixtures }) {
  const fixture = fixtures[0];
  const helpers = loadFunctions(source, ['diagnosticCopyErrorName', 'diagnosticCopyResult', 'runDiagnosticCopy']);
  const payload = fixture.input.payload;
  const assertions = [];

  {
    let build = 0, primary = 0, fallback = 0;
    const result = await helpers.runDiagnosticCopy(
      () => { build += 1; return payload; },
      async (text) => { primary += 1; equal(text, payload, 'primary payload'); },
      async () => { fallback += 1; return true; }
    );
    equal(result.status, fixture.expected['primary-success'], 'primary status');
    equal(build, 1, 'primary build count'); equal(primary, 1, 'primary copy count'); equal(fallback, 0, 'primary fallback count');
    assertions.push({ id: 'diagnostic-copy.primary-success', status: 'PASS' });
  }

  {
    let build = 0, primary = 0, fallback = 0; let primaryPayload = null, fallbackPayload = null;
    const result = await helpers.runDiagnosticCopy(
      () => { build += 1; return payload; },
      async (text) => { primary += 1; primaryPayload = text; throw new TypeError('synthetic primary failure'); },
      async (text) => { fallback += 1; fallbackPayload = text; return true; }
    );
    equal(result.status, fixture.expected['fallback-success'], 'fallback status');
    equal(build, 1, 'fallback build count'); equal(primary, 1, 'fallback primary count'); equal(fallback, 1, 'fallback count');
    equal(primaryPayload, fallbackPayload, 'immutable report reused');
    assertions.push({ id: 'diagnostic-copy.fallback-success', status: 'PASS' });
  }

  {
    let primary = 0, fallback = 0;
    const result = await helpers.runDiagnosticCopy(
      () => { throw new Error('synthetic build failure'); },
      async () => { primary += 1; },
      async () => { fallback += 1; return true; }
    );
    equal(result.status, fixture.expected['report-build-failed'], 'build failed status');
    equal(primary, 0, 'build fail primary count'); equal(fallback, 0, 'build fail fallback count');
    assertions.push({ id: 'diagnostic-copy.report-build-failed', status: 'PASS' });
  }

  {
    let build = 0;
    const result = await helpers.runDiagnosticCopy(
      () => { build += 1; return payload; },
      async () => { throw new Error('synthetic primary failure'); },
      async () => false
    );
    equal(result.status, fixture.expected['clipboard-write-failed'], 'clipboard failed status');
    equal(build, 1, 'clipboard fail build count');
    assertions.push({ id: 'diagnostic-copy.clipboard-write-failed', status: 'PASS' });
  }

  for (const mode of [{ execResult: true, expected: true, id: 'dom-success' }, { execResult: false, expected: false, id: 'dom-false' }, { execThrows: true, throws: true, id: 'dom-throw' }]) {
    const dom = createDiagnosticDom(mode);
    const { fallbackCopyText } = loadFunctions(source, ['fallbackCopyText'], { document: dom.document });
    let returned = null; let threw = false;
    try { returned = fallbackCopyText(payload); } catch (_) { threw = true; }
    if (mode.throws) assert(threw, 'DOM throw fixture must propagate exec failure');
    else equal(returned, mode.expected, `${mode.id} return`);
    equal(dom.body.children.length, 0, `${mode.id} cleanup`);
    assert(dom.events.includes('create'), `${mode.id} create`);
    assert(dom.events.includes('append'), `${mode.id} append`);
    assert(dom.events.includes('select'), `${mode.id} selection`);
    assert(dom.events.includes('exec:copy'), `${mode.id} exec copy`);
    assert(dom.events.includes('remove'), `${mode.id} remove`);
    assert(dom.events.includes('previous-focus'), `${mode.id} focus restore`);
    equal(dom.created.value, payload, `${mode.id} payload assigned`);
    assertions.push({ id: `diagnostic-copy.${mode.id}`, status: 'PASS' });
  }

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
