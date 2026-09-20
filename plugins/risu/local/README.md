# Local plugin compatibility family

This directory is the compatibility/navigation parent for the future Risu O Local plugin family.

Current posture: `compatibility-family / evidence-only / non-production`.

## Current child authorities

- Local Usage Dashboard: `plugin:usage-dashboard` → `plugins/usage-dashboard/**`
- DevPass: `plugin:devpass` → `plugins/devpass/**`
- Voyage Token Check: `plugin:voyage-token-check` → `voyage-token-check/**`

Those child authorities remain authoritative until a separately reviewed migration proves replacement.

## Boundary

This parent does not own a production version, release branch, update URL, runtime deployment, provider credentials, or child production truth.
It does not authorize copying, moving, deleting, or redirecting the current child roots.
In particular, `release-usage-dashboard` and its current `plugins/usage-dashboard/**` artifact/runtime paths remain unchanged.

Future shared provider/normalization work must compose with #2582 and preserve UNKNOWN versus known-zero fidelity.
Broader invocation/routing work remains separately scoped by #2589.

The intended future organization is under `plugins/risu/local/`, but target organization is not current production authority.

## Child compatibility paths

Nested child paths remain owned by their child identities, not by the Local parent.

Current bridge:
- `plugins/risu/local/voyage/**` → `plugin:voyage-token-check`
- current Voyage design/evidence authority still remains under `voyage-token-check/**`

The Local parent owns only its own direct compatibility surfaces. A nested child path must not be interpreted as authority collapse into `plugin:local`.
