
  function premiumAllowanceTruth(weekly) {
    const source = weekly && typeof weekly === 'object' ? weekly : null;
    const explicitNumber = (value, predicate) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && predicate(parsed) ? parsed : null;
    };
    const used = explicitNumber(source?.used, value => value >= 0);
    const limit = explicitNumber(source?.limit, value => value > 0);
    const complete = used !== null && limit !== null;
    const remaining = complete ? Math.max(0, limit - used) : null;
    const percentUsed = complete ? (used / limit) * 100 : null;
    const visualPercent = percentUsed === null ? null : Math.min(100, Math.max(0, percentUsed));
    const resetCandidate = source?.resetAt;
    const resetMs = resetTimestamp(resetCandidate);
    const resetAt = Number.isFinite(resetMs) ? resetCandidate : null;
    const state = percentUsed === null
      ? 'unknown'
      : percentUsed >= 100
        ? 'exhausted'
        : percentUsed >= 80
          ? 'warning'
          : 'normal';
    const stateLabel = state === 'normal' ? '정상' : state === 'warning' ? '주의' : state === 'exhausted' ? '소진' : '—';
    return Object.freeze({used, limit, remaining, percentUsed, visualPercent, resetAt, state, stateLabel});
  }

  function premiumAllowanceDiagnosticText(weekly) {
    const allowance = premiumAllowanceTruth(weekly);
    const valueText = value => value === null ? '—' : String(Number(value));
    const percentText = allowance.percentUsed === null ? '—' : `${Number(allowance.percentUsed).toFixed(1)}%`;
    return `Premium allowance: used ${valueText(allowance.used)} · limit ${valueText(allowance.limit)} · remaining ${valueText(allowance.remaining)} · ${percentText} · reset ${allowance.resetAt ? String(allowance.resetAt) : '—'} · state ${allowance.state}`;
  }
