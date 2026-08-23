
  function normalizeRequestProvenanceMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const captureMode = ['account-wide','project-fallback','unknown'].includes(String(raw.captureMode))
      ? String(raw.captureMode)
      : 'unknown';
    const bounded = value => num(value) ? Math.max(0, Number(value)) : 0;
    return {
      captureMode,
      rows:bounded(raw.rows),
      fallbackCount:bounded(raw.fallbackCount),
      devpass:bounded(raw.devpass),
      credits:bounded(raw.credits),
      unknown:bounded(raw.unknown),
      conflict:bounded(raw.conflict),
      modelInference:0,
      authority:String(raw.authority || '') === 'project-exact+credits-org-used-mode'
        ? 'project-exact+credits-org-used-mode'
        : 'unknown',
    };
  }

  const normalizeScopeActivityBeforeProvenance = normalizeScopeActivity;
  normalizeScopeActivity = function normalizeScopeActivityWithProvenance(raw) {
    const normalized = normalizeScopeActivityBeforeProvenance(raw);
    if (!normalized) return normalized;
    return {
      ...normalized,
      requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),
    };
  };
