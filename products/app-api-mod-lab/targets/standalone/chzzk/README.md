# CHZZK Target

This is the concrete App API Mod Lab target root for NAVER CHZZK.

- ecosystem: Risu X / `standalone`
- kind: `api`
- provenance: issue #2020
- runtime liveness: `UNVERIFIED_RUNTIME`

## First bounded work unit

In scope:

- public, anonymous, read-only playback reconnaissance
- live detail
- live playback metadata
- VOD detail/playback metadata
- clip detail/playback metadata
- endpoint/version drift tracking

Out of scope:

- login/session cookie handling
- follow/subscription mutation
- chat write or WebSocket mutation
- donation/subscription mutation
- creator controls / stream key / live settings mutation
- payment/ad mutation or circumvention
- deployment/release behavior

## Authority boundary

This repository owns only target-local research, sanitized evidence, probes, clients, and adaptations created under the App API Mod Lab contract.

NAVER CHZZK owns the external service/runtime. Official Open API documentation is authoritative only for the supported Open API surface it documents. Internal web/app API observations remain unofficial and drift-prone.

Materialization of this directory does not prove endpoint liveness, runtime compatibility, release readiness, or production authority.

## Privacy boundary

Do not commit credentials, OAuth tokens, `NID_AUT`, `NID_SES`, chat access tokens, signed playback URLs, private headers, raw account payloads, or unsanitized traffic captures.

## Next validation

The strongest next evidence is a fresh sanitized anonymous CHZZK flow capture for the locked playback scope. Until that exists, current endpoint liveness remains `UNVERIFIED_RUNTIME`.
