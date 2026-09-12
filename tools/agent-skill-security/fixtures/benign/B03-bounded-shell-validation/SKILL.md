---
name: bounded-shell-validation
description: >-
  Run bounded local validation commands that inspect repository tests without reading secrets or using the network.
---

# Bounded local validation

When validation is requested, use repository-owned commands such as:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python -m py_compile src/example.py
```

Do not access credential stores or network endpoints. Report the actual exit status.
