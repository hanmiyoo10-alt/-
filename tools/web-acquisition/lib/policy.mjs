import { lookup as dnsLookup } from 'node:dns/promises';
import net from 'node:net';

export class TargetPolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TargetPolicyError';
    this.code = code;
  }
}

function ipv4Number(address) {
  return address.split('.').reduce((value, octet) =>
    ((value << 8) | Number(octet)) >>> 0, 0);
}

function inV4Range(address, base, prefix) {
  const bits = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & bits) === (ipv4Number(base) & bits);
}

const BLOCKED_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
];
function blockedIpv6(address) {
  const value = address.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length);
    return net.isIP(mapped) === 4 && blockedAddress(mapped);
  }
  const first = Number.parseInt(value.split(':').find(Boolean) ?? '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xff00) === 0xff00) return true;
  if (value.startsWith('2001:db8:') || value === '2001:db8::') return true;
  return false;
}

export function blockedAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return BLOCKED_V4.some(([base, prefix]) =>
    inV4Range(address, base, prefix));
  if (family === 6) return blockedIpv6(address);
  return true;
}

function policyError(code, detail) {
  return new TargetPolicyError(code, `${code}: ${detail}`);
}
function testPrivateHostAllowed(host, options) {
  const hosts = options.testPrivateHosts;
  return options.testMode === true && Array.isArray(hosts) && hosts.includes(host);
}

export async function resolveTarget(rawUrl, options = {}) {
  const allowPrivate = options.testMode === true && options.allowPrivate === true;
  const lookup = options.lookup ?? dnsLookup;
  const cache = options.cache ?? new Map();
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw policyError('TARGET_INVALID_URL', rawUrl);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw policyError('TARGET_UNSAFE_SCHEME', parsed.protocol);
  }
  if (parsed.username || parsed.password) {
    throw policyError('TARGET_CREDENTIALS_FORBIDDEN', parsed.origin);
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    if (!allowPrivate && !testPrivateHostAllowed(host, options)) {
      throw policyError('TARGET_PRIVATE_NETWORK', host);
    }
  }
  let addresses = cache.get(host);
  if (!addresses) {
    if (net.isIP(host)) addresses = [{ address: host, family: net.isIP(host) }];
    else {
      try {
        addresses = await lookup(host, { all: true, verbatim: true });
      } catch {
        throw policyError('TARGET_DNS_LOOKUP_FAILED', host);
      }
    }
    cache.set(host, addresses);
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw policyError('TARGET_DNS_EMPTY', host);
  }

  const normalized = addresses.map((item) => ({
    address: typeof item === 'string' ? item : item.address,
    family: typeof item === 'string' ? net.isIP(item) : item.family,
  }));
  const privateAllowed = allowPrivate || testPrivateHostAllowed(host, options);
  for (const item of normalized) {
    if (!item.address || (!privateAllowed && blockedAddress(item.address))) {
      throw policyError('TARGET_PRIVATE_NETWORK', item.address || host);
    }
  }
  return { url: parsed, host, addresses: normalized };
}

export async function validateTarget(rawUrl, options = {}) {
  return (await resolveTarget(rawUrl, options)).url;
}
