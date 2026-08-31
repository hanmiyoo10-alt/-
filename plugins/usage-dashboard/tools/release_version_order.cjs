'use strict';

const VERSION_RE = /^3\.0\.0-(alpha|rc)\.(\d+)(?:\.(\d+))?$/;

function parseReleaseVersion(value) {
  const text = String(value || '').trim();
  if (text === '3.0.0') return Object.freeze({stage:2, series:0, iteration:0, text});
  const match = VERSION_RE.exec(text);
  if (!match) return null;
  const [, stageName, first, second] = match;
  if (stageName === 'alpha') {
    if (second === undefined) return null;
    return Object.freeze({stage:0, series:Number(first), iteration:Number(second), text});
  }
  if (second !== undefined) return null;
  return Object.freeze({stage:1, series:Number(first), iteration:0, text});
}

function compareReleaseVersions(left, right) {
  const a = parseReleaseVersion(left);
  const b = parseReleaseVersion(right);
  if (!a || !b) return null;
  for (const key of ['stage','series','iteration']) {
    if (a[key] !== b[key]) return Math.sign(a[key] - b[key]);
  }
  return 0;
}

function nextForwardFixture(value) {
  const parsed = parseReleaseVersion(value);
  if (!parsed) return null;
  if (parsed.stage === 0) return `3.0.0-alpha.${parsed.series}.${parsed.iteration + 1}`;
  if (parsed.stage === 1) return `3.0.0-rc.${parsed.series + 1}`;
  return null;
}

module.exports = {
  VERSION_RE,
  parseReleaseVersion,
  compareReleaseVersions,
  nextForwardFixture,
};
