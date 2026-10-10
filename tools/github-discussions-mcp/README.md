# GitHub Discussions MCP

Repository-owned bounded GitHub Discussions connector for the canonical repository:

`hanmiyoo10-alt/-`

This package is the supported V1 subset of #3483 / #3484. It is intentionally separate from the private **Hanmiyoo Repo Cockpit**, whose existing contract remains strictly read-only.

## Authority boundary

This MCP is not a repository, release, production, runtime, or Idea Hub truth database. It reads or mutates only current GitHub Discussion objects in the fixed canonical repository.

It exposes no arbitrary repository selector and no generic GraphQL proxy.

Supported tools:

- `discussion_categories`
- `discussion_list`
- `discussion_get`
- `discussion_update_guarded`
- `discussion_move_guarded`

Explicitly absent:

- Discussion create/delete/close/reopen
- Discussion comments/replies/answers/upvotes/locks/moderation
- category create/delete/rename
- generic GraphQL/HTTP
- issue/PR/review-thread mutation
- branch/ref/file/commit mutation
- workflow dispatch/rerun
- release/production/runtime/device effects

## GitHub API contract

The transport sends only four repository-owned GraphQL documents:

1. categories query
2. bounded Discussion list query
3. exact Discussion get query
4. `updateDiscussion` mutation

The transport rejects any other document before a network call.

The endpoint is fixed to:

`https://api.github.com/graphql`

Repository variables are fixed by the semantic service to:

`owner=hanmiyoo10-alt`
`name=-`

## Authentication

Live calls require one dedicated deployment secret:

`GITHUB_DISCUSSIONS_TOKEN`

Optional bounded timeout:

`GITHUB_DISCUSSIONS_TIMEOUT_SECONDS` (default 8, clamped to 1..30)

The package deliberately does **not** read:

- the host `gh auth token`
- `GITHUB_TOKEN`
- a token file
- plugin manifests
- arbitrary caller credentials

The deployment credential must be separately provisioned as a least-privilege GitHub App/OAuth credential for the fixed repository. Do not commit it, put it in plugin files, echo it, or include it in receipts/logs.

The config object's token field is excluded from `repr`.

## Read tools

### `discussion_categories`

Reads all current categories in one bounded `first:100` query.

If GitHub reports another page, the result is `UNKNOWN / CATEGORY_PAGE_BOUND_EXCEEDED` rather than silently returning an incomplete inventory.

### `discussion_list`

Reads one bounded page ordered by `UPDATED_AT DESC`.

`limit` must be 1..50.

The result includes compact Discussion identity plus `pageInfo.hasNextPage/endCursor`.

### `discussion_get`

Reads one exact Discussion number with:

- node id / number
- title / body
- `updatedAt`
- closed
- category identity
- `viewerCanUpdate`
- GitHub source locator

Bodies are bounded to 128 KiB. An oversized body becomes explicit `UNKNOWN` rather than a silent truncation.

## Guarded mutation currentness

GitHub exposes Discussion `updatedAt` but `UpdateDiscussionInput` has no server-side expected-version / expected-updatedAt field.

Therefore V1 is **not atomic CAS**.

Every mutation receipt contains:

`atomicCas=false`

and:

`currentnessContract=EXACT_PRE_READ_PLUS_POST_WRITE_VERIFICATION_NON_ATOMIC`

The currentness sequence is:

```text
read exact Discussion
→ require node id + number identity
→ require observed updatedAt == caller expectedUpdatedAt
→ require viewerCanUpdate=true
→ fixed updateDiscussion mutation
→ immediate exact Discussion readback
→ verify requested fields/category and identity
```

A different `updatedAt` before mutation returns:

`STALE_PRECONDITION`

with zero mutation attempt.

This guard reduces stale overwrites but does not remove the race between the final pre-read and GitHub accepting the mutation. No receipt may call it atomic CAS.

## Mutation uncertainty

After a mutation call is attempted, any GraphQL/network/credential-loss error is reported as:

`MUTATION_UNCERTAIN`

with:

- `mutationAttempted=true`
- `mutationMayHaveOccurred=true`

The connector does not downgrade possible mutation to a clean blocker.

A successful mutation response is still insufficient. Exact post-write readback must match the requested state or the result remains `MUTATION_UNCERTAIN`.

## `discussion_update_guarded`

May change only title and/or body.

The connector builds `UpdateDiscussionInput` itself. Callers cannot supply arbitrary input keys.

On success, the bounded receipt includes title when requested and body SHA-256/byte length when body was requested. It does not duplicate a large body into the mutation receipt.

## `discussion_move_guarded`

May change only `categoryId`.

The connector reads the fixed repository's category inventory **before** Discussion mutation and rejects a target category id that is not present.

It then applies the same exact id/number/updatedAt guard and verifies after the mutation that:

- the Discussion moved to the requested category
- title stayed unchanged
- body stayed unchanged

## Category rename

Current public GitHub Discussions GraphQL does not expose a documented category-rename mutation in the activated #3483 design evidence.

V1 does not emulate rename through delete/recreate or UI automation.

Full #3438 Item 5 therefore remains capability-blocked for category rename.

## True atomic CAS

Current `UpdateDiscussionInput` has no expected version/currentness field.

V1 never claims server-side atomic CAS.

Full #3438 Item 5 therefore remains capability-blocked for true atomic Discussion CAS.

## Tests

The core semantic tests use fake GraphQL transport only. No GitHub credential and no live Discussion mutation are needed:

```bash
cd tools/github-discussions-mcp
python -m unittest discover -s tests -p 'test_*.py' -v
```

Useful source checks:

```bash
python -m py_compile github_discussions_mcp/*.py tests/*.py
PYTHONPATH=. python -c "import github_discussions_mcp; print(github_discussions_mcp.REPOSITORY_FULL_NAME)"
```

The MCP SDK is required only to import/run `server.py`.

## Deployment boundary

IMPLEMENTATION_PR is repository source only.

Do not deploy this package, modify Railway, publish/update a private plugin, or mutate a live Discussion merely to validate the repository implementation.

A later stage may deploy a **separate sibling service/plugin** only after dedicated least-privilege auth is explicitly provisioned. Existing `repo-cockpit-aggregator` remains read-only and separate.
