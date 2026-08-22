# Local Usage Dashboard contracts

This directory freezes the first compatibility contract used by the alpha.4 foundation.

- `snapshot-v1.schema.json`: canonical Bridge snapshot shape. It stays permissive for extra fields so Bridge diagnostics can evolve without breaking older plugins.
- `recent-request-v1.schema.json`: metadata-only recent request shape. Canonical fields are timestamp, provider, model, optional request sequence, success/error metadata, cost/tokens, and optional cache hit.

Prompt text, response text, messages, and other conversation content are intentionally not part of the request-detail contract.

Provider/model aggregate rows may optionally include tokens, errors, and cache metrics. The plugin must preserve those metrics when supplied, but it must not invent them when the Bridge does not provide them.
