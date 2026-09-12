#!/usr/bin/env node
import { acquireRenderedPage } from './lib/render.mjs';

function usageResult(reason) {
  return {
    status: 'FAILED', method: 'PLAYWRIGHT_RENDER', requestedUrl: null,
    finalUrl: null, title: '', text: '', links: [], rendered: false,
    truncated: false, warnings: [], failureReason: reason,
  };
}

function parseArgs(argv) {
  const options = {};
  const urls = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (arg === '--text-limit') options.textLimit = Number(argv[++index]);
    else if (arg === '--link-limit') options.linkLimit = Number(argv[++index]);
    else if (arg === '--test-allow-private') options.allowPrivate = true;
    else if (arg.startsWith('-')) throw new Error('CLI_UNKNOWN_OPTION');
    else urls.push(arg);
  }
  if (urls.length !== 1) throw new Error('CLI_REQUIRES_EXACTLY_ONE_URL');
  return { url: urls[0], options };
}
let output;
try {
  const { url, options } = parseArgs(process.argv.slice(2));
  if (options.allowPrivate && process.env.WEB_ACQUISITION_TEST_MODE !== '1') {
    output = usageResult('TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV');
    output.status = 'BLOCKED';
    output.requestedUrl = url;
  } else {
    if (options.allowPrivate) options.testMode = true;
    output = await acquireRenderedPage(url, options);
  }
} catch (error) {
  output = usageResult(error?.message ?? 'CLI_ARGUMENT_ERROR');
}

process.stdout.write(`${JSON.stringify(output)}\n`);
process.exitCode = ['OK', 'PARTIAL'].includes(output.status) ? 0 : 2;
