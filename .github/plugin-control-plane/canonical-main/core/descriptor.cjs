'use strict';

function validateDescriptor(descriptor, policy) {
  const errors = [];
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) return ['descriptor must be an object'];
  if (descriptor.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(descriptor.id || '')) errors.push('id must be machine-safe kebab-case');
  if (!['plugin', 'product'].includes(descriptor.kind)) errors.push('kind must be plugin or product');
  if (!descriptor.displayName) errors.push('displayName missing');
  if (!descriptor.projectPath || descriptor.projectPath.startsWith('/') || descriptor.projectPath.includes('..')) errors.push('projectPath invalid');
  if (!descriptor.guidelines || !descriptor.guidelines.startsWith('docs/') || descriptor.guidelines.includes('..')) errors.push('guidelines must stay under docs/');
  if (!descriptor.authority || typeof descriptor.authority !== 'object') errors.push('authority missing');
  if (!descriptor.memory || !policy?.bootstrap?.profiles?.includes(descriptor.memory.profile)) errors.push('memory.profile unsupported');
  if (!descriptor.alerts || descriptor.alerts.policy !== policy?.bootstrap?.defaultAlertPolicy) errors.push('alerts.policy must inherit repo-default in phase A');
  const authorityType = descriptor.authority?.type;
  if (!['release', 'manifest', 'evidence', 'none'].includes(authorityType)) errors.push('authority.type unsupported');
  if (authorityType === 'release' && !descriptor.authority.releaseBranch) errors.push('release authority requires releaseBranch');
  if (authorityType === 'manifest' && !descriptor.authority.manifest) errors.push('manifest authority requires manifest');
  if (authorityType === 'evidence' && !descriptor.authority.evidence) errors.push('evidence authority requires evidence');
  if (descriptor.memory?.profile === 'check-only' && authorityType !== 'none' && authorityType !== 'evidence') errors.push('check-only profile requires none/evidence authority');
  if (descriptor.memory?.profile !== 'check-only' && (!Array.isArray(descriptor.memory.outputs) || descriptor.memory.outputs.length === 0)) errors.push('writable memory profile requires outputs');
  for (const output of descriptor.memory?.outputs || []) {
    if (output.startsWith('/') || output.includes('..')) errors.push(`memory output invalid: ${output}`);
  }
  return errors;
}

module.exports = {validateDescriptor};
