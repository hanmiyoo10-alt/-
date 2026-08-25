'use strict';

function createGitHubClient({token, repo, fetchImpl = fetch, apiVersion = '2022-11-28', userAgent = 'canonical-main-orchestrator'} = {}) {
  if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
  if (!repo) throw new Error('GITHUB_REPOSITORY is required');
  async function request(endpoint, options = {}) {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}${endpoint}`, {
      method: options.method || 'GET',
      headers: {Accept: options.accept || 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': apiVersion, 'User-Agent': userAgent},
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (options.allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
    return response;
  }
  async function api(endpoint, options = {}) {
    const response = await request(endpoint, options);
    if (response === null || response.status === 204) return null;
    return response.json();
  }
  async function fetchText(endpoint) {
    const response = await request(endpoint, {accept: 'text/plain'});
    return response.text();
  }
  return {repo, request, api, fetchText};
}

module.exports = {createGitHubClient};
