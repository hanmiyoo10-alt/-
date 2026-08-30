
  function paygAccountTruth(account) {
    const source = account && typeof account === 'object' ? account : null;
    const exactBoolean = value => typeof value === 'boolean' ? value : null;
    const exactNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
    const paygEnabled = exactBoolean(source?.paygEnabled);
    const regularCredits = exactNumber(source?.regularCredits);
    const autoTopUpEnabled = exactBoolean(source?.autoTopUpEnabled);
    const autoTopUpThreshold = exactNumber(source?.autoTopUpThreshold);
    const autoTopUpAmount = exactNumber(source?.autoTopUpAmount);

    let balanceState = 'unknown';
    if (paygEnabled !== null && regularCredits !== null && regularCredits >= 0) {
      if (paygEnabled && regularCredits > 0) balanceState = 'available';
      else if (paygEnabled && regularCredits === 0) balanceState = 'empty';
      else if (!paygEnabled && regularCredits > 0) balanceState = 'held-off';
      else if (!paygEnabled && regularCredits === 0) balanceState = 'off';
    }

    const booleanState = value => value === true ? 'on' : value === false ? 'off' : 'unknown';
    const booleanLabel = value => value === true ? '켜짐' : value === false ? '꺼짐' : '—';
    const balanceLabels = {
      available:'사용 가능',
      empty:'잔액 없음',
      'held-off':'보유 중 · PAYG OFF',
      off:'PAYG OFF',
      unknown:'—',
    };

    return Object.freeze({
      paygEnabled,
      paygState:booleanState(paygEnabled),
      paygLabel:booleanLabel(paygEnabled),
      regularCredits,
      balanceState,
      balanceStateLabel:balanceLabels[balanceState] || '—',
      autoTopUpEnabled,
      autoTopUpState:booleanState(autoTopUpEnabled),
      autoTopUpLabel:booleanLabel(autoTopUpEnabled),
      autoTopUpThreshold,
      autoTopUpAmount,
    });
  }

  function paygAccountDiagnosticText(account) {
    const truth = paygAccountTruth(account);
    const scalar = value => value === null ? '—' : String(value);
    return `PAYG status: overflow ${truth.paygState} · credits ${scalar(truth.regularCredits)} · balance-state ${truth.balanceState} · auto-reload ${truth.autoTopUpState} · threshold ${scalar(truth.autoTopUpThreshold)} · amount ${scalar(truth.autoTopUpAmount)}`;
  }
