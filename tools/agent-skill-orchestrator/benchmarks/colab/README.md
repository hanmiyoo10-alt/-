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

Open `colab-agent-bootstrap.ipynb` in the intended Colab account and use **Run all**.
There are no repository-SHA or request-id fields to fill.

The notebook clones only the public `main` branch without credentials. Immediately
after clone it validates that the checkout is `main`, binds that checkout's exact
40-hex HEAD once, generates a bounded UTC request id with a short random suffix, then
switches to detached HEAD at the already-bound SHA. It never re-resolves `main` later
in the run.

Google Drive authorization remains an explicit user-controlled trust boundary. After
Drive is mounted, the notebook delegates request/build/run logic to the repository-owned
Python modules in this directory and prints only bounded execution identity/validation
data.

Do not paste tokens, cookies, account identifiers, billing details, or private device
material into the notebook.

## CAGB-0 entitlement observation

Subscription/Compute Unit visibility is an account-UI observation, not a repository or
Drive fact. If captured for the experiment, record only the bounded observation needed by
#2925, with its observation time. Do not commit account email, billing identifiers,
payment details, or unrelated screenshots.

## CAGB-2 GPU admission/runtime smoke

Packet #2952 adds a separate `gpu/` adapter without changing the frozen CPU registry,
generation policy, CPU prebuilt artifact, or existing CPU receipt contracts.

The CAGB-2 request is fixed to `GPU_REQUIRED`, `max_model_calls = 0`, and the
`COLAB_GPU_RUNTIME_SMOKE` operation. GPU absence returns `BLOCKED_NO_ACCELERATOR` and
never falls back to a CPU runtime. When a GPU is present, the adapter fetches only the
pinned llama.cpp `b10516` tag, verifies commit `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`,
builds one reviewed CUDA profile, hashes `llama-server` and `libggml-cuda.so`, and runs
only a bounded `--version` smoke. No model is downloaded or loaded.

The thin launcher is `gpu/colab-agent-gpu-admission.ipynb`. Its result bundle uses:

```text
nyang-colab/agent-bench/gpu-admission/<request-id>/
```

Local contract checks remain model-free:

```text
python -m unittest discover -s benchmarks/colab/gpu/tests -v
```

CAGB-3 Scout inference remains a separate packet after CAGB-2 merge, postmerge
convergence, and one bounded live Colab GPU admission/runtime attempt.
