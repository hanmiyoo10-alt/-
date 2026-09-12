'use strict';

function buildIssueListEndpoint(state = 'open', page = 1, labels = []) {
  const params = new URLSearchParams();
  params.set('state', state);
  params.set('per_page', '100');
  params.set('page', String(page));
  if (Array.isArray(labels) && labels.length) params.set('labels', labels.join(','));
  return `/issues?${params.toString()}`;
}

function createIssueStore(client) {
  async function listIssues(state = 'open', maxPages = 5, labels = []) {
    const result = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const rows = await client.api(buildIssueListEndpoint(state, page, labels));
      result.push(...rows.filter((row) => !row.pull_request));
      if (rows.length < 100) return result;
    }
    throw new Error('issue pagination exceeded safety bound');
  }
  const getIssue = (issueNumber) => client.api(`/issues/${issueNumber}`, {allow404: true});
  async function listIssueComments(issueNumber, maxPages = 2) {
    const result = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const rows = await client.api(`/issues/${issueNumber}/comments?per_page=100&page=${page}`);
      result.push(...rows);
      if (rows.length < 100) return result;
    }
    throw new Error(`issue #${issueNumber} comment pagination exceeded safety bound`);
  }
  async function ensureLabel(name, color, description) {
    const encoded = encodeURIComponent(name);
    if (await client.api(`/labels/${encoded}`, {allow404: true})) return;
    await client.api('/labels', {method: 'POST', body: {name, color, description}});
  }
  async function ensureLabels(defs) { for (const def of defs) await ensureLabel(...def); }
  const createIssue = (body) => client.api('/issues', {method: 'POST', body});
  const updateIssue = (issueNumber, body) => client.api(`/issues/${issueNumber}`, {method: 'PATCH', body});
  const replaceLabels = (issueNumber, labels) => client.api(`/issues/${issueNumber}/labels`, {method: 'PUT', body: {labels}});
  return {listIssues, getIssue, listIssueComments, ensureLabels, createIssue, updateIssue, replaceLabels};
}

module.exports = {buildIssueListEndpoint, createIssueStore};
