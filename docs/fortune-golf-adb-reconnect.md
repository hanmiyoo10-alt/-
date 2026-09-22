# S → M ADB reconnect

Configured 2026-09-22. Pairing succeeded from S; Android shell access and a PNG screen capture were verified. Main Android user exposed net.dlunch.wie; Probe 11 package was not found there. Do not infer installed app version from prior screenshots.

`fortune-adb-reconnect.py` is installed on S at `~/.local/bin/fortune-adb-reconnect.py`. Private local configuration is `~/.config/fortune-adb/target.json` with `host`, integer `port`, and expected Android `serial`. Device addresses, serial, pairing codes and ADB keys are intentionally absent from this repository. Keep S's existing ADB keys private and intact.

The monitor checks every 15 seconds, reconnects the configured endpoint, and verifies the serial via a read-only property. It can learn a changed TLS connection port only if mDNS advertises the expected serial at the configured host. It does not scan ports, pair automatically, change adbd settings, or operate on app data. Commands have 12-second timeouts. A lock prevents duplicate monitors; logs rotate at 64 KiB with one backup.

On S, .bashrc and .profile invoke `python3 "$HOME/.local/bin/fortune-adb-reconnect.py" --start`. Original startup files were backed up with the `.before-fortune-adb` suffix. This restarts monitoring on shell startup, not at Android boot. Systemd was offline. Android must keep S's Linux environment running and M's wireless debugging reachable. A changed port that is not advertised requires updating the local configuration. Initial mDNS discovery was empty on this network.

Commands:

- Start: `python3 ~/.local/bin/fortune-adb-reconnect.py --start`
- Check: `python3 ~/.local/bin/fortune-adb-reconnect.py --once`
- Log: `~/.local/state/fortune-adb/monitor.log`
- Stop: verify the process in `~/.local/state/fortune-adb/monitor.pid`, then terminate that monitor. Remove the two startup hook lines to disable future starts. Do not delete ADB keys or revoke pairing to stop monitoring.

Validation: Python syntax check and identity check passed. A deliberate `adb disconnect` was followed by reconnection without a new pairing request; device transport ID changed from 2 to 3. This verifies reconnection to the current endpoint, not recovery after Android reboot or a changed port.
