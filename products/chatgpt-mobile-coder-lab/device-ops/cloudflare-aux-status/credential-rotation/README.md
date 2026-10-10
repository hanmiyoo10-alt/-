# Cloudflare auxiliary status credential rotation

This directory owns one narrow L/WSL credential-rotation client for the existing
repo-owned `mcl-cloudflare-aux-status` Worker.

## Public commands

```sh
python3 mcl-cloudflare-aux-status-rotate --check
python3 mcl-cloudflare-aux-status-rotate --rotate
```

No other argument is accepted. `--check` is read-only. `--rotate` is the only
mutation path and is not authorized until #3348 reaches merged/postmerge
`EXPERIMENT_CLOSE`.

## Fixed runtime identity

- Worker: `mcl-cloudflare-aux-status`
- secret binding: `MCL_STATUS_PASSWORD`
- Basic username: `mcl`
- Wrangler: `/usr/local/bin/npx wrangler@4.148.0`
- curl: `/usr/bin/curl`
- private state directory:
  `/home/alsl0/.local/state/mcl/cloudflare-aux-status`
- current credential: `MCL_STATUS_PASSWORD`
- candidate credential: `MCL_STATUS_PASSWORD.next`
- rollback copy: `MCL_STATUS_PASSWORD.previous`
- private hostname locator: `custom-domain-hostname`
- single rotation lock: `credential-rotation.lock`

The state directory must be user-owned mode 0700. Credential, hostname and
recovery files must be regular non-symlink user-owned mode 0600.

The hostname locator is not caller input. During a later authorized live stage it
is materialized only after fresh Cloudflare metadata proves exactly one Custom
Domain mapped to this Worker. The hostname is never committed or emitted in a
normal receipt.

## Transaction

The owner keeps the current credential unchanged while it:

1. reruns read-only preflight;
2. generates one private candidate credential;
3. runs fixed `wrangler versions secret put MCL_STATUS_PASSWORD` with the
   candidate only on stdin;
4. proves exactly one new Worker Version appeared while current deployment
   remained unchanged;
5. deploys exactly that new Version at 100%;
6. proves the candidate gets exact authenticated 200 responses on both fixed
   endpoints and the old credential gets 401;
7. creates one private rollback copy of the old credential;
8. atomically promotes the candidate into current local custody;
9. proves post-readback and removes the rollback copy.

No password is placed in argv, environment dumps, Git, issue/PR text or normal
stdout/stderr.

## Rollback

After traffic may have changed, any failed acceptance or custody promotion causes
at most one rollback to the captured pre-rotation Worker Version. Rollback is
accepted only when the old credential is live again and the candidate is not.

If rollback or readback is ambiguous, the result is `unknown`; there is no
automatic second attempt. Private recovery material is preserved when needed for
explicit recovery.

## Fixed source boundary

The owner validates the sibling `wrangler.jsonc` contract before action:
`workers_dev=false`, `preview_urls=false`, fixed Worker name, and exactly the
required `MCL_STATUS_PASSWORD` secret declaration.

It accepts no caller-selected Worker, secret, hostname, credential path,
Cloudflare account/zone/version, command, URL, repository path, retry count or
fallback. It does not change Worker code, routes, DNS, TLS, Access, Custom
Domains, neighboring Workers, repository authority, or any device runtime.

## Receipt

Receipts contain only bounded semantic states. They never contain old/new
passwords, Authorization values, private hostname, account/zone identifiers,
Worker Version/Deployment identifiers, or raw Cloudflare output.

## Validation

```sh
python3 -m py_compile mcl-cloudflare-aux-status-rotate tests/test_contract.py
python3 tests/test_contract.py -v
```

Refs #3348 #3315 #3325 #3328.
