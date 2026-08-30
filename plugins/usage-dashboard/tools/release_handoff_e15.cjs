'use strict';

const CANONICAL_PLUGIN_LINE = 'Plugin: usage-dashboard';
const PLUGIN_VALUE = 'usage-dashboard';
const SHA40_RE = /\b[0-9a-f]{40}\b/i;
const PR_REQUEST_MARKER_RE = /^Usage-Dashboard-Release-Request: #([1-9]\d*)$/;

const E15_IMPLEMENTATION_STATUS = Object.freeze({
  schema: 1,
  implementation: 'baseline-active',
  durableReleaseGeneration: 'E13',
  durableGeneration: false,
  documentationMode: 'generated-parity',
  liveEvidenceIssue: '#869',
});

const REQUIRED_PR_LOCATOR_ENTRIES = Object.freeze([
  Object.freeze({key:'candidate-authority', line:'Candidate authority: current PR head'}),
  Object.freeze({key:'source-authority', line:'Source authority: durable release request `source_sha`'}),
  Object.freeze({key:'frozen-main-authority', line:'Frozen-main authority: candidate trailer + E11 receipt'}),
  Object.freeze({key:'validation-authority', line:'Validation authority: E9 exact-SHA receipt'}),
  Object.freeze({key:'merge-authority', line:'Merge authority: fresh E11 receipt + expected-head merge'}),
]);
const REQUIRED_PR_LOCATORS = Object.freeze(REQUIRED_PR_LOCATOR_ENTRIES.map((entry) => entry.line));

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizedLines(body) {
  return String(body || '').replace(/\r/g, '').split('\n');
}

function explicitPluginDeclarations(body) {
  const lines = normalizedLines(body);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const direct = /^Plugin:\s*(.*?)\s*$/i.exec(trimmed);
    if (direct) {
      out.push({form:'direct', raw:trimmed, value:direct[1]});
      continue;
    }
    if (/^###\s+Plugin\s*$/i.test(trimmed)) {
      let value = '';
      for (let j = i + 1; j < lines.length; j += 1) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        value = candidate;
        break;
      }
      out.push({form:'heading', raw:trimmed, value});
    }
  }
  return out;
}

function validateRequestPluginDeclaration(body) {
  const declarations = explicitPluginDeclarations(body);
  if (!declarations.length) fail('E15_REQUEST_PLUGIN_MISSING');
  if (declarations.length > 1) {
    const conflicting = declarations.find((entry) => entry.value !== PLUGIN_VALUE);
    if (conflicting) fail('E15_REQUEST_PLUGIN_CONFLICT', conflicting.value || '<empty>');
    fail('E15_REQUEST_PLUGIN_DUPLICATE');
  }
  const declaration = declarations[0];
  if (declaration.value !== PLUGIN_VALUE) fail('E15_REQUEST_PLUGIN_CONFLICT', declaration.value || '<empty>');
  if (declaration.form !== 'direct' || declaration.raw !== CANONICAL_PLUGIN_LINE) {
    fail('E15_REQUEST_PLUGIN_NONCANONICAL');
  }
  return PLUGIN_VALUE;
}

function requireOneLine(value, label) {
  const text = String(value ?? '').trim();
  if (!text) fail('E15_PR_RENDER_FIELD_MISSING', label);
  if (/[\r\n]/.test(text)) fail('E15_PR_RENDER_FIELD_MULTILINE', label);
  return text;
}

function requireRequestNumber(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail('E15_PR_REQUEST_NUMBER_INVALID', String(value));
  return number;
}

function renderStableLocatorBlock() {
  return REQUIRED_PR_LOCATORS.join('\n');
}

function renderStablePrBody(input = {}) {
  const version = requireOneLine(input.version, 'version');
  const summary = String(input.summary ?? '').replace(/\r/g, '').trim();
  if (!summary) fail('E15_PR_RENDER_FIELD_MISSING', 'summary');
  const productVersion = requireOneLine(input.productVersion, 'productVersion');
  const engineVersion = requireOneLine(input.engineVersion, 'engineVersion');
  const managerVersion = requireOneLine(input.managerVersion, 'managerVersion');
  const snapshotContract = requireOneLine(input.snapshotContract, 'snapshotContract');
  const recentRequestContract = requireOneLine(input.recentRequestContract, 'recentRequestContract');
  const requestNumber = requireRequestNumber(input.requestNumber);
  const body = [
    `## Local Usage Dashboard ${version}`,
    '',
    summary,
    '',
    `- Product: \`${productVersion}\``,
    `- Engine: \`${engineVersion}\``,
    `- Manager: \`${managerVersion}\``,
    `- contracts: \`${snapshotContract}/${recentRequestContract}\``,
    '',
    ...REQUIRED_PR_LOCATORS,
    '',
    `Usage-Dashboard-Release-Request: #${requestNumber}`,
  ].join('\n');
  validateStablePrBody(body, requestNumber);
  return body;
}

function validateStablePrBody(body, requestNumber) {
  const expectedRequest = requireRequestNumber(requestNumber);
  const lines = normalizedLines(body).map((line) => line.trim());
  for (const locator of REQUIRED_PR_LOCATOR_ENTRIES) {
    const count = lines.filter((line) => line === locator.line).length;
    if (count !== 1) fail('E15_PR_LOCATOR_INVALID', `${locator.key}:count=${count}`);
  }

  const markers = lines
    .map((line) => PR_REQUEST_MARKER_RE.exec(line))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  if (markers.length !== 1) fail('E15_PR_REQUEST_MARKER_INVALID', `count=${markers.length}`);
  if (markers[0] !== expectedRequest) fail('E15_PR_REQUEST_MARKER_MISMATCH', `${markers[0]}!=${expectedRequest}`);

  for (const line of lines) {
    if (!SHA40_RE.test(line)) continue;
    if (/(candidate|source|frozen[-_ ]?main)/i.test(line)) {
      fail('E15_PR_MUTABLE_SHA_PROSE', line.slice(0, 160));
    }
  }
  return true;
}

module.exports = {
  CANONICAL_PLUGIN_LINE,
  PLUGIN_VALUE,
  E15_IMPLEMENTATION_STATUS,
  REQUIRED_PR_LOCATOR_ENTRIES,
  REQUIRED_PR_LOCATORS,
  explicitPluginDeclarations,
  validateRequestPluginDeclaration,
  renderStableLocatorBlock,
  renderStablePrBody,
  validateStablePrBody,
};
