#!/usr/bin/env python3
import subprocess

SOURCE_COMMIT = 'c8117b3ff8caaab218187bed28c0f52a02f99c3b'
SOURCE_PATH = 'products/simcore/tooling/build-06410-host-local-one-shot-telemetry-handoff.py'


def load_immutable_builder():
    result = subprocess.run(
        ['git', 'show', f'{SOURCE_COMMIT}:{SOURCE_PATH}'],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit('06410_RECOVERY_SOURCE_UNAVAILABLE')
    source = result.stdout
    if "VERSION_TO = '0.64.10'" not in source:
        raise SystemExit('06410_RECOVERY_SOURCE_VERSION_INVALID')
    if "HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__'" not in source:
        raise SystemExit('06410_RECOVERY_SOURCE_HOST_LOCAL_MISSING')
    if "if __name__ == '__main__':" not in source:
        raise SystemExit('06410_RECOVERY_SOURCE_ENTRYPOINT_MISSING')
    return source


def main():
    source = load_immutable_builder()
    scope = {
        '__name__': '__main__',
        '__file__': SOURCE_PATH,
        '__package__': None,
    }
    exec(compile(source, SOURCE_PATH, 'exec'), scope, scope)


if __name__ == '__main__':
    main()
