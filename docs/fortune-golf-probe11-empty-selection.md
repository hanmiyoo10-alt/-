# Probe 11: capture the empty resource selection

## Probe 10 device evidence
The supplied screenshot shows query/size/read for char_grip_0x21.mtra and char_grip_0x22.mtra, then query "" and size "" => None, followed by null access with PC 0x10af88 and LR 0x10ac85. Read notes precede reads and alone do not prove completion.

The original archive was restored and its ZIP CRC check passed (956991 bytes). Both named character resources exist. game.cfg contains nonempty character geometry/animation/texture names; no replacement resource was invented.

## Static reconstruction
In client.bin (SHA256 4627f98a60dba7ed2cec6c9161ada1a834c247d6298e4d85fc6160657c1952ca), function 0x10ad18 uses record stride 0x86c and record base resolved through PIC table 0x16b030, entry +0x1c. Record zero resolves to 0x1775e0. At entry it saves (record[33] - 1) & 255 at SP+28. Immediately before the failing load, the filename address is record + 1600 + 32 * saved_index. The preceding resource wrapper returns zero for a negative resource ID. The likely null load is 0x10af86; the following ADD at 0x10af88 has no memory operand.

This does NOT establish record[33] == 0. A valid index selecting an empty slot, unexpected selection state, or corrupted table remains possible. The parser provides an additional link: at 0x139160 it compares the token against PIC+0xc30 (0x16bc60 -> 0x160e68, :PARTS_TEXTURE). The matched branch at 0x139188..0x1391ba fills record+1600 in 32-byte steps. Therefore the failing lookup selects a character BMP texture, not the immediately preceding grip animation. Character 0x20 declares three textures (char_body_0x20.bmp through char_body_0x22.bmp). The actual runtime selector and populated slots are still unknown.

## Probe 11
Capture R0, R7 record base, record[33], the saved SP+28 index, and bounded 32-byte first/selected filename slots when the engine fault PC is 0x10af86..0x10af8a. Snapshot runs before unwinding while the existing engine lock is held. Checked address arithmetic and failed reads return unreadable/None; no guest memory or return value is changed. Java exception/unwind variants remain preserved.

Tests cover mapped selection, saved index, irrelevant PC, unmapped/overflow addresses, and register preservation. This is diagnostic, not a gameplay fix. Local Python compilation passed; CI/device validation pending.

Analysis this turn used LLVM Thumb decoding and archive inspection. No new Ghidra execution is claimed. Original archive and disassembly are not published here.
