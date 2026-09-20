#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { acquirePage, acquisitionResult } from './lib/acquire.mjs';
import { loadRevealPlanFile } from './lib/reveal.mjs';

function cliFailure(reason, requestedUrl = null, status = 'FAILED') {
  const result = acquisitionResult(requestedUrl, 'boundedReveal');
  result.status = status;
  result.failureReason = reason;
  return result;
}

export function parseArgs(argv) {
  const urls = [];
  const options = {};
  let planFile = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--plan-file') planFile = argv[++index] ?? null;
    else if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else if (arg === '--text-limit') options.textLimit = Number(argv[++index]);
    else if (arg === '--link-limit') options.linkLimit = Number(argv[++index]);
    else if (arg === '--test-allow-private') options.allowPrivate = true;
    else if (arg.startsWith('-')) throw new Error('CLI_UNKNOWN_OPTION');
    else urls.push(arg);
  }
  if (urls.length !== 1) throw new Error('CLI_REQUIRES_EXACTLY_ONE_URL');
  if (!planFile) throw new Error('CLI_PLAN_FILE_REQUIRED');
  return { url: urls[0], planFile, options };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const write = deps.write ?? ((text) => process.stdout.write(text));
  const env = deps.env ?? process.env;
  let output;
  let url = null;
  try {
    const parsed = parseArgs(argv);
    url = parsed.url;
    if (parsed.options.allowPrivate && env.WEB_ACQUISITION_TEST_MODE !== '1') {
      output = cliFailure('TEST_PRIVATE_MODE_REQUIRES_EXPLICIT_ENV', url, 'BLOCKED');
    } else {
      const plan = await (deps.loadRevealPlanFile ?? loadRevealPlanFile)(parsed.planFile);
      const options = {
        ...parsed.options,
        plan,
        mode: 'boundedReveal',
        lookup: deps.lookup,
        launchOptions: deps.launchOptions,
      };
      if (parsed.options.allowPrivate) options.testMode = true;
      output = await (deps.acquirePage ?? acquirePage)(url, options);
    }
  } catch (error) {
    const reason = error?.code ?? error?.message ?? 'CLI_ARGUMENT_ERROR';
    const blocked = String(reason).startsWith('REVEAL_PLAN_')
      || reason === 'REVEAL_ACTION_LIMIT_EXCEEDED';
    output = cliFailure(reason, url, blocked ? 'BLOCKED' : 'FAILED');
  }

  write(`${JSON.stringify(output)}\n`);
  return { output, exitCode: ['OK', 'PARTIAL'].includes(output.status) ? 0 : 2 };
}

const direct = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const { exitCode } = await main();
  process.exitCode = exitCode;
}
