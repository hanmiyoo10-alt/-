#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {loadPolicy, verifyStageCurrentness} from './stage.mjs';

function fail(code, detail = '') {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

export function parseArgs(argv) {
  const out = {mirrorDir: null, stageReport: null, report: null};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--mirror-dir' || key === '--stage-report' || key === '--report') {
      if (!value || value.startsWith('--')) fail('MISSING_ARGUMENT_VALUE', key);
      out[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      index += 1;
      continue;
    }
    fail('UNKNOWN_ARGUMENT', key);
  }
  if (!out.mirrorDir) fail('MIRROR_DIR_REQUIRED');
  if (!out.stageReport) fail('STAGE_REPORT_REQUIRED');
  if (!out.report) fail('REPORT_PATH_REQUIRED');
  return out;
}

function boundedErrorCode(error) {
  return String(error?.message || error || 'UNKNOWN_ERROR').split(':', 1)[0].slice(0, 120);
}

async function writeReport(reportPath, report) {
  await fsp.mkdir(path.dirname(reportPath), {recursive: true});
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceRepo = process.cwd();
  const mirrorDir = path.resolve(args.mirrorDir);
  const reportPath = path.resolve(args.report);
  const policy = loadPolicy();
  const stage = JSON.parse(fs.readFileSync(path.resolve(args.stageReport), 'utf8'));
  try {
    const report = verifyStageCurrentness({sourceRepo, mirrorDir, stage, policy});
    await writeReport(reportPath, report);
    process.stdout.write(JSON.stringify({status: report.status, channels: report.channels.length}) + '\n');
  } catch (error) {
    await writeReport(reportPath, {
      schemaVersion: 1,
      kind: 'CLOUDFLARE_DELIVERY_CURRENTNESS',
      status: 'ERROR',
      errorCode: boundedErrorCode(error),
    });
    throw error;
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${boundedErrorCode(error)}\n`);
    process.exitCode = 1;
  });
}
