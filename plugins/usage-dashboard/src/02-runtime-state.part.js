

  function hydrateState(saved) {
    return {...DEFAULTS,...(saved && typeof saved === 'object' ? saved : {})};
  }

  function normalizeBridgeError(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' || typeof value === 'number') {
      return {code:'', type:'', message:String(value)};
    }
    if (typeof value !== 'object') return {code:'', type:'', message:String(value)};
    const nested = value.error && typeof value.error === 'object' ? value.error : null;
    const codeRaw = value.code ?? value.errorCode ?? value.error_code ?? value.statusCode ?? value.status_code ?? nested?.code ?? '';
    const typeRaw = value.type ?? value.errorType ?? value.error_type ?? nested?.type ?? '';
    const messageRaw = value.message ?? (typeof value.error === 'string' ? value.error : null) ?? nested?.message ?? '';
    const code = codeRaw === null || codeRaw === undefined ? '' : String(codeRaw);
    const type = typeRaw === null || typeRaw === undefined ? '' : String(typeRaw);
    const message = messageRaw === null || messageRaw === undefined ? '' : String(messageRaw);
    return (code || type || message) ? {code, type, message} : null;
  }

  function normalizeErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      const normalized = normalizeBridgeError(value);
      if (normalized) out[key] = normalized;
    }
    return out;
  }

  function errorSummaryText(value) {
    const normalized = normalizeBridgeError(value);
    if (!normalized) return '';
    return [normalized.code, normalized.type, normalized.message].filter(Boolean).join(' · ') || '오류';
  }

  function countErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return 0;
    return Object.values(raw).filter(value => Boolean(normalizeBridgeError(value))).length;
  }

  function usageCacheText(scope) {
    const hasCount = num(scope?.cacheCount);
    const hasRate = num(scope?.cacheRate);
    if (!hasCount && !hasRate) return '—';
    return [
      hasCount ? `${Number(scope.cacheCount).toLocaleString()}회` : '',
      hasRate ? `${Number(scope.cacheRate).toFixed(1)}%` : ''
    ].filter(Boolean).join(' · ');
  }
