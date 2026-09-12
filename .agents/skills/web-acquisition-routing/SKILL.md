---
name: web-acquisition-routing
description: >-
  Route repository web evidence requests to the lightest sufficient surface,
  use isolated Playwright only for public JavaScript-rendered page evidence,
  and use bounded Crawlee orchestration only when same-origin recursive evidence
  is actually required.
---

# Web Acquisition Routing

Repository-wide acquisition procedure for public rendered web evidence. It
composes with `agent-execution-compactness`; it does not replace web search,
connectors, project authority, or existing evidence/currentness gates.

## Routing contract

Use the first evidence-equivalent surface that is sufficient:

1. Existing web/search/connector evidence sufficient -> use it and stop.
2. Static public retrieval sufficient -> use it and stop.
3. Missing evidence is rendered DOM on exactly one public unauthenticated URL ->
   use `tools/web-acquisition/cli.mjs` once for that URL.
4. Missing evidence requires finite same-origin rendered recursion from exactly
   one public unauthenticated seed -> use `tools/web-acquisition/crawl-cli.mjs`.
5. Anything broader, cross-origin, authenticated, or stateful -> return
   unsupported/escalation rather than silently widening browser authority.

Browser or Crawlee availability is never itself a reason to escalate. V2 never
replaces the v1 single-page route when one rendered URL is sufficient.
## Required result fidelity

Single-page acquisition preserves `status`, `method`, requested/final URL,
title, bounded text/links, `rendered`, `truncated`, warnings, and failure reason.
Bounded crawl additionally preserves seed, same-origin scope, declared limits,
visited count, depth-bearing per-page v1 results, bounded skipped reasons, and
aggregate truncation/failure evidence.

Empty output is not automatically success. Policy rejection, timeout, browser
unavailability, navigation failure, child-page failure, robots rejection, and
limit exhaustion remain explicit. A bounded crawl is `OK` only when its declared
scope completed without unresolved blocked/failed/unknown evidence or truncation.

## Trust boundary

Default acquisition is public, unauthenticated, and stateless only:

- only `http:` and `https:` URLs without embedded credentials;
- initial targets, network requests, redirects, and candidates preserve the v1
  target-policy boundary for private, loopback, link-local, metadata, and
  reserved network space;
- browser transport uses a short-lived local policy proxy that connects to the
  validated resolved address rather than re-resolving the destination;
- every page acquisition uses fresh browser state and disposes it afterward;
- never persist cookies, storage state, profiles, credentials, auth/session
  material, downloads, or Crawlee crawl state;
- no login, CAPTCHA/access-control bypass, arbitrary click automation, or
  bot-protection bypass.
## Bounded v2 crawl contract

V2 is queue/orchestration only. Crawlee does not own browser transport; every
page is acquired through the existing v1 `acquireRenderedPage()` boundary.

- exactly one seed and same-origin recursive expansion only;
- queue dedupe with concurrency fixed at 1;
- `maxDepth` is bounded to 0..3 and `maxPages` to 1..20;
- per-page and aggregate output budgets are finite, and exhaustion is `PARTIAL`;
- Crawlee storage persistence is disabled for each crawl operation;
- robots is loaded through the same short-lived policy proxy before enqueue or
  acquisition decisions; Crawlee built-in robots fetching remains disabled.

Local/private targets exist only for deterministic tests through explicit test
mode. Do not use that switch for ordinary repository evidence gathering.

## Explicit non-goals

No multi-seed crawl, cross-origin/site-wide traversal, sitemap discovery,
concurrency above 1, Firecrawl, browser-use, Stagehand, authenticated session,
persistent profile/crawl resume, general browser control plane, or
product/runtime mutation. A need for those requires a separate authority and
trust-boundary design rather than widening v1 or v2 silently.
