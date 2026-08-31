# PERSISTENT-VOLUME-CREDENTIAL-RECOVERY-BOUNDARY

Status: `DESIGN_NEEDED`

## Problem / evidence

HaejeokRisuai commit `4bb245a9c08af3cb786ac67db5f0791cb546ca86` demonstrates a first-install failure mode where persistent database/object-store volumes have already been created and initialized with generated credentials, but application readiness later fails. If rollback discards or rewinds the generated protected credential/config state while keeping those volumes, intact persistent data can become inaccessible to subsequent lifecycle commands.

The source regression test forces volume creation followed by an authentication readiness failure, verifies generated PostgreSQL/RustFS credentials remain persisted, verifies no transaction debris remains, and verifies a later rebuild succeeds.

Evidence for PocketRisu is external and therefore `MEDIUM` until its actual deployment transaction is reproduced/audited.

## Minimal safe scope

Design only. Do not alter PocketRisu deployment/runtime in this dossier until the exact credential-binding boundary is mapped.

The smallest future implementation slice, if explicitly authorized, would only distinguish:

1. failure before any persistent credential-bound resource exists → normal rollback may restore pre-install protected configuration;
2. failure after persistent credential-bound resources exist → preserve the exact protected configuration that owns them, fail closed, and present recovery guidance.

No automatic volume deletion, credential guessing, credential rotation, or hidden destructive reset belongs in this feature.

## Ownership boundaries

- deployment/install transaction coordinator owns phase transitions and rollback decisions;
- protected checkout-local state owns generated database/object-store credentials and deployment settings;
- persistent database/object-store volumes own data initialized under those credentials;
- readiness diagnostics may classify likely authentication failure but must not mutate credentials as a side effect;
- lifecycle commands (`start`, `rebuild`, recovery/doctor equivalents) consume protected configuration but do not become credential authorities themselves.

## Proposed mechanism

Introduce an explicit install transaction marker or derived predicate for `persistent_credentials_bound` only after the installer can prove credential-bound persistent resources were created/initialized. Rollback logic branches on that state.

Before the boundary, rollback may restore the previous protected configuration. After the boundary, rollback tears down the failed candidate runtime as appropriate but retains the protected generated configuration, reports that persistent state now depends on it, and offers non-destructive recovery/diagnostic commands.

Authentication-specific readiness failures may produce a more targeted explanation, but generic readiness failure after the boundary must still preserve the owning credential state unless the installer can prove the volumes were never initialized.

## Compatibility / invariants

- never delete persistent volumes automatically as a recovery shortcut;
- never guess or synthesize replacement credentials for an existing persistent volume;
- never overwrite known-good prior deployment credentials with a failed candidate unless ownership is proven;
- protected credential state must retain restrictive filesystem permissions;
- a failed install must leave no transaction scratch/debris that can be mistaken for committed configuration;
- pre-boundary failures must retain existing rollback semantics;
- post-boundary failures must be restart/rebuild recoverable using the preserved exact credentials;
- keep PocketRisu runtime/service-manager guardrails unchanged; this design does not authorize PM2 or any host/runtime migration;
- no server-phone Android notification behavior is introduced.

## Validation / acceptance

Required before readiness can advance:

- map every PocketRisu install phase that creates networks, volumes, containers, schemas/users/buckets, or protected credentials;
- identify the earliest operation after which the generated credentials are required to recover persistent data;
- fixture test failure immediately before that operation and confirm prior-state rollback;
- fixture test failure immediately after that operation and confirm generated protected state is retained;
- fixture test database/object-store authentication failure during readiness and verify actionable diagnosis without secret disclosure;
- verify protected-state permissions and no credentials appear in normal logs;
- verify subsequent `rebuild`/`start`/doctor-style recovery succeeds with the preserved credentials;
- verify transaction debris is absent after both rollback paths;
- verify manual cleanup remains explicit and destructive operations require separate confirmation/instruction.

Acceptance requires a deterministic ownership proof for the boundary, not a heuristic such as “container existed once”.

## Risk / blast radius

`HIGH`. A wrong boundary can strand data, retain secrets unnecessarily, resurrect stale configuration, or attach a new runtime to the wrong persistent data. Deployment failures are difficult to recover from remotely, especially on the server phone.

Contain blast radius by keeping the state transition explicit, avoiding credential mutation after binding, preserving existing pre-boundary rollback, and making destructive cleanup out-of-scope.

## Rollback / fallback

Before any future implementation, preserve the current installer path as a clean revert target. If the new boundary misclassifies state, disable the special post-binding recovery branch and return to the prior installer while retaining user-visible manual recovery documentation. Never roll back by deleting persistent volumes or rotating their credentials automatically.

## Dependencies

- PocketRisu installer/container ownership audit;
- persistent-volume naming and lifecycle inventory;
- protected credential/config storage ownership and permission audit;
- deterministic readiness/authentication failure fixture;
- explicit recovery UX contract.

## PR decomposition

1. **Audit/tests only:** document install phases and add failure fixtures around candidate credential-binding points. No production behavior change.
2. **Boundary state only:** introduce the explicit persisted/in-memory transaction phase marker with tests, still no recovery behavior change.
3. **Recovery behavior:** preserve credential-owning protected state after the proven boundary and emit non-destructive recovery guidance.
4. **Optional diagnostics:** add auth-specific diagnosis only if it can be implemented without secret exposure or mutation.

Each PR must remain independently revertible. No autonomous implementation is authorized while this remains `SYSTEM_UPDATE_REQUIRED` / `Risk: HIGH`.