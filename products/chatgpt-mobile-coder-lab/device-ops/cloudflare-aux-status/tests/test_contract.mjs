import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import worker from "../worker.mjs";

const PASSWORD = "test-only-password";
const ENV = Object.freeze({MCL_STATUS_PASSWORD: PASSWORD});

function basic(username = "mcl", password = PASSWORD) {
  return "Basic " + Buffer.from(`${username}:${password}`, "utf8").toString("base64");
}

async function call(path, init = {}, env = ENV) {
  return worker.fetch(new Request("https://example.invalid" + path, init), env);
}

test("protected endpoints challenge missing credentials", async () => {
  for (const path of ["/health", "/capabilities"]) {
    const response = await call(path);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Basic /);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const text = await response.text();
    assert.doesNotMatch(text, /self-health|capability-manifest|test-only-password/);
  }
});

test("malformed and wrong credentials fail closed without reflection", async () => {
  const attempts = [
    "Bearer nope",
    "Basic !!!",
    basic("other-user", PASSWORD),
    basic("mcl", "wrong-password"),
  ];
  for (const authorization of attempts) {
    const response = await call("/health", {headers: {authorization}});
    assert.equal(response.status, 401);
    const text = await response.text();
    assert.doesNotMatch(text, /other-user|wrong-password|test-only-password|Bearer nope/);
  }
});

test("missing secret binding fails closed", async () => {
  const response = await call("/health", {
    headers: {authorization: basic()},
  }, {});
  assert.equal(response.status, 401);
});

test("authorized health is fixed and bounded", async () => {
  const response = await call("/health", {
    headers: {authorization: basic()},
  });
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

test("authorized capability manifest truthfully declares auth binding", async () => {
  const response = await call("/capabilities", {
    headers: {authorization: basic()},
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.capabilities, ["self-health", "capability-manifest"]);
  assert.equal(body.outboundFetch, false);
  assert.equal(body.credentialBindings, true);
  assert.equal(body.authentication, "http-basic");
  assert.equal(body.repositoryWrite, false);
  assert.equal(body.externalActions, false);
  assert.ok(JSON.stringify(body).length < 1024);
});

test("methods and unknown paths preserve bounded fail-closed behavior", async () => {
  const post = await call("/health", {
    method: "POST",
    headers: {authorization: basic()},
  });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET");
  const missing = await call("/anything-else");
  assert.equal(missing.status, 404);
});

test("worker source has no wider credential or external effect surface", async () => {
  const source = await readFile(new URL("../worker.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /searchParams|targetUrl|target_url|token exchange|console\.|cookie|set-cookie/i);
  assert.match(source, /MCL_STATUS_PASSWORD/);
  assert.match(source, /crypto\.subtle\.digest/);
  assert.doesNotMatch(source, /===\s*expectedPassword|expectedPassword\s*===/);
});

test("wrangler config declares only the required secret name", async () => {
  const text = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const config = JSON.parse(text);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.secrets, {required: ["MCL_STATUS_PASSWORD"]});
  for (const forbidden of [
    "account_id", "routes", "vars", "kv_namespaces", "r2_buckets",
    "services", "durable_objects",
  ]) {
    assert.equal(Object.hasOwn(config, forbidden), false, forbidden);
  }
  assert.doesNotMatch(text, /test-only-password/);
});
