# Repository Project Catalog

> Generated from `.github/plugin-control-plane/registry.json` and canonical-main descriptors. Operational freshness remains on status issues/#305 rather than this durable catalog.

| Scope | Name | Lifecycle | Primary path | Authority | Guidelines |
| --- | --- | --- | --- | --- | --- |
| plugin:devpass | DevPass | declared-update-channel | plugins/devpass/** | declaredBy=plugins/devpass/README.md; artifact=plugins/devpass/latest.js; ref=main | docs/DEVPASS_GUIDELINES.md |
| plugin:simcore | SimCore | production | plugins/simcore/** | releaseBranch=release-simcore; manifest=product-manifest.json; artifact=plugins/simcore/latest.js | docs/SIMCORE_GUIDELINES.md |
| plugin:termux-large-doc-editor | Termux Large Doc Editor | prototype | plugins/termux/large-doc-editor/** | evidence=plugins/termux/large-doc-editor/README.md | docs/TERMUX_DEVELOPMENT_GUIDELINES.md |
| plugin:usage-dashboard | Local Usage Dashboard | production | plugins/usage-dashboard/** | releaseBranch=release-usage-dashboard; manifest=plugins/usage-dashboard/runtime/product-manifest.json; artifact=plugins/usage-dashboard/latest.js; releaseSpecDir=.github/usage-dashboard/releases | docs/USAGE_DASHBOARD_GUIDELINES.md |
| plugin:voyage-token-check | Voyage Token Check | design-evidence-validation | voyage-token-check/** | evidence=voyage-token-check/DESIGN_STATUS.md | docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md |
| product:pocketrisu-helper-mod | PocketRisu Helper Mod | operations-product-root | products/pocketrisu-helper-mod/** | manifest=products/pocketrisu-helper-mod/product.json; currentState=products/pocketrisu-helper-mod/CURRENT.md | docs/POCKETRISU_HELPER_MOD_GUIDELINES.md |
