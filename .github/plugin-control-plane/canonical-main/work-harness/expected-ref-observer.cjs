'use strict';

function branchRefEndpoint(ref) {
  if (typeof ref !== 'string' || !ref || ref === 'main') return null;
  if (ref.startsWith('/') || ref.endsWith('/') || ref.includes('//') || ref.includes('..') || ref.includes('@{')) return null;
  if (/[\\\s~^:?*\[]/.test(ref) || ref.endsWith('.') || ref.split('/').some((part) => !part || part === '.' || part === '..' || part.endsWith('.lock'))) return null;
  return `/git/ref/heads/${ref.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

async function observeExpectedBranchRefs({ client, workRecord, mainSha } = {}) {
  const observedRefs = {};
  const reasonCodes = [];
  if (typeof mainSha === 'string' && mainSha) observedRefs.main = mainSha;
  if (!client || !workRecord || !Array.isArray(workRecord.expectedBases)) return { observedRefs, reasonCodes };

  const refs = [...new Set(workRecord.expectedBases
    .filter((base) => base?.mode === 'EXACT')
    .map((base) => base?.ref)
    .filter((ref) => typeof ref === 'string' && ref && ref !== 'main'))].sort();

  for (const ref of refs) {
    const endpoint = branchRefEndpoint(ref);
    if (!endpoint) {
      reasonCodes.push(`EXPECTED_REF_OBSERVER_REF_INVALID:${ref}`);
      continue;
    }
    try {
      const result = await client.api(endpoint, { allow404: true });
      const sha = result?.object?.sha;
      if (typeof sha === 'string' && sha) observedRefs[ref] = sha;
    } catch {
      reasonCodes.push(`EXPECTED_REF_OBSERVER_READ_FAILED:${ref}`);
    }
  }

  return { observedRefs, reasonCodes: [...new Set(reasonCodes)].sort() };
}

module.exports = { branchRefEndpoint, observeExpectedBranchRefs };
