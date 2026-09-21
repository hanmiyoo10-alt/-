# Virtual browser trial (2026-09-11)

User requested testing in a virtual/Linux environment instead of capturing the phone. Two connected PRoot Linux sessions reported aarch64; command discovery did not find Xvfb, Chromium, Firefox, Android emulator, QEMU aarch64 or Waydroid in PATH. This is not proof they are absent everywhere.

A separate controlled cloud Chrome was available. Used the official WIE web UI at https://wie.dlunch.net (linked in upstream README). This deployment is not the pinned Probe 11 build; its exact version was not established.

Imported the existing 956991-byte, ZIP-readable Fortune Golf archive through the app file chooser. Library displayed the game's icon/title. Dismissed the advertisement and ordinary control-help dialog; selected the game. DOM confirmed the player title and directional/OK/numeric keypad. No course, title-menu canvas, or gameplay screenshot was obtained after launch.

After launch, screenshot calls returned CDP timeouts (get tabs then refresh tabs, each 20000 ms). This demonstrates inability to observe the running page in this trial, not a diagnosed game hang or measured input latency. Browser infrastructure, emulator workload, and deployment-specific behavior remain unresolved. No claim that the phone's delay was reproduced.

Next meaningful comparison needs our Probe 11 web build in a controlled test page. Do not compare this unversioned official deployment's responsiveness directly with the patched Android APK. Original game files and screenshots were not added to this public repository.
