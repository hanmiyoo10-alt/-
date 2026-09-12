#!/usr/bin/env node
import { crawlRenderedSite } from './lib/crawl.mjs';

function safeUrl(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    return parsed.href;
  } catch { return value; }
}

function usageResult(reason, seedUrl = null) {
  return {
    status: 'FAILED',
    method: 'CRAWLEE_QUEUE_PLAYWRIGHT_RENDER',
    seedUrl: safeUrl(seedUrl),
    scope: 'SAME_ORIGIN',
    maxDepth: null,
    maxPages: null,
    visitedCount: 0,
    pages: [],
    skipped: [],
    truncated: false,
    warnings: [],
    failureReason: reason,
  };
}
function parseArgs(argv) {
  const options = {};
  const urls = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--max-depth') options.maxDepth = Number(argv[++index]);
    else if (arg === '--max-pages') options.maxPages = Number(argv[++index]);
    else if (arg === '--text-limit') options.textLimit = Number(argv[++index]);
    else if (arg === '--link-limit') options.linkLimit = Number(argv[++index]);
    else if (arg === '--aggregate-text-limit') {
      options.aggregateTextLimit = Number(argv[++index]);
    } else if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (arg === '--test-allow-private') options.allowPrivate = true;
    else if (arg.startsWith('-')) throw new Error('CLI_UNKNOWN_OPTION');
    else urls.push(arg);
  }
  if (urls.length !== 1) throw new Error('CLI_REQUIRES_EXACTLY_ONE_SEED_URL');
  return { seedUrl: urls[0], options };
}

let output;
try {
  const { seedUrl, options } = parseArgs(process.argv.slice(2));
  if (options.allowPrivate && process.env.WEB_ACQUISITION_TEST_MODE !== '1') {
    output = usageResult('TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV', seedUrl);
    output.status = 'BLOCKED';
  } else {
    if (options.allowPrivate) options.testMode = true;
    output = await crawlRenderedSite(seedUrl, options);
  }
} catch (error) {
  output = usageResult(error?.message ?? 'CLI_ARGUMENT_ERROR');
}

process.stdout.write(`${JSON.stringify(output)}\n`);
process.exitCode = ['OK', 'PARTIAL'].includes(output.status) ? 0 : 2;
