'use strict';

function deriveOperatorState({incidents = [], attention = [], freshnessValid = false} = {}) {
  if (!freshnessValid) return 'UNKNOWN';
  const active = incidents.filter((incident) => incident?.state === 'OPEN');
  if (active.some((incident) => incident.severity === 'P0' || incident.severity === 'P1')) return 'INCIDENT';
  if (active.some((incident) => incident.severity === 'P2') || attention.length > 0) return 'ATTENTION';
  return 'CLEAR';
}

module.exports = {deriveOperatorState};
