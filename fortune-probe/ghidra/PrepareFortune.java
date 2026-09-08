import ghidra.app.script.GhidraScript;
import java.math.BigInteger;

// Import the user-supplied raw binary at 0x100000 with ARM:LE:32:v5t.
// No game code or assets are included in this script.
public class PrepareFortune extends GhidraScript {
    public void run() throws Exception {
        var memory = currentProgram.getMemory();
        currentProgram.getProgramContext().setValue(
            currentProgram.getRegister("TMode"), memory.getMinAddress(),
            memory.getMaxAddress(), BigInteger.ONE);
        for (long offset : new long[]{0x100000, 0x10131c}) {
            var address = toAddr(offset);
            addEntryPoint(address);
            disassemble(address);
            createFunction(address, "fortune_entry_" + Long.toHexString(offset));
        }
    }
}
