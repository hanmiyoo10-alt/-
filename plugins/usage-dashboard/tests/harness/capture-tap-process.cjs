'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {spawn} = require('node:child_process');

const clientPath = path.resolve(__dirname, 'capture-tap-client.cjs');

function json(res, value) {
  const body = JSON.stringify(value);
  res.writeHead(200, {
    'content-type':'application/json',
    'content-length':Buffer.byteLength(body),
  });
  res.end(body);
}

function fixtureResponse(pathname, payloads) {
  if (pathname.endsWith('/orgs')) return payloads.orgs;
  if (pathname.endsWith('/dev-plans/status')) return payloads.status;
  if (pathname.endsWith('/activity')) return payloads.activity;
  if (pathname.endsWith('/logs')) return payloads.logs;
  return null;
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve) => server.close(resolve));
}

async function runCaptureTap({tapPath, fixtureRoot, payloads, timeoutMs = 5_000}) {
  const resolvedRoot = path.resolve(fixtureRoot);
  const resolvedTap = path.resolve(tapPath);
  const relativeTap = path.relative(resolvedRoot, resolvedTap);
  if (!relativeTap || relativeTap.startsWith('..') || path.isAbsolute(relativeTap)) {
    throw new Error('capture tap must stay inside the isolated fixture root');
  }
  if (!fs.statSync(resolvedTap).isFile()) throw new Error('capture tap missing');

  const captureFile = path.join(resolvedRoot, 'capture-tap-result.json');
  const server = http.createServer((req, res) => {
    let pathname = '';
    try { pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname; }
    catch {}
    const value = fixtureResponse(pathname, payloads);
    if (value === null || value === undefined) {
      res.writeHead(404);
      res.end();
      return;
    }
    json(res, value);
  });

  let child = null;
  let stdout = '';
  let stderr = '';
  let timeout = null;
  try {
    const port = await listen(server);
    child = spawn(process.execPath, [clientPath], {
      env:{
        ...process.env,
        NODE_OPTIONS:`--require=${resolvedTap}`,
        DEVPASS_BRIDGE_CAPTURE_FILE:captureFile,
        DEVPASS_BRIDGE_ACTIVITY_RANGE:'24h',
        UD_CAPTURE_TAP_ORIGIN:`http://127.0.0.1:${port}`,
      },
      stdio:['ignore','pipe','pipe'],
    });
    child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(-20_000); });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-20_000); });

    const exit = await Promise.race([
      new Promise((resolve) => child.once('exit', (code, signal) => resolve({code,signal}))),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve({timeout:true}), timeoutMs);
      }),
    ]);
    if (exit.timeout) {
      if (child.exitCode === null) child.kill('SIGKILL');
      throw new Error(`capture-tap client timed out\n${stdout}\n${stderr}`);
    }
    if (exit.code !== 0) {
      throw new Error(`capture-tap client failed (${exit.code ?? exit.signal})\n${stdout}\n${stderr}`);
    }
    return JSON.parse(fs.readFileSync(captureFile, 'utf8'));
  } finally {
    if (timeout) clearTimeout(timeout);
    if (child && child.exitCode === null) child.kill('SIGKILL');
    await close(server);
  }
}

module.exports = {runCaptureTap};
