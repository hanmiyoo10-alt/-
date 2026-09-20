---
name: web-acquisition-routing
description: >-
  Route repository web evidence requests to the lightest sufficient surface,
  use isolated Playwright only for public JavaScript-rendered page evidence,
  bounded Crawlee orchestration only for same-origin recursion, and optional
  Firecrawl structured extraction only with explicit provider opt-in, and bounded
  Playwright reveal interaction only for one public unauthenticated page.
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
5. Missing evidence is schema-constrained structured data from exactly one public
   unauthenticated URL, and external-provider egress is explicitly opted in ->
   use `tools/web-acquisition/structured-cli.mjs` with `--provider firecrawl`.
6. Missing evidence exists only after a small explicit public-page reveal, with no
   auth/input/form/navigation workflow -> use `tools/web-acquisition/reveal-cli.mjs`.
7. Anything broader, cross-origin, authenticated, stateful, or provider-driven
   crawl/search/action work -> return unsupported/separate-authority disposition.
Browser, Crawlee, Firecrawl availability, or API-key presence is never itself a
reason to escalate. V2 never replaces v1 when one rendered URL is sufficient,
and v3 never replaces v1/v2 when local evidence is sufficient.

## Required result fidelity

Single-page acquisition preserves `status`, `method`, requested/final URL,
title, bounded text/links, `rendered`, `truncated`, warnings, and failure reason.
Bounded crawl additionally preserves seed, same-origin scope, declared limits,
visited count, depth-bearing per-page v1 results, bounded skipped reasons, and
aggregate truncation/failure evidence.

Structured provider extraction additionally preserves provider identity, source
URL, stable schema identity, whether provider data egress occurred, whether zero
data retention was requested, request count, bounded usage metadata when
available, schema-validated data, warnings, and explicit failure reason.

Empty output is not automatically success. Policy rejection, timeout, browser
unavailability, navigation failure, child-page failure, robots rejection, crawl
limit exhaustion, provider auth/billing/rate-limit/server/transport failure,
retention-unavailable response, and schema mismatch remain explicit.

## Trust boundary

Default local acquisition is public, unauthenticated, and stateless only:

- only `http:` and `https:` URLs without embedded credentials;
- v1/v2 network requests preserve target-policy blocking for private, loopback,
  link-local, metadata, and reserved network space;
- v1 browser transport uses the validated resolved address through its local
  policy proxy, with fresh browser state disposed after each acquisition;
- never persist cookies, storage state, profiles, credentials, auth/session
  material, downloads, or Crawlee crawl state;
- no login, CAPTCHA/access-control bypass, general/arbitrary click automation, or
  bot-protection bypass; v4 permits only its declared bounded reveal plan.
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

Local/private targets exist only for deterministic v1/v2 tests through explicit
test mode. Do not use that switch for ordinary repository evidence gathering.

## Bounded v3 provider contract

V3 is one optional structured-extraction request, not general Firecrawl access:

- exactly one public unauthenticated URL plus one bounded JSON schema;
- explicit `--provider firecrawl` opt-in is mandatory;
- the API key comes only from runtime `FIRECRAWL_API_KEY`, never a CLI argument;
- the adapter calls only fixed `https://api.firecrawl.dev/v2/scrape` and makes at
  most one provider request with no automatic retry;
- request JSON extraction only, with `maxAge: 0`, `storeInCache: false`,
  `skipTlsVerification: false`, `proxy: basic`, and `zeroDataRetention: true`;
- if zero-data-retention is unavailable, fail closed rather than retrying with a
  weaker retention mode;
- returned structured data must validate against the requested schema before
  status can be `OK`.
V3 reuses local target-policy validation only as an egress preflight. Firecrawl
controls its own DNS resolution, redirects, and network transport, so provider
fetching does not inherit v1's validated-address policy-proxy socket guarantee.
Treat provider use as third-party data egress and preserve that provenance.

Do not install the Firecrawl SDK/CLI, run Firecrawl login/setup/init, create
editor skills/MCP/default-provider configuration, or persist provider auth state.
Ordinary tests use injected provider transport and require no live credential or
paid request.

## Explicit non-goals

No multi-seed or multi-URL provider jobs, cross-origin/site-wide traversal,
sitemap discovery, crawl concurrency above 1, Firecrawl crawl/map/search/agent/
interact/actions, browser-use, Stagehand, authenticated session, target-site
cookies/auth headers, persistent profile/crawl resume, general browser control
plane, access-control bypass, or product/runtime mutation. Any such need requires
a separate authority and trust-boundary design rather than silently widening
v1, v2, or v3.

## Bounded v4 reveal contract

V4 is a narrow read-oriented public-page reveal mode over the existing v1
Playwright/policy-proxy transport. It is not general browser automation.

- exactly one public unauthenticated URL plus one bounded machine-readable plan;
- use `reveal-cli.mjs --plan-file <plan.json> <url>` only when passive v1/v2/v3
  evidence is insufficient and a small explicit reveal is the missing job;
- plans are at most 16 KiB, version 1, with 1..5 actions and a 12 second total
  interaction budget;
- action types are exactly `clickReveal` and visible-only `waitFor`;
- selectors are CSS-only, at most 512 characters, and must resolve deterministically;
- each action timeout is finite, defaults to 2000 ms, and cannot exceed 5000 ms;
- `clickReveal` is limited to one visible semantic reveal controller: safe buttons,
  `summary` under `details`, or non-form ARIA button/tab controls;
- links, edit/input/select surfaces, submit/reset/file/navigation controls, unsafe
  form ownership, downloads and unsupported controllers fail closed before click;
- fresh context/browser/proxy state is disposed after every operation and no login,
  cookie/profile/session persistence, permission grant, or supplied auth state exists.

During the reveal phase, the original target/redirect/subresource policy remains active
and an additional bounded effect guard is armed only after initial navigation:

- only GET/HEAD browser requests may continue;
- non-GET/HEAD requests, second top-level navigation, popup/new-page, download, and
  dialog attempts are explicit blocked effects and make final `OK` impossible;
- downloads are not accepted, dialogs are dismissed, and no browser permission is granted;
- result provenance includes bounded `actionsRequested`, `actionsExecuted`,
  `actionResults`, and `blockedEffects` alongside the rendered evidence.

This guard does not prove universal remote-side-effect freedom. GET/HEAD behavior remains
site-controlled, so v4 preserves an explicit residual-risk warning and must never be
presented as a mathematically side-effect-free browser workflow. Anything requiring text
entry, form submission, navigation workflow, authentication/session continuity, arbitrary
JavaScript/evaluate input, AI action planning, browser-use, Stagehand, or provider actions
belongs to separate authority, including #2030 for authenticated/stateful browser sessions.
