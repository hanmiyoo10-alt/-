# L Secure MCP Tunnel owner

This directory owns one narrow L/WSL execution profile that connects the existing
read-only Repository Read MCP to OpenAI Secure MCP Tunnel. It is transport and
local-host tooling only. It does not become repository, merge, release, runtime,
device, or production authority.

## Public commands

The tracked wrapper remains ordinary mode 100644 and is invoked explicitly with
Python:

\`\`\`sh
python3 products/chatgpt-mobile-coder-lab/device-ops/l-secure-mcp-tunnel/mcl-l-secure-mcp-tunnel --check
python3 products/chatgpt-mobile-coder-lab/device-ops/l-secure-mcp-tunnel/mcl-l-secure-mcp-tunnel --run
\`\`\`

No other argument is accepted.

\`--check\` is read-only. It validates only fixed local prerequisites and emits a
bounded semantic receipt. It does not contact the OpenAI tunnel control plane,
create a tunnel, run \`doctor\`, start Repository Read MCP, or start tunnel-client.

\`--run\` repeats the same preflight, removes only a previously validated fixed
health URL file if one exists, emits a bounded \`starting\` receipt, then replaces
itself with the fixed tunnel-client foreground process. The \`starting\` receipt
is not readiness or tunnel-connectivity proof. Later live acceptance must inspect
loopback readiness and perform an actual read-only MCP call separately.

## Fixed production identity

The L production profile is deliberately caller-invariant:

\`\`\`text
tunnel-client:
  /home/alsl0/.local/libexec/mcl-secure-mcp/tunnel-client

Repository Read MCP:
  /home/alsl0/.local/share/mcl-secure-mcp/repo-ci-mcp-venv/bin/repo-ci-mcp

tunnel id file:
  /home/alsl0/.config/mcl-secure-mcp/tunnel-id

runtime API key file:
  /home/alsl0/.config/mcl-secure-mcp/runtime-api-key

local state:
  /home/alsl0/.local/state/mcl-secure-mcp

single-instance lock:
  /home/alsl0/.local/state/mcl-secure-mcp/run.lock
\`\`\`

The two credential-reference files must be regular, non-symlink, owned by the
current L user, and mode 0600. The state directory must be regular/non-symlink,
user-owned, and mode 0700. Both executable paths must be regular, non-symlink,
user-owned, owner-executable, and not writable by group or others. An existing
run lock must be a regular user-owned mode-0600 file. Secret values and tunnel
identifiers are never emitted in receipts.

The Repository Read MCP child receives only the fixed public repository identity
and GitHub API URL. No GitHub token is inherited or materialized by this owner.

## tunnel-client contract

This owner pins tunnel-client semantic version **0.0.15**. The version probe
accepts only bare \`0.0.15\` or the official release form
\`0.0.15+<40-hex-sha> (git sha: <same-40-hex-sha>)\`. Receipts retain only the
bounded semantic version and never forward raw probe output. A missing binary,
symlink, foreign owner, unsafe writable mode, non-executable file, malformed
release string, failed version probe, or any other semantic version fails closed.
Updating the pin requires a reviewed source change.

The installation runbook should still consult OpenAI's latest public release
surface instead of embedding a version-specific download URL. The source pin
controls what this repository owner will execute after a verified binary has been
materialized by a separately authorized live step.

The exact foreground argv is fixed to:

- \`run\`;
- runtime API key by \`--control-plane.api-key=file:<fixed-file>\`;
- one \`--mcp.command=<fixed-repo-ci-mcp>\` stdio \`main\` binding;
- \`--health.listen-addr=127.0.0.1:0\`;
- one fixed health URL file;
- health details off;
- remote UI off;
- automatic browser opening off;
- structured-text info logging.

The tunnel id is read from the fixed private file and passed only through
\`CONTROL_PLANE_TUNNEL_ID\`. The child environment is rebuilt from a minimal fixed
allowlist instead of inheriting caller-selected proxy, command, token, repository,
or network configuration.

Before removing any previous health URL or emitting the \`starting\` receipt,
\`--run\` acquires a non-blocking exclusive lock on the fixed mode-0600
\`run.lock\` file. The lock descriptor is deliberately inherited across the
foreground exec so the advisory lock remains held for the tunnel-client lifetime.
A concurrent run returns bounded \`RUN_ALREADY_ACTIVE\` and launches no second
client or Repository Read MCP child. The lock file may remain after exit; file
existence alone never means an instance is active.

OpenAI currently documents Secure MCP Tunnel as outbound HTTPS from the
customer-run tunnel-client to the OpenAI control plane, with stdio supported
through \`--mcp.command\`, runtime API keys supported by file references, and
health/admin surfaces loopback-only by default. For stdio targets it also
requires a single active tunnel-client per tunnel ID. The current public stable
release at implementation time is v0.0.15. Re-read current OpenAI documentation
before changing this contract.

References:

- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- https://github.com/openai/tunnel-client/releases/latest
- https://github.com/openai/tunnel-client/blob/master/docs/configuration.md

## Receipt

\`\`\`text
schema=mcl-l-secure-mcp-tunnel.v1
operation=<check|run|unknown>
tunnel_client=<exact|blocked|unknown>
tunnel_client_version=<0.0.15|unknown>
repository_read_mcp=<exact|blocked|unknown>
tunnel_id_ref=<present|blocked|unknown>
runtime_key_ref=<present|blocked|unknown>
health_bind=loopback
result=<pass|blocked|starting>
reason=<bounded reason>
details=withheld
\`\`\`

Receipts never contain the tunnel id, API key, account/workspace identity,
arbitrary filesystem path, raw command output, or environment dump.

## Explicit non-authority

This owner has no path for:

- tunnel CRUD or OpenAI admin-key use;
- public ingress or Cloudflare/ngrok transport;
- arbitrary shell, MCP command, binary, URL, proxy, CA, or endpoint selection;
- repository file mutation, Git command selection, push/PR/merge/release;
- S/M/Android/ADB/PocketRisu effects;
- boot/login persistence;
- automatic credential creation or secret persistence in Git.

Long-lived supervision, installation/materialization, tunnel/workspace association,
and the first real ChatGPT tool call remain separate live acceptance steps under
#3313 after merge and postmerge convergence.

## Tests

\`\`\`sh
python3 products/chatgpt-mobile-coder-lab/device-ops/l-secure-mcp-tunnel/tests/test_contract.py -v
python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/l-secure-mcp-tunnel/mcl-l-secure-mcp-tunnel \
  products/chatgpt-mobile-coder-lab/device-ops/l-secure-mcp-tunnel/tests/test_contract.py
\`\`\`

Refs #3313 #3158 #3232.
