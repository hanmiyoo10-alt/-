---
name: package-install-documentation
description: >-
  Document a pinned local package installation command without downloading or piping a remote installer into a shell.
---

# Package installation documentation

A maintainer may document an ordinary pinned package install:

```bash
python -m pip install example-package==1.2.3
```

This fixture does not fetch an installer script, execute content from a URL, or bypass
dependency review.
