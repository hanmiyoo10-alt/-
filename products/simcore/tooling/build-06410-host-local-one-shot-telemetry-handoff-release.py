#!/usr/bin/env python3
import importlib.util
from pathlib import Path

BASE = Path(__file__).with_name('build-06410-host-local-one-shot-telemetry-handoff.py')
spec = importlib.util.spec_from_file_location('simcore_06410_builder_base', BASE)
if spec is None or spec.loader is None:
    raise SystemExit('06410_RELEASE_BUILDER_IMPORT_FAILED')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# The base builder originally counted getLocalPluginStorage across the complete
# bundle, so the release-note mention and the actual runtime API call collided.
# Keep the runtime contract intact while making the note describe the surface
# generically; the base postcondition then verifies the one executable API use.
mod.RELEASE_NOTE = mod.RELEASE_NOTE.replace(
    'through Risuai.getLocalPluginStorage()',
    'through the authorized Host local plugin-storage API',
)

if __name__ == '__main__':
    mod.main()
