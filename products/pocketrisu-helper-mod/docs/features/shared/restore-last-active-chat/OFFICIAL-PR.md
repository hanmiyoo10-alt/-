# Official upstream PR — restore-last-active-chat

Feature-ID: `restore-last-active-chat`

## Official PR
- Repository: `PocketRisu/PocketRisu`
- PR: `#60` — `feat: restore last active chat after reload`
- Result: `MERGED_UPSTREAM`
- Merged at: `2026-08-23T06:48:22Z`
- Upstream merge commit: `e3d9e1cdfbb536b8e4117c61c37d776f5585b43c`
- Source head: `000dd8baf383200ecb180490d2c063ebdd11c004`

## Accepted scope
The official PR accepted the six-file last-active-character/chat restoration implementation. It stores stable character identity, restores through the canonical `changeChar()` path, and clears persistence on deliberate Home/deselect paths.

## Validation submitted upstream
- active chat -> reload -> same character/chat restored
- intentional Home -> reload -> Home remains
- `pnpm check`: 0 errors (existing accessibility warnings only)
- production build succeeded

## Meaning for this feature
This feature is no longer merely a rebuild candidate. Its official upstream PR was merged. Keep `UPSTREAM.md` as historical/rebuild design material, but treat this file as the authoritative official-PR outcome record.
