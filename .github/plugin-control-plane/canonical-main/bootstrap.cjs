'use strict';

const fs = require('fs');
const path = require('path');
const {validateDescriptor} = require('./contract.cjs');

const TEMPLATE_PATH = path.join(__dirname, 'guidelines-template.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function repositoryBindingErrors(descriptor, root = process.cwd()) {
  const errors = [];
  const resolve = (value) => path.resolve(root, value);
  const insideRoot = (target) => {
    const relative = path.relative(root, target);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  };

  const projectTarget = resolve(descriptor.projectPath || '.');
  if (!insideRoot(projectTarget) || !fs.existsSync(projectTarget)) errors.push('projectPath missing or outside repository');

  const authority = descriptor.authority || {};
  for (const key of ['manifest', 'evidence', 'artifact']) {
    if (!authority[key]) continue;
    const target = resolve(authority[key]);
    if (!insideRoot(target) || !fs.existsSync(target)) errors.push(`authority ${key} missing or outside repository: ${authority[key]}`);
  }

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
  const errors = [...validateDescriptor(descriptor), ...repositoryBindingErrors(descriptor)];
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

module.exports = {repositoryBindingErrors, placeholderValues, renderGuidelines};
