# PLUGIN-STORAGE-PENDING-WRITE-READ-YOUR-WRITES

Status: ADOPTED

Source: PocketRisu/PocketRisu commit 83ffa0474abd013581c4df23e50b20c559d4b47a. Preserved at reviewed tip ca09a80746e74e5334145e5e78af47ce423e0eba.

Invariant: while storage persistence is asynchronous, same-key reads and full snapshots observe the newest pending local intent. Pending removal reads as missing. Pending set reads as the queued value. Pending intent remains transient and does not override newer mutations or failure recovery.

Validation: held set/get, held remove/get, snapshot during held write, ordering, failure recovery, newer-write ownership, clear interaction, malformed pending data.

Canonical ledger: hanmiyoo10-alt/PocketRisu notes/external-risu-dev-watch, notes/idea-ledger-addenda/2026-09-04-0743-plugin-storage-pending-write-read-your-writes.md
