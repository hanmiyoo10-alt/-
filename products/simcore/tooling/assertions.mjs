export function assert(condition, message = 'assertion failed') {
  if (!condition) throw new Error(message);
}

export function equal(actual, expected, message = 'values differ') {
  if (actual !== expected) {
    throw new Error(`${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

export function deepEqual(actual, expected, message = 'values differ') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}: expected=${e} actual=${a}`);
}

export function includes(haystack, needle, message = 'expected substring missing') {
  if (!String(haystack).includes(String(needle))) {
    throw new Error(`${message}: ${JSON.stringify(needle)}`);
  }
}
