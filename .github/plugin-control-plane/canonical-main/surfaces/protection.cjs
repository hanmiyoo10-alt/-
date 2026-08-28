'use strict';

const START = '<!-- canonical-main-protection-start -->';
const END = '<!-- canonical-main-protection-end -->';
function renderProtectionSection(observation) {
  const checks = observation.requiredChecks.length ? observation.requiredChecks.map((row) => `\`${row}\``).join(', ') : 'none';
  const attemptState = observation.automaticActivationAttempt
    ? observation.automaticActivationDeferred ? 'DEFERRED_PERMISSION' : 'ENABLED'
    : 'DISABLED';
  return [
    START,
    '## Protected main',
    '',
    `- Protection state: \`${observation.state}\``,
    `- GitHub branch protected: \`${observation.protected}\``,
    `- Required status-check enforcement: \`${observation.enforcementLevel}\``,
    `- Required target: \`${observation.requiredName}\` / API context \`${observation.requiredApiContext}\` — \`${observation.requiredPresent ? 'PRESENT' : 'NOT_ENFORCED'}\``,
    `- Observed required checks: ${checks}`,
    `- Protected writer gateway: \`${observation.writerGatewayReady ? 'READY' : 'DRIFT'}\` — ${observation.activeWriterCount} active writers`,
    `- Exact-candidate shadow proof: \`${observation.shadowProof}\``,
    `- Native activation capability: \`${observation.activationCapabilityState}\` — \`${observation.activationCapabilityReason}\``,
    `- Automatic native activation attempt: \`${attemptState}\``,
    `- Soft enforcement fallback: \`${observation.softEnforcementEnabled ? 'ACTIVE' : 'DISABLED'}\` — \`${observation.softEnforcementStrategy}\``,
    `- Soft fallback equals native protection: \`${observation.nativeProtectionEquivalent}\``,
    ...(observation.writerErrors.length ? observation.writerErrors.map((row) => `- Writer contract error: \`${row}\``) : []),
    '- Native protection truth comes only from direct GitHub read-back. Capability accounting may defer attempts, and an ACTIVE soft fallback never makes native protection active.',
    END,
  ].join('\n');
}
function replaceProtectionSection(body, section) {
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (pattern.test(body)) return body.replace(pattern, section);
  const anchor = '\n## Main-write / durable-memory adapters', index = body.indexOf(anchor);
  return index >= 0 ? `${body.slice(0, index)}\n\n${section}${body.slice(index)}` : `${body.trimEnd()}\n\n${section}\n`;
}
module.exports = {START, END, renderProtectionSection, replaceProtectionSection};
