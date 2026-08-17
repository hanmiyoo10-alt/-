
  function bridgeStabilitySnapshot() {
    const bridge = state?.data?.bridge || null;
    const modules = bridge?.modules && typeof bridge.modules === 'object' ? bridge.modules : null;
    const moduleRows = modules ? Object.values(modules).filter(row => row && typeof row === 'object') : [];
    const diagnostics = bridge?.diagnostics && typeof bridge.diagnostics === 'object' ? bridge.diagnostics : null;
    const cache = diagnostics?.cache && typeof diagnostics.cache === 'object' ? diagnostics.cache : null;
    const cli = diagnostics?.cli && typeof diagnostics.cli === 'object' ? diagnostics.cli : null;
    const circuits = diagnostics?.circuits && typeof diagnostics.circuits === 'object' ? diagnostics.circuits : null;
    const circuitStats = diagnostics?.circuitStats && typeof diagnostics.circuitStats === 'object' ? diagnostics.circuitStats : null;
    const moduleError = row => {
      const status = String(row?.status || '').toLowerCase();
      return ['error','open','partial'].includes(status) || Boolean(row?.errorCode) || Boolean(row?.errorType) || Boolean(row?.errorMessage);
    };
    const partialModules = modules ? moduleRows.filter(row => String(row?.status || '').toLowerCase() === 'partial').length : null;
    const slowestModule = moduleRows.filter(row => num(row?.durationMs)).sort((a,b) => Number(b.durationMs) - Number(a.durationMs))[0] || null;
    const numeric = value => num(value) ? Number(value) : null;
    return {
      version: bridge?.version || '',
      compatible: typeof bridge?.compatible === 'boolean' ? bridge.compatible : null,
      fetchedAt: bridge?.fetchedAt || null,
      moduleCount: modules ? Object.keys(modules).length : null,
      staleModules: modules ? moduleRows.filter(row => row?.stale === true).length : null,
      errorModules: modules ? moduleRows.filter(moduleError).length : null,
      partialModules,
      moduleDetails:moduleRows,
      slowestModule,
      cacheHitRate: numeric(cache?.hitRate),
      cacheEntries: numeric(cache?.entries ?? diagnostics?.cacheEntries),
      inFlight: numeric(cache?.inFlight ?? diagnostics?.inFlight),
      staleFallbacks: numeric(cache?.staleFallbacks),
      cliActive: numeric(cli?.active),
      cliQueued: numeric(cli?.queued),
      openCircuits: circuits ? Object.values(circuits).filter(row => String(row?.state || '').toLowerCase() === 'open').length : null,
      circuitRecoveries: numeric(circuitStats?.recoveries)
    };
  }
