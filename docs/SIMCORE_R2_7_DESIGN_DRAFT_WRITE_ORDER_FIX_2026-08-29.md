# SimCore R2.7 Design Draft Write-Order Fix

Date: 2026-08-29 KST

Classification: **FIX · ADMIN/DOC WRITE ORDER · NON_RUNTIME**

During preparation of the R2.7 design draft, several accidental temporary documentation writes were sent directly to `main` while attempting to create an intended design branch. All transient files were immediately removed. No runtime, release-system code, production authority, or `release-simcore` state changed.

Observed transient writes and repairs:

```text
R2.7 placeholder draft
create 0b1120388af4b57536244103c77a17e827d7b805
remove 128ae558e987337e491ef8f9f60fb9973ef9f81b

NOOP.md
create 0310edc3601a2e8303d97e090eb8376c21353810
remove a437b0891b3f810ea20b17b1dc0fb491cb8915be

TEMP_BRANCH_PROBE.md
create d4c7a909d0b80265b46184d0817d047b8e951732
remove d5b654dba2f8474730ae12b063d8b98e4460f71a
```

Disposition: **FIX · RESOLVED**

Safety impact:

```text
runtime mutation: NONE
release-simcore mutation: NONE
release-system code mutation: NONE
production publisher invocation: NONE
```

Corrected transaction rule:

```text
main is design/evidence authority
→ draft design/evidence may be recorded directly on main when explicitly marked DRAFT / NOT FROZEN
→ implementation still requires a dedicated working branch
→ no further temporary/probe files are permitted on main
```

No product/runtime authority or deployment authority was affected.
