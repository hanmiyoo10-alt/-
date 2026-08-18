
  function recentRequestValue(row, keys, fallback = null) {
    for (const key of keys) {
      const parts = String(key).split('.');
      let value = row;
      for (const part of parts) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function recentRequestField(row, keys) {
    for (const key of keys) {
      const value = recentRequestValue(row, [key], null);
      if (value !== null && value !== undefined && value !== '') return {key, value};
    }
    return {key:'', value:null};
  }

  function requestCacheSignal(row) {
    const explicit = recentRequestValue(row, ['cacheHit','cache_hit','cached','isCached','is_cached','cache.hit'], null);
    const text = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
    if (typeof explicit === 'boolean') return explicit;
    if (num(explicit)) return Number(explicit) > 0;
    if (['true','yes','hit','cached'].includes(text)) return true;
    if (['false','no','miss','uncached'].includes(text)) return false;
    const cachedTokens = recentRequestValue(row, [
      'cachedTokens','cached_tokens','usage.cachedTokens','usage.cached_tokens',
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ], null);
    return num(cachedTokens) ? Number(cachedTokens) > 0 : null;
  }


  function requestCacheMetrics(row) {
    const metric = keys => {
      const value = recentRequestValue(row, keys, null);
      return num(value) ? Math.max(0, Number(value)) : null;
    };
    const inputTokens = metric([
      'inputTokens','input_tokens','promptTokens','prompt_tokens','usage.inputTokens','usage.input_tokens','usage.prompt_tokens'
    ]);
    const outputTokens = metric([
      'outputTokens','output_tokens','completionTokens','completion_tokens','usage.outputTokens','usage.output_tokens','usage.completion_tokens'
    ]);
    const explicitCachedInputTokens = metric([
      'cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens',
      'usage.cachedInputTokens','usage.cached_input_tokens','usage.cachedTokens','usage.cached_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ]);
    const cacheReadInputTokens = metric([
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens'
    ]);
    const cacheCreationInputTokens = metric([
      'cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens',
      'usage.cacheCreationInputTokens','usage.cache_creation_input_tokens','usage.cacheWriteTokens','usage.cache_write_tokens',
      'usage.input_tokens_details.cache_write_tokens','usage.prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens'
    ]);
    const cacheCreation5mTokens = metric([
      'cacheCreation5mTokens','cache_creation_5m_tokens','usage.cacheCreation5mTokens','usage.cache_creation_5m_tokens',
      'cache_creation.ephemeral_5m_input_tokens','usage.cache_creation.ephemeral_5m_input_tokens'
    ]);
    const cacheCreation1hTokens = metric([
      'cacheCreation1hTokens','cache_creation_1h_tokens','usage.cacheCreation1hTokens','usage.cache_creation_1h_tokens',
      'cache_creation.ephemeral_1h_input_tokens','usage.cache_creation.ephemeral_1h_input_tokens'
    ]);
    const cachedInputTokens = explicitCachedInputTokens !== null
      ? explicitCachedInputTokens
      : (cacheReadInputTokens !== null || cacheCreationInputTokens !== null
        ? Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
        : null);
    const denominatorKnown = inputTokens !== null || cacheReadInputTokens !== null || cacheCreationInputTokens !== null;
    const readDenominator = denominatorKnown
      ? Number(inputTokens || 0) + Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
      : null;
    const cacheReadRatio = cacheReadInputTokens !== null && readDenominator > 0
      ? Math.max(0, Math.min(100, cacheReadInputTokens / readDenominator * 100))
      : null;
    return {
      inputTokens,
      outputTokens,
      cachedInputTokens,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      cacheCreation5mTokens,
      cacheCreation1hTokens,
      cacheReadRatio
    };
  }

  function requestCacheDetailText(row) {
    const parts = [];
    if (typeof row?.cacheHit === 'boolean') parts.push(`캐시 ${row.cacheHit ? 'HIT' : 'MISS'}`);
    if (num(row?.cachedInputTokens)) parts.push(`Cached ${Number(row.cachedInputTokens).toLocaleString()}`);
    if (num(row?.cacheReadInputTokens)) parts.push(`Read ${Number(row.cacheReadInputTokens).toLocaleString()}`);
    if (num(row?.cacheCreationInputTokens)) {
      const ttl = [
        num(row?.cacheCreation5mTokens) ? `5m=${Number(row.cacheCreation5mTokens).toLocaleString()}` : '',
        num(row?.cacheCreation1hTokens) ? `1h=${Number(row.cacheCreation1hTokens).toLocaleString()}` : ''
      ].filter(Boolean).join(', ');
      parts.push(`Write ${Number(row.cacheCreationInputTokens).toLocaleString()}${ttl ? ` (${ttl})` : ''}`);
    }
    if (num(row?.cacheReadRatio)) parts.push(`Read ratio ${Number(row.cacheReadRatio).toFixed(1)}%`);
    return parts.join(' · ');
  }
