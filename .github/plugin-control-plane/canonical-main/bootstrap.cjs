'use strict';

const fs = require('fs');
const path = require('path');
const {validateDescriptor} = require('./contract.cjs');

const TEMPLATE_PATH = path.join(__dirname, 'guidelines-template.md');
const REGISTRY_PATH = path.join(__dirname, '..', 'registry.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeTarget(root, value) {
  const target = path.resolve(root, value);
  const relative = path.relative(root, target);
  const inside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  return {target, inside};
}

function flattenStrings(value, rows = []) {
  if (typeof value === 'string') rows.push(value);
  else if (Array.isArray(value)) value.forEach((row) => flattenStrings(row, rows));
  else if (value && typeof value === 'object') Object.values(value).forEach((row) => flattenStrings(row, rows));
  return rows;
}

function registryEntry(descriptor, registry = readJson(REGISTRY_PATH)) {
  const collection = descriptor.kind === 'product' ? registry.products : registry.plugins;
  return collection?.[descriptor.id] || null;
}

function registryPathCovers(pattern, projectPath) {
  const normalized = String(projectPath || '').replace(/\/$/, '');
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3).replace(/\/$/, '');
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  return normalized === pattern.replace(/\/$/, '');
}

function registryBindingErrors(descriptor, registry = readJson(REGISTRY_PATH)) {
  const errors = [];
  const entry = registryEntry(descriptor, registry);
  if (!entry) return [`registry entry missing for ${descriptor.kind}:${descriptor.id}`];
  if (entry.displayName !== descriptor.displayName) errors.push(`registry displayName mismatch: ${entry.displayName} != ${descriptor.displayName}`);
  if (entry.lifecycle !== descriptor.lifecycle) errors.push(`registry lifecycle mismatch: ${entry.lifecycle} != ${descriptor.lifecycle}`);
  if (!(entry.paths || []).some((pattern) => registryPathCovers(pattern, descriptor.projectPath))) {
    errors.push(`registry paths do not cover projectPath: ${descriptor.projectPath}`);
  }

  const registeredAuthorityValues = new Set(flattenStrings(entry.authority || {}));
  for (const [key, value] of Object.entries(descriptor.authority || {})) {
    if (key === 'type' || typeof value !== 'string' || !value) continue;
    if (!registeredAuthorityValues.has(value)) errors.push(`descriptor authority ${key} not registered: ${value}`);
  }
  return errors;
}

function repositoryBindingErrors(descriptor, root = process.cwd(), options = {}) {
  const errors = [];
  const requireGuidelines = options.requireGuidelines !== false;
  const checkPath = (label, value) => {
    if (!value) return null;
    const {target, inside} = safeTarget(root, value);
    if (!inside || !fs.existsSync(target)) errors.push(`${label} missing or outside repository: ${value}`);
    return target;
  };

  checkPath('projectPath', descriptor.projectPath);
  if (requireGuidelines) checkPath('guidelines', descriptor.guidelines);

  const authority = descriptor.authority || {};
  for (const key of ['manifest', 'evidence', 'artifact']) checkPath(`authority ${key}`, authority[key]);

  const memory = descriptor.memory || {};
  for (const output of memory.outputs || []) checkPath('memory output', output);

  if (memory.profile !== 'check-only') {
    if (!memory.workflow) errors.push('writable memory profile requires memory.workflow');
    const workflowTarget = checkPath('memory workflow', memory.workflow);
    const workflowText = workflowTarget && fs.existsSync(workflowTarget) ? fs.readFileSync(workflowTarget, 'utf8') : '';
    if (workflowText) {
      if (!workflowText.includes('scripts/repo-main-write.py')) errors.push('memory workflow must use scripts/repo-main-write.py');
      if (!workflowText.includes('Required')) errors.push('memory workflow must bind the permanent Required gate');
      for (const output of memory.outputs || []) {
        if (!workflowText.includes(output)) errors.push(`memory workflow does not reference declared output: ${output}`);
      }
    }

    if (memory.profile === 'production-state-block') {
      if (!(memory.outputs || []).includes(descriptor.guidelines)) errors.push('production-state-block must own the declared guidelines output');
      if (requireGuidelines) {
        const guidelinesTarget = safeTarget(root, descriptor.guidelines).target;
        if (fs.existsSync(guidelinesTarget)) {
          const text = fs.readFileSync(guidelinesTarget, 'utf8');
          const starts = text.match(/<!-- [A-Z0-9_]*RELEASE_STATE_START -->/g) || [];
          const ends = text.match(/<!-- [A-Z0-9_]*RELEASE_STATE_END -->/g) || [];
          if (starts.length !== 1 || ends.length !== 1) errors.push('production-state-block guidelines require exactly one release-state marker pair');
        }
      }
    }

    if (memory.profile === 'registered-renderer') {
      if (!memory.renderer) errors.push('registered-renderer requires memory.renderer');
      if (!memory.targets) errors.push('registered-renderer requires memory.targets');
      const rendererTarget = checkPath('memory renderer', memory.renderer);
      const targetsTarget = checkPath('memory targets', memory.targets);
      if (workflowText && memory.renderer && !workflowText.includes(memory.renderer)) errors.push(`memory workflow does not invoke renderer: ${memory.renderer}`);
      if (workflowText && memory.targets && !workflowText.includes(memory.targets)) errors.push(`memory workflow does not bind target registry: ${memory.targets}`);
      void rendererTarget;
      void targetsTarget;
    }
  }

  errors.push(...registryBindingErrors(descriptor));
  return errors;
}

function placeholderValues(descriptor, repository = process.env.GITHUB_REPOSITORY || '<OWNER/REPO>') {
  const authority = descriptor.authority || {};
  return {
    '<PLUGIN_NAME>': descriptor.displayName,
    '<OWNER/REPO>': repository,
    '<PLUGIN_PATH>': descriptor.projectPath.replace(/\/$/, ''),
    '<RELEASE_BRANCH>': authority.releaseBranch || authority.ref || 'UNKNOWN',
    '<MANIFEST_PATH>': authority.manifest || authority.artifact || authority.evidence || 'UNKNOWN',
    '<CURRENT_VERSION>': 'UNKNOWN',
  };
}

function renderGuidelines(descriptor, repository) {
  let text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  for (const [token, value] of Object.entries(placeholderValues(descriptor, repository))) {
    text = text.split(token).join(String(value));
  }
  return text;
}

function main() {
  const [command, descriptorPath, outputPath] = process.argv.slice(2);
  if (!['check', 'render'].includes(command) || !descriptorPath) {
    throw new Error('usage: bootstrap.cjs <check|render> <descriptor.json> [output.md]');
  }
  const descriptor = readJson(descriptorPath);
  const errors = [
    ...validateDescriptor(descriptor),
    ...repositoryBindingErrors(descriptor, process.cwd(), {requireGuidelines: command === 'check'}),
  ];
  if (errors.length) {
    console.error(JSON.stringify({ok: false, errors}, null, 2));
    process.exitCode = 2;
    return;
  }
  if (command === 'check') {
    console.log(`BOOTSTRAP_DESCRIPTOR_OK:${descriptor.id}:${descriptor.memory.profile}`);
    return;
  }
  if (!outputPath) throw new Error('render requires output path');
  const expected = path.resolve(process.cwd(), descriptor.guidelines);
  const requested = path.resolve(process.cwd(), outputPath);
  if (expected !== requested) throw new Error(`render output must equal descriptor guidelines path: ${descriptor.guidelines}`);
  if (fs.existsSync(requested)) throw new Error(`refusing to overwrite existing guidelines: ${descriptor.guidelines}`);
  fs.mkdirSync(path.dirname(requested), {recursive: true});
  fs.writeFileSync(requested, renderGuidelines(descriptor), 'utf8');
  console.log(`BOOTSTRAP_GUIDELINES_RENDERED:${descriptor.id}:${descriptor.guidelines}`);
}

if (require.main === module) main();

module.exports = {
  repositoryBindingErrors,
  registryBindingErrors,
  registryEntry,
  registryPathCovers,
  placeholderValues,
  renderGuidelines,
};
