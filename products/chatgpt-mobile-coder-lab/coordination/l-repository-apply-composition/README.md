# MCL L apply composition

Composes existing holder, L owner, D-013 and D-014 for one PREPARED `L/L` transaction.

Activation is fsync-durable before D-013 release. Finalize is source-effect-free: current `#2352` lastRelease cites `issue:#2352`; historical proof preserves disposition/reasons; manifest-comment identity stays exact; terminal activation and byte-identical completion receipts replay safely.

No new Git/PR/lease/merge/runtime/release/production primitive or time takeover.

Refs #3524 #3525 #3491 #3481 #3473 #2352.
