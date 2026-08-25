'use strict';

function createRepoFiles(client) {
  async function fetchContent(filePath, ref = 'main') {
    const encoded = filePath.split('/').map(encodeURIComponent).join('/');
    const row = await client.api(`/contents/${encoded}?ref=${encodeURIComponent(ref)}`, {allow404: true});
    if (!row || Array.isArray(row) || !row.content) return null;
    return Buffer.from(row.content, row.encoding || 'base64').toString('utf8');
  }
  async function branchHead(branch) {
    const row = await client.api(`/branches/${encodeURIComponent(branch)}`, {allow404: true});
    return row?.commit?.sha || null;
  }
  return {fetchContent, branchHead};
}

module.exports = {createRepoFiles};
