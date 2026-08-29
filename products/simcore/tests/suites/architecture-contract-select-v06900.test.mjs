import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { equal, assert } from '../../tooling/assertions.mjs';
import { selectArchitectureContract } from '../../tooling/ci/architecture-contract-select.mjs';

function write(root, rel, text) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

export async function runSuite() {
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-arch-select-'));
  try {
    write(root, 'config/simcore-architecture-v2.json', '{}\n');
    write(root, 'config/simcore-architecture-v06900-candidate.json', '{}\n');

    write(root, 'v068-latest.js', '//@name simcore\n//@version 0.68.0\n');
    write(root, 'v068-install.js', '//@name simcore\n//@version 0.68.0\n');
    const current = selectArchitectureContract({ root, source: 'v068-latest.js', mirrorSource: 'v068-install.js' });
    equal(current.version, '0.68.0', 'v0.68 source version');
    equal(current.contract, 'config/simcore-architecture-v2.json', 'v0.68 must use current production contract');
    equal(current.transitional, false, 'v0.68 is not transition sidecar');
    pass('V06900-arch-select-current-production');

    write(root, 'v069-latest.js', '//@name simcore\n//@version 0.69.0\n');
    write(root, 'v069-install.js', '//@name simcore\n//@version 0.69.0\n');
    const candidate = selectArchitectureContract({ root, source: 'v069-latest.js', mirrorSource: 'v069-install.js' });
    equal(candidate.version, '0.69.0', 'v0.69 source version');
    equal(candidate.contract, 'config/simcore-architecture-v06900-candidate.json', 'v0.69 exact sidecar contract');
    equal(candidate.transitional, true, 'v0.69 sidecar is transitional');
    pass('V06900-arch-select-exact-candidate');

    fs.rmSync(path.join(root, 'config/simcore-architecture-v06900-candidate.json'));
    const fallback = selectArchitectureContract({ root, source: 'v069-latest.js', mirrorSource: 'v069-install.js' });
    equal(fallback.contract, 'config/simcore-architecture-v2.json', 'sidecar retirement falls back to promoted main contract');
    pass('V06900-arch-select-retirement-fallback');

    write(root, 'mismatch.js', '//@version 0.68.0\n');
    let mismatch = null;
    try { selectArchitectureContract({ root, source: 'v069-latest.js', mirrorSource: 'mismatch.js' }); } catch (error) { mismatch = error; }
    assert(mismatch && mismatch.code === 'ARCH_CONTRACT_SOURCE_VERSION_MISMATCH', 'latest/install version mismatch must fail closed');
    pass('V06900-arch-select-version-mismatch-block');

    write(root, 'invalid.js', '//@name simcore\n');
    let invalid = null;
    try { selectArchitectureContract({ root, source: 'invalid.js', mirrorSource: 'invalid.js' }); } catch (error) { invalid = error; }
    assert(invalid && invalid.code === 'ARCH_CONTRACT_SOURCE_VERSION_INVALID', 'missing version must fail closed');
    pass('V06900-arch-select-invalid-version-block');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
