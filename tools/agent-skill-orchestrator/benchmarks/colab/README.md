# Colab Agent Bootstrap

This directory owns the bounded CAGB-0/CAGB-1 bootstrap adapter from #2925.

Its job is deliberately small:

```text
exact repository commit
-> fixed bootstrap request
-> no-model CPU provenance smoke
-> sanitized hash-linked bundle
-> Google Drive handoff
```

It is an auxiliary execution/transport surface only. It is not benchmark ground truth,
model assignment authority, CI authority, release authority, production authority, or
a repository writer.

## V1 boundaries

- operation: `COLAB_BOOTSTRAP_CPU_SMOKE`
- execution profile: `colab-cpu-bootstrap-v1`
- model calls: exactly `0`
- hosted AI calls: exactly `0`
- GPU/CUDA/model download: out of scope
- arbitrary shell command fields: not accepted
- arbitrary output paths in requests: not accepted
- GitHub PAT or repository secret: not required
- Colab does not push commits or mutate repository state

The request binds an exact 40-hex repository commit. The runner fails closed when the
checked-out `HEAD` differs or the worktree is dirty. Sentinel bytes are read from the
requested Git commit, not inferred from branch names.

## Fixed Drive handoff

The caller supplies only the mounted Drive root. The repository code derives the rest:

```text
nyang-colab/agent-bench/bootstrap/<request-id>/
  request.json
  result.json
  bundle-manifest.json
  receipt.json
```

The request ID is a bounded slug and cannot contain path separators. Existing target
directories are never overwritten.

Drive is transport, not authority. `bundle-manifest.json` covers the pre-receipt request/result files; `receipt.json` carries its own canonical self-hash and binds the manifest hash. A bundle is usable only after `validate` rechecks its schemas, canonical hashes, file hashes, exact repository identity, zero-call accounting, and sanitized payload contract.

## Local contract check

From `tools/agent-skill-orchestrator`:

```text
python -m unittest discover -s benchmarks/colab/tests -v
```

A prepared bundle can be revalidated with:

```text
python benchmarks/colab/bootstrap.py validate --bundle-dir <bundle-directory>
```

## Colab pilot

Open `colab-agent-bootstrap.ipynb` in the intended Colab account. Fill only:

- `REPOSITORY_SHA` with the exact merged commit to test;
- `REQUEST_ID` with a new bounded slug.

The notebook clones the public repository without credentials, checks out the exact
commit detached, asks Google Colab to mount Drive through the ordinary interactive
authorization flow, and delegates request/build/run logic to the repository-owned Python
modules in this directory.

Do not paste tokens, cookies, account identifiers, billing details, or private device
material into the notebook.

## CAGB-0 entitlement observation

Subscription/Compute Unit visibility is an account-UI observation, not a repository or
Drive fact. If captured for the experiment, record only the bounded observation needed by
#2925, with its observation time. Do not commit account email, billing identifiers,
payment details, or unrelated screenshots.

## Next boundary

CAGB-2 GPU/CUDA work is explicitly outside this directory's current V1 proof. It requires
a separate packet after #2925 completes its CPU + Drive round trip.
