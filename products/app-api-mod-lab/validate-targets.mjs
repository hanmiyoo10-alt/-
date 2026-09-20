import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.join(here, 'target-contract.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const targetRoot = path.join(here, 'targets');
const errors = [];

function fail(message) {
  errors.push(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (contract.schema_version !== 1) fail('contract.schema_version must be 1');
if (contract.target_root !== 'products/app-api-mod-lab/targets') fail('contract.target_root mismatch');
if (contract.metadata_file !== 'TARGET.json') fail('contract.metadata_file must be TARGET.json');
if (!isPlainObject(contract.ecosystems) || Object.keys(contract.ecosystems).sort().join(',') !== 'risu,standalone') {
  fail('contract ecosystems must be risu and standalone');
}
if (!Array.isArray(contract.kinds) || contract.kinds.slice().sort().join(',') !== 'api,app,hybrid') {
  fail('contract kinds must be app, api, hybrid');
}
if (contract.id_pattern !== '^[a-z0-9]+(?:-[a-z0-9]+)*

if (!fs.existsSync(targetRoot)) fail('targets root missing');

let targetCount = 0;
if (fs.existsSync(targetRoot)) {
  for (const entry of fs.readdirSync(targetRoot, {withFileTypes: true})) {
    if (entry.isFile()) {
      if (entry.name !== 'README.md') fail(`unexpected file in targets root: ${entry.name}`);
      continue;
    }
    if (!entry.isDirectory()) {
      fail(`unsupported targets root entry: ${entry.name}`);
      continue;
    }
    if (!ecosystemIds.has(entry.name)) {
      fail(`unexpected ecosystem directory: ${entry.name}`);
      continue;
    }

    const ecosystemRoot = path.join(targetRoot, entry.name);
    for (const child of fs.readdirSync(ecosystemRoot, {withFileTypes: true})) {
      if (!child.isDirectory()) {
        fail(`unexpected non-directory under targets/${entry.name}: ${child.name}`);
        continue;
      }
      targetCount += 1;
      const targetId = child.name;
      const targetDir = path.join(ecosystemRoot, targetId);
      const metadataPath = path.join(targetDir, contract.metadata_file);

      if (!idRegex.test(targetId)) {
        fail(`invalid target directory id: ${entry.name}/${targetId}`);
        continue;
      }
      if (!fs.existsSync(metadataPath)) {
        fail(`missing ${contract.metadata_file}: ${entry.name}/${targetId}`);
        continue;
      }

      let metadata;
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        fail(`invalid JSON in ${entry.name}/${targetId}/${contract.metadata_file}: ${error.message}`);
        continue;
      }

      for (const field of contract.required_fields || []) {
        if (!(field in metadata)) fail(`${entry.name}/${targetId}: missing field ${field}`);
      }
      if (metadata.schema_version !== 1) fail(`${entry.name}/${targetId}: schema_version must be 1`);
      if (metadata.id !== targetId) fail(`${entry.name}/${targetId}: id must match directory name`);
      if (typeof metadata.display_name !== 'string' || !metadata.display_name.trim()) fail(`${entry.name}/${targetId}: display_name missing`);
      if (metadata.ecosystem !== entry.name) fail(`${entry.name}/${targetId}: ecosystem must match parent directory`);
      if (!kinds.has(metadata.kind)) fail(`${entry.name}/${targetId}: invalid kind ${metadata.kind}`);
      if (typeof metadata.category !== 'string' || !categoryRegex.test(metadata.category) || !categories.has(metadata.category)) {
        fail(`${entry.name}/${targetId}: invalid category ${metadata.category}`);
      }

      if (!isPlainObject(metadata.authority)) {
        fail(`${entry.name}/${targetId}: authority must be an object`);
      } else {
        for (const field of contract.authority_fields || []) {
          if (typeof metadata.authority[field] !== 'string' || !metadata.authority[field].trim()) {
            fail(`${entry.name}/${targetId}: authority.${field} must be a non-empty string`);
          }
        }
      }

      if (!isPlainObject(metadata.scope)) {
        fail(`${entry.name}/${targetId}: scope must be an object`);
      } else {
        if (!Array.isArray(metadata.scope.owned_surfaces) || metadata.scope.owned_surfaces.length === 0) {
          fail(`${entry.name}/${targetId}: scope.owned_surfaces must contain at least one entry`);
        }
        if (!Array.isArray(metadata.scope.preserve_surfaces)) {
          fail(`${entry.name}/${targetId}: scope.preserve_surfaces must be an array`);
        }
      }

      if (!isPlainObject(metadata.privacy) || metadata.privacy.credentials_in_git !== false) {
        fail(`${entry.name}/${targetId}: privacy.credentials_in_git must be false`);
      }
      if (!Array.isArray(metadata.validation_surfaces) || metadata.validation_surfaces.length === 0) {
        fail(`${entry.name}/${targetId}: validation_surfaces must contain at least one entry`);
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`APP_API_MOD_LAB_TARGET_CONTRACT:FAIL:${error}`);
  process.exit(1);
}

console.log(`APP_API_MOD_LAB_TARGET_CONTRACT:OK:targets=${targetCount}`);
) fail('contract id_pattern mismatch');
if (contract.category_pattern !== '^[a-z0-9]+(?:-[a-z0-9]+)*

if (!fs.existsSync(targetRoot)) fail('targets root missing');

let targetCount = 0;
if (fs.existsSync(targetRoot)) {
  for (const entry of fs.readdirSync(targetRoot, {withFileTypes: true})) {
    if (entry.isFile()) {
      if (entry.name !== 'README.md') fail(`unexpected file in targets root: ${entry.name}`);
      continue;
    }
    if (!entry.isDirectory()) {
      fail(`unsupported targets root entry: ${entry.name}`);
      continue;
    }
    if (!ecosystemIds.has(entry.name)) {
      fail(`unexpected ecosystem directory: ${entry.name}`);
      continue;
    }

    const ecosystemRoot = path.join(targetRoot, entry.name);
    for (const child of fs.readdirSync(ecosystemRoot, {withFileTypes: true})) {
      if (!child.isDirectory()) {
        fail(`unexpected non-directory under targets/${entry.name}: ${child.name}`);
        continue;
      }
      targetCount += 1;
      const targetId = child.name;
      const targetDir = path.join(ecosystemRoot, targetId);
      const metadataPath = path.join(targetDir, contract.metadata_file);

      if (!idRegex.test(targetId)) {
        fail(`invalid target directory id: ${entry.name}/${targetId}`);
        continue;
      }
      if (!fs.existsSync(metadataPath)) {
        fail(`missing ${contract.metadata_file}: ${entry.name}/${targetId}`);
        continue;
      }

      let metadata;
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        fail(`invalid JSON in ${entry.name}/${targetId}/${contract.metadata_file}: ${error.message}`);
        continue;
      }

      for (const field of contract.required_fields || []) {
        if (!(field in metadata)) fail(`${entry.name}/${targetId}: missing field ${field}`);
      }
      if (metadata.schema_version !== 1) fail(`${entry.name}/${targetId}: schema_version must be 1`);
      if (metadata.id !== targetId) fail(`${entry.name}/${targetId}: id must match directory name`);
      if (typeof metadata.display_name !== 'string' || !metadata.display_name.trim()) fail(`${entry.name}/${targetId}: display_name missing`);
      if (metadata.ecosystem !== entry.name) fail(`${entry.name}/${targetId}: ecosystem must match parent directory`);
      if (!kinds.has(metadata.kind)) fail(`${entry.name}/${targetId}: invalid kind ${metadata.kind}`);

      if (!isPlainObject(metadata.authority)) {
        fail(`${entry.name}/${targetId}: authority must be an object`);
      } else {
        for (const field of contract.authority_fields || []) {
          if (typeof metadata.authority[field] !== 'string' || !metadata.authority[field].trim()) {
            fail(`${entry.name}/${targetId}: authority.${field} must be a non-empty string`);
          }
        }
      }

      if (!isPlainObject(metadata.scope)) {
        fail(`${entry.name}/${targetId}: scope must be an object`);
      } else {
        if (!Array.isArray(metadata.scope.owned_surfaces) || metadata.scope.owned_surfaces.length === 0) {
          fail(`${entry.name}/${targetId}: scope.owned_surfaces must contain at least one entry`);
        }
        if (!Array.isArray(metadata.scope.preserve_surfaces)) {
          fail(`${entry.name}/${targetId}: scope.preserve_surfaces must be an array`);
        }
      }

      if (!isPlainObject(metadata.privacy) || metadata.privacy.credentials_in_git !== false) {
        fail(`${entry.name}/${targetId}: privacy.credentials_in_git must be false`);
      }
      if (!Array.isArray(metadata.validation_surfaces) || metadata.validation_surfaces.length === 0) {
        fail(`${entry.name}/${targetId}: validation_surfaces must contain at least one entry`);
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`APP_API_MOD_LAB_TARGET_CONTRACT:FAIL:${error}`);
  process.exit(1);
}

console.log(`APP_API_MOD_LAB_TARGET_CONTRACT:OK:targets=${targetCount}`);
) fail('contract category_pattern mismatch');
if (!Array.isArray(contract.categories) || contract.categories.length === 0) {
  fail('contract categories must contain at least one category');
}

const idRegex = new RegExp(contract.id_pattern);
const categoryRegex = new RegExp(contract.category_pattern || 'a^');
const ecosystemIds = new Set(Object.keys(contract.ecosystems || {}));
const kinds = new Set(contract.kinds || []);
const categories = new Set(contract.categories || []);
if (categories.size !== (contract.categories || []).length) fail('contract categories must be unique');
for (const category of contract.categories || []) {
  if (typeof category !== 'string' || !categoryRegex.test(category)) fail(`invalid contract category: ${category}`);
}

if (!fs.existsSync(targetRoot)) fail('targets root missing');

let targetCount = 0;
if (fs.existsSync(targetRoot)) {
  for (const entry of fs.readdirSync(targetRoot, {withFileTypes: true})) {
    if (entry.isFile()) {
      if (entry.name !== 'README.md') fail(`unexpected file in targets root: ${entry.name}`);
      continue;
    }
    if (!entry.isDirectory()) {
      fail(`unsupported targets root entry: ${entry.name}`);
      continue;
    }
    if (!ecosystemIds.has(entry.name)) {
      fail(`unexpected ecosystem directory: ${entry.name}`);
      continue;
    }

    const ecosystemRoot = path.join(targetRoot, entry.name);
    for (const child of fs.readdirSync(ecosystemRoot, {withFileTypes: true})) {
      if (!child.isDirectory()) {
        fail(`unexpected non-directory under targets/${entry.name}: ${child.name}`);
        continue;
      }
      targetCount += 1;
      const targetId = child.name;
      const targetDir = path.join(ecosystemRoot, targetId);
      const metadataPath = path.join(targetDir, contract.metadata_file);

      if (!idRegex.test(targetId)) {
        fail(`invalid target directory id: ${entry.name}/${targetId}`);
        continue;
      }
      if (!fs.existsSync(metadataPath)) {
        fail(`missing ${contract.metadata_file}: ${entry.name}/${targetId}`);
        continue;
      }

      let metadata;
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        fail(`invalid JSON in ${entry.name}/${targetId}/${contract.metadata_file}: ${error.message}`);
        continue;
      }

      for (const field of contract.required_fields || []) {
        if (!(field in metadata)) fail(`${entry.name}/${targetId}: missing field ${field}`);
      }
      if (metadata.schema_version !== 1) fail(`${entry.name}/${targetId}: schema_version must be 1`);
      if (metadata.id !== targetId) fail(`${entry.name}/${targetId}: id must match directory name`);
      if (typeof metadata.display_name !== 'string' || !metadata.display_name.trim()) fail(`${entry.name}/${targetId}: display_name missing`);
      if (metadata.ecosystem !== entry.name) fail(`${entry.name}/${targetId}: ecosystem must match parent directory`);
      if (!kinds.has(metadata.kind)) fail(`${entry.name}/${targetId}: invalid kind ${metadata.kind}`);

      if (!isPlainObject(metadata.authority)) {
        fail(`${entry.name}/${targetId}: authority must be an object`);
      } else {
        for (const field of contract.authority_fields || []) {
          if (typeof metadata.authority[field] !== 'string' || !metadata.authority[field].trim()) {
            fail(`${entry.name}/${targetId}: authority.${field} must be a non-empty string`);
          }
        }
      }

      if (!isPlainObject(metadata.scope)) {
        fail(`${entry.name}/${targetId}: scope must be an object`);
      } else {
        if (!Array.isArray(metadata.scope.owned_surfaces) || metadata.scope.owned_surfaces.length === 0) {
          fail(`${entry.name}/${targetId}: scope.owned_surfaces must contain at least one entry`);
        }
        if (!Array.isArray(metadata.scope.preserve_surfaces)) {
          fail(`${entry.name}/${targetId}: scope.preserve_surfaces must be an array`);
        }
      }

      if (!isPlainObject(metadata.privacy) || metadata.privacy.credentials_in_git !== false) {
        fail(`${entry.name}/${targetId}: privacy.credentials_in_git must be false`);
      }
      if (!Array.isArray(metadata.validation_surfaces) || metadata.validation_surfaces.length === 0) {
        fail(`${entry.name}/${targetId}: validation_surfaces must contain at least one entry`);
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`APP_API_MOD_LAB_TARGET_CONTRACT:FAIL:${error}`);
  process.exit(1);
}

console.log(`APP_API_MOD_LAB_TARGET_CONTRACT:OK:targets=${targetCount}`);
