# L Windows Wireless ADB raw host control

This owner provides one bounded L/WSL controller for reconnecting the already-paired exact M and exact S Android devices when raw mDNS advertises the ADB TLS connect service but Windows Platform-Tools `adb mdns services` does not expose it.

It is a host-side discovery/reconnect owner. It does not pair devices and does not change Android Wireless Debugging state.

## Fixed profiles

| Profile | Target model | Private pin |
| --- | --- | --- |
| `M` | `SM-S938N` | `$HOME/.local/state/mcl-wireless-adb-host-control/l-to-m.v1` |
| `S` | `SM-G998N` | `$HOME/.local/state/mcl-wireless-adb-host-control/l-to-s.v1` |

Fixed DNS-SD service: `_adb-tls-connect._tcp.local`.

The Windows ADB binary is resolved only from the standard per-user Platform-Tools location under `%LOCALAPPDATA%\Android\platform-tools\adb.exe`.

## Runtime shape

```text
ordinary ChatGPT
→ L/WSL Python owner
→ fixed Windows PowerShell.exe
→ raw mDNS socket / fixed Windows adb.exe
→ already-paired exact M or exact S
```

The PowerShell transport is a fixed sibling source file. The Python owner invokes it only for four internal transport operations:

- `mdns` — one fixed PTR query and bounded response capture;
- `known-hosts` — read the fixed Windows ADB known-host file under a strict byte ceiling;
- `connected` — enumerate connected ADB rows and exact model readback;
- `connect` — one internally selected endpoint, then exact model readback.

The PowerShell child output is consumed internally. Raw service instances, endpoints, serials, hosts, addresses and ports are never returned in normal owner receipts.

## Private pin contract

Bootstrap is allowed only while the selected exact target is already connected once through the user-approved Windows ADB trust relationship.

The controller correlates:

1. raw mDNS candidate;
2. local ADB known-host evidence;
3. one currently connected exact target model.

It then writes only a domain-separated SHA-256 digest of the normalized service instance to the WSL private pin.

Pins are regular non-symlink mode 0600. They contain no raw endpoint, serial, host, IP or port.

## Public operations

```sh
python3 mcl_wireless_adb_host_control.py inspect M
python3 mcl_wireless_adb_host_control.py bootstrap M
python3 mcl_wireless_adb_host_control.py reconnect M

python3 mcl_wireless_adb_host_control.py inspect S
python3 mcl_wireless_adb_host_control.py bootstrap S
python3 mcl_wireless_adb_host_control.py reconnect S
```

Only exact profile names `M|S` are accepted.

There is no caller-supplied endpoint, serial, service type, path, command, retry count or target model.

### inspect

Read-only.

Requires:
- valid private pin;
- matching known-host evidence;
- exactly one matching raw mDNS candidate;
- exactly one resolved network endpoint for that candidate.

### bootstrap

Writes only the selected private pin.

Requires:
- exactly one connected transport whose model equals the fixed profile model;
- exactly one raw mDNS candidate correlated to that transport;
- matching known-host evidence.

It never pairs or connects.

### reconnect

Uses the private pin to select exactly one raw candidate, invokes exactly one Windows `adb connect` internally, and then requires exact target-model readback.

A model mismatch, zero/ambiguous candidate, missing pin, known-host mismatch, malformed discovery evidence or Windows transport error fails closed.

## Safety boundary

The owner must not:

- run `adb pair`;
- start, stop or restart the ADB server;
- run `adb tcpip`;
- toggle Wireless Debugging;
- modify Android settings, packages, permissions, network state or reboot;
- scan arbitrary DNS-SD service types;
- accept a caller-selected endpoint/serial;
- persist or emit raw discovery or transport identifiers;
- modify the M→S `wireless-adb-peer-control/**` owner.

Windows raw mDNS is used because #4141 proved a real `_adb-tls-connect._tcp.local` PTR answer while `adb mdns services` projected zero candidates on the same L Windows host.

## Receipt

Normal results are bounded JSON with:

- schema/version;
- operation;
- profile;
- fixed target model;
- status;
- stable reason codes;
- `identifiers=withheld`;
- all repository/device/merge/release/production authority flags false.

## Validation

Repository-only focused validation:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-host-control/tests/test_contract.py

python3 - <<'PY'
from pathlib import Path
path = Path("products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-host-control/mcl_wireless_adb_host_control.py")
compile(path.read_text(), str(path), "exec")
PY

test -z "$(find products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-host-control -type f -name '*.pyc' -print -quit)"
test -z "$(find products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-host-control -type d -name '__pycache__' -print -quit)"
```

On physical L, separately syntax-parse the exact PowerShell source with Windows PowerShell before publication.

## Live sequencing

After merge/postmerge only:

1. bootstrap M and S while both exact targets are currently connected;
2. require `inspect M` and `inspect S` PASS;
3. share #4124 exact-M reboot acceptance with L→M reconnect;
4. share #4139 exact-S reboot acceptance with L→S reconnect;
5. collect #3769 receipt-fidelity evidence in those already-required reboot windows;
6. keep M→S #3762 under its separate existing owner.

Implementation packet: #4282.
D0 attribution source: #4141.
