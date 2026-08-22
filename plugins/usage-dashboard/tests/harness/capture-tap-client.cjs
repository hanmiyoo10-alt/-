#!/usr/bin/env node
'use strict';

const origin = String(process.env.UD_CAPTURE_TAP_ORIGIN || '');
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
  throw new Error('capture-tap fixture origin must be loopback');
}

(async () => {
  const response = await fetch(`${origin}/orgs`, {
    headers:{authorization:'Bearer fixture-only',accept:'application/json'},
  });
  if (!response.ok) throw new Error(`fixture orgs failed: ${response.status}`);
  await response.text();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
