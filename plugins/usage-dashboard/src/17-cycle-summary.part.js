
  function cycleSummaryExactMetric(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
  }

  function cycleSummaryKstDateKey(value) {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const timestamp = typeof value === 'number' && Number.isFinite(value) ? value : Date.parse(text);
    if (!Number.isFinite(timestamp)) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:KST_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date(timestamp));
    const get = type => parts.find(part => part.type === type)?.value || '';
    const year = get('year'), month = get('month'), day = get('day');
    return year && month && day ? `${year}-${month}-${day}` : '';
  }

  function cycleSummaryIsKstMidnight(timestamp) {
    if (!Number.isFinite(timestamp)) return false;
    const date = new Date(timestamp);
    if (date.getUTCMilliseconds() !== 0) return false;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:KST_TIME_ZONE, hourCycle:'h23', hour:'2-digit', minute:'2-digit', second:'2-digit'
    }).formatToParts(date);
    const number = type => Number(parts.find(part => part.type === type)?.value);
    return number('hour') === 0 && number('minute') === 0 && number('second') === 0;
  }

  function cycleSummaryDailySeries(window, range) {
    const source = window?.dailySeries;
    if (!source || typeof source !== 'object') return null;
    const granularity = typeof source.granularity === 'string' ? source.granularity.trim().toLowerCase() : '';
    const buckets = Array.isArray(source.buckets) ? source.buckets.map(row => {
      const date = cycleSummaryKstDateKey(row?.date);
      if (!date) return null;
      return {
        date,
        requestCount:cycleSummaryExactMetric(row?.requestCount),
        inputTokens:cycleSummaryExactMetric(row?.inputTokens),
        cachedTokens:cycleSummaryExactMetric(row?.cachedTokens),
        totalTokens:cycleSummaryExactMetric(row?.totalTokens),
      };
    }).filter(Boolean).sort((a,b) => a.date.localeCompare(b.date)) : [];
    const uniqueDates = new Set(buckets.map(row => row.date));
    return {
      range:String(source.range || range || ''),
      granularity,
      buckets,
      valid:granularity === 'daily' && buckets.length > 0 && uniqueDates.size === buckets.length,
    };
  }

  function cycleSummaryMetrics(buckets) {
    const rows = Array.isArray(buckets) ? buckets : [];
    const complete = key => rows.length > 0 && rows.every(row => cycleSummaryExactMetric(row?.[key]) !== null);
    const sum = key => complete(key) ? rows.reduce((total,row) => total + Number(row[key]), 0) : null;
    const requests = sum('requestCount');
    const totalTokens = sum('totalTokens');
    const inputTokens = sum('inputTokens');
    const cachedTokens = sum('cachedTokens');
    const cachedInputShare = inputTokens !== null && cachedTokens !== null && inputTokens > 0
      ? cachedTokens / inputTokens * 100
      : null;
    let peakDay = null;
    if (requests !== null && requests > 0) {
      let best = null;
      for (const row of rows) {
        const count = cycleSummaryExactMetric(row.requestCount);
        if (count === null) { best = null; break; }
        if (!best || count > best.count || (count === best.count && row.date < best.date)) best = {date:row.date,count};
      }
      peakDay = best?.date || null;
    }
    return {requests,totalTokens,cachedInputShare,peakDay};
  }

  function devpassCycleSummaryTruth(account, analytics, now = Date.now()) {
    const windows = analytics?.windows && typeof analytics.windows === 'object' ? analytics.windows : {};
    const raw30 = windows['30d'] || null;
    const raw7 = windows['7d'] || null;
    const series30 = cycleSummaryDailySeries(raw30, '30d');
    const series7 = cycleSummaryDailySeries(raw7, '7d');
    const start = account?.billingCycleStart ? Date.parse(String(account.billingCycleStart)) : NaN;
    const end = account?.expiresAt ? Date.parse(String(account.expiresAt)) : NaN;
    const current = Number(now);
    let exactReason = 'ok';
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) exactReason = 'boundary-missing';
    else if (!Number.isFinite(current) || current < start || current >= end) exactReason = 'period-ended';
    else if (!cycleSummaryIsKstMidnight(start)) exactReason = 'boundary-not-kst-day';
    else if (series30 && series30.granularity && series30.granularity !== 'daily') exactReason = 'granularity-not-daily';
    else if (!series30?.valid) exactReason = 'coverage-insufficient';
    else {
      const startKey = cycleSummaryKstDateKey(start);
      if (!startKey || !series30.buckets.some(row => row.date === startKey)) exactReason = 'coverage-insufficient';
    }

    let mode = 'window-unavailable';
    let title = '사용량 요약';
    let reason = 'window-unavailable';
    let selected = [];
    if (exactReason === 'ok' && series30?.valid) {
      const startKey = cycleSummaryKstDateKey(start);
      const nowKey = cycleSummaryKstDateKey(current);
      selected = series30.buckets.filter(row => row.date >= startKey && (!nowKey || row.date <= nowKey));
      mode = 'billing-cycle-exact';
      title = '이번 사이클';
      reason = 'ok';
    } else if (series30?.valid) {
      selected = series30.buckets;
      mode = 'window-30d';
      title = '최근 30일';
      reason = exactReason;
    } else if (series7?.valid) {
      selected = series7.buckets;
      mode = 'window-7d';
      title = '최근 7일';
      reason = exactReason === 'granularity-not-daily' ? 'granularity-not-daily' : 'coverage-insufficient';
    }

    const metrics = cycleSummaryMetrics(selected);
    if (mode === 'billing-cycle-exact' && reason === 'ok' && [metrics.requests,metrics.totalTokens,metrics.cachedInputShare].some(value => value === null)) {
      reason = 'metric-incomplete';
    }
    return Object.freeze({mode,title,reason,...metrics});
  }

  function devpassCycleSummaryDiagnosticText(truth) {
    const value = truth && typeof truth === 'object' ? truth : devpassCycleSummaryTruth(null, null);
    const scalar = input => input === null || input === undefined ? '—' : String(input);
    const cached = value.cachedInputShare === null ? '—' : `${Number(value.cachedInputShare).toFixed(1)}%`;
    return `DevPass cycle summary: mode ${value.mode} · reason ${value.reason} · requests ${scalar(value.requests)} · tokens ${scalar(value.totalTokens)} · cached-input ${cached} · peak ${scalar(value.peakDay)}`;
  }
