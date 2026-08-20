# BaseCore Governance

## Source of truth

BaseCore-owned repository files are authoritative for BaseCore development state.
Conversation memory is useful working context, not durable product memory.

## Ownership boundary

BaseCore workflows may modify only BaseCore-owned runtime/state files plus shared repository infrastructure explicitly required for BaseCore release automation.

BaseCore must not modify SimCore product state, SimCore release branches, or SimCore durable memory as a side effect of BaseCore work.

## Durable decision rule

A decision is durable when it changes one of these:

- runtime behavior
- state schema or namespace
- prompt contract
- release/update behavior
- validation gate
- architecture ownership

Durable decisions must be written to BaseCore repository memory during the same work session.

## Validation hierarchy

1. Static syntax / deterministic fixture checks
2. Fresh-chat runtime validation
3. Existing long-chat attach/bootstrap validation
4. Reload/update safety validation
5. Manual-edit recovery validation

A failed gate is recorded as failure evidence, not silently rewritten as success.
