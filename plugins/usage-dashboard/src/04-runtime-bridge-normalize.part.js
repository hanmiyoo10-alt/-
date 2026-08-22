
  function normalizeBridgeModule(name, row) {
    if (!row || typeof row !== 'object') return null;
    const error = normalizeBridgeError(row.error || {
      code: row.errorCode ?? row.error_code ?? '',
      type: row.errorType ?? row.error_type ?? '',
      message: row.errorMessage ?? row.error_message ?? ''
    });
    const status = String(row.status || row.state || (error ? 'error' : 'ok')).toLowerCase() || 'unknown';
    const fetchedAt = bridgeTimestamp(row.fetchedAt ?? row.updatedAt ?? row.updated_at ?? row.lastUpdatedAt ?? row.completedAt);
    const durationRaw = row.durationMs ?? row.duration_ms ?? row.elapsedMs ?? row.elapsed_ms ?? row.latencyMs ?? row.tookMs;
    return {
      name:String(name || row.name || 'module'),
      status,
      stale:row.stale === true || status === 'stale',
      fetchedAt,
      durationMs:num(durationRaw) ? Math.max(0, Number(durationRaw)) : null,
      errorCode:String(row.errorCode ?? row.error_code ?? error?.code ?? ''),
      errorType:String(row.errorType ?? row.error_type ?? error?.type ?? ''),
      errorMessage:String(row.errorMessage ?? row.error_message ?? error?.message ?? '')
    };
  }

  function normalizeBridgeModules(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const [name, row] of Object.entries(raw)) {
      const normalized = normalizeBridgeModule(name, row);
      if (normalized) out[name] = normalized;
    }
    return Object.keys(out).length ? out : null;
  }

  function bridgeSemver(value) {
    const match = String(value || '').match(/(?:^|[^0-9])(\d+)\.(\d+)\.(\d+)(?:[^0-9]|$)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  }

  function bridgeCompatibleVersion(value, compatibility = null) {
    if (typeof compatibility?.compatible === 'boolean') return compatibility.compatible;
    const current = bridgeSemver(value);
    const required = bridgeSemver(REQUIRED_BRIDGE_VERSION);
    if (!current || !required) return null;
    for (let i = 0; i < 3; i += 1) {
      if (current[i] > required[i]) return true;
      if (current[i] < required[i]) return false;
    }
    return true;
  }

  function bridgeTimestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    if (num(value)) {
      const n = Number(value);
      return n > 0 && n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeBridgeMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const version = String(raw.bridgeVersion || raw.version || '');
    const compatibility = raw.compatibility && typeof raw.compatibility === 'object' ? raw.compatibility : null;
    const modules = normalizeBridgeModules(raw.modules);
    const diagnostics = raw.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : null;
    const capabilitiesRaw = raw.bridgeCapabilities ?? raw.capabilities?.bridge ?? raw.capabilities;
    const capabilities = capabilitiesRaw && typeof capabilitiesRaw === 'object' ? capabilitiesRaw : null;
    const managerRaw = raw.bridgeManager ?? raw.manager ?? raw.updateManager;
    const manager = managerRaw && typeof managerRaw === 'object' ? managerRaw : null;
    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;
    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();
    if (!version && !compatibility && !modules && !diagnostics && !capabilities && !manager && raw.__bridgeSnapshot !== true) return null;
    return {
      version,
      protocolVersion,
      compatibility,
      compatible: bridgeCompatibleVersion(version, compatibility),
      modules,
      diagnostics,
      capabilities,
      manager,
      fetchedAt
    };
  }
