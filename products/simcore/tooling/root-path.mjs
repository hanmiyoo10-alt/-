import fs from 'node:fs';
import path from 'node:path';

export function resolveRoot(value) {
  if (typeof value !== 'string' || !value || /[\r\n\0]/.test(value)) {
    const e = new Error('root must be a non-empty path');
    e.code = 'R2_7_ROOT_INVALID';
    throw e;
  }
  return path.resolve(value);
}

export function resolveUnderRoot(rootValue, relativeValue, { kind = 'PATH', allowAbsolute = false } = {}) {
  const root = resolveRoot(rootValue);
  if (typeof relativeValue !== 'string' || !relativeValue || /[\r\n\0]/.test(relativeValue)) {
    const e = new Error(`${kind} path must be a non-empty string`);
    e.code = 'R2_7_PATH_INVALID';
    throw e;
  }
  if (path.isAbsolute(relativeValue) && !allowAbsolute) {
    const e = new Error(`${kind} absolute path rejected`);
    e.code = 'R2_7_PATH_ABSOLUTE_REJECTED';
    throw e;
  }
  const resolved = path.resolve(root, relativeValue);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    const e = new Error(`${kind} path outside root: ${relativeValue}`);
    e.code = 'R2_7_PATH_OUTSIDE_ROOT';
    throw e;
  }
  return resolved;
}

export function ensureParentUnderRoot(root, relativeValue, options = {}) {
  const file = resolveUnderRoot(root, relativeValue, options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}
