# SimCore v0.66.0 Branch Hygiene / Draft PR Failure 05

Date: 2026-08-29
Classification: `FIX · VALIDATION_HARNESS / OPERATOR_TOOLING · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: `EVIDENCE RECORDED · REPAIR IN PROGRESS`

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

This file is validation-harness residue only. It is not part of the SimCore runtime candidate, is not required by the frozen builder, and must not enter the product PR.

Diagnosis:
- an earlier temporary repair workflow staged runner-generated `__pycache__` output;
- although the workflow push failed at one point, a later branch commit path left the bytecode artifact tracked;
- exact-production builder materialization and candidate identity remain independent of this file.

Required repair:
- delete the tracked `.pyc` from the work branch;
- re-run branch diff hygiene and ensure no `__pycache__` / `.pyc` remains.

## Event B: accidental draft PR creation during branch inspection

While checking the work branch against `main`, an operator/tool invocation mistakenly created draft PR `#758` with title `__DO_NOT_CREATE__`.

At detection time:
- PR state: `open`, `draft = true`;
- merged: `false`;
- production mutation: `NONE`;
- `release-simcore` mutation: `NONE`;
- no release authorization was created;
- no permanent publication was requested.

Required repair:
- close draft PR `#758` without merge;
- do not reuse it as the product PR;
- create the real M2-4 product PR only after branch hygiene, architecture dual-lane contract, and evidence updates are complete.

## Product impact

`NONE`.

The successful exact-production materialization remains authoritative for the current runtime candidate:
- builder SHA-256 `ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50`;
- candidate blob `766c3b758ca26ae72546a38bfa1c053efa666c45`;
- candidate SHA-256 `af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a`;
- Slice A/B/C/D static checks PASS.

This incident is a repository/validation-harness hygiene repair only and must not be mixed with release-system redesign.
