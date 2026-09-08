# Pixel path investigation

## Verified by local ghidra-cli

Functions 0x152798 and 0x15277c return/check the pointer at object offset +4. The object has width at +8, height at +12, stride in pixels at +16, and a format selector at +20. This is a game-owned object, not established to be a WIPICFramebuffer.

Allocation function 0x1527f8 rounds the pixel width up to a multiple of four. Its format selectors 1, 2 and 3 select one, two and four bytes per pixel respectively; selector 4 is normalized to 2. Thus the game contains multiple pixel formats, not exclusively RGB565.

Function 0x152ac8 duplicates each 16-bit source pixel into a 2x2 destination block. Previously inspected 0x152c04 averages a 2x2 block into one 16-bit pixel. Neither function alone proves the origin of the striped menus.

## Emulator comparison

Pinned WIE graphics.rs uses FRAMEBUFFER_DEPTH=16 for screen and offscreen buffers. graphics/image.rs delegates decoded images to FrameBuffer::from_image; framebuffer.rs preserves the input bytes_per_pixel. The decoder's 32-bit output therefore remains 32-bit. This mismatch remains a candidate, not a verified fault at the game boundary.

Do not globally convert all images to RGB565 based solely on these observations: the game has separate buffers and supports multiple formats, and PNG alpha handling would also need consideration.

## Next tracing anchors

Original filename string locations: title.bmp 0x15f4a8, menuList.bmp 0x15f3e0, font.bmp 0x15f320, Annunciator.bmp 0x15f208. Track their loading and conversion paths, accounting for PIC/GOT and indirect calls. Missing automatically generated cross-references are not evidence that these resources or functions are unused.

No new APK or graphics fix was produced by this investigation. Existing first-run crash and actual round/save verification remain open. Original decompiled bodies and binary assets are not included here.
