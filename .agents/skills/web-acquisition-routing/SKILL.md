---
name: web-acquisition-routing
description: >-
  Route repository web evidence requests to the lightest sufficient surface and
  use the isolated Playwright renderer only for public unauthenticated content
  that specifically requires JavaScript-rendered DOM evidence.
---

# Web Acquisition Routing

Repository-wide acquisition procedure for rendered public-page evidence. It
composes with `agent-execution-compactness`; it does not replace web search,
connectors, project authority, or existing evidence/currentness gates.

## Routing contract

Use the first evidence-equivalent surface that is sufficient:

1. Existing web/search/connector evidence sufficient -> use it and stop.
2. Static public retrieval sufficient -> use it and stop.
3. Missing evidence is specifically rendered DOM on one public unauthenticated
   URL -> use `tools/web-acquisition/cli.mjs` once for that URL.
4. Anything broader or stateful -> return unsupported/escalation rather than
   silently widening browser authority.

Browser availability is never itself a reason to launch a browser.
## Required result fidelity

Rendered acquisition preserves `status`, `method`, requested/final URL, title,
bounded text/links, `rendered`, `truncated`, warnings, and failure reason.
Empty output is not automatically success. Policy rejection, timeout, browser
unavailability, navigation failure, and truncation remain explicit.

## Trust boundary

Default acquisition is public, unauthenticated, and stateless only:

- only `http:` and `https:` URLs without embedded credentials;
- initial target, network requests, and redirect destinations fail closed when
  they resolve to loopback, private, link-local, metadata-style, or reserved
  network space;
- browser transport uses a short-lived local policy proxy that connects to the
  validated resolved address rather than re-resolving the destination;
- every acquisition uses fresh browser state and disposes it afterward;
- never persist cookies, storage state, profiles, credentials, auth/session
  material, or downloads;
- no login, CAPTCHA/access-control bypass, arbitrary click automation, or
  recursive/site-wide crawl authority.

Local/private targets exist only for deterministic tests through explicit test
mode. Do not use that switch for ordinary repository evidence gathering.

## v1 non-goals

No Crawlee queue/depth traversal, Firecrawl, browser-use, authenticated session,
persistent profile, general browser control plane, or product/runtime mutation.
A need for any of those is a separate design/authority escalation, not v1.
