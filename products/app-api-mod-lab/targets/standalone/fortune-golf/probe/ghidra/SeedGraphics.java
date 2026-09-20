import ghidra.app.script.GhidraScript;

// Addresses are for the known Fortune Golf binary imported at 0x100000.
// GOT values relocate against 0x100fa0, not the image base.
public class SeedGraphics extends GhidraScript {
    public void run() throws Exception {
        for (long entry : new long[]{0x129a10, 0x129ae0, 0x129b58, 0x12d294, 0x12f014, 0x126a24}) {
            var address = toAddr(entry);
            disassemble(address);
            if (getFunctionAt(address) == null) {
                createFunction(address, "graphics16_" + Long.toHexString(entry));
            }
        }
    }
}
