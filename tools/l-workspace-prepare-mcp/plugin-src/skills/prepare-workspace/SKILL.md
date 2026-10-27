---
name: prepare-workspace
description: >
  Prepare one exact MCL L repository workspace only after current packet,
  D-013 lease and D-014 manifest evidence already authorize it.
---

# Prepare MCL L workspace

1. Read the owning repository packet and current authority first.
2. Call `prepare_workspace(packet_number, manifest_id)` only with the exact
   packet number and current D-014 manifest ID.
3. Treat `BLOCKED`, `UNKNOWN`, and `CONFLICT` as fail-closed.
4. A `PASS / PREPARED` result authorizes no holder claim, patch, commit, push,
   PR, merge, cleanup, release, production or device effect.
5. Never ask for or expose lease IDs, holder claims, OAuth secrets, GitHub
   tokens, filesystem paths beyond repository-owned public evidence, or raw
   process/environment data.
6. After PREPARED, hand control back to the owning packet's existing
   workspace-holder and L repository apply composition.

This skill does not authorize generic shell, Git, file, worktree, PR, merge,
release, runtime, network, Tailscale, or production operations.
