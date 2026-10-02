'use strict';

const fs = require('node:fs');
const path = require('node:path');
const policy = require('./policy.json');

const MAX_BODY_BYTES = 128 * 1024;

const PACKET_MARKER = `<!-- ${policy.markers.workPacket} -->`;
const PACKET_STATES = Object.freeze([...policy.packetStates]);
const INTERACTION_STAGES = Object.freeze([...policy.stagedInteraction.stages]);
const REASON_CODES = Object.freeze({
  INPUT_BODY_INVALID: 'INPUT_BODY_INVALID',
  PACKET_MARKER_MISSING: 'PACKET_MARKER_MISSING',
  PACKET_MARKER_DUPLICATE: 'PACKET_MARKER_DUPLICATE',
  STATE_PROJECTION_MISSING: 'STATE_PROJECTION_MISSING',
  STATE_PROJECTION_DUPLICATE: 'STATE_PROJECTION_DUPLICATE',
  STATE_PROJECTION_MALFORMED: 'STATE_PROJECTION_MALFORMED',
  PACKET_LIFECYCLE_UNKNOWN: 'PACKET_LIFECYCLE_UNKNOWN',
  PACKET_LIFECYCLE_CONFLICT: 'PACKET_LIFECYCLE_CONFLICT',
  INTERACTION_STAGE_SECTION_MISSING: 'INTERACTION_STAGE_SECTION_MISSING',
  INTERACTION_STAGE_SECTION_DUPLICATE: 'INTERACTION_STAGE_SECTION_DUPLICATE',
  INTERACTION_STAGE_CURRENT_MISSING: 'INTERACTION_STAGE_CURRENT_MISSING',
  INTERACTION_STAGE_CURRENT_DUPLICATE: 'INTERACTION_STAGE_CURRENT_DUPLICATE',
  INTERACTION_STAGE_UNKNOWN: 'INTERACTION_STAGE_UNKNOWN',
  INTERACTION_STAGE_CONFLICT: 'INTERACTION_STAGE_CONFLICT',
});

function uniq(values) {
  return [...new Set(values)];
}

function normalizeText(body) {
  return typeof body === 'string' ? body.replace(/\r\n/g, '\n') : null;
}

function sections(text, heading) {
  const lines = text.split('\n');
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== `## ${heading}`) continue;
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^##\s+/.test(lines[cursor])) break;
      body.push(lines[cursor]);
    }
    found.push(body);
  }
  return found;
}

function stateProjectionLines(text) {
  const values = [];
  for (const section of sections(text, 'State')) {
    const nonEmpty = section.map((line) => line.trim()).filter(Boolean);
    if (nonEmpty.length !== 1) return {ok: false, values, malformed: true};
    values.push(nonEmpty[0]);
  }
  const bold = /^\*\*State:\s*([^*\n]+)\*\*\s*$/gmi;
  for (const match of text.matchAll(bold)) values.push(match[1].trim());
  return {ok: true, values, malformed: false};
}

function lifecycleTokens(value) {
  const escaped = PACKET_STATES.map((state) => state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
  return [...String(value || '').matchAll(pattern)].map((match) => match[1]);
}

function parseLifecycle(body) {
  const text = normalizeText(body);
  if (text === null) return {lifecycle: null, reasonCodes: [REASON_CODES.INPUT_BODY_INVALID], conflict: false};
  const projection = stateProjectionLines(text);
  if (!projection.ok) return {lifecycle: null, reasonCodes: [REASON_CODES.STATE_PROJECTION_MALFORMED], conflict: false};
  if (projection.values.length === 0) return {lifecycle: null, reasonCodes: [REASON_CODES.STATE_PROJECTION_MISSING], conflict: false};
  if (projection.values.length !== 1) return {lifecycle: null, reasonCodes: [REASON_CODES.STATE_PROJECTION_DUPLICATE], conflict: true};
  const tokens = lifecycleTokens(projection.values[0]);
  if (tokens.length === 0) return {lifecycle: null, reasonCodes: [REASON_CODES.PACKET_LIFECYCLE_UNKNOWN], conflict: false};
  if (tokens.length !== 1) return {lifecycle: null, reasonCodes: [REASON_CODES.PACKET_LIFECYCLE_CONFLICT], conflict: true};
  return {lifecycle: tokens[0], reasonCodes: [], conflict: false};
}

function extractPacketLifecycle(body) {
  return parseLifecycle(body).lifecycle;
}

function parseInteractionStage(body) {
  const text = normalizeText(body);
  if (text === null) return {interactionStage: null, reasonCodes: [REASON_CODES.INPUT_BODY_INVALID], conflict: false};
  const found = sections(text, 'Interaction stage');
  if (found.length === 0) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_SECTION_MISSING], conflict: false};
  if (found.length !== 1) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_SECTION_DUPLICATE], conflict: true};
  const currentLines = found[0].map((line) => line.trim()).filter((line) => /^- Current(?:\/next)? stage:/.test(line));
  if (currentLines.length === 0) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_CURRENT_MISSING], conflict: false};
  if (currentLines.length !== 1) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_CURRENT_DUPLICATE], conflict: true};
  const escaped = INTERACTION_STAGES.map((stage) => stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
  const tokens = [...currentLines[0].matchAll(pattern)].map((match) => match[1]);
  if (tokens.length === 0) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_UNKNOWN], conflict: false};
  if (tokens.length !== 1) return {interactionStage: null, reasonCodes: [REASON_CODES.INTERACTION_STAGE_CONFLICT], conflict: true};
  return {interactionStage: tokens[0], reasonCodes: [], conflict: false};
}

function classifyPacketProjection(body) {
  const text = normalizeText(body);
  const reasonCodes = [];
  let conflict = false;
  if (text === null) {
    return result('UNKNOWN', null, null, [REASON_CODES.INPUT_BODY_INVALID]);
  }
  const markerCount = text.split('\n').filter((line) => line.trim() === PACKET_MARKER).length;
  if (markerCount === 0) reasonCodes.push(REASON_CODES.PACKET_MARKER_MISSING);
  if (markerCount > 1) {
    reasonCodes.push(REASON_CODES.PACKET_MARKER_DUPLICATE);
    conflict = true;
  }

  const lifecycle = parseLifecycle(text);
  reasonCodes.push(...lifecycle.reasonCodes);
  conflict ||= lifecycle.conflict;

  const stage = parseInteractionStage(text);
  reasonCodes.push(...stage.reasonCodes);
  conflict ||= stage.conflict;

  const disposition = conflict ? 'CONFLICT' : reasonCodes.length ? 'UNKNOWN' : 'PASS';
  return result(disposition, lifecycle.lifecycle, stage.interactionStage, reasonCodes);
}

function result(disposition, lifecycle, interactionStage, reasonCodes) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_PACKET_PROJECTION',
    disposition,
    lifecycle,
    interactionStage,
    reasonCodes: uniq(reasonCodes).sort(),
    mutationAuthorized: false,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--body-file' || !argv[1]) {
    throw new Error('usage: node packet-projection.cjs --body-file <packet-body.md>');
  }
  return {bodyFile: argv[1]};
}

function readBodyFile(bodyFile) {
  const resolved = path.resolve(bodyFile);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BODY_BYTES) {
    throw new Error('body-file must be a bounded regular file');
  }
  const body = fs.readFileSync(resolved, 'utf8');
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    throw new Error('body-file exceeds size bound');
  }
  return body;
}

function exitCodeFor(projection) {
  if (projection?.disposition === 'PASS') return 0;
  if (projection?.disposition === 'CONFLICT') return 2;
  return 3;
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  return classifyPacketProjection(readBodyFile(args.bodyFile));
}

function main() {
  try {
    const projection = run();
    process.stdout.write(`${JSON.stringify(projection)}\n`);
    process.exitCode = exitCodeFor(projection);
  } catch {
    const projection = result('UNKNOWN', null, null, [REASON_CODES.INPUT_BODY_INVALID]);
    process.stdout.write(`${JSON.stringify(projection)}\n`);
    process.exitCode = 3;
  }
}

if (require.main === module) main();

module.exports = {
  INTERACTION_STAGES,
  MAX_BODY_BYTES,
  PACKET_MARKER,
  PACKET_STATES,
  REASON_CODES,
  classifyPacketProjection,
  exitCodeFor,
  extractPacketLifecycle,
  parseArgs,
  parseInteractionStage,
  parseLifecycle,
  readBodyFile,
  run,
};
