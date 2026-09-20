# Relocation and image loading findings

## Verified relocation rule

The entry at 0x100000 computes descriptor address 0x10006a. Its relocation count gives relocation base 0x100fa0. GOT starts at 0x16b030. Stored GOT offsets must be added to 0x100fa0, NOT 0x100000. The latter gave invalid function boundaries during this session; temporary graphics16 labels created at those wrong addresses were removed. The checked-in SeedGraphics.java uses corrected addresses only.

Startup 0x101684 branches on screen depth 16 vs 32 and installs different function pointers. The six 16-bit branch targets resolve to 0x129a10, 0x129ae0, 0x129b58, 0x12d294, 0x12f014, 0x126a24. Correct targets have normal Thumb function prologues.

## Color-key evidence

Function 0x129b58 compares its first pixel argument with the value at 0x129bd8 (0xf81f); when equal it retains its second argument. This is evidence of a magenta color-key path, unlike 0x152c04 where the same constant serves as a channel averaging mask. Do not infer that every magenta pixel in every image is transparent.

Decompiler warning: 0x158530 was marked no-return, truncating callers. Clearing that flag improves output but complete function-body recovery still needs care; do not derive a complete blend formula from truncated output.

## Resource linkage

Verified GOT slots: title.bmp at 0x16b46c resolves to 0x15f4a8; menuList.bmp at 0x16b3a8 resolves to 0x15f3e0; font.bmp at 0x16b2d0 resolves to 0x15f320.

Function 0x108cd0 references menuList.bmp through GOT offset 0x378 (literal at 0x108fd0) and invokes loader 0x10d5c8 when its handle is empty.

Loader 0x10d5c8 obtains bytes/length via platform calls and forwards an output handle, buffer, zero offset and length through trampoline 0x15d3c8. This resembles image creation, but the trampoline target must still be resolved from instructions/API table before naming that call definitively.

Next: resolve that image-creation API, follow image buffer access into menu drawing, then test a targeted pixel-format compatibility change. No APK fix is claimed yet.
