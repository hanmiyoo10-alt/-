
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
