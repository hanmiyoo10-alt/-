# Repository Project Catalog

> Generated from `.github/plugin-control-plane/registry.json` and canonical-main descriptors. Operational freshness remains on status issues/#305 rather than this durable catalog.

| Scope | Name | Lifecycle | Primary path | Authority | Guidelines |
| --- | --- | --- | --- | --- | --- |
| plugin:devpass | DevPass | declared-update-channel | plugins/risu/local/devpass/** | declaredBy=plugins/risu/local/devpass/README.md; artifact=plugins/devpass/latest.js; ref=main | docs/DEVPASS_GUIDELINES.md |
| plugin:local | Local | compatibility-family | plugins/risu/local | evidence=plugins/risu/local/README.md | docs/LOCAL_PLUGIN_GUIDELINES.md |
| plugin:simcore | SimCore | production | plugins/simcore/** | releaseBranch=release-simcore; manifest=product-manifest.json; artifact=plugins/simcore/latest.js | docs/SIMCORE_GUIDELINES.md |
| plugin:termux-large-doc-editor | Termux Large Doc Editor | prototype | plugins/termux/large-doc-editor/** | evidence=plugins/termux/large-doc-editor/README.md | docs/TERMUX_DEVELOPMENT_GUIDELINES.md |
| plugin:usage-dashboard | Local Usage Dashboard | production | plugins/usage-dashboard/** | releaseBranch=release-usage-dashboard; manifest=plugins/usage-dashboard/runtime/product-manifest.json; artifact=plugins/usage-dashboard/latest.js; releaseSpecDir=.github/usage-dashboard/releases | docs/USAGE_DASHBOARD_GUIDELINES.md |
| plugin:voyage-token-check | Voyage Token Check | design-evidence-validation | plugins/risu/local/voyage/** | evidence=plugins/risu/local/voyage/DESIGN_STATUS.md | docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md |
| product:app-api-mod-lab | App API Mod Lab | research-product-root | products/app-api-mod-lab/** | evidence=products/app-api-mod-lab/CURRENT.md; manifest=products/app-api-mod-lab/product.json | docs/APP_API_MOD_LAB_GUIDELINES.md |
| product:pocketrisu-helper-mod | PocketRisu Helper Mod | operations-product-root | products/pocketrisu-helper-mod/** | manifest=products/pocketrisu-helper-mod/product.json; currentState=products/pocketrisu-helper-mod/CURRENT.md | docs/POCKETRISU_HELPER_MOD_GUIDELINES.md |

## Family Navigation Projection

> Navigation-only projection from `.github/plugin-control-plane/taxonomy.json`. It does not create or replace plugin/product release, runtime, deployment, or production authority.

- Taxonomy authority posture: `navigation-only`
- Path moves authorized: `false`
- Identity collapse authorized: `false`
- Release mutation authorized: `false`
- `sourceRefs` and `sourceRoots` describe current classification/location evidence; omission from the authority table above does not manufacture a new owner.
- `targetRoot` describes intended future organization only.

| Family | Risu | Member | Current refs | Current roots | Target root | Migration |
| --- | --- | --- | --- | --- | --- | --- |
| PRODUCT | X | App API Mod Lab | product:app-api-mod-lab | products/app-api-mod-lab/** | products/standalone/app-api-mod-lab | regroup |
| PRODUCT | X | Mobile Coder Lab | scope:research-product | products/chatgpt-mobile-coder-lab/** | products/standalone/mobile-coder-lab | reclassify |
| PRODUCT | O | PocketRisu | product:pocketrisu-helper-mod | products/pocketrisu-helper-mod/** | products/risu/pocketrisu | regroup |
| PRODUCT | X | Termux | plugin:termux-large-doc-editor | plugins/termux/** | products/standalone/termux | reclassify |
| PLUGIN | O | Local | plugin:usage-dashboard<br>plugin:devpass<br>plugin:voyage-token-check | plugins/usage-dashboard/**<br>products/usage-dashboard/**<br>plugins/risu/local/devpass/**<br>plugins/devpass/**<br>plugins/risu/local/voyage/**<br>voyage-token-check/**<br>tools/usage-dashboard-mcp/** | plugins/risu/local | consolidate |
| PLUGIN | O | SimCore | plugin:simcore | plugins/simcore/**<br>products/simcore/**<br>tools/simcore-mcp/** | plugins/risu/simcore | regroup |
| PLATFORM | X | Agent Platform | scope:repo | .agents/skills/**<br>tools/agent-skill-orchestrator/**<br>tools/agent-skill-eval/**<br>tools/agent-skill-security/** | platform/agents | regroup |
| PLATFORM | X | Canonical Main | scope:repo | .github/plugin-control-plane/canonical-main/** | platform/canonical-main | regroup |
| PLATFORM | X | Control Plane | scope:repo | .github/plugin-control-plane/** | platform/control-plane | regroup |
| PLATFORM | BRIDGE | Local Runtime Plane | scope:local-runtime | local/** | local | preserve |
| PLATFORM | X | Repository Operations | — | tools/repo-ci-mcp/**<br>tools/repo-write/**<br>tools/repo-env/** | platform/repo-ops | regroup |
| PLATFORM | X | Sandbox and Host Tooling | — | tools/sandbox-health/**<br>tools/sandbox-ingress/**<br>tools/sandbox-toolchain/** | platform/sandbox | regroup |
| PLATFORM | X | Web Acquisition | — | tools/web-acquisition/** | platform/web-acquisition | regroup |
| STUDY | X | Study | scope:study | study/** | study | preserve |
