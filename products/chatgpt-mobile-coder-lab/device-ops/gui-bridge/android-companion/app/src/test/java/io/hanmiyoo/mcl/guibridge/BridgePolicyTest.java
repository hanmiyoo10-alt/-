package io.hanmiyoo.mcl.guibridge;

import static org.junit.Assert.*;

import org.junit.Test;

public class BridgePolicyTest {
    @Test
    public void targetPackageIsFixed() {
        assertEquals("com.openai.chatgpt", BridgePolicy.TARGET_PACKAGE);
        assertEquals("com.termux", BridgePolicy.TERMUX_PACKAGE);
    }

    @Test
    public void loginAndCredentialLabelsAreRestricted() {
        assertTrue(BridgePolicy.restrictedLabel("Log in"));
        assertTrue(BridgePolicy.restrictedLabel("비밀번호"));
        assertTrue(BridgePolicy.restrictedLabel("Email address"));
        assertFalse(BridgePolicy.restrictedLabel("New chat"));
    }

    @Test
    public void editableLabelDoesNotExposeFieldContents() {
        assertEquals("editable", BridgePolicy.visibleLabel("secret draft", null, true));
    }

    @Test
    public void userTextIsBounded() {
        assertTrue(BridgePolicy.boundedText("GUI_BRIDGE_PROBE_OK"));
        assertFalse(BridgePolicy.boundedText(""));
        assertFalse(BridgePolicy.boundedText("x".repeat(513)));
    }
}
