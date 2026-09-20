import { acquirePage } from './acquire.mjs';

export async function acquireRenderedPage(requestedUrl, options = {}) {
  return acquirePage(requestedUrl, { ...options, mode: 'render' });
}
