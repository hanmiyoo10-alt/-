# First direct M-device Fortune Golf test — 2026-09-22

## Verified

S's paired ADB connection to M worked. Android shell UID was 2000. Captured PNG screenshots were decoded and visually inspected using the remote file reader. Launching `net.dlunch.wie/.MainActivity` showed the WIE library with the existing Fortune Golf entry. Tapping that entry produced a visible fatal error before gameplay.

Installed package: `net.dlunch.wie`, versionName `0.1.0`, versionCode `1000`, DEBUGGABLE, target SDK 36. Main-user package queries found no package containing `fortune`. This is not the previously documented Probe 11 package (`io.hanmiyoo.fortunegolf.probe11`); exact source revision of this installed WIE build is unknown. Queries across all profiles returned a permission error for Android user 150; inspection was confined to user 0, without attempting access to that profile.

## Visible error

`net.wie.WieError: Unimplemented: 4: stub`

Native PC `0x7100288a`, LR `0x10172f`; possible stack: `0x7100288a`, `0x10172a`, `0x101328`, `0x157d6e`, `0x1580ca`, `0x157fda`. Java stack begins at `Clet.startApp`, then `WIPIMIDlet.startApp`, `Launcher.startMIDlet`, and `org.kwis.msp.lcdui.Main.main`.

The number 4 alone is insufficient to identify the API family. This is not evidence that Probe 11 regressed. No input-latency measurement or gameplay verification was possible on this installed build. No saves were cleared, no package was replaced, and no fresh APK was installed.

## Next action

Recover the verified Probe 11 APK and install it alongside the existing package, then import the existing game using its normal UI. Source artifact is still unexpired as of this test:

- Run: https://github.com/hanmiyoo10-alt/-/actions/runs/34319538928
- Artifact ID: 10091648459; 47,629,910 bytes
- ZIP SHA-256: `671dd29f92d091db6fca6377b59a4c535b32bddd908b4d135b4f06c15662e2b0`
- Overlay commit: `cefe56950c8a31066d05dc844c493958ec752fbe`

A later S remote command returned HTTP 504 (MCP request timed out). Thus the new APK transfer/install was not completed. This remote command timeout does not establish failure of the separate ADB reconnect monitor.

Temporary screenshots remain on S under `/tmp/fortune-wie-ready.png` and `/tmp/fortune-game-start.png`; they are not durable backups. They include an unrelated video overlay and are not committed to this public repository.
