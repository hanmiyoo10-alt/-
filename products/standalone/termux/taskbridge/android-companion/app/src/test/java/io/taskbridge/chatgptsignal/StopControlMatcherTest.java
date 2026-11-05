package io.taskbridge.chatgptsignal;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class StopControlMatcherTest {
    @Test
    public void matchesEnglishAndKoreanStopGenerationControls() {
        assertTrue(StopControlMatcher.matches("Stop generating", null, null, "android.widget.Button", true));
        assertTrue(StopControlMatcher.matches(null, "생성 중지", null, "android.widget.ImageButton", true));
    }

    @Test
    public void ignoresOrdinaryClickableConversationText() {
        assertFalse(StopControlMatcher.matches("Copy", null, null, "android.widget.Button", true));
        assertFalse(StopControlMatcher.matches("긴 답변 본문", null, null, "android.widget.TextView", false));
    }

    @Test
    public void acceptsSpecificStopGenerationViewId() {
        assertTrue(StopControlMatcher.matches(null, null, "com.openai.chatgpt:id/stop_generation", "android.widget.ImageButton", true));
    }
}
