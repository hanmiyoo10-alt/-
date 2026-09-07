#!/usr/bin/env node
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AsyncLocalStorage } from 'node:async_hooks';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const VERSION = '1.6.37';
const PROTOCOL_VERSION = 2;
const MIN_PLUGIN_VERSION = '2.5.4';
const RECOMMENDED_PLUGIN_VERSION = '2.7.3';
const HOST = '127.0.0.1';
const PORT = Number(process.env.DEVPASS_BRIDGE_PORT || 39117);
const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';
const MODEL_CATALOG_PACKAGE = '@llmgateway/models';
const MODEL_CATALOG_VERSION = '1.280.0';
const NPX_PREFER_OFFLINE = String(process.env.DEVPASS_BRIDGE_NPX_PREFER_OFFLINE || '1') !== '0';
const MANAGED_CLI_ENABLED = String(process.env.DEVPASS_BRIDGE_MANAGED_CLI || '1') !== '0';
const MANAGED_CLI_ROOT = path.join(os.homedir(), '.local', 'share', 'local-usage-dashboard', 'runtime', 'cli');
const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, CLI_VERSION);
const MANAGED_CLI_DESCRIPTOR = path.join(MANAGED_CLI_ROOT, 'managed-cli.json');
const MANAGED_CLI_STATE = path.join(MANAGED_CLI_ROOT, 'managed-cli-state.json');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'llmgateway-devpass-bridge');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token');
const UPDATE_READY_DIR = path.join(os.homedir(), 'PocketRisu', 'bridge', 'update-ready');
const PLUGIN_LATEST_FILE = path.join(UPDATE_READY_DIR, 'latest_dashboard.js');
const CAPTURE_TAP_FILE = path.join(CONFIG_DIR, 'capture-orgs.cjs');
const CACHE_TTL = {
  orgs: 30_000,
  accountCapture: 30_000,
  creditsBootstrap: 30_000,
  devpassStatus: 30_000,
  'activity:24h': 60_000,
  'activity:7d': 300_000,
  'activity:30d': 600_000,
  analytics: 60_000,
};

const cache = new Map();
const inFlight = new Map();
const STARTED_AT = Date.now();
const CACHE_MAX_ENTRIES = 128;
const CACHE_STALE_MAX_MS = 30 * 60_000;
const cacheStats = {
  hits: 0,
  misses: 0,
  joins: 0,
  loads: 0,
  errors: 0,
  staleFallbacks: 0,
  totalLoadMs: 0,
  lastLoadMs: 0,
};
const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));
const cliWaiters = [];
const cliStats = { active: 0, queued: 0, runs: 0, maxActive: 0 };
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_BASE_OPEN_MS = 45_000;
const CIRCUIT_MAX_OPEN_MS = 5 * 60_000;
const circuits = new Map();
const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };
const snapshotAttributionStorage = new AsyncLocalStorage();
const SECONDARY_REFRESH_CONCURRENCY = 1;
const SECONDARY_REFRESH_MAX_KEYS = 32;
const secondaryRefreshQueue = [];
const secondaryRefreshKeys = new Set();
const secondaryRefreshStats = {
  servedStale: 0,
  completed: 0,
  errors: 0,
  blocked: 0,
  superseded: 0,
  foregroundHeld: 0,
  dropped: 0,
  lastStartAt: null,
  lastStartAfterForegroundMs: null,
};
let secondaryRefreshRunning = false;
let secondaryDrainScheduled = false;
let foregroundSnapshotsActive = 0;
let lastForegroundEndedAt = null;

