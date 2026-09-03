# PLUGIN-STORAGE-FULL-HYDRATION-EXPLICIT-OPT-IN

Status: ADOPTED

PocketRisu keeps server-externalized plugin storage bounded by default. V3 full `pluginCustomStorage` compatibility hydration is allowed only through the explicit per-plugin user setting; merely naming the field in `getDatabase(includeOnly)` is not authority to hydrate the whole store.

Evidence: `PocketRisu/PocketRisu@cccaf9ee585279467c98d8a0bb61d04c1392c6d9`, tightened by `838b47e598210a565ed3c0aa1474fbf20e6d97d4`, retained at reviewed tip `ca09a80746e74e5334145e5e78af47ce423e0eba`.

Invariant: default V3 snapshots remain bounded; explicit opt-in may request the compatibility snapshot; turning the option off returns to bounded behavior; per-key plugin storage access remains preferred. Do not infer whole-store hydration from API shape or field selection without separate review and memory measurements.
