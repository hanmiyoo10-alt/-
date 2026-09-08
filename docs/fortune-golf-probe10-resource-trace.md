# Probe 10: resource lookup trace for PC 0x10af88

Probe 9 screenshot: timer 0x16fde0, callback 0x102319, param 1, engine PC 0x10af88, LR 0x10ac85, invalid memory address 0.

Restored client.bin from the private checkpoint. LLVM Thumb decoding shows 0x10af86 is ldr r3,[r0], immediately followed at 0x10af88 by adds r1,r3,#0 (no memory access). The recorded PC is thus consistent with a post-instruction PC; the likely faulting load is 0x10af86, not an access performed by the adds instruction. This needs runtime register confirmation.

The preceding call at 0x10af82 resolves to 0x10ac68. That wrapper calls interface +124 (matching kernel GetResourceID), branches on negative result to return 0, otherwise calls +128 (GetResource) and returns a shared buffer handle. Therefore lookup failure is a concrete candidate, as is an unexpectedly zero shared buffer handle. No missing filename or file-format cause is yet established. The original filenames at this call are assembled in game-owned state.

Probe 10 adds a per-ArmCore shared ring of eight resource query/size/read notes, each limited to 320 Unicode characters. Fresh WIPI contexts share ArmCore, so the history survives separate SVC calls without a global cross-emulator variable. The engine failure message includes that history. Lookup results and guest exception variants are unchanged; no missing-resource failure is forced. A trace can contain interleaved tasks and is diagnostic context, not proof of causation.

Unit test checks sharing between core clones, isolation between emulators, bounded history and Unicode truncation. Existing KTF library tests remain enabled. Local Python syntax check passed; CI must verify generated Rust and APK.

This turn used LLVM; local Ghidra had been removed by workspace maintenance. No new Ghidra execution or fix of gameplay is claimed.
