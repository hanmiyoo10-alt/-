# ChatGPT sandbox Rust ingress bridge

Authority: #2225. Work packet: #2238. Generic chunking authority: `tools/sandbox-ingress/**` / #2235.

This directory owns only Rust-specific preparation for a GitHub Actions network bridge. It verifies exact Rust distribution payloads against the corresponding SHA-256 sidecars fetched from `https://static.rust-lang.org/dist`, creates a deterministic bridge bundle, and records bounded provenance. It does not install or activate Rust in the ChatGPT sandbox.

## Frozen inputs

The bridge is intentionally pinned to the historical proven set:

- Rust version: `1.98.1`
- host payload: `rust-1.98.1-x86_64-unknown-linux-gnu.tar.xz`
- target std payload: `rust-std-1.98.1-aarch64-linux-android.tar.xz`

`prepare.sh` requires both payloads and both `.sha256` sidecars. Each payload hash must match the first SHA-256 token in its sidecar before any payload is copied into staging. Missing or malformed sidecars and checksum mismatches fail closed.

## Preparation

```sh
sh tools/sandbox-toolchain/rust/prepare.sh \
  --input-dir /path/to/downloaded-rust-dist \
  --output-dir /path/to/rust-bridge
```

The output directory must not already exist. Success produces:

- `rust-1.98.1-linux-x86_64-plus-android-aarch64.tar`
- `RUST_TOOLCHAIN_PROVENANCE.tsv`

The tar archive contains only the two verified upstream payloads and their two sidecars. It uses fixed ordering, epoch mtime, numeric owner/group zero, normalized file modes, and ustar format so identical verified inputs produce identical bundle bytes. The separate provenance file records the exact version, host, target, payload sizes/hashes, and outer bundle size/hash.

The permanent workflow `.github/workflows/chatgpt-sandbox-rust-bridge.yml` is manual-only. It downloads the frozen inputs in GitHub Actions, runs this verifier/preparer, then delegates chunking to `tools/sandbox-ingress/pack.sh` with a maximum part size of `209715200` bytes (200 MiB). Its uploaded artifact is retained for one day and contains only the ingress manifest/parts plus bounded provenance.

## Offline contract test

```sh
sh tools/sandbox-toolchain/rust/test-prepare.sh
```

The test uses tiny synthetic files with the exact frozen names. It proves deterministic normal preparation, expected bundle membership, checksum-tamper rejection, missing-sidecar rejection, and no final output exposure on failure. It requires no network access and no Rust installation.

## Boundaries

A PASS proves only the Rust-specific byte-verification and packaging contract. SHA-256 sidecars fetched from the same upstream establish byte agreement with that upstream metadata, not an independent signature or transparency proof. The workflow does not extract the bundle in the ChatGPT sandbox, mutate `/opt`, change `PATH`, or establish `rustc`/`cargo` readiness. It also does not prove sandbox DNS/HTTPS egress health or explain the historical `TransportTimeoutError`; that root cause remains `UNKNOWN` under #2225.
