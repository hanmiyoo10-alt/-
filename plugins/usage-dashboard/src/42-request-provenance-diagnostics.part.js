
  function requestProvenanceDiagnosticMetadata() {
    const source = state.data?.usageScopes?.scopes?.all?.requestProvenance || null;
    if (source && typeof source === 'object') return source;
    const stats = requestAccountScopeStats(requestLedgerRowsForScope('all'));
    return {
      captureMode:'unknown',
      rows:stats.rows,
      fallbackCount:0,
      devpass:stats.devpass,
      credits:stats.credits,
      unknown:stats.unknown,
      conflict:stats.conflict,
      modelInference:0,
      authority:'unknown',
    };
  }

  const diagTextBeforeRequestProvenance = diagText;
  diagText = function diagTextWithRequestProvenance() {
    const base = diagTextBeforeRequestProvenance();
    const p = requestProvenanceDiagnosticMetadata();
    const rows = Math.max(0, Number(p?.rows || 0));
    const mode = ['account-wide','project-fallback'].includes(String(p?.captureMode)) ? String(p.captureMode) : 'unknown';
    return `${base}\nAccount request capture: ${mode} · rows ${rows} · fallback ${Math.max(0, Number(p?.fallbackCount || 0))}\nRequest account scope fidelity: DevPass ${Math.max(0, Number(p?.devpass || 0))}/${rows} · Credits ${Math.max(0, Number(p?.credits || 0))}/${rows} · Unknown ${Math.max(0, Number(p?.unknown || 0))}/${rows} · conflict ${Math.max(0, Number(p?.conflict || 0))}\nScope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0`;
  };
