'use strict';

function client({token, repo, fetchImpl = fetch}) {
  if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
  if (!repo) throw new Error('GITHUB_REPOSITORY is required');
  async function request(endpoint, options = {}) {
    const method = options.method || 'GET';
    const allowed = ((method === 'GET' && endpoint === '/branches/main') || (method === 'GET' && /^\/issues\?state=(?:all|open)&per_page=100&page=\d+$/.test(endpoint)) || (method === 'POST' && endpoint === '/issues') || (method === 'PATCH' && /^\/issues\/\d+$/.test(endpoint)) || (method === 'PUT' && /^\/issues\/\d+\/labels$/.test(endpoint)));
    if (!allowed) throw new Error(`rehearsal endpoint denied: ${method} ${endpoint}`);
    const response = await fetchImpl(`https://api.github.com/repos/${repo}${endpoint}`, {method, headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'canonical-main-rehearsal'}, body: options.body === undefined ? undefined : JSON.stringify(options.body)});
    if (!response.ok) throw new Error(`${method} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0,300)}`);
    if (response.status === 204) return null;
    return response.json();
  }
  async function listIssues(state = 'all') {
    const result = [];
    for (let page = 1; page <= 5; page += 1) {
      const rows = await request(`/issues?state=${state}&per_page=100&page=${page}`);
      result.push(...rows.filter((row) => !row.pull_request));
      if (rows.length < 100) return result;
    }
    throw new Error('issue pagination exceeded safety bound');
  }
  return {request, listIssues};
}
async function readMainIdentity(apiClient) {
  const branch = await apiClient.request('/branches/main');
  return branch.commit.sha;
}
async function assertMainIdentity(apiClient, expectedMainSha) {
  const observedMainSha = await readMainIdentity(apiClient);
  if (observedMainSha !== expectedMainSha) throw new Error(`rehearsal main moved: expected ${expectedMainSha}, observed ${observedMainSha}`);
  return observedMainSha;
}
module.exports = {client, readMainIdentity, assertMainIdentity};
