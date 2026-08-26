# Local Usage Dashboard — DevPass Funding Authority Investigation

Status: **IMPLEMENTED — authority investigation complete**

Idea: `NV-FUNDING-AUTH`  
Design: #416  
Parent backlog: #348 candidate 8  
Production baseline: `3.0.0-alpha.5.80 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1`

## Final verdict

**`NOT_PROVEN`**

Current repository/pinned runtime evidence does not prove an authoritative request-level distinction between:

- DevPass plan allowance,
- PAYG overflow / regular credits.

Therefore a request funding source must remain **UNKNOWN**. No versioned `V-FUNDING-PROVENANCE` implementation is authorized from this investigation.

## Evidence reviewed

| Candidate source | Exact field(s) | Scope | Proven semantics | Allowed derivation | Verdict contribution |
| --- | --- | --- | --- | --- | --- |
| account-wide `/logs` capture | `projectId` / aliases | request | exact DevPass project identity can classify account scope | exact project match → `requestAccountScope=devpass` | insufficient for funding |
| account-wide `/logs` capture | `organizationId` / aliases | request | exact organization identity participates in Credits scope classification | selected Credits org match only with explicit Credits billing evidence | insufficient for DevPass funding |
| account-wide `/logs` capture | `usedMode` / `used_mode` | request | current shipped contract proves `usedMode=credits` only as part of selected-Credits-org account-scope authority | selected Credits org + `usedMode=credits` → Credits scope | **insufficient** for plan-vs-PAYG |
| DevPass status | `regularCredits` | account | account credit state | display account balance only when source-backed | insufficient for a single request |
| DevPass status | `paygEnabled` / source PAYG status | account | account/status capability | account status only | insufficient for a single request |
| model/provider/cost/tokens/duration/service tier | existing request metadata | request | independent request metadata axes | none for funding | explicitly rejected |

## Current request-provenance contract

`runtime-src/bridge-engine/35-request-provenance-capture.part.mjs` captures raw request project ID, organization ID, and `usedMode` only in the short-lived `0600` capture file.

`runtime-src/bridge-engine/55-request-provenance.part.mjs` then applies the shipped rule:

1. exact request project == DevPass project → `devpass` account scope;
2. otherwise exact selected Credits organization + `usedMode=credits` → `credits` account scope;
3. otherwise → `unknown`.

The same source explicitly states that model/provider/price/tokens/duration/cache/service tier do not participate.

Nothing in the current repository contract defines `usedMode` for a DevPass-project request as a stable enum for **plan allowance vs PAYG overflow**.

## Why account PAYG state is not request funding truth

`regularCredits` and PAYG-enabled status are account-level state. They can answer questions such as whether PAYG capability or regular credits exist, but they do not prove which balance funded one particular request.

The following correlations are forbidden:

- PAYG enabled → this request used PAYG;
- regular credits > 0 → this request used PAYG;
- allowance exhausted → this request used PAYG;
- DevPass account scope → plan allowance;
- a particular model/service tier/cost → plan or PAYG;
- missing `usedMode` → plan allowance;
- `usedMode=credits` on a DevPass-project row → PAYG, unless upstream semantics are separately proven.

## Static upstream/schema result

The currently pinned Local Usage Dashboard repository evidence exposes no stronger request-level funding field such as a stable `fundingSource`, `billingSource`, `chargeSource`, or equivalent mapping whose semantics are proven to identify plan allowance vs PAYG overflow.

A suggestive field name or observed correlation would not satisfy the authority threshold. Because current static evidence is sufficient to conclude **not proven**, no live/device probe is justified for this task.

## UNKNOWN rule

A request funding source remains UNKNOWN whenever an explicit, stable request-level upstream funding decision is absent.

UNKNOWN must not be converted to:

- `plan-allowance`,
- `payg-overflow`,
- false/disabled,
- zero.

## Privacy / retention

No new raw billing data was captured or persisted by this investigation.

Protected boundaries remain:

- raw project/org IDs stay transient inside capture;
- raw `usedMode` is not promoted into the public Request Ledger as funding truth;
- transaction/invoice/payment identifiers are not retained;
- prompts/responses/auth/cookies/headers remain excluded.

## Extra I/O

**None.**

The investigation used repository/source evidence only and introduced no shipped network, CLI, polling, or device probe.

## Downstream decision

`V-FUNDING-PROVENANCE` remains blocked on authority and must be treated as:

- source authority: **not proven**;
- public value: **UNKNOWN**;
- implementation: **not authorized**;
- next reopening condition: new pinned upstream documentation/source proving an explicit request-level field or an explicitly guaranteed request-level composite rule.

This is a successful result for `NV-FUNDING-AUTH`: truth was preferred over completeness.
