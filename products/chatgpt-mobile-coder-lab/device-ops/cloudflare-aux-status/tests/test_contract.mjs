import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import worker from "../worker.mjs";

async function call(path, init = {}) {
  return worker.fetch(new Request("https://example.invalid" + path, init));
}

test("health is fixed and bounded", async () => {
  const response = await call("/health");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(body, {
    schema: "mcl-cloudflare-aux-status.v1",
    profile: "mcl-cloudflare-aux-status-v1",
    status: "ok",
  });
  assert.ok(JSON.stringify(body).length < 256);
});

test("capability manifest denies wider effects", async () => {
  const response = await call("/capabilities");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.capabilities, ["self-health", "capability-manifest"]);
  assert.equal(body.outboundFetch, false);
  assert.equal(body.credentialBindings, false);
  assert.equal(body.repositoryWrite, false);
  assert.equal(body.externalActions, false);
  assert.ok(JSON.stringify(body).length < 1024);
});

test("methods and unknown paths fail closed", async () => {
  const post = await call("/health", {method: "POST"});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET");
  const missing = await call("/anything-else");
  assert.equal(missing.status, 404);
});

test("worker source has no outbound or credential surface", async () => {
  const source = await readFile(new URL("../worker.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /ACCESS_TOKEN|Authorization|searchParams|targetUrl|target_url|token exchange/i);
  assert.doesNotMatch(source, /access-control-allow-origin/i);
});

test("wrangler config has no route, binding, domain, or secret identity", async () => {
  const text = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const config = JSON.parse(text);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  for (const forbidden of [
    "account_id", "routes", "vars", "kv_namespaces", "r2_buckets",
    "services", "durable_objects",
  ]) {
    assert.equal(Object.hasOwn(config, forbidden), false, forbidden);
  }
});
