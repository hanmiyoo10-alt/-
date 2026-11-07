# MCL Wireless ADB peer control v1

Fixed-purpose first-direction controller for:

`M Termux host → exact physical S target (SM-G998N)`.

S→M remains a separate later authority/proof direction.

## Fixed identities

- target model: `SM-G998N`
- DNS-SD service: `_adb-tls-connect._tcp.local`
- ADB binary: fixed Termux ADB path
- private pin: `$HOME/.local/state/mcl-wireless-adb-peer-control/m-to-s.v1`
- local known-host evidence: `$HOME/.android/adb_known_hosts.pb`

No caller selects any of those values.

## Private pin

Bootstrap starts only from an already approved connected exact-S transport.
The pin is mode `0600` and stores schema, fixed target model, and one
domain-separated SHA-256 digest of the normalized exact-S service instance.

Raw transport and discovery identities are not persisted in the pin or emitted
in normal receipts.

## Discovery contract

Discovery uses only the Python standard library and one fixed service query.
Packet, record, instance, endpoint, compression and known-host parsing all have
compile-time bounds.

Malformed, zero-candidate and ambiguous evidence fails closed.

For one SRV target, address selection is deterministic and bounded: prefer the sole IPv4 address when exactly one IPv4 is present; otherwise permit one IPv6 only when IPv4 is absent and exactly one IPv6 exists. Multiple IPv4 addresses remain ambiguous and produce no candidate.

A candidate is eligible only when the private pin matches one discovered service
instance, that instance is present in local known-host evidence, and exactly one
network endpoint is selected by that rule. Normal output withholds all such identifiers.

## Operation surface

The executable accepts only four fixed operation names: inspect, bootstrap,
recover-bootstrap and reconnect. It accepts no endpoint, serial, service, path or
command selector.

Inspect is read-only. Bootstrap binds an already-connected exact-S observation to
the private pin. recover-bootstrap is only for a zero-connected exact-S baseline:
it requires one unique raw candidate already backed by local known-host trust,
performs exactly one internally selected adb connect, verifies exact model
SM-G998N, and only then writes the normal 0600 pin. Reconnect uses the one
internally selected pinned candidate and verifies the fixed target model after
connection.

## Boundary

V1 does not alter pairing, ADB server mode/lifecycle, Android configuration,
packages, or persistence. It does not provide arbitrary scanning or a generic
device command surface. Background/watch integration is separately owned.

Receipts contain only bounded status/reason evidence, the fixed target model,
`identifiers=withheld`, and explicit false authority flags.

Focused validation:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control/tests/test_contract.py
python3 - <<'PY'
from pathlib import Path
path = Path("products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control/mcl_adb_peer_control.py")
compile(path.read_text(), str(path), "exec")
PY
test -z "$(find products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control -type f -name '*.pyc' -print -quit)"
test -z "$(find products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control -type d -name '__pycache__' -print -quit)"
```

Implementation owner: #3762. Live reboot/reconnect proof remains a later stage.
