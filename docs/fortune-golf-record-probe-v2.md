# Fortune Golf record probe v2

The device screenshot reached `MC_DB.open(size=128, create=1, mode=1, exists=false)`. This proves that the initial absent-database branch progressed to a creation request. It does not prove later gameplay compatibility.

This overlay adds independent, experimental fixed-record handling for vector 4. Vector 6 stream handling is unchanged. No game binaries or assets are included.

Implemented slots: open (0), close (1), insert (3), select (4), update (5), delete record (6), count (10), record size (11). Other slots still stop explicitly.

Live handles are guest allocations with a type marker. Persistent storage uses a separate, hex-encoded name namespace. Adapter metadata occupies internal record 0; game records start at 1. Reopening does not truncate records. Existing metadata conflicts fail without replacing data. Only the observed access mode 1 is supported.

Evidence: the [libwipi 1.2.1 ABI catalog](https://github.com/mirusu400/libwipi/blob/a6633ddb9f5a4510b237b7b8059ea0dafa1e4585/spec/wipi-1.2.1/api.csv) establishes signatures and slot offsets. The generated operation documentation explicitly does not establish all return-value semantics. Accordingly, record IDs starting at 1, byte-count transfer returns, and zero padding of short writes are experimental compatibility choices, not claimed verified KTF behavior. These need device validation.

Tests cover missing/open/create behavior, close and reopen, record isolation, invalid lengths, metadata protection, size mismatch preservation, and bounded zero-padded reads. These tests validate the adapter's data integrity; they do not prove the original game's ABI expectations or persistence across a real Android process restart.

Android app: Fortune Golf Probe 2, `io.hanmiyoo.fortunegolf.probe2`, version 0.1.2. A distinct package avoids conflicting with earlier ephemeral debug signatures. Import the user's ZIP in the new app. Actual game launch, rendering, audio, touch redesign, and end-to-end saving remain unverified.

## Probe 3 follow-up

The next device screenshot reports vector 4 slot 7 (`IP=0x50007`) with a database handle, an output buffer pointer, and byte capacity 12. Added MC_dbListRecords: exclude metadata record 0, order visible IDs, write only complete u32 IDs fitting the supplied byte capacity, and return the count written. Negative lengths and address wraparound are rejected before writes. Added three boundary tests.

The [SDK CRUD example](https://github.com/mirusu400/libwipi/blob/a6633ddb9f5a4510b237b7b8059ea0dafa1e4585/examples/database-crud/main.c) supplies sizeof(listed) and expects select/update to return M_SUCCESS. Probe 3 changes those two returns to 0, superseding Probe 2's experimental byte-count returns. The example's synthetic LGT contract is supporting evidence, not proof of all KTF edge cases.

Probe 3 uses version 0.1.3 and package io.hanmiyoo.fortunegolf.probe3. Actual gameplay remains unverified. Pending slots are database deletion (2), sorting (8), access mode (9), and database listing (12).

## Probe 4 follow-up

Next screenshot: IP=0x50002, R0=name pointer, R1=1; vector 4 slot 2 is MC_dbDeleteDataBase(name, mode). Add deletion restricted to the current PID and the adapter's encoded database namespace. Missing databases return NOENT without creation; metadata or unsupported-mode mismatches stop without deleting. Tests cover named/app isolation, deletion followed by recreation, and rejected requests preserving records.

App identity is Fortune Golf Probe 4, io.hanmiyoo.fortunegolf.probe4, version 0.1.4. Game-directed startup cleanup is implemented; the screenshot alone does not establish why the game chose that path or verify gameplay. Slots 8, 9, and 12 remain unsupported.
