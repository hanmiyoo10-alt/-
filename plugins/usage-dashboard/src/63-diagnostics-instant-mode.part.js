
  const diagnosticsInstantModeLegacyBindSettings = bindSettings;
  let diagnosticsModePersistTail = Promise.resolve();

  function persistDiagnosticsModeSerialized() {
    diagnosticsModePersistTail = diagnosticsModePersistTail
      .then(() => persist())
      .catch(error => {
        console.log(`[Local Usage Dashboard] diagnostics mode persist failed: ${error?.message || error}`);
      });
    return diagnosticsModePersistTail;
  }

  function setDiagnosticsModeInstant(mode) {
    const next = mode === 'detailed' ? 'detailed' : 'basic';
    if (diagnosticsWorkspaceMode() === next) return;
    state.diagnosticsMode = next;
    renderSettingsPartial();
    void persistDiagnosticsModeSerialized();
  }

  bindSettings = function diagnosticsInstantModeBindSettings() {
    diagnosticsInstantModeLegacyBindSettings();
    const basic = document.querySelector('#diagnostics-mode-basic');
    const detailed = document.querySelector('#diagnostics-mode-detailed');
    if (basic) basic.onclick = () => setDiagnosticsModeInstant('basic');
    if (detailed) detailed.onclick = () => setDiagnosticsModeInstant('detailed');
  };
