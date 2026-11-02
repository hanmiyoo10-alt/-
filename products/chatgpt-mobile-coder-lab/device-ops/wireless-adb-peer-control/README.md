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

A candidate is eligible only when the private pin matches one discovered service
instance, that instance is present in local known-host evidence, and exactly one
network endpoint resolves. Normal output withholds all such identifiers.

## Operation surface

The executable accepts only three fixed operation names: inspect, bootstrap and
reconnect. It accepts no endpoint, serial, service, path or command selector.

Inspect is read-only. Bootstrap binds an already-connected exact-S observation to
the private pin. Reconnect uses the one internally selected candidate and verifies
the fixed target model after connection.

## Boundary

V1 does not alter pairing, ADB server mode/lifecycle, Android configuration,
packages, or persistence. It does not provide arbitrary scanning or a generic
device command surface. Background/watch integration is separately owned.

Receipts contain only bounded status/reason evidence, the fixed target model,
`identifiers=withheld`, and explicit false authority flags.

Focused validation:

```sh
python3 products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control/tests/test_contract.py
python3 -m py_compile products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control/mcl_adb_peer_control.py
```

Implementation owner: #3762. Live reboot/reconnect proof remains a later stage.
