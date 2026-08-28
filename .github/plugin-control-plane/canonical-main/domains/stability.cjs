'use strict';

const convergence = require('./convergence.cjs');
const circuitBreaker = require('./circuit-breaker.cjs');
const incidentMetrics = require('./incident-metrics.cjs');

module.exports = {
  BLOCK_CLASSES: circuitBreaker.BLOCK_CLASSES,
  CIRCUIT_BREAKER_STATES: circuitBreaker.STATES,
  decideCircuitBreaker: circuitBreaker.decideCircuitBreaker,
  deriveConvergence: convergence.deriveConvergence,
  convergenceAttention: convergence.convergenceAttention,
  unstableAttention: incidentMetrics.unstableAttention,
};
