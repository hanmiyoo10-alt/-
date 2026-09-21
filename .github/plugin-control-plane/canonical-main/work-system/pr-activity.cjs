const fs = require('node:fs');

const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const PACKET_STATES = new Set([
  'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'DONE',
  'BLOCKED', 'CANCELLED', 'SUPERSEDED',
]);
const TERMINAL_PACKET_STATES = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
const ACTIVE_PACKET_STATES = new Set(['READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'BLOCKED']);
const SHA_RE = /^[0-9a-f]{40}$/i;

const REASON_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  INPUT_JSON_INVALID: 'INPUT_JSON_INVALID',
  PR_NATIVE_STATE_CONFLICT: 'PR_NATIVE_STATE_CONFLICT',
  PR_NATIVE_TERMINAL: 'PR_NATIVE_TERMINAL',
  OPEN_PR_DEFAULT_ACTIVE: 'OPEN_PR_DEFAULT_ACTIVE',
  PACKET_EVIDENCE_INVALID: 'PACKET_EVIDENCE_INVALID',
  PACKET_RELATION_MISMATCH: 'PACKET_RELATION_MISMATCH',
  PACKET_NATIVE_STATE_CONFLICT: 'PACKET_NATIVE_STATE_CONFLICT',
  LINKED_PACKET_ACTIVE: 'LINKED_PACKET_ACTIVE',
  LINKED_PACKET_TERMINAL: 'LINKED_PACKET_TERMINAL',
  ACTIVE_PACKET_SUPERSESSION_CONFLICT: 'ACTIVE_PACKET_SUPERSESSION_CONFLICT',
  SUCCESSOR_EVIDENCE_INVALID: 'SUCCESSOR_EVIDENCE_INVALID',
  SUCCESSOR_NATIVE_STATE_CONFLICT: 'SUCCESSOR_NATIVE_STATE_CONFLICT',
  SUCCESSOR_RELATION_CONFLICT: 'SUCCESSOR_RELATION_CONFLICT',
  SUPERSESSION_PROOF_INCOMPLETE: 'SUPERSESSION_PROOF_INCOMPLETE',
  SUPERSESSION_PROOF_CONTRADICTED: 'SUPERSESSION_PROOF_CONTRADICTED',
  MERGED_SUCCESSOR_PROVEN: 'MERGED_SUCCESSOR_PROVEN',
});
function boundedText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 240);
}

function uniqueRefs(...values) {
  return [...new Set(values.flat().filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
}

function result(state, reasonCode, candidateRef, evidence, sourceRefs, extra = {}) {
  return {
    schemaVersion: 1,
    state,
    reasonCode,
    candidateRef,
    evidence: boundedText(evidence),
    sourceRefs: uniqueRefs(sourceRefs),
    ...extra,
  };
}

function sectionLines(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}
function extractPacketState(body) {
  const stateSection = sectionLines(body, 'State');
  const stateText = stateSection ? stateSection.find((line) => line.trim()) : null;
  const fallback = body.match(/^\*\*State:\s*([^*]+)\*\*/mi)?.[1];
  const source = stateText || fallback || '';
  const match = source.match(/\b(READY|CLAIMED|IN_PROGRESS|REVIEW|DONE|BLOCKED|CANCELLED|SUPERSEDED)\b/);
  return match && PACKET_STATES.has(match[1]) ? match[1] : null;
}

function normalizePr(pr) {
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) return null;
  const ref = typeof pr.ref === 'string' ? pr.ref.trim() : '';
  const state = typeof pr.state === 'string' ? pr.state.trim().toLowerCase() : '';
  const headSha = typeof pr.headSha === 'string' ? pr.headSha.trim() : '';
  if (!ref || !['open', 'closed'].includes(state) || !SHA_RE.test(headSha) || typeof pr.merged !== 'boolean') return null;
  return {
    ref,
    state,
    merged: pr.merged,
    headSha: headSha.toLowerCase(),
    sourceRefs: uniqueRefs(pr.sourceRefs, ref),
  };
}

function normalizePacket(packet) {
  if (packet === undefined || packet === null) return null;
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return {invalid: true};
  const ref = typeof packet.ref === 'string' ? packet.ref.trim() : '';
  const issueState = typeof packet.issueState === 'string' ? packet.issueState.trim().toLowerCase() : '';
  const body = typeof packet.body === 'string' ? packet.body : '';
  const linkedPrRef = typeof packet.linkedPrRef === 'string' ? packet.linkedPrRef.trim() : '';
  if (!ref || !['open', 'closed'].includes(issueState) || !body.includes(PACKET_MARKER) || !linkedPrRef) return {invalid: true};
  const lifecycle = extractPacketState(body);
  if (!lifecycle) return {invalid: true};
  return {ref, issueState, body, linkedPrRef, lifecycle, sourceRefs: uniqueRefs(packet.sourceRefs, ref)};
}
function normalizeSuccessor(successor) {
  if (successor === undefined || successor === null) return null;
  if (!successor || typeof successor !== 'object' || Array.isArray(successor)) return {invalid: true};
  const ref = typeof successor.ref === 'string' ? successor.ref.trim() : '';
  const state = typeof successor.state === 'string' ? successor.state.trim().toLowerCase() : '';
  const mergeSha = typeof successor.mergeSha === 'string' ? successor.mergeSha.trim().toLowerCase() : '';
  const supersedesRef = typeof successor.supersedesRef === 'string' ? successor.supersedesRef.trim() : '';
  const ancestry = successor.ancestry === undefined ? null : String(successor.ancestry).trim().toUpperCase();
  const patchEquivalent = successor.patchEquivalent === undefined ? null : successor.patchEquivalent;
  if (!ref || !['open', 'closed'].includes(state) || typeof successor.merged !== 'boolean' || !supersedesRef) return {invalid: true};
  if (successor.merged && !SHA_RE.test(mergeSha)) return {invalid: true};
  if (ancestry !== null && !['PROVEN', 'CONTRADICTED', 'UNKNOWN'].includes(ancestry)) return {invalid: true};
  if (patchEquivalent !== null && typeof patchEquivalent !== 'boolean') return {invalid: true};
  return {
    ref,
    state,
    merged: successor.merged,
    mergeSha,
    supersedesRef,
    ancestry,
    patchEquivalent,
    sourceRefs: uniqueRefs(successor.sourceRefs, ref),
  };
}

function classifyPrActivity(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result('UNKNOWN', REASON_CODES.INPUT_INVALID, '<unresolved>', 'input must be an object', ['caller:input']);
  }
  const pr = normalizePr(input.pr);
  if (!pr) {
    return result('UNKNOWN', REASON_CODES.INPUT_INVALID, '<unresolved>', 'candidate PR requires ref, open|closed state, merged boolean, and exact head SHA', ['caller:pr']);
  }
  if (pr.state === 'open' && pr.merged) {
    return result('CONFLICT', REASON_CODES.PR_NATIVE_STATE_CONFLICT, pr.ref, 'candidate PR is natively open but marked merged', pr.sourceRefs);
  }
  if (pr.state === 'closed') {
    return result('NONBLOCKING_PROVEN', REASON_CODES.PR_NATIVE_TERMINAL, pr.ref, 'candidate PR is natively closed', pr.sourceRefs, {headSha: pr.headSha});
  }
  const packet = normalizePacket(input.linkedPacket);
  if (packet?.invalid) {
    return result('UNKNOWN', REASON_CODES.PACKET_EVIDENCE_INVALID, pr.ref, 'linked packet evidence is incomplete or unsupported', uniqueRefs(pr.sourceRefs, 'caller:linkedPacket'));
  }
  if (packet && packet.linkedPrRef !== pr.ref) {
    return result('CONFLICT', REASON_CODES.PACKET_RELATION_MISMATCH, pr.ref, `linked packet names ${packet.linkedPrRef}, not candidate ${pr.ref}`, uniqueRefs(pr.sourceRefs, packet.sourceRefs));
  }
  if (packet && packet.issueState === 'closed' && ACTIVE_PACKET_STATES.has(packet.lifecycle)) {
    return result('CONFLICT', REASON_CODES.PACKET_NATIVE_STATE_CONFLICT, pr.ref, `packet ${packet.ref} is natively closed while lifecycle is ${packet.lifecycle}`, uniqueRefs(pr.sourceRefs, packet.sourceRefs));
  }
  if (packet && packet.issueState === 'open' && TERMINAL_PACKET_STATES.has(packet.lifecycle)) {
    return result('CONFLICT', REASON_CODES.PACKET_NATIVE_STATE_CONFLICT, pr.ref, `packet ${packet.ref} is natively open while lifecycle is ${packet.lifecycle}`, uniqueRefs(pr.sourceRefs, packet.sourceRefs));
  }

  const successor = normalizeSuccessor(input.successor);
  if (successor?.invalid) {
    return result('UNKNOWN', REASON_CODES.SUCCESSOR_EVIDENCE_INVALID, pr.ref, 'successor evidence is incomplete or unsupported', uniqueRefs(pr.sourceRefs, 'caller:successor'));
  }
  if (successor && successor.state === 'open' && successor.merged) {
    return result('CONFLICT', REASON_CODES.SUCCESSOR_NATIVE_STATE_CONFLICT, pr.ref, `successor ${successor.ref} is natively open but marked merged`, uniqueRefs(pr.sourceRefs, successor.sourceRefs));
  }

  if (packet && ACTIVE_PACKET_STATES.has(packet.lifecycle)) {
    if (successor) {
      return result('CONFLICT', REASON_CODES.ACTIVE_PACKET_SUPERSESSION_CONFLICT, pr.ref, `active packet ${packet.ref} conflicts with supplied supersession claim`, uniqueRefs(pr.sourceRefs, packet.sourceRefs, successor.sourceRefs));
    }
    return result('ACTIVE_WRITER', REASON_CODES.LINKED_PACKET_ACTIVE, pr.ref, `linked packet ${packet.ref} is current ${packet.lifecycle}`, uniqueRefs(pr.sourceRefs, packet.sourceRefs), {headSha: pr.headSha, packetRef: packet.ref});
  }

  if (packet && TERMINAL_PACKET_STATES.has(packet.lifecycle)) {
    if (packet.issueState !== 'closed') {
      return result('CONFLICT', REASON_CODES.PACKET_NATIVE_STATE_CONFLICT, pr.ref, 'terminal packet must be natively closed before suppressing an open PR', uniqueRefs(pr.sourceRefs, packet.sourceRefs));
    }
    return result('NONBLOCKING_PROVEN', REASON_CODES.LINKED_PACKET_TERMINAL, pr.ref, `linked packet ${packet.ref} is closed and terminal ${packet.lifecycle}`, uniqueRefs(pr.sourceRefs, packet.sourceRefs), {headSha: pr.headSha, packetRef: packet.ref});
  }
  if (successor) {
    const relationMatches = successor.supersedesRef === pr.ref || (packet && successor.supersedesRef === packet.ref);
    if (!relationMatches) {
      return result('CONFLICT', REASON_CODES.SUCCESSOR_RELATION_CONFLICT, pr.ref, `successor ${successor.ref} does not explicitly supersede candidate or linked packet`, uniqueRefs(pr.sourceRefs, successor.sourceRefs, packet?.sourceRefs));
    }
    if (successor.state !== 'closed' || !successor.merged) {
      return result('UNKNOWN', REASON_CODES.SUPERSESSION_PROOF_INCOMPLETE, pr.ref, `successor ${successor.ref} is not proven merged/closed`, uniqueRefs(pr.sourceRefs, successor.sourceRefs));
    }

    const proven = successor.ancestry === 'PROVEN' || successor.patchEquivalent === true;
    const contradicted = successor.ancestry === 'CONTRADICTED' || successor.patchEquivalent === false;
    if (proven) {
      return result('NONBLOCKING_PROVEN', REASON_CODES.MERGED_SUCCESSOR_PROVEN, pr.ref, `merged successor ${successor.ref} has exact supplied ancestry/patch proof`, uniqueRefs(pr.sourceRefs, successor.sourceRefs), {
        headSha: pr.headSha,
        successorRef: successor.ref,
        successorMergeSha: successor.mergeSha,
      });
    }
    if (contradicted) {
      return result('CONFLICT', REASON_CODES.SUPERSESSION_PROOF_CONTRADICTED, pr.ref, `successor ${successor.ref} supersession claim is contradicted by exact supplied evidence`, uniqueRefs(pr.sourceRefs, successor.sourceRefs));
    }
    return result('UNKNOWN', REASON_CODES.SUPERSESSION_PROOF_INCOMPLETE, pr.ref, `successor ${successor.ref} lacks exact ancestry or patch-equivalence proof`, uniqueRefs(pr.sourceRefs, successor.sourceRefs));
  }

  return result('ACTIVE_WRITER', REASON_CODES.OPEN_PR_DEFAULT_ACTIVE, pr.ref, 'candidate PR is open and no mechanically proven nonblocking evidence was supplied', pr.sourceRefs, {headSha: pr.headSha});
}

function readCliInput(filePath) {
  return filePath ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(0, 'utf8');
}

if (require.main === module) {
  let output;
  try {
    output = classifyPrActivity(JSON.parse(readCliInput(process.argv[2])));
  } catch (error) {
    output = result('UNKNOWN', REASON_CODES.INPUT_JSON_INVALID, '<unresolved>', error?.message || 'invalid JSON input', ['caller:input']);
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (output.state === 'UNKNOWN') process.exitCode = 2;
  else if (output.state === 'CONFLICT') process.exitCode = 3;
}

module.exports = {REASON_CODES, classifyPrActivity};