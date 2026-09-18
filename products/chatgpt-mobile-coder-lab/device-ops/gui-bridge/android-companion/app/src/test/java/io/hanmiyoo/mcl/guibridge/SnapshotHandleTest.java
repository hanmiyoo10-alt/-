package io.hanmiyoo.mcl.guibridge;

import static org.junit.Assert.*;
import org.junit.Test;

public class SnapshotHandleTest {
    @Test public void exactGenerationAndWindowAreRequired() {
        String handle=SnapshotHandle.create(9L,42,3);
        assertTrue(SnapshotHandle.matches(handle,9L,42));
        assertFalse(SnapshotHandle.matches(handle,10L,42));
        assertFalse(SnapshotHandle.matches(handle,9L,43));
    }

    @Test public void malformedHandlesFailClosed() {
        assertFalse(SnapshotHandle.matches(null,1L,1));
        assertFalse(SnapshotHandle.matches("v1:abc:1:2",1L,1));
        assertFalse(SnapshotHandle.matches("v2:1:1:2",1L,1));
        assertFalse(SnapshotHandle.matches("v1:1:1:-1",1L,1));
    }
}
