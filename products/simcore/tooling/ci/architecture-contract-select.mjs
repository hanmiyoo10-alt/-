import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONTRACT = 'config/simcore-architecture-v2.json';
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function declaredPluginVersion(sourcePath) {
  const fd = fs.openSync(sourcePath, 'r');
  try {
    const buffer = Buffer.alloc(8192);
    const count = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, count).toString('utf8');
    const match = head.match(/^\/\/@version\s+([^\s]+)\s*$/m);
    const version = String(match?.[1] || '');
    if (!VERSION_RE.test(version)) {
      const error = new Error(`plugin source version missing/invalid: ${sourcePath}`);
      error.code = 'ARCH_CONTRACT_SOURCE_VERSION_INVALID';
      throw error;
    }
    return version;
  } finally {
    fs.closeSync(fd);
  }
}

export function candidateContractPath(version) {
  if (!VERSION_RE.test(String(version || ''))) {
    const error = new Error(`candidate contract version invalid: ${version}`);
    error.code = 'ARCH_CONTRACT_SOURCE_VERSION_INVALID';
    throw error;
  }
  return `config/simcore-architecture-v${String(version).replaceAll('.', '')}-candidate.json`;
}

export function selectArchitectureContract({ root = '.', source, mirrorSource }) {
  const base = path.resolve(root);
  const sourcePath = path.resolve(base, String(source || ''));
  const mirrorPath = path.resolve(base, String(mirrorSource || ''));
  const inside = (file) => file === base || file.startsWith(`${base}${path.sep}`);
  if (!inside(sourcePath) || !inside(mirrorPath)) {
    const error = new Error('architecture source outside root');
    error.code = 'ARCH_CONTRACT_SOURCE_PATH_INVALID';
    throw error;
  }

  const sourceVersion = declaredPluginVersion(sourcePath);
  const mirrorVersion = declaredPluginVersion(mirrorPath);
  if (sourceVersion !== mirrorVersion) {
    const error = new Error(`latest/install version mismatch: ${sourceVersion} != ${mirrorVersion}`);
    error.code = 'ARCH_CONTRACT_SOURCE_VERSION_MISMATCH';
    throw error;
  }

  const candidate = candidateContractPath(sourceVersion);
  const candidateAbs = path.resolve(base, candidate);
  const selected = fs.existsSync(candidateAbs) ? candidate : DEFAULT_CONTRACT;
  return Object.freeze({ version: sourceVersion, contract: selected, transitional: selected !== DEFAULT_CONTRACT });
}
