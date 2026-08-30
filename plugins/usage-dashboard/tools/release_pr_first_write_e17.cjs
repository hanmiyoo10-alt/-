'use strict';

const {
  renderStablePrBody,
  validateStablePrBody,
} = require('./release_handoff_e15.cjs');

const PRODUCT_RE = /^3\.0\.0-alpha\.(5\.\d+)$/;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function oneLine(value, label) {
  const text = String(value ?? '').trim();
  if (!text || /[\r\n]/.test(text)) fail('E17_PR_DRAFT_FIELD_INVALID', label);
  return text;
}

function shortVersion(productVersion) {
  const match = PRODUCT_RE.exec(oneLine(productVersion, 'productVersion'));
  if (!match) fail('E17_PR_DRAFT_PRODUCT_VERSION_INVALID', String(productVersion || ''));
  return match[1];
}

function renderFirstWritePrDraft(input = {}) {
  const productVersion = oneLine(input.productVersion, 'productVersion');
  const version = shortVersion(productVersion);
  const requestNumber = Number(input.requestNumber);
  if (!Number.isSafeInteger(requestNumber) || requestNumber < 1) fail('E17_PR_DRAFT_REQUEST_INVALID', String(input.requestNumber));
  const summary = String(input.summary ?? '').replace(/\r/g, '').trim();
  if (!summary) fail('E17_PR_DRAFT_FIELD_INVALID', 'summary');

  const body = renderStablePrBody({
    version,
    summary,
    productVersion,
    engineVersion: oneLine(input.engineVersion, 'engineVersion'),
    managerVersion: oneLine(input.managerVersion, 'managerVersion'),
    snapshotContract: oneLine(input.snapshotContract, 'snapshotContract'),
    recentRequestContract: oneLine(input.recentRequestContract, 'recentRequestContract'),
    requestNumber,
  });
  validateStablePrBody(body, requestNumber);

  return Object.freeze({
    title: `release(usage-dashboard): ${productVersion}`,
    base: 'main',
    head: `stage/usage-dashboard-${productVersion}`,
    body,
    requestNumber,
    productVersion,
  });
}

module.exports = {
  PRODUCT_RE,
  shortVersion,
  renderFirstWritePrDraft,
};
