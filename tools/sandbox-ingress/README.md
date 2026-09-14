# ChatGPT sandbox artifact ingress

Authority / context: #2225. Work packet: #2235.

This directory defines a small, toolchain-agnostic protocol for moving a large file through a transport that may impose a per-file size ceiling. It owns only chunking, integrity metadata, and fail-closed reassembly. It does not download, extract, install, register, or execute the reconstructed artifact.

The historical Android bridge proved the transport shape with three 350 MB pieces plus metadata after a roughly 922 MB bundle exceeded the observed single-file ceiling. That historical run is evidence for the pattern, not a permanent workflow or a claim about current sandbox network/backend health.

## Protocol

`pack.sh` writes one output directory containing `manifest.tsv` plus zero or more deterministic part files:

```text
schema<TAB>sandbox-ingress.v1
file<TAB><original-name><TAB><whole-size-bytes><TAB><whole-sha256>
max_part_bytes<TAB><positive-decimal>
part_count<TAB><decimal>
part<TAB>0000<TAB><original-name>.part-0000<TAB><part-size><TAB><part-sha256>
part<TAB>0001<TAB><original-name>.part-0001<TAB><part-size><TAB><part-sha256>
...
```

The protocol deliberately restricts the original basename to `A-Z`, `a-z`, `0-9`, `.`, `_`, and `-`, excluding `.` and `..`. This keeps manifest parsing and reconstructed paths unambiguous without a JSON/YAML parser or escaping layer.

Part order is the numeric manifest index. Part names must exactly match the declared original filename plus `.part-NNNN`. Each part must be no larger than the declared maximum. SHA-256 is recorded for every part and for the whole input.

## Pack

```sh
sh tools/sandbox-ingress/pack.sh \
  --input /path/to/archive.tar.zst \
  --output-dir /path/to/archive.parts \
  --max-part-bytes 367001600
```

The output directory must not already exist. Packing happens in a temporary sibling directory and is exposed only after the manifest and parts are complete.

## Verify and reassemble

```sh
sh tools/sandbox-ingress/unpack.sh \
  --manifest /path/to/archive.parts/manifest.tsv \
  --output /path/to/archive.tar.zst
```

By default, parts are read from the manifest directory. `--parts-dir DIR` may point at another directory after external transport has placed all declared parts there.

Reassembly fails closed on malformed schema/fields, invalid ordering, duplicate manifest records, missing or renamed declared parts, part-size mismatch, part-hash mismatch, or undeclared extra files matching the deterministic part prefix. Data is appended only to a temporary file. The final output path is created only after whole-file size and SHA-256 verification succeeds, then committed by a same-directory rename. Existing output files are never overwritten.

## Dependencies and boundaries

The helpers use `/bin/sh` plus ordinary Linux base utilities such as `split`, `sha256sum`, `awk`, `wc`, `mktemp`, `cat`, and `mv`. They require no network, package manager, Python, Rust, Android SDK/NDK, or project-specific dependency.

A successful reassembly proves only byte-for-byte integrity against the supplied manifest. It does **not** prove the artifact is trusted, safe to extract, compatible, installable, or ready for use. It does not diagnose or repair the historical `TransportTimeoutError`, test sandbox egress, mutate `/opt`, or establish Python/Rust/Android readiness. Those remain separately owned steps.

## Contract test

```sh
sh tools/sandbox-ingress/test-ingress.sh
```

The test uses tiny synthetic fixtures. It covers single- and multi-part round trips plus missing part, same-size tamper, size mismatch, rename, duplicate manifest record, undeclared extra part, invalid schema, and temporary-output cleanup behavior.
