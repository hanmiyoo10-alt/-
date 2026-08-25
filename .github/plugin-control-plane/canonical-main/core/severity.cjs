'use strict';

function severityFor(event, overrides = {}, policy) {
  const reason = event?.observation?.reasonCode;
  const base = policy?.alerts?.defaultSeverity?.[reason] || 'P2';
  if (policy?.alerts?.nonDowngradable?.includes(reason)) return base;
  const override = overrides[reason];
  return policy?.alerts?.severities?.includes(override) ? override : base;
}

module.exports = {severityFor};
