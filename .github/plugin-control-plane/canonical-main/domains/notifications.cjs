'use strict';

function systemKey(envelope) {
  const scope = [...(envelope.scope || [])].filter(Boolean).sort();
  const specific = scope.filter((value) => value.startsWith('plugin:') || value.startsWith('product:'));
  if (specific.length === 1) return specific[0];
  if (specific.length > 1) return `multi:${specific.join('+')}`;
  if (scope.includes('scope:repo')) return 'scope:repo';
  return scope.length ? `scope:${scope.join('+')}` : 'scope:unknown';
}

function bundleEligibleNotifications(envelopes = []) {
  const groups = new Map();
  for (const envelope of envelopes) {
    if (!envelope || envelope.eligible !== true) continue;
    const key = systemKey(envelope);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(envelope);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      systemKey: key,
      deliveryKeys: items.map((item) => item.deliveryKey),
      items: items.sort((a, b) => {
        const severityRank = {P0: 0, P1: 1, P2: 2, P3: 3};
        const severity = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
        if (severity !== 0) return severity;
        if (a.correlationKey === b.correlationKey) {
          if (a.transition === b.transition) return String(a.eventId).localeCompare(String(b.eventId));
          return a.transition === 'OPEN' ? -1 : 1;
        }
        return String(a.correlationKey).localeCompare(String(b.correlationKey));
      }),
    }));
}

module.exports = {
  systemKey,
  bundleEligibleNotifications,
};
