'use strict';

const convergence = require('./convergence.cjs');
const incidentMetrics = require('./incident-metrics.cjs');

module.exports = {
  deriveConvergence: convergence.deriveConvergence,
  convergenceAttention: convergence.convergenceAttention,
  unstableAttention: incidentMetrics.unstableAttention,
};
