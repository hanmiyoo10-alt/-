import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidate, maintenanceClass, threeMonthProjection } from '../src/classifier.mjs';

function candidate(overrides = {}) {
  return {
    id: 'sample',
    title: '샘플 후보',
    sourceUrl: 'https://example.com/source',
    evidenceStatus: 'verified',
    costStatus: 'free',
    revenueStatus: 'unknown',
    ratings: {
      difficulty: 2,
      simplicity: 5,
      convenience: 5,
      autonomy: 5,
      risk: 1,
    },
    ...overrides,
  };
}

test('무료·검증·저위험 후보만 추천할 수 있다', () => {
  assert.deepEqual(evaluateCandidate(candidate()), {
    score: 12,
    decision: 'recommended',
    gates: [],
  });
});

test('점수가 높아도 미검증 백그라운드 앱은 보류한다', () => {
  const result = evaluateCandidate(candidate({
    evidenceStatus: 'unverified',
    costStatus: 'unknown',
    ratings: { difficulty: 1, simplicity: 5, convenience: 5, autonomy: 5, risk: 5 },
  }));

  assert.equal(result.decision, 'hold');
  assert.deepEqual(result.gates, ['EVIDENCE_INCOMPLETE', 'NOT_CONFIRMED_ZERO_COST', 'HIGH_RISK']);
});

test('무료 체험은 무료 후보로 승격하지 않는다', () => {
  const result = evaluateCandidate(candidate({ costStatus: 'free-trial' }));
  assert.equal(result.decision, 'hold');
  assert.deepEqual(result.gates, ['NOT_CONFIRMED_ZERO_COST']);
});

test('연구 프로토타입은 임의 수익 상태를 거부한다', () => {
  assert.throws(
    () => evaluateCandidate(candidate({ revenueStatus: 'guaranteed' })),
    /revenueStatus=unknown/,
  );
});

test('월 유지시간으로 저관리/반자동/수동을 나눈다', () => {
  assert.equal(maintenanceClass(1), '저관리형');
  assert.equal(maintenanceClass(4), '반자동형');
  assert.equal(maintenanceClass(4.5), '수동형');
});

test('3개월 투입시간과 사용자 입력값만 계산한다', () => {
  assert.deepEqual(threeMonthProjection({ setupHours: 8, monthlyHours: 1, monthlyRevenue: 50_000 }), {
    totalHours: 11,
    totalRevenue: 150_000,
    hourlyValue: 150_000 / 11,
    maintenanceClass: '저관리형',
  });
});

