# Web Acquisition

Repository-owned bounded acquisition tooling for **public, unauthenticated web evidence**.

This directory implements four progressively stronger surfaces:

1. one rendered public page through Playwright;
2. finite same-origin rendered crawl orchestration through Crawlee;
3. one schema-constrained Firecrawl structured-extraction request with explicit provider opt-in;
4. one bounded read-oriented reveal plan over the Playwright transport.

The owner is repository tooling only. It does **not** create repository, project, release,
production, runtime, browser-session, provider-account, or source-of-truth authority.
Fetched or extracted content remains evidence from the named source/provider and must still
be evaluated under the owning task's authority/currentness rules.

Routing guidance lives in
`.agents/skills/web-acquisition-routing/SKILL.md`. Prefer the lightest
evidence-equivalent surface. Existing web/search/connector evidence or static retrieval
should win over these heavier acquisition paths when sufficient.

## Capability matrix

| Surface | Entrypoint | Current job | Key boundary |
| --- | --- | --- | --- |
| v1 render | `cli.mjs` | render exactly one public page and extract bounded title/text/links | fresh Playwright state; public target policy |
| v2 crawl | `crawl-cli.mjs` | finite same-origin recursion where one rendered page is insufficient | robots + same-origin + finite depth/page/text budgets; concurrency 1 |
| v3 structured | `structured-cli.mjs` | one schema-constrained Firecrawl extraction request | explicit provider opt-in + runtime API key + third-party data egress |
| v4 reveal | `reveal-cli.mjs` | reveal otherwise-hidden evidence on one public page with a small fixed plan | no auth/input/form/navigation workflow; guarded read-oriented controls only |

Do not escalate merely because Playwright, Crawlee, Firecrawl, Chromium, or a provider key
is available. A broader surface never makes weaker evidence more authoritative.

## Install and local validation

The package requires Node.js 20 or newer. The repository CI uses Node 22.

```bash
cd tools/web-acquisition
npm ci
npx playwright install --with-deps --only-shell chromium
npm test
```

`npm test` runs the deterministic v1-v4 contract suites:

- `tests/web-acquisition.test.mjs`
- `tests/web-acquisition-crawl.test.mjs`
- `tests/web-acquisition-firecrawl.test.mjs`
- `tests/web-acquisition-reveal.test.mjs`

Pull requests and main pushes touching this directory are covered by
`.github/workflows/web-acquisition-ci.yml`.

## Shared public-target policy

Local Playwright/Crawlee acquisition is public, unauthenticated, and stateless by default.

The target policy:

- accepts only `http:` and `https:`;
- rejects embedded URL credentials;
- rejects localhost, loopback, private, link-local, documentation, multicast, reserved,
  and other blocked address ranges;
- resolves the target before browser acquisition and keeps browser requests behind the
  repository policy proxy;
- applies the same target checks to browser redirects/subresources;
- strips username/password material from bounded URL evidence;
- keeps browser/profile/storage state ephemeral.

Private/local targets exist only for deterministic tests. The
`--test-allow-private` switch is blocked unless
`WEB_ACQUISITION_TEST_MODE=1`; it is not an ordinary acquisition escape hatch.

No surface here authorizes login, CAPTCHA/access-control bypass, credential testing,
persistent cookies/storage/profile state, arbitrary browser control, or authenticated
session continuation.

## Result semantics

The tools return one bounded JSON result rather than raw browser/provider logs.

Common dispositions are:

- `OK` — the requested bounded acquisition completed under its contract;
- `PARTIAL` — useful evidence exists but a declared output/crawl budget was exhausted;
- `BLOCKED` — policy, robots, provider/auth/billing/retention, reveal-effect, or another
  explicit contract boundary refused the operation;
- `FAILED` — the bounded operation ran but its required contract could not be satisfied;
- `UNKNOWN` — required transport/provider evidence could not be established safely.

The CLIs exit zero only for `OK` or `PARTIAL`; other dispositions exit nonzero.

`OK` proves only the acquisition contract. It does not prove that page/provider content
is correct, current, safe, complete, authoritative, or suitable for a broader project
claim. Empty output is not automatically success, and a browser/provider process exiting
successfully is not itself evidence that semantic acceptance was satisfied.

## v1 — one rendered public page

Use when the missing evidence is rendered DOM on exactly one public unauthenticated URL.

```bash
node tools/web-acquisition/cli.mjs \
  --timeout-ms 15000 \
  --text-limit 20000 \
  --link-limit 100 \
  https://example.com/
```

The result preserves:

- method `PLAYWRIGHT_RENDER`;
- requested/final URL;
- title;
- bounded normalized body text;
- bounded deduplicated links;
- rendered/truncated flags;
- warnings and explicit failure reason.

Each operation uses fresh browser/context/proxy state and disposes it after the acquisition.

## v2 — bounded same-origin rendered crawl

Use only when one rendered page is insufficient and the missing evidence requires finite
same-origin recursion from exactly one public seed.

```bash
node tools/web-acquisition/crawl-cli.mjs \
  --max-depth 1 \
  --max-pages 5 \
  --text-limit 8000 \
  --link-limit 50 \
  --aggregate-text-limit 40000 \
  https://example.com/
```

Current default/maximum bounds:

| Field | Default | Maximum |
| --- | ---: | ---: |
| `maxDepth` | 1 | 3 |
| `maxPages` | 5 | 20 |
| per-page `textLimit` | 8,000 | 20,000 |
| per-page `linkLimit` | 50 | 100 |
| aggregate text | 40,000 | 100,000 |

The crawl contract is intentionally narrow:

- scope is exactly `SAME_ORIGIN`;
- concurrency is fixed at 1;
- queue entries are deduplicated;
- request retries are disabled;
- persistent Crawlee storage/session state is disabled;
- `robots.txt` is fetched through the same bounded policy-proxy boundary before crawl;
- disallowed robots entries are blocked rather than crawled;
- every rendered page still uses the v1 acquisition boundary;
- cross-origin links and finite-budget overflow remain explicit skipped/partial evidence.

V2 is queue/orchestration, not a second browser authority.

## v3 — one Firecrawl structured extraction request

Use only when the missing evidence is schema-constrained structured data from one public
unauthenticated URL and third-party provider egress is explicitly acceptable.

The provider must be opted in explicitly:

```bash
export FIRECRAWL_API_KEY='...'
node tools/web-acquisition/structured-cli.mjs \
  --provider firecrawl \
  --schema-file schema.json \
  https://example.com/
```

Do not place the API key in Git, CLI arguments, issue evidence, or generated files. The
adapter reads it only from runtime `FIRECRAWL_API_KEY`.

The v3 contract:

- requires exactly one URL and one JSON-schema file;
- limits the schema file to 32 KiB;
- computes a stable SHA-256 schema identity over canonicalized JSON;
- locally applies the public-target preflight;
- calls only `https://api.firecrawl.dev/v2/scrape`;
- makes at most one provider request and has no automatic retry;
- requests `maxAge: 0`, `storeInCache: false`, `skipTlsVerification: false`,
  `proxy: basic`, and `zeroDataRetention: true`;
- fails closed if zero-data-retention is unavailable;
- caps the provider response at 2 MiB;
- validates returned structured data against the requested schema before `OK`;
- records bounded provider/egress/request/usage provenance without persisting provider auth.

After the local preflight, Firecrawl controls its own DNS resolution, redirects, and
network transport. Provider acquisition therefore does **not** inherit the v1
validated-address policy-proxy socket guarantee. Treat v3 as explicit third-party data
egress.

The repository does not install or configure a Firecrawl SDK/CLI, login state, MCP, editor
integration, or default provider.

## v4 — bounded public-page reveal

Use only when passive evidence is insufficient and one public unauthenticated page needs a
small explicit reveal such as opening a disclosure or waiting for a deterministic element.

Example plan:

```json
{
  "version": 1,
  "actions": [
    {"type": "clickReveal", "selector": "button.more"},
    {"type": "waitFor", "selector": ".details"}
  ]
}
```

```bash
node tools/web-acquisition/reveal-cli.mjs \
  --plan-file plan.json \
  https://example.com/
```

Plan limits are fixed:

- file size at most 16 KiB;
- version exactly 1;
- 1..5 actions;
- action types exactly `clickReveal` and `waitFor`;
- CSS selector at most 512 characters;
- action timeout defaults to 2,000 ms and cannot exceed 5,000 ms;
- total reveal budget is 12 seconds.

`clickReveal` accepts only one visible deterministic reveal control, such as a safe
button, a `summary` owned by `details`, or a non-form ARIA button/tab. Links, editable
controls, submit/reset/file behavior, form-owned controls, downloads, and unsupported
controllers fail closed.

After initial navigation, the reveal effect guard additionally blocks:

- browser requests other than GET/HEAD;
- a second top-level navigation;
- popup/new-page creation;
- downloads;
- dialogs.

The result preserves bounded action counts/results and blocked-effect evidence.

This is a **read-oriented guard, not a universal side-effect proof**. GET/HEAD behavior
remains site-controlled, so v4 always preserves the residual warning
`REVEAL_GET_HEAD_EFFECTS_REMAIN_SITE_CONTROLLED`. Anything requiring text input, form
submission, navigation workflows, authentication, persistent sessions, arbitrary
JavaScript/evaluate input, AI action planning, or general browser automation needs a
separate authority and trust-boundary design.

## Explicit non-goals

This platform does not provide:

- multi-seed or unrestricted cross-origin/site-wide crawl;
- sitemap discovery or general search;
- crawl concurrency above the bounded v2 contract;
- Firecrawl crawl/map/search/agent/interact/actions;
- browser-use/Stagehand/general autonomous browser control;
- authenticated or stateful browsing;
- persistent target cookies, profiles, storage state, or crawl resume;
- arbitrary downloads or file-writing workflows;
- access-control or bot-protection bypass;
- project/runtime/release/production mutation.

A requirement outside these boundaries is a new authority/scope problem, not a reason to
quietly widen this directory.

## Historical design lineage

The current implementation was developed through these completed repository design lines:

- #2015 — U-26 v1: Playwright single-page rendered acquisition;
- #2127 — U-26 v2: bounded same-origin rendered crawl;
- #2155 — U-26 v3: explicit Firecrawl structured extraction;
- #2167 — U-26 v4: bounded stateless public reveal.

These issues are historical design provenance. Current behavior is owned by this directory's
source/tests plus the repository routing skill and CI, not by stale mutable facts in issue
history.
