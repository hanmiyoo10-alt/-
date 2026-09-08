# Probe 7: first-run framebuffer cleanup

Probe 6 timer evidence is documented in fortune-golf-timer-callback-14438c.md.

## New original-code evidence

At 0x101732–0x101736, the result of the earlier interface call is compared to -12. Equality branches to 0x101c1e. The normal path creates an offscreen framebuffer at 0x101754–0x101768; the first-run branch skips this allocation.

The first-run branch draws three original strings resolved through PIC literals:
- 0x15f2b0: 첫 실행시 메모리 최적화
- 0x15f2c8: 를 위해 게임을 종료 합니다.
- 0x15f2e4: 다시 실행해 주세요.

It registers the already identified 5000-unit timer, whose callback runs cleanup 0x1015ac before exit. This corrects the earlier hypothesis that this necessarily indicates an initialization failure: intentional first-run shutdown is directly supported by original text and control flow.

Cleanup 0x1015d0–0x1015e2 calls the graphics interface slot +12 with a global framebuffer handle. WIE maps this slot to destroy_offscreen_framebuffer. WIE unconditionally calls context.free; KtfWIPICContext::free reads memory.0 + 4. With an uncreated zero handle, this produces the observed invalid address 4. This is a concrete source-level reproduction path, but the actual fault PC and the runtime value at this inner call have not been captured.

## Patch

Return success when destroying a zero offscreen framebuffer handle. Nonzero handles still pass to the existing allocator; other invalid-memory errors are not suppressed. Keep Probe 5 image conversion and Probe 6 diagnostics. Product version 0.1.7, package io.hanmiyoo.fortunegolf.probe7.

Regression test uses a test context that explicitly errors on free(0), then verifies the public destroy API accepts an uncreated buffer and a normally allocated buffer. It runs under the existing fortune_image_tests filter. TestContext's null-free behavior changes only under cfg(test). Rust/Clippy and APK results belong to the new CI run, not the previous successful run.

## Limits

The first-run notice may remain invisible due to separate graphics issues. Successful intended shutdown still requires restarting the game. This patch does not claim to fix all startup failures or graphics.

Ghidra is durably saved in the repository Release, but a direct local download attempt this turn failed with a network approval cancellation. No new Ghidra execution was performed. Original instructions were inspected with the available LLVM ARM disassembler and the restored prior analysis binary.
