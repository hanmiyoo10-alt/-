package io.hanmiyoo.mcl.guibridge;

final class SnapshotHandle {
    private SnapshotHandle() {}

    static String create(long generation, int windowId, int index) {
        return "v1:" + generation + ":" + windowId + ":" + index;
    }

    static boolean matches(String handle, long generation, int windowId) {
        if (handle == null) return false;
        String[] parts = handle.split(":", -1);
        if (parts.length != 4 || !"v1".equals(parts[0])) return false;
        try {
            return Long.parseLong(parts[1]) == generation
                && Integer.parseInt(parts[2]) == windowId
                && Integer.parseInt(parts[3]) >= 0;
        } catch (NumberFormatException error) {
            return false;
        }
    }
}
