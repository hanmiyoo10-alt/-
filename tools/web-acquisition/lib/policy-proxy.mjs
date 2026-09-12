import http from 'node:http';
import net from 'node:net';
import { resolveTarget, TargetPolicyError } from './policy.mjs';

function policyCode(error) {
  return error instanceof TargetPolicyError ? error.code : 'TARGET_POLICY_FAILED';
}

function proxyPolicy(options) {
  return {
    allowPrivate: options.allowPrivate,
    testMode: options.testMode,
    testPrivateHosts: options.testPrivateHosts,
    lookup: options.lookup,
    cache: new Map(),
  };
}

function stripProxyHeaders(headers) {
  const next = { ...headers };
  delete next['proxy-connection'];
  delete next['proxy-authorization'];
  return next;
}

export async function startPolicyProxy(options = {}) {
  const policy = proxyPolicy(options);
  let blocked = null;
  let failed = null;
  const server = http.createServer((request, response) => {
    void (async () => {
      let resolved;
      try {
        resolved = await resolveTarget(request.url, policy);
      } catch (error) {
        blocked ??= policyCode(error);
        response.writeHead(403).end('blocked');
        return;
      }
      if (resolved.url.protocol !== 'http:') {
        blocked ??= 'TARGET_UNSAFE_PROXY_REQUEST';
        response.writeHead(403).end('blocked');
        return;
      }
      const address = resolved.addresses[0]?.address;
      const upstream = http.request({
        host: address,
        port: Number(resolved.url.port || 80),
        method: request.method,
        path: `${resolved.url.pathname}${resolved.url.search}`,
        headers: stripProxyHeaders(request.headers),
        agent: false,
      });
      upstream.on('response', (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on('error', () => {
        failed ??= 'POLICY_PROXY_CONNECT_FAILED';
        if (!response.headersSent) response.writeHead(502);
        response.end('proxy connect failed');
      });
      request.pipe(upstream);
    })().catch(() => {
      failed ??= 'POLICY_PROXY_FAILED';
      if (!response.headersSent) response.writeHead(500);
      response.end('proxy failed');
    });
  });

  server.on('connect', (request, clientSocket, head) => {
    void (async () => {
      let authority;
      try {
        authority = new URL(`https://${request.url}/`);
      } catch {
        blocked ??= 'TARGET_INVALID_URL';
        clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
      let resolved;
      try {
        resolved = await resolveTarget(authority.href, policy);
      } catch (error) {
        blocked ??= policyCode(error);
        clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
      const address = resolved.addresses[0]?.address;
      const upstream = net.connect({
        host: address,
        port: Number(authority.port || 443),
      });
      upstream.once('connect', () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      upstream.once('error', () => {
        failed ??= 'POLICY_PROXY_CONNECT_FAILED';
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      });
      clientSocket.once('error', () => upstream.destroy());
    })().catch(() => {
      failed ??= 'POLICY_PROXY_FAILED';
      clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    blocked: () => blocked,
    failed: () => failed,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
