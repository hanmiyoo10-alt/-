# Public Distribution Publisher

One-way mirror from canonical release authorities into `hanmiyoo10-alt/myang`.

This tool is not a release authority. It copies only the file allowlists in `policy.json`, byte-for-byte, and publishes with ordinary fast-forward Git updates.

Channels:

- `termux`: `main` -> `myang/main`
- `simcore`: `release-simcore` -> `myang/release-simcore`
- `usage-dashboard`: `release-usage-dashboard` -> `myang/release-usage-dashboard`

The CLI accepts only the fixed channels above. It does not accept a caller-selected repository, source ref, target branch, or file path.

This packet does not cut consumers over to myang. Mirrored product bytes intentionally keep their current canonical public URLs until the separately owned URL-migration step completes. The canonical repository must remain publicly readable until that later cutover is proven.

V1 is manual-only through `.github/workflows/public-distribution-publish.yml`.
