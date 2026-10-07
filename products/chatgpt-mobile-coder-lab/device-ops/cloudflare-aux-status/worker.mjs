const PROFILE = "mcl-cloudflare-aux-status-v1";
const SCHEMA = "mcl-cloudflare-aux-status.v1";

const BASE_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
});

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...BASE_HEADERS, ...extraHeaders},
  });
}

export function handleRequest(request) {
  if (request.method !== "GET") {
    return json(405, {
      schema: SCHEMA,
      profile: PROFILE,
      error: "method_not_allowed",
    }, {allow: "GET"});
  }

  const {pathname} = new URL(request.url);

  if (pathname === "/health") {
    return json(200, {
      schema: SCHEMA,
      profile: PROFILE,
      status: "ok",
    });
  }

  if (pathname === "/capabilities") {
    return json(200, {
      schema: SCHEMA,
      profile: PROFILE,
      capabilities: ["self-health", "capability-manifest"],
      outboundFetch: false,
      credentialBindings: false,
      repositoryWrite: false,
      externalActions: false,
      expansionPolicy: [
        "read-only-status",
        "allowlisted-egress-review",
        "bounded-actions-separate-owner",
      ],
    });
  }

  return json(404, {
    schema: SCHEMA,
    profile: PROFILE,
    error: "not_found",
  });
}

export default {
  fetch: handleRequest,
};
