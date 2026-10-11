'use strict';

const {
  classifyPacketProjection,
  readBodyFile,
} = require('./packet-projection.cjs');
const {extractPacketScopes} = require('./scope-overlap.cjs');

const REASON_CODES = Object.freeze({
  PACKET_SCOPE_UNRESOLVED: 'PACKET_SCOPE_UNRESOLVED',
  PACKET_SCOPE_CONFLICT: 'PACKET_SCOPE_CONFLICT',
  PACKET_SCOPE_SECTION_IDENTITY_UNRESOLVED: 'PACKET_SCOPE_SECTION_IDENTITY_UNRESOLVED',
  PACKET_SCOPE_PRESERVATION_BOUNDARY_REQUIRED: 'PACKET_SCOPE_PRESERVATION_BOUNDARY_REQUIRED',
});

function bounded(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 240);
}

function levelTwoSections(body) {
  const lines = String(body ?? '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^##\s+/.test(lines[index])) continue;
    let end = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^##\s+/.test(lines[cursor])) {
        end = cursor;
        break;
      }
    }
    sections.push({
      startLine: index + 1,
      text: lines.slice(index, end).join('\n'),
      lines: lines.slice(index + 1, end),
    });
  }
  return sections;
}

function semanticScopeSection(body) {
  const candidates = levelTwoSections(body).filter((section) => extractPacketScopes(section.text).ok);
  return candidates.length === 1 ? candidates[0] : null;
}

function preservationCue(line) {
  const text = String(line ?? '').trim();
  if (!text || /^#{1,6}\s+/.test(text)) return false;
  return /^(?:[-*+]\s*)?(?:preserve(?:d|\s+unchanged)?|preservation|exclude(?:d)?|do\s+not\s+(?:modify|touch)|non-write|forbidden)\b/i.test(text);
}

function scopeToken(line) {
  return /(?:^|[\s`])(?:path|surface):[^\s`]+/.test(String(line ?? ''));
}

function findPreservationScopeInflation(body) {
  const section = semanticScopeSection(body);
  if (!section) return null;
  let cue = null;
  for (let index = 0; index < section.lines.length; index += 1) {
    const line = section.lines[index];
    if (!cue && preservationCue(line)) {
      cue = {line: section.startLine + index + 1, excerpt: bounded(line)};
      continue;
    }
    if (cue && scopeToken(line)) {
      return {
        cueLine: cue.line,
        cueExcerpt: cue.excerpt,
        scopeLine: section.startLine + index + 1,
        scopeExcerpt: bounded(line),
      };
    }
  }
  return null;
}

function classifyPacketAuthoring(body) {
  const projection = classifyPacketProjection(body);
  if (projection.disposition !== 'PASS') {
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
      disposition: projection.disposition,
      lifecycle: projection.lifecycle,
      interactionStage: projection.interactionStage,
      normalizedScopes: [],
      reasonCodes: projection.reasonCodes,
      finding: null,
      mutationAuthorized: false,
    };
  }

  const parsedScopes = extractPacketScopes(body);
  if (!parsedScopes.ok) {
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
      disposition: parsedScopes.conflict ? 'CONFLICT' : 'UNKNOWN',
      lifecycle: projection.lifecycle,
      interactionStage: projection.interactionStage,
      normalizedScopes: parsedScopes.scopes.map((scope) => scope.normalized),
      reasonCodes: [parsedScopes.conflict
        ? REASON_CODES.PACKET_SCOPE_CONFLICT
        : REASON_CODES.PACKET_SCOPE_UNRESOLVED],
      finding: {excerpt: bounded(parsedScopes.reason)},
      mutationAuthorized: false,
    };
  }

  const section = semanticScopeSection(body);
  if (!section) {
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
      disposition: 'UNKNOWN',
      lifecycle: projection.lifecycle,
      interactionStage: projection.interactionStage,
      normalizedScopes: parsedScopes.scopes.map((scope) => scope.normalized),
      reasonCodes: [REASON_CODES.PACKET_SCOPE_SECTION_IDENTITY_UNRESOLVED],
      finding: null,
      mutationAuthorized: false,
    };
  }

  const finding = findPreservationScopeInflation(body);
  if (finding) {
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
      disposition: 'CONFLICT',
      lifecycle: projection.lifecycle,
      interactionStage: projection.interactionStage,
      normalizedScopes: parsedScopes.scopes.map((scope) => scope.normalized),
      reasonCodes: [REASON_CODES.PACKET_SCOPE_PRESERVATION_BOUNDARY_REQUIRED],
      finding,
      mutationAuthorized: false,
    };
  }

  return {
    schemaVersion: 1,
    mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
    disposition: 'PASS',
    lifecycle: projection.lifecycle,
    interactionStage: projection.interactionStage,
    normalizedScopes: parsedScopes.scopes.map((scope) => scope.normalized),
    reasonCodes: [],
    finding: null,
    mutationAuthorized: false,
  };
}

function exitCodeFor(result) {
  if (result?.disposition === 'PASS') return 0;
  if (result?.disposition === 'CONFLICT') return 2;
  return 3;
}

function main() {
  let result;
  try {
    const argv = process.argv.slice(2);
    if (argv.length !== 2 || argv[0] !== '--body-file' || !argv[1]) throw new Error('invalid args');
    result = classifyPacketAuthoring(readBodyFile(argv[1]));
  } catch {
    result = {
      schemaVersion: 1,
      mode: 'CANONICAL_PACKET_AUTHORING_PREFLIGHT',
      disposition: 'UNKNOWN',
      lifecycle: null,
      interactionStage: null,
      normalizedScopes: [],
      reasonCodes: ['INPUT_BODY_INVALID'],
      finding: null,
      mutationAuthorized: false,
    };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  REASON_CODES,
  classifyPacketAuthoring,
  exitCodeFor,
  findPreservationScopeInflation,
};
