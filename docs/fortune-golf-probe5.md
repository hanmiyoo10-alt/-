# Probe 5 — opaque BMP pixel format experiment

Experimental package: io.hanmiyoo.fortunegolf.probe5, version 0.1.5. Retains Probe 4 DB behavior. No game assets included.

## Evidence

Ghidra disassembly of menu image loader 0x10d5c8 shows kernel calls at offsets 0x7c (resource ID), 0x54 (calloc), 0x80 (resource read), then graphics table offset 0x80 (slot 32, create_image), passing output pointer, buffer, offset zero and length. These offsets match pinned WIE's interface tables. The final target is passed in r4 through 0x15d3c8.

The current image decoder returns 32-bit pixels while screen/offscreen buffers are 16-bit. The game chooses 16-bit drawing callbacks from screen depth and has a magenta color-key path. This motivates a controlled image-format experiment, not a claim that the entire corruption is fixed.

## Change

Decode normally, then convert only opaque files with BMP magic BM to RGB565. Preserve all other files, including PNG disguised as .bmp, and preserve any image with nonopaque pixels. Do not remove magenta: native comparison requires its 0xf81f value. Keep current packed stride width*2. Do not alter original files, game code, timer behavior or other drawing APIs.

## Validation

Added regression cases for a 3x2 image: exact little-endian RGB565 bytes, odd-width stride, row ordering and magenta preservation; a second case checks non-BMP and alpha preservation. GitHub Actions runs these plus existing DB tests and clippy before Android packaging. Build and device results are pending at document creation.

Compare Probe 5 with Probe 4 on title logo, menu text, character page and first launch. Use the same original archive. The separate app package means prior probe save data is not automatically shared. A startup error or remaining magenta backgrounds must be recorded separately; this experiment does not repair callback blending or first-run timer crashes.
