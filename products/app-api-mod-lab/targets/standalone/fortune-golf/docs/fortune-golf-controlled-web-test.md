# Controlled Probe 11 web test

Build workflow: .github/workflows/fortune-golf-web-probe.yml
Initial run: https://github.com/hanmiyoo10-alt/-/actions/runs/34678172773
Artifact name: fortune-golf-probe11-web

This builds WIE commit 1ed8710956e727629e67db762ddc1e6bd6151a1f with the exact Probe 11 overlay commit cefe56950c8a31066d05dc844c493958ec752fbe. It uses the same npm production/WASM frontend build as the successful APK workflow. No new emulator behavior is introduced and no ROM is included. probe-build.json records source commits and SHA256 hashes of all output files.

## Test sequence
1. Download/extract the artifact and verify files against probe-build.json. Serve the directory over HTTP on a stable localhost origin; do not open index.html with file:// because WASM/module fetching and persistent storage need a proper origin.
2. Import the privately retained original ZIP. Record the first launch separately.
3. If the UI is responsive, use the existing return-to-library button. Its cleanup stops update scheduling, aborts input listeners, unsubscribes volume changes and frees the emulator.
4. Launch the same library entry again without deleting the app or clearing browser data. If a page reload is needed, keep the same browser profile, hostname and port.
5. Confirm title/tutorial/course visually before measuring input. A page containing the keypad alone does not demonstrate rendered gameplay.
6. If browser control times out, record that as inability to observe/control, not proof of a specific game bug. A new cloud-browser session can lose prior library/save data and does not count as a second launch of the previous session.
7. Only after course entry compare browser event delivery and guest handling. Desktop/cloud results do not establish phone latency.

The original official-web trial used an unversioned deployment and stalled browser control. User reports the Android build initially shows white then closes, and subsequent launches show the game. That reported sequence remains to be verified in this controlled build.

At creation of this note the new web build was running; artifact integrity, browser launch, second-launch behavior and input latency were not yet verified.
