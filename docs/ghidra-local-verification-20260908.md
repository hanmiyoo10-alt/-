# Ghidra local verification — 2026-09-08

Ghidra CLI 0.2.2 with Ghidra 12.1.3 and JDK 21 successfully imported and analyzed the user-supplied raw ARM binary locally. Thumb mode, ARM:LE:32:v5t, base 0x100000, explicit entries 0x100000 and 0x10131c. CLI decompile of 0x10131c succeeded.

A cross-reference query to 0x152d6c found reads in function 0x152c04. Decompilation shows 16-bit pixel pointers and a 2x2 averaging operation using red/blue mask 0xf81f and green mask 0x7c0. This constant is an averaging channel mask here, not evidence of a transparency key. The function supports investigating pixel-format compatibility, but its use by the corrupted menu has not been established. No graphics fix or new APK is claimed.

Private original binary, project database and decompilation outputs are excluded from this repository. The public helper only establishes analysis entry points.
