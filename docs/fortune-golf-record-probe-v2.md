# Fortune Golf record probe v2

The device screenshot reached `MC_DB.open(size=128, create=1, mode=1, exists=false)`. This proves that the initial absent-database branch progressed to a creation request. It does not prove later gameplay compatibility.

This overlay adds independent, experimental fixed-record handling for vector 4. Vector 6 stream handling is unchanged. No game binaries or assets are included.

Implemented slots: open (0), close (1), insert (3), select (4), update (5), delete record (6), count (10), record size (11). Other slots still stop explicitly.

Live handles are guest allocations with a type marker. Persistent storage uses a separate, hex-encoded name namespace. Adapter metadata occupies internal record 0; game records start at 1. Reopening does not truncate records. Existing metadata conflicts fail without replacing data. Only the observed access mode 1 is supported.

Evidence: the [libwipi 1.2.1 ABI catalog](https://github.com/mirusu400/libwipi/blob/a6633ddb9f5a4510b237b7b8059ea0dafa1e4585/spec/wipi-1.2.1/api.csv) establishes signatures and slot offsets. The generated operation documentation explicitly does not establish all return-value semantics. Accordingly, record IDs starting at 1, byte-count transfer returns, and zero padding of short writes are experimental compatibility choices, not claimed verified KTF behavior. These need device validation.

Tests cover missing/open/create behavior, close and reopen, record isolation, invalid lengths, metadata protection, size mismatch preservation, and bounded zero-padded reads. These tests validate the adapter's data integrity; they do not prove the original game's ABI expectations or persistence across a real Android process restart.

Android app: Fortune Golf Probe 2, `io.hanmiyoo.fortunegolf.probe2`, version 0.1.2. A distinct package avoids conflicting with earlier ephemeral debug signatures. Import the user's ZIP in the new app. Actual game launch, rendering, audio, touch redesign, and end-to-end saving remain unverified.
