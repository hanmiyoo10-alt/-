# SimCore Risu Donor Source & MYANG Update Hub Policy v1 - 2026-10-13

Status: **FINAL TARGET POLICY / PRE-IMPLEMENTATION / BLOCKED BY MYANG EXISTING-CONTENT RELOCATION**

## 1. Purpose

Centralize the selected plugin/donor source workflow for the owner's private SimCore Risu build without losing upstream identity.

Target principle:

```text
original upstream
    |
    | observe / compare / provenance
    v
MYANG donor intake
    |
    | private adaptation / integration
    v
SimCore Risu private build
    |
    | owner-controlled update channel
    v
MYANG update/distribution endpoint
```

MYANG is the target private intake/update/distribution hub.

MYANG does not erase or replace original upstream identity.

## 2. Owner private-source-use instruction

The owner has explicitly stated that the plugins they supply to this project are for personal/private use and may be used at source level for their private SimCore Risu build.

Project policy for those owner-supplied donor artifacts:

- source-level inspection is allowed;
- source-level adaptation is allowed;
- selective code transplant is allowed;
- modification and refactoring into the proper Fusion/SimCore Risu owner is allowed;
- private source snapshots may be retained for integration work;
- donor code does not keep canonical ownership merely because code is reused.

This is an owner workflow authorization for the private build.

It does not assert that the owner owns third-party copyright, and it does not manufacture public redistribution rights.

Any future public/shared distribution remains separately subject to the applicable license, provenance, attribution and redistribution requirements.

## 3. Provenance must remain explicit

Even when source-level private adaptation is allowed, every donor retains provenance.

At minimum keep:

- donor/project name;
- original author/project identity when known;
- original repository or upstream URL when known;
- original release/update URL when known;
- observed upstream version/tag/SHA when known;
- imported/local artifact hash;
- local patch or adaptation identity;
- donor role in SimCore Risu;
- last upstream review time;
- license/copyright notice when present;
- public-redistribution status if ever relevant.

Do not relabel copied/adapted source as original SimCore authorship.

## 4. MYANG becomes the private donor/update hub

After the MYANG relocation prerequisite and MYANG product-authority bootstrap, MYANG should own the private SimCore Risu donor/update routing layer.

This includes:

- donor registry;
- upstream URL registry;
- observed-version/SHA registry;
- private source snapshots or adaptation branches where useful;
- local patch/adaptation records;
- compatibility status;
- integration status;
- owner-controlled update manifests/endpoints;
- update receipts/history.

The exact MYANG directory layout is intentionally deferred until MYANG bootstrap. Do not invent a permanent path before reading the then-current repository.

## 5. Original upstream links remain

For every donor with a known upstream:

```text
upstream_url
!=
myang_update_url
```

Meaning:

- `upstream_url` identifies where the original project comes from;
- `myang_update_url` identifies where the owner's adapted/private build receives updates.

The original URL must remain stored even if the runtime update link points to MYANG.

This lets SimCore Risu continue to detect upstream releases without losing provenance.

## 6. Update-link routing

For private adapted plugins that continue to exist as plugin artifacts:

- their owner-facing install/update URL should eventually point to an owner-controlled MYANG endpoint or manifest;
- their original upstream/update URL remains metadata in the MYANG donor registry;
- an upstream release does not automatically replace the MYANG build;
- upstream changes are compared, reviewed and integrated into the MYANG adaptation first.

Conceptual flow:

```text
upstream release/update
        |
        v
donor watch
        |
        v
compare against MYANG adaptation
        |
        +--> irrelevant -> record/ignore
        |
        +--> useful -> integrate + validate
                          |
                          v
                    MYANG private build
                          |
                          v
                    MYANG update channel
```

No user-facing private build should need to update directly from several unrelated third-party endpoints once the MYANG hub is qualified.

## 7. Native SimCore Risu modules

Long term, capabilities transplanted natively into SimCore Risu should stop behaving as independent self-updating donor plugins.

Instead:

```text
donor upstreams
-> MYANG donor intake
-> SimCore Risu source/modules
-> one SimCore Risu updater/release system
```

A native module should not retain a hidden third-party updater that can independently mutate the application.

## 8. Donor-watch ownership

Current interim coordination remains:

- #3131 donor watch in `hanmiyoo10-alt/-`;
- individual donor review issues;
- Fusion/SimCore Risu architecture issues.

After MYANG is bootstrapped as the SimCore Risu repository:

- operational donor/update intake should move to MYANG;
- `hanmiyoo10-alt/-` should retain only the cross-project locator/architecture references needed by current SimCore/Fusion;
- avoid two mutable donor-version registries.

## 9. Selected donor guarantee

Every owner-selected donor remains traceable.

A donor may be superseded only when:
- the intended capability has an explicit destination;
- equal-or-better behavior is proven;
- relevant data/migration/provenance is preserved;
- the old updater/hook/store/model owner is safely retired.

No donor disappears silently.

## 10. Host / Risu-Lineage Donor Lane

SimCore Risu tracks a dedicated host-level donor lane alongside plugin/feature donors.

Direct lineage:

```text
kwaroran/RisuAI
      |
      | parent lineage
      v
PocketRisu/PocketRisu
      |
      | primary upstream
      v
hanmiyoo10-alt/PocketRisu
      |
      | owner integration / staging
      v
hanmiyoo10-alt/myang
      |
      v
SimCore Risu
```

Selective sibling host donors:
- `nevaeh5379/HaejeokRisuai`
- `rpaddict/RisuBard`

Roles:

- **RisuAI**: parent Risu lineage, ecosystem/data/plugin compatibility reference.
- **PocketRisu official**: primary self-hosted upstream and official host update stream.
- **owner PocketRisu fork**: integration/staging fork and proven owner-specific host modifications.
- **HaejeokRisu**: performance, lazy loading, SQL/PostgreSQL, Termux/cross-platform, low-memory donor.
- **RisuBard**: bounded context/composer, Wiki/product UX, save/load, durability/migration donor.

Update classification for host donors should use:
- `UPSTREAM_REQUIRED`
- `DONOR_CAPABILITY_CANDIDATE`
- `ALREADY_SUPERSEDED`
- `IRRELEVANT`
- `CONFLICT_REVIEW`

No host-donor update auto-merges into MYANG.

After MYANG bootstrap, operational host-donor version/update tracking moves to MYANG with the rest of the donor hub. Until then, #3131 and #3642 remain coordination records.

## 11. SocialRisu

SocialRisu is included in this policy as an owner-supplied private-use donor.

Target roles recorded in #3636 include:
- Interactive Social Surface;
- Social Client UX;
- Surface-to-World promotion;
- world-native social network synthesis;
- Media & Asset Pipeline;
- social identity/privacy;
- storage/migration durability.

Its current embedded third-party update URL is provenance/upstream evidence only.

Any future owner-adapted SocialRisu-derived private plugin or native capability should update through MYANG after the update hub is qualified.

## 12. Safety / authority boundary

This policy does not authorize:

- current SimCore production mutation;
- `release-simcore` mutation;
- MYANG mutation before its existing-content relocation prerequisite;
- automatic donor code adoption without review;
- automatic release/deployment;
- a second canonical Runtime/Memory/Knowledge/Presentation owner.

## 13. Current gate

Current product priority remains:

`WAIT_MYANG_EXISTING_CONTENT_RELOCATION`

Therefore, before that gate completes:

- do not rewrite plugin update URLs to MYANG yet;
- do not create MYANG donor registry files yet;
- do not mirror source into MYANG yet;
- record donor/update routing decisions in the current SimCore Risu coordination root only.

After the gate, re-read MYANG and establish the concrete update-hub layout under MYANG authority.
