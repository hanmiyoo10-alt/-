#!/usr/bin/env python3
import importlib.util
from pathlib import Path

BASE = Path(__file__).with_name('build-06411-bounded-telemetry-capsule-compaction.py')
spec = importlib.util.spec_from_file_location('simcore_06411_builder_base', BASE)
if spec is None or spec.loader is None:
    raise SystemExit('06411_V2_BUILDER_IMPORT_FAILED')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fixed_wrap_last_function_before_exports(text, name, rich_name, wrapper, label):
    marker = f'function {name}('
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f'06411_PATCH_ANCHOR_INVALID {label}-fn count={count}')
    start = text.index(marker)
    # v0.64.10 modules place module.exports immediately after the closing function
    # with a single newline. The first builder searched for two newlines and could
    # cross into the following SimCore module, moving the wrapper outside its owner.
    end = text.index('\nmodule.exports =', start)
    module_close = text.find('\n});\n\nSimCore.define(', start)
    if module_close >= 0 and end > module_close:
        raise SystemExit(f'06411_PATCH_ANCHOR_ESCAPED_MODULE {label}')
    original = text[start:end]
    renamed = original.replace(f'function {name}(', f'function {rich_name}(', 1)
    return text[:start] + renamed + '\n\n' + wrapper.strip() + '\n' + text[end:]


mod.wrap_last_function_before_exports = fixed_wrap_last_function_before_exports

if __name__ == '__main__':
    mod.main()
