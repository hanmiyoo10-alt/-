
  const diagTextBeforeRequestProvenance = diagText;
  diagText = function diagTextWithRequestProvenance() {
    const base = diagTextBeforeRequestProvenance();
    const key = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const rows = requestLedgerRowsForScope(key);
    const tier = requestServiceTierStats(rows);
    const outcome = requestOutcomeStats(rows);
    const lines = String(base || '').split('\n');
    const replaceLine = (prefix, next) => {
      const index = lines.findIndex(line => line.startsWith(prefix));
      if (index >= 0) lines[index] = next;
    };
    replaceLine('Service tier fidelity:', `Service tier fidelity: requested known ${tier.requestedKnown}/${tier.rows} · served known ${tier.servedKnown}/${tier.rows} · served flex ${tier.flex} · standard ${tier.standard} · priority ${tier.priority} · unknown ${tier.unknown}`);
    replaceLine('Service tier source fields:', `Service tier source fields: requested ${tier.requestedSources.join(',') || 'none'} · served ${tier.servedSources.join(',') || 'none'}`);
    replaceLine('Request outcome taxonomy:', `Request outcome taxonomy: success ${outcome.success} · error ${outcome.error} · cancelled ${outcome.cancelled} · unknown ${outcome.unknown} · rows ${outcome.rows}`);
    return lines.join('\n');
  };
