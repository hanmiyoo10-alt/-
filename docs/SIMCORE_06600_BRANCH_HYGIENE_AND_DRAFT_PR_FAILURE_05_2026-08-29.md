# SimCore v0.66.0 Branch Hygiene / Draft PR Failure 05

Date: 2026-08-29
Classification: `FIX · VALIDATION_HARNESS / OPERATOR_TOOLING · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: `REPAIRED · CLOSED WITHOUT PRODUCTION EXPOSURE`

Work branch:
`runtime/simcore-v0.66.0-m2-4-boundary-completion`

Production authority remains:
- `release-simcore`
- version `0.65.0`
- commit `c6659296c68b4322d0ed43f7d8a3339e57f1cbf1`
- runtime blob `1b38e2b2874f2581edae8f1080edc39558febefa`

## Event A: tracked Python bytecode artifact

A branch-vs-main diff review after temporary workflow retirement found a tracked generated artifact:

`products/simcore/tooling/__pycache__/build-06600-m2-4-session-runtime-mirror-boundary-completion.cpython-312.pyc`

This file was validation-harness residue only. It was not part of the SimCore runtime candidate and was not required by the frozen builder.

Diagnosis:
- an earlier temporary repair workflow staged runner-generated `__pycache__` output;
- a later branch commit path left the bytecode artifact tracked;
- exact-production builder materialization and candidate identity were independent of this file.

Repair:
- deleted the tracked `.pyc` from the work branch;
- deletion commit: `f007df45de8194ecd2058547208f24e646938e2e`;
- final branch hygiene must continue to assert no `__pycache__` / `.pyc` in the product diff.

## Event B: accidental draft PR creation during branch inspection

While checking the work branch against `main`, an operator/tool invocation mistakenly created draft PR `#758`.

Detected state:
- draft: `true`;
- merged: `false`;
- production mutation: `NONE`;
- `release-simcore` mutation: `NONE`;
- no release authorization was created;
- no permanent publication was requested.

Repair:
- PR `#758` was immediately closed without merge;
- final state: `closed`, `merged = false`;
- the accidental draft is not reused as the product PR.

## Product impact

`NONE`.

The successful exact-production materialization remains authoritative for the current runtime candidate:
- builder SHA-256 `ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50`;
- candidate blob `766c3b758ca26ae72546a38bfa1c053efa666c45`;
- candidate SHA-256 `af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a`;
- Slice A/B/C/D static checks PASS.

## Closure rule

This incident is closed as repository/validation-harness hygiene only. It does not alter the M2-4 runtime scope and must not be mixed with release-system redesign.
