import { evaluateCandidate, threeMonthProjection } from '../src/classifier.mjs';

const LABELS = {
  recommended: '추천',
  experiment: '실험',
  hold: '보류',
  manual: '수동형',
};

const GATE_LABELS = {
  EVIDENCE_INCOMPLETE: '근거 미완료',
  NOT_CONFIRMED_ZERO_COST: '무료 아님/미확정',
  HIGH_RISK: '고위험',
};

const grid = document.querySelector('#idea-grid');
const status = document.querySelector('#result-status');
const search = document.querySelector('#search');
const filter = document.querySelector('#decision-filter');
const sort = document.querySelector('#sort-order');
let ideas = [];

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function ratingRow(label, value, inverse = false) {
  const row = element('div', 'rating-row');
  const heading = element('span', '', label);
  const meter = element('span', 'rating-meter');
  const visualValue = inverse ? 6 - value : value;
  meter.setAttribute('aria-label', `${label} ${value}점`);

  for (let index = 1; index <= 5; index += 1) {
    const dot = element('i', index <= visualValue ? 'filled' : '');
    meter.append(dot);
  }
  row.append(heading, meter, element('b', '', String(value)));
  return row;
}

function candidateCard(candidate) {
  const result = evaluateCandidate(candidate);
  const card = element('article', `idea-card decision-${result.decision}`);
  card.dataset.decision = result.decision;

  const top = element('div', 'card-top');
  top.append(
    element('span', `decision-badge ${result.decision}`, LABELS[result.decision]),
    element('span', 'score', `점수 ${result.score}`),
  );

  const title = element('h3', '', candidate.title);
  const summary = element('p', 'card-summary', candidate.summary);
  const ratings = element('div', 'ratings');
  ratings.append(
    ratingRow('난이도', candidate.ratings.difficulty, true),
    ratingRow('간단성', candidate.ratings.simplicity),
    ratingRow('편의성', candidate.ratings.convenience),
    ratingRow('무인성', candidate.ratings.autonomy),
    ratingRow('안전성', candidate.ratings.risk, true),
  );

  const maintenance = element('p', 'maintenance');
  maintenance.append(element('strong', '', '남는 일 '), document.createTextNode(candidate.maintenance));

  const gates = element('div', 'gate-list');
  const gateValues = result.gates.length > 0 ? result.gates : ['통과'];
  for (const gate of gateValues) {
    gates.append(element('span', gate === '통과' ? 'gate-pass' : 'gate-hold', GATE_LABELS[gate] ?? gate));
  }

  const source = element('a', 'source-link', '근거 열기 ↗');
  source.href = candidate.sourceUrl;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';

  card.append(top, title, summary, ratings, maintenance, gates, source);
  return card;
}

function selectedIdeas() {
  const query = search.value.trim().toLocaleLowerCase('ko');
  const decision = filter.value;

  return ideas
    .filter((candidate) => {
      const result = evaluateCandidate(candidate);
      const matchesText = !query || `${candidate.title} ${candidate.summary}`.toLocaleLowerCase('ko').includes(query);
      const matchesDecision = decision === 'all' || result.decision === decision;
      return matchesText && matchesDecision;
    })
    .sort((left, right) => {
      const a = evaluateCandidate(left);
      const b = evaluateCandidate(right);
      if (sort.value === 'score') return b.score - a.score;
      if (sort.value === 'difficulty') return left.ratings.difficulty - right.ratings.difficulty;
      if (sort.value === 'risk') return left.ratings.risk - right.ratings.risk;
      return right.ratings.autonomy - left.ratings.autonomy || b.score - a.score;
    });
}

function render() {
  const selected = selectedIdeas();
  grid.replaceChildren(...selected.map(candidateCard));
  status.textContent = `${ideas.length}개 후보 중 ${selected.length}개를 표시합니다.`;
}

function updateSummary() {
  const evaluated = ideas.map((candidate) => ({ candidate, result: evaluateCandidate(candidate) }));
  document.querySelector('#free-count').textContent = evaluated.filter(({ candidate }) => candidate.costStatus === 'free').length;
  document.querySelector('#autonomy-count').textContent = evaluated.filter(({ candidate }) => candidate.ratings.autonomy >= 4).length;
  document.querySelector('#hold-count').textContent = evaluated.filter(({ result }) => result.decision === 'hold').length;
}

async function loadIdeas() {
  try {
    const response = await fetch('./data/ideas.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    ideas = await response.json();
    updateSummary();
    render();
  } catch (error) {
    status.textContent = `후보 데이터를 불러오지 못했습니다: ${error.message}`;
    status.classList.add('error');
  }
}

for (const control of [search, filter, sort]) {
  control.addEventListener('input', render);
}

document.querySelector('#calculator-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const projection = threeMonthProjection({
    setupHours: document.querySelector('#setup-hours').value,
    monthlyHours: document.querySelector('#monthly-hours').value,
    monthlyRevenue: document.querySelector('#monthly-revenue').value,
  });

  const result = document.querySelector('#calculator-result');
  const timeText = `3개월 총 투입 ${projection.totalHours.toLocaleString('ko-KR')}시간 · ${projection.maintenanceClass}`;
  result.textContent = projection.hourlyValue === null || projection.totalRevenue === 0
    ? `${timeText}. 수익은 아직 UNKNOWN으로 둡니다.`
    : `${timeText} · 입력값 기준 시간당 ${Math.round(projection.hourlyValue).toLocaleString('ko-KR')}원`;
});

loadIdeas();

