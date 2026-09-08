# Ghidra workspace recovery verified

The local toolchain is restored and executed successfully in the current Work workspace.

## Verified evidence

- Source Release: ghidra-toolchain-34213335872.
- Transfer workflow: 34243741148, ghidra-release-transfer.yml.
- 12 manifest-listed chunks verified by SHA256; ZIP CRC checks passed.
- Combined archive SHA256: 34ef46b97d65f105358e40f5be5edb1dd43464a77521176842d4b0c44a04ab2d.
- Ghidra installation, analyzeHeadless, full JDK 21, bridge compilation, project directory checks all passed locally.
- CLI opened the restored fortune-original/client.bin project and successfully decompiled function 0x10131c, returning fortune_entry_10131c and its body.

## Current paths

Launcher: /workspace/scratch/f937cae0f3c9/ghidra-restore/runtime/run-ghidra
Projects: /workspace/scratch/f937cae0f3c9/callback-analysis/restored/ghidra-projects
Project: fortune-original; program: client.bin.

```sh
./ghidra-restore/runtime/run-ghidra --projects-dir /workspace/scratch/f937cae0f3c9/callback-analysis/restored/ghidra-projects --project fortune-original --program client.bin decompile 0x10131c
```

## Working recovery route

Direct GitHub release download still failed with a network approval cancellation. This does not mean local Ghidra cannot run. The supported GitHub artifact download tool produced file references, which the supported file materialization tool placed in the workspace. One transient server disconnect was resolved by retrying that chunk.

Download existing Release chunks through the dedicated transfer workflow; no toolchain rebuild is necessary. Materialize each artifact, validate ZIP CRCs, extract its named payload, verify every entry in PARTS-SHA256SUMS, and concatenate exactly those listed names in numerical order. Do not glob arbitrary partial/intermediate filenames into the combined archive. Verify SHA256SUMS before extracting with the safe tar data filter.

After any workspace reset, inspect these paths and restore through the same supported route if absent. Release storage is durable; scratch paths are not. Do not claim the global network policy was changed. No game binary or decompiled body is included in this public record.
