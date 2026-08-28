// 5.71 Cross-Scope Request Provenance capture extension.
// Keep the stable 5.70 capture tap as the base, then patch only the request-log
// metadata/query policy before the official CLI process starts.
const ensureCaptureTapBeforeRequestProvenance = ensureCaptureTap;
let ensureCaptureTapRequestProvenanceInFlight = null;

function replaceCaptureSourceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`REQUEST_PROVENANCE_CAPTURE_PATCH_MISMATCH:${label}:${count}`);
  return source.replace(oldText, newText);
}

ensureCaptureTap = async function ensureCaptureTapWithRequestProvenance() {
  if (ensureCaptureTapRequestProvenanceInFlight) return ensureCaptureTapRequestProvenanceInFlight;
  const patchPromise = (async () => {
    await ensureCaptureTapBeforeRequestProvenance();
    let source = await fs.readFile(CAPTURE_TAP_FILE, 'utf8');

    source = replaceCaptureSourceOnce(
      source,
      "llmgateway.devpass.bridge.capture.v10",
      "llmgateway.devpass.bridge.capture.v13",
      'capture-marker',
    );

    source = replaceCaptureSourceOnce(
      source,
      "      const cacheUsage = normalizeProviderCacheUsage(row);\n      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0",
      "      const requestProject = logField(row, ['projectId','project_id','project.id','metadata.projectId','metadata.project_id']);\n      const requestOrganization = logField(row, ['organizationId','organization_id','orgId','org_id','organization.id','metadata.organizationId','metadata.organization_id']);\n      const requestUsedMode = logField(row, ['usedMode','used_mode']);\n      const finalHttpStatus = logField(row, ['errorDetails.statusCode']);\n      const serviceTierSelection = logField(row, ['routingMetadata.serviceTierSource']);\n      const cacheUsage = normalizeProviderCacheUsage(row);\n      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0",
      'exact-final-http-status-input',
    );

    source = replaceCaptureSourceOnce(
      source,
      "        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',\n        requestedServiceTier: requestedTier.value,",
      "        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',\n        httpStatusCode: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? finalHttpStatus.value : null,\n        httpStatusSource: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'errorDetails.statusCode' : '',\n        httpStatusFidelity: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'explicit' : 'unknown',\n        serviceTierSelectionSource: ['request','coding-plan-default'].includes(String(serviceTierSelection.value || '').trim().toLowerCase()) ? String(serviceTierSelection.value).trim().toLowerCase() : 'unknown',\n        requestProjectId: requestProject.value === null ? '' : String(requestProject.value),\n        requestOrganizationId: requestOrganization.value === null ? '' : String(requestOrganization.value),\n        requestUsedMode: requestUsedMode.value === null ? '' : String(requestUsedMode.value),\n        requestedServiceTier: requestedTier.value,",
      'exact-final-http-status-fields',
    );

    const logsStart = source.indexOf("  const logsCandidates = (orgUrl, statusUrl, projectId, range) => {");
    const logsEnd = source.indexOf("\n\n  const originalFetch = globalThis.fetch;", logsStart);
    if (logsStart < 0 || logsEnd <= logsStart) throw new Error('REQUEST_PROVENANCE_CAPTURE_PATCH_MISMATCH:logs-candidates-boundary');
    const logsBlock = source.slice(logsStart, logsEnd);
    const patchedLogsBlock = replaceCaptureSourceOnce(
      logsBlock,
      "    return [...new Map(out.map((u) => [u.toString(), u])).values()];",
      "    const projectScoped = [...new Map(out.map((u) => [u.toString(), u])).values()];\n    const accountWide = projectScoped.map((u) => {\n      const next = new URL(u);\n      next.searchParams.delete('projectId');\n      return next;\n    });\n    return [...new Map([...accountWide, ...projectScoped].map((u) => [u.toString(), u])).values()];",
      'account-wide-before-project-fallback',
    );
    source = source.slice(0, logsStart) + patchedLogsBlock + source.slice(logsEnd);

    source = replaceCaptureSourceOnce(
      source,
      "storeLogs(logs, requestedActivityRange, 'fetch')",
      "storeLogs(logs, requestedActivityRange, logsTarget.searchParams.has('projectId') ? 'project-fallback-fetch' : 'account-wide-fetch')",
      'fetch-capture-mode',
    );
    source = replaceCaptureSourceOnce(
      source,
      "storeLogs(logs, requestedActivityRange, 'node-request')",
      "storeLogs(logs, requestedActivityRange, logsTarget.searchParams.has('projectId') ? 'project-fallback-node-request' : 'account-wide-node-request')",
      'node-capture-mode',
    );

    // Raw project/org identity and usedMode live only in this short-lived 0600
    // capture file. Engine normalization consumes them and emits only derived
    // scope/fidelity fields before data reaches the snapshot or request ledger.
    await fs.writeFile(CAPTURE_TAP_FILE, source, { mode: 0o600 });
  })();
  ensureCaptureTapRequestProvenanceInFlight = patchPromise;
  try {
    return await patchPromise;
  } finally {
    if (ensureCaptureTapRequestProvenanceInFlight === patchPromise) {
      ensureCaptureTapRequestProvenanceInFlight = null;
    }
  }
};