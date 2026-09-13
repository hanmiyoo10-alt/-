#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import {
  acquireStructuredData,
  loadSchemaFile,
  structuredResult,
} from './lib/firecrawl.mjs';

function cliFailure(reason, requestedUrl = null, status = 'FAILED') {
  const result = structuredResult(requestedUrl);
  result.status = status;
  result.failureReason = reason;
  return result;
}

export function parseArgs(argv) {
  const urls = [];
  let schemaFile = null;
  let provider = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--schema-file') schemaFile = argv[++index] ?? null;
    else if (arg === '--provider') provider = argv[++index] ?? null;
    else if (arg.startsWith('-')) throw new Error('CLI_UNKNOWN_OPTION');
    else urls.push(arg);
  }
  if (urls.length !== 1) throw new Error('CLI_REQUIRES_EXACTLY_ONE_URL');
  if (!schemaFile) throw new Error('CLI_SCHEMA_FILE_REQUIRED');
  return { url: urls[0], schemaFile, provider };
}
export async function main(argv = process.argv.slice(2), deps = {}) {
  const write = deps.write ?? ((text) => process.stdout.write(text));
  const env = deps.env ?? process.env;
  let output;
  let url = null;
  try {
    const parsed = parseArgs(argv);
    url = parsed.url;
    if (parsed.provider !== 'firecrawl') {
      output = cliFailure(
        parsed.provider ? 'PROVIDER_UNSUPPORTED' : 'PROVIDER_OPT_IN_REQUIRED',
        url,
        'BLOCKED',
      );
    } else {
      const schema = await (deps.loadSchemaFile ?? loadSchemaFile)(parsed.schemaFile);
      output = await (deps.acquireStructuredData ?? acquireStructuredData)(url, schema, {
        providerOptIn: true,
        apiKey: env.FIRECRAWL_API_KEY,
        fetchImpl: deps.fetchImpl,
        lookup: deps.lookup,
        timeoutMs: deps.timeoutMs,
      });
    }
  } catch (error) {
    const reason = error?.code ?? error?.message ?? 'CLI_ARGUMENT_ERROR';
    const blocked = String(reason).startsWith('SCHEMA_');
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
