export const RANGE_PATHS = Object.freeze([
  '/simcore/latest.js',
  '/simcore/install.js',
  '/usage-dashboard/latest.js',
]);

const RANGE_PATH_SET = new Set(RANGE_PATHS);

export function parseSingleByteRange(value, length) {
  if (typeof value !== 'string' || !Number.isSafeInteger(length) || length < 0) {
    return {kind: 'invalid'};
  }
  const match = /^bytes=(\d+)-(\d+)$/.exec(value.trim());
  if (!match) return {kind: 'invalid'};
  const start = Number(match[1]);
  const requestedEnd = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start > requestedEnd) {
    return {kind: 'invalid'};
  }
  if (start >= length) return {kind: 'unsatisfiable'};
  return {kind: 'range', start, end: Math.min(requestedEnd, length - 1)};
}

function partialHeaders(upstream, length, range) {
  const headers = new Headers(upstream.headers);
  headers.delete('content-encoding');
  headers.set('Accept-Ranges', 'bytes');
  if (range.kind === 'range') {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${length}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
  } else {
    headers.set('Content-Range', `bytes */${length}`);
    headers.set('Content-Length', '0');
  }
  return headers;
}

async function fetchWholeAsset(request, env) {
  const headers = new Headers(request.headers);
  headers.delete('range');
  const fullRequest = new Request(request, {headers});
  return env.ASSETS.fetch(fullRequest);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || !RANGE_PATH_SET.has(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const rangeHeader = request.headers.get('range');
    if (!rangeHeader) return env.ASSETS.fetch(request);

    const upstream = await fetchWholeAsset(request, env);
    if (!upstream.ok) return upstream;

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const range = parseSingleByteRange(rangeHeader, bytes.byteLength);
    const headers = partialHeaders(upstream, bytes.byteLength, range);

    if (range.kind !== 'range') {
      return new Response(null, {status: 416, headers});
    }

    return new Response(bytes.slice(range.start, range.end + 1), {
      status: 206,
      headers,
    });
  },
};
