const RATING_KEYS = ['difficulty', 'simplicity', 'convenience', 'autonomy', 'risk'];
const EVIDENCE_STATES = new Set(['owned', 'verified', 'partial', 'unverified']);
const COST_STATES = new Set(['free', 'free-trial', 'paid', 'unknown']);

function assertRating(name, value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new TypeError(`${name} must be an integer from 1 to 5`);
  }
}

export function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new TypeError('candidate must be an object');
  }

  for (const key of ['id', 'title', 'sourceUrl', 'evidenceStatus', 'costStatus', 'revenueStatus']) {
    if (typeof candidate[key] !== 'string' || candidate[key].trim() === '') {
      throw new TypeError(`${key} must be a non-empty string`);
    }
  }

  if (!/^https:\/\//.test(candidate.sourceUrl)) {
    throw new TypeError('sourceUrl must use HTTPS');
  }
  if (!EVIDENCE_STATES.has(candidate.evidenceStatus)) {
    throw new TypeError(`unsupported evidenceStatus: ${candidate.evidenceStatus}`);
  }
  if (!COST_STATES.has(candidate.costStatus)) {
    throw new TypeError(`unsupported costStatus: ${candidate.costStatus}`);
  }
  if (candidate.revenueStatus !== 'unknown') {
    throw new TypeError('research prototype only accepts revenueStatus=unknown');
  }

  for (const key of RATING_KEYS) {
    assertRating(`ratings.${key}`, candidate.ratings?.[key]);
  }

  return candidate;
}

export function evaluateCandidate(candidate) {
  validateCandidate(candidate);

  const { difficulty, simplicity, convenience, autonomy, risk } = candidate.ratings;
  const score = simplicity + convenience + autonomy - difficulty - risk;
  const gates = [];

  if (!['owned', 'verified'].includes(candidate.evidenceStatus)) {
    gates.push('EVIDENCE_INCOMPLETE');
  }
  if (candidate.costStatus !== 'free') {
    gates.push('NOT_CONFIRMED_ZERO_COST');
  }
  if (risk >= 4) {
    gates.push('HIGH_RISK');
  }

  let decision;
  if (gates.length > 0) {
    decision = 'hold';
  } else if (autonomy >= 4 && score >= 8) {
    decision = 'recommended';
  } else if (score >= 4) {
    decision = 'experiment';
  } else {
    decision = 'manual';
  }

  return { score, decision, gates };
}

export function maintenanceClass(monthlyHours) {
  const hours = Number(monthlyHours);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new TypeError('monthlyHours must be a non-negative number');
  }
  if (hours <= 1) return '저관리형';
  if (hours <= 4) return '반자동형';
  return '수동형';
}

export function threeMonthProjection({ setupHours, monthlyHours, monthlyRevenue }) {
  const values = [setupHours, monthlyHours, monthlyRevenue].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError('calculator values must be non-negative numbers');
  }

  const [setup, monthly, revenue] = values;
  const totalHours = setup + monthly * 3;
  const totalRevenue = revenue * 3;

  return {
    totalHours,
    totalRevenue,
    hourlyValue: totalHours > 0 ? totalRevenue / totalHours : null,
    maintenanceClass: maintenanceClass(monthly),
  };
}

