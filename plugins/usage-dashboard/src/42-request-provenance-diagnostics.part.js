
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
    const key = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const scopeRows = requestLedgerRowsForScope(key);
    const tier = requestServiceTierStats(scopeRows);
    const outcome = requestOutcomeStats(scopeRows);
    const lines = String(base || '').split('\n');
    const replaceLine = (prefix, next) => {
      const index = lines.findIndex(line => line.startsWith(prefix));
      if (index >= 0) lines[index] = next;
    };
    replaceLine('Service tier fidelity:', `Service tier fidelity: requested known ${tier.requestedKnown}/${tier.rows} · served known ${tier.servedKnown}/${tier.rows} · served flex ${tier.flex} · standard ${tier.standard} · priority ${tier.priority} · unknown ${tier.unknown}`);
    replaceLine('Service tier source fields:', `Service tier source fields: requested ${tier.requestedSources.join(',') || 'none'} · served ${tier.servedSources.join(',') || 'none'}`);
    replaceLine('Request outcome taxonomy:', `Request outcome taxonomy: success ${outcome.success} · error ${outcome.error} · cancelled ${outcome.cancelled} · unknown ${outcome.unknown} · rows ${outcome.rows}`);
    const p = requestProvenanceDiagnosticMetadata();
    const rows = Math.max(0, Number(p?.rows || 0));
    const mode = ['account-wide','project-fallback'].includes(String(p?.captureMode)) ? String(p.captureMode) : 'unknown';
    return `${lines.join('\n')}\nAccount request capture: ${mode} · rows ${rows} · fallback ${Math.max(0, Number(p?.fallbackCount || 0))}\nRequest account scope fidelity: DevPass ${Math.max(0, Number(p?.devpass || 0))}/${rows} · Credits ${Math.max(0, Number(p?.credits || 0))}/${rows} · Unknown ${Math.max(0, Number(p?.unknown || 0))}/${rows} · conflict ${Math.max(0, Number(p?.conflict || 0))}\nScope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0`;
  };
