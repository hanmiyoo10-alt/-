# Upstream PR dossier — firefox-lmkd-memory-footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `DESIGNING_MITIGATION`

## Problem / motivation
On Android memory pressure, LMKD can reclaim PocketRisu's large Firefox Gecko content process while the Firefox main process survives. Firefox later restores the tab as a new `back_forward` document, producing visible reconstruction.

## Minimal upstream scope
First candidate: release the hydrated active chat body while the document is safely backgrounded, then hydrate it again on return using the existing server-backed chat lazy-load path.

No preset lazy-loading in this first scope.

## Dependencies
- existing chat stubs/placeholders
- existing `/api/chat-content` storage
- existing hydration dirty-tracking suppression
- current chat save path

## Explicitly out of scope
- Android sound keep-alive
- same-process navigation investigation
- inactive bot-preset lazy loading
- server DB format cutover
- forced page reload
- server Android notifications

## Verification evidence
- LMKD explicitly reclaimed the Firefox PocketRisu-correlated content process for low watermark/filecache pressure.
- replacement PocketRisu content process reaches roughly 600–700 MB RSS.
- long hydrated chats are multi-megabyte JSON objects.
- chat server storage already supports stub → placeholder → hydration.

## Upstream pitch
Not prepared until a safe dehydrate round trip is proven without destructive dirty tracking or data loss.

## Review / PR state
- next action: implement/test chat lifecycle suppression + background dehydrate on an isolated source branch.
