# Cloudflare Delivery

Bounded public delivery adapter for the exact nine artifacts already promoted into the private `hanmiyoo10-alt/myang` mirror.

This tool is not a release authority. It refuses to stage when the private mirror provenance no longer matches the current canonical source refs.

## V1 shape

```text
canonical release/main refs
→ private myang promotion branches
→ exact parity/currentness verification
→ disposable dist/
→ Cloudflare Workers Static Assets
→ update.myang.link
```

V1 has no Worker script, R2, KV, D1, Durable Objects, service bindings, caller-selected repository/ref/path/hostname, or automatic release hook.

`wrangler.jsonc` deliberately has no route. Initial service creation and Custom Domain bootstrap are separate post-merge runtime effects. After `update.myang.link` is attached to the fixed Worker, the manual workflow can publish later asset revisions without changing routing.

## Commands

```text
npm ci
node stage.mjs --mirror-dir /path/to/private-myang --output-dir ./dist --report /tmp/stage.json
npm test
npm run check
npm run dry-run
node verify-live.mjs --stage-report /tmp/stage.json --report /tmp/live.json
```

The CLI accepts no public hostname. Live verification always uses the fixed `publicBaseUrl` in `policy.json`.

## Runtime secrets

The checked-in workflow names secret inputs but never stores values:

- `MYANG_DISTRIBUTION_READ_SSH_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Provisioning those values, creating the fixed Worker, attaching the Custom Domain, and changing product consumer URLs are outside IMPLEMENTATION_PR.
