'use strict';

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'registry.json');

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function escapeRegex(text) {
  return text.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i += 1;
        out += '.*';
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += escapeRegex(ch);
    }
  }
  out += '$';
  return new RegExp(out);
}

function matchesAny(filePath, patterns = []) {
  return patterns.some((pattern) => globToRegex(pattern).test(filePath));
}

function classifyPaths(paths, registry = loadRegistry()) {
  const pluginIds = new Set();
  const scopeLabels = new Set();
  const unclassifiedPaths = [];
  const ambiguousPaths = [];

  for (const filePath of paths) {
    const owners = Object.entries(registry.plugins)
      .filter(([, plugin]) => matchesAny(filePath, plugin.paths))
      .map(([id]) => id);

    const nonOperational = (registry.nonOperationalScopes || [])
      .filter((entry) => matchesAny(filePath, entry.paths));
    const isRepo = matchesAny(filePath, registry.repoPaths || []);
    const isShared = matchesAny(filePath, registry.sharedPaths || []);

    if (owners.length > 1) {
      ambiguousPaths.push(filePath);
      scopeLabels.add('scope:unclassified');
      continue;
    }

    if (owners.length === 1) pluginIds.add(owners[0]);
    for (const entry of nonOperational) scopeLabels.add(entry.label);
    if (isRepo) scopeLabels.add('scope:repo');
    if (isShared) scopeLabels.add('scope:shared');

    if (!owners.length && !nonOperational.length && !isRepo && !isShared) {
      unclassifiedPaths.push(filePath);
      scopeLabels.add('scope:unclassified');
    }
  }

  if (pluginIds.size > 1) scopeLabels.add('scope:multi-plugin');

  return {
    pluginIds: [...pluginIds].sort(),
    labels: [
      ...[...pluginIds].sort().map((id) => `plugin:${id}`),
      ...[...scopeLabels].sort(),
    ],
    unclassifiedPaths,
    ambiguousPaths,
  };
}

function extractIssuePluginValue(body = '') {
  const lines = String(body).replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === '### Plugin') {
      for (let j = i + 1; j < lines.length; j += 1) {
        const value = lines[j].trim();
        if (value) return value;
      }
    }
    const direct = lines[i].match(/^Plugin:\s*(.+)$/i);
    if (direct) return direct[1].trim();
  }
  return null;
}

function classifyIssueBody(body, registry = loadRegistry()) {
  const value = extractIssuePluginValue(body);
  if (!value) return {explicit: false, labels: []};

  if (value === 'repo') return {explicit: true, labels: ['scope:repo']};
  if (value === 'shared') return {explicit: true, labels: ['scope:shared']};

  const matched = Object.entries(registry.plugins)
    .filter(([, plugin]) => (plugin.issueValues || []).includes(value));
  if (matched.length === 1) {
    return {explicit: true, labels: [`plugin:${matched[0][0]}`]};
  }
  return {explicit: true, labels: ['scope:unclassified']};
}

function managedLabel(label, registry = loadRegistry()) {
  return (registry.managedLabelPrefixes || []).some((prefix) => label.startsWith(prefix))
    || label === 'control-plane:status';
}

function labelDefinitions(registry = loadRegistry()) {
  const defs = [
    ['scope:repo', '5319e7', 'Repository-level control-plane or shared infrastructure work'],
    ['scope:shared', '8250df', 'Change affects shared repository surface'],
    ['scope:multi-plugin', 'd876e3', 'Change touches more than one registered plugin'],
    ['scope:unclassified', 'b60205', 'Plugin scope could not be classified deterministically'],
    ['scope:template', 'c5def5', 'Template-only path'],
    ['scope:test-fixture', 'c5def5', 'Repository test fixture path'],
    ['control-plane:status', '0e8a16', 'Mutable plugin operational status issue'],
  ];
  for (const [id, plugin] of Object.entries(registry.plugins)) {
    defs.push([`plugin:${id}`, '1d76db', plugin.displayName]);
  }
  return defs.map(([name, color, description]) => ({name, color, description}));
}

function validateRegistry(registry = loadRegistry()) {
  const errors = [];
  if (registry.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  const forbiddenMutableKeys = new Set([
    'productionVersion', 'releaseCommit', 'productionSha', 'physicalVerification', 'currentVersion',
  ]);

  function walk(value, trail = []) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, trail.concat(String(index))));
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenMutableKeys.has(key)) errors.push(`mutable truth key forbidden: ${trail.concat(key).join('.')}`);
      walk(item, trail.concat(key));
    }
  }
  walk(registry);

  for (const [id, plugin] of Object.entries(registry.plugins || {})) {
    if (!plugin.displayName) errors.push(`${id}: displayName missing`);
    if (!Array.isArray(plugin.paths) || !plugin.paths.length) errors.push(`${id}: paths missing`);
    if (!plugin.statusAdapter) errors.push(`${id}: statusAdapter missing`);
  }
  return errors;
}

module.exports = {
  loadRegistry,
  globToRegex,
  matchesAny,
  classifyPaths,
  extractIssuePluginValue,
  classifyIssueBody,
  managedLabel,
  labelDefinitions,
  validateRegistry,
};
