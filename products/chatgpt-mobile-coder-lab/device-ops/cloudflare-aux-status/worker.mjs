const PROFILE = "mcl-cloudflare-aux-status-v1";
const SCHEMA = "mcl-cloudflare-aux-status.v1";
const AUTH_USER = "mcl";
const AUTH_REALM = "mcl-aux-status";
const MAX_BASIC_PAYLOAD_LENGTH = 8192;

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

function unauthorized() {
  return json(401, {
    schema: SCHEMA,
    profile: PROFILE,
    error: "unauthorized",
  }, {
    "www-authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
  });
}

function parseBasicAuthorization(value) {
  if (typeof value !== "string") return null;
  const match = /^Basic +([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[1].length > MAX_BASIC_PAYLOAD_LENGTH) return null;

  let binary;
  try {
    binary = atob(match[1]);
  } catch {
    return null;
  }

  let decoded;
  try {
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    decoded = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
  } catch {
    return null;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

async function digestText(value) {
  return new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  ));
}

async function timingResistantPasswordEqual(candidate, expected) {
  const [left, right] = await Promise.all([
    digestText(candidate.normalize("NFC")),
    digestText(expected.normalize("NFC")),
  ]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function isAuthorized(request, env) {
  const expectedPassword = env?.MCL_STATUS_PASSWORD;
  if (typeof expectedPassword !== "string" || expectedPassword.length === 0) {
    return false;
  }

  const credentials = parseBasicAuthorization(
    request.headers.get("authorization"),
  );
  if (!credentials || credentials.username !== AUTH_USER) return false;

  return timingResistantPasswordEqual(credentials.password, expectedPassword);
}

export async function handleRequest(request, env = {}) {
  const {pathname, protocol} = new URL(request.url);

  if (protocol !== "https:") {
    return json(400, {
      schema: SCHEMA,
      profile: PROFILE,
      error: "https_required",
    });
  }

  if (pathname !== "/health" && pathname !== "/capabilities") {
    return json(404, {
      schema: SCHEMA,
      profile: PROFILE,
      error: "not_found",
    });
  }

  if (request.method !== "GET") {
    return json(405, {
      schema: SCHEMA,
      profile: PROFILE,
      error: "method_not_allowed",
    }, {allow: "GET"});
  }

  if (!(await isAuthorized(request, env))) return unauthorized();

  if (pathname === "/health") {
    return json(200, {
      schema: SCHEMA,
      profile: PROFILE,
      status: "ok",
    });
  }

  return json(200, {
    schema: SCHEMA,
    profile: PROFILE,
    capabilities: ["self-health", "capability-manifest"],
    outboundFetch: false,
    credentialBindings: true,
    authentication: "http-basic",
    repositoryWrite: false,
    externalActions: false,
    expansionPolicy: [
      "read-only-status",
      "allowlisted-egress-review",
      "bounded-actions-separate-owner",
    ],
  });
}

export default {
  fetch: handleRequest,
};
