# MCL exact canonical issue-body evidence

This read-only owner materializes the exact UTF-8 bytes of the GitHub-returned issue `body` string for two fixed MCL evidence profiles.

## Profiles

- `ledger` reads fixed issue #2352 and requires the current task-lease parser to accept the exact body.
- `packet --packet '#N'` reads one open canonical work packet and requires packet projection `PASS` with a nonterminal lifecycle.

The repository is compile-time fixed to `hanmiyoo10-alt/-`. Callers cannot choose another repository, endpoint, HTTP method, JSON/JQ expression, issue field, normalization mode, or output path.

## Exact-byte channel

The canonical body never appears on stdout. The CLI writes only to dedicated file descriptor 3:

```sh
node mcl-exact-issue-body.cjs ledger 3>ledger.body
node mcl-exact-issue-body.cjs packet --packet '#4210' 3>packet.body
```

The body is encoded from the GitHub-returned JavaScript string directly as UTF-8. No `.trim()`, `.trimEnd()`, shell command substitution, `--jq .body`, newline append, canonical renderer, or whitespace normalization is used.

Stdout contains only a bounded receipt with kind/ref, byte count, SHA-256, and false authority flags. The body bytes are never echoed in diagnostics.

When `GH_TOKEN` or `GITHUB_TOKEN` is present, the existing fixed GitHub client is used. Otherwise the existing MCL coordination-operator bounded `gh api` issue-read fallback is reused. Both paths return the JSON issue body string before exact UTF-8 encoding.

## Boundaries

This owner does not mutate GitHub, #2352, packet issues, Git, refs, worktrees, D-013, D-014, holders, PRs, runtime/device state, release, or production. It does not weaken strict semantic owners such as `task-lease.cjs::parseLedger`.

Malformed issue identity, closed/PR issue, invalid ledger, invalid/noncanonical packet, terminal packet, oversized body, missing fd3, GitHub read failure, or write failure remains fail-closed.
