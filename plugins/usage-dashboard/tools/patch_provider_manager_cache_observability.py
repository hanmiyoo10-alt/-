from pathlib import Path
import argparse
import hashlib
import shutil

EXPECTED_VERSION = '1.13.0'
DASHBOARD_PLUGIN = 'local_usage_dashboard_modular'
ALLOWED_IPC = '//@allowed-ipc provider-manager yumi-jina-reader yumi-serper yumi-web-fetch yumi-translator'
SWITCH_ANCHOR = 'const n=!0===Do.ipcService?.enabled;if("status"===e.op||"cancel"===e.op||n)switch(e.op){case"status":this.Qe(e);break;case"listModels":'
METHOD_ANCHOR = '}tn(t){const e=Do.models.map'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


def cache_observability_method() -> str:
    # Read-only projection. Never expose request/response bodies, prompts, keys,
    # cookies, auth headers, or the raw Request Log object.
    return '''}async cacheObs(t){try{const e=t.payload&&"object"==typeof t.payload&&!Array.isArray(t.payload)?t.payload:{},n=Math.min(250,Math.max(1,Number.isFinite(Number(e.limit))?Math.trunc(Number(e.limit)):120)),o=Number.isFinite(Number(e.since))?Number(e.since):Date.now()-864e5,i=(await _m()).filter(t=>Number(t?.timestamp||0)>=o).slice(0,n).map(t=>{const e=t?.usage&&"object"==typeof t.usage&&!Array.isArray(t.usage)?t.usage:{},n=e=>Number.isFinite(Number(e))?Math.max(0,Number(e)):null,o=[];for(const e of[t?.requestHeaders,t?.responseHeaders])if(e&&"object"==typeof e&&!Array.isArray(e))for(const[t,n]of Object.entries(e))/(?:^|[-_])(request|correlation|interaction)[-_]?id$/i.test(t)&&"string"==typeof n&&n.length>0&&n.length<=200&&o.push(n);return{logId:String(t?.id||""),timestamp:Number(t?.timestamp||0),provider:String(t?.provider||""),model:String(t?.modelId||""),success:"boolean"==typeof t?.success?t.success:null,requestIdHints:[...new Set(o)].slice(0,8),usage:{inputTokens:n(e.inputTokens),outputTokens:n(e.outputTokens),cachedInputTokens:n(e.cachedInputTokens),cacheReadInputTokens:n(e.cacheReadInputTokens),cacheCreationInputTokens:n(e.cacheCreationInputTokens),cacheCreation5mTokens:n(e.cacheCreation5mTokens),cacheCreation1hTokens:n(e.cacheCreation1hTokens)}}});this.cn(t,"cacheObservability",{version:1,source:"provider-manager-request-log",rows:i})}catch(e){this.rn(t,"CACHE_OBSERVABILITY_FAILED",e instanceof Error?e.message:String(e))}}tn(t){const e=Do.models.map'''


def patch_text(text: str) -> str:
    if '//@name provider-manager\n' not in text:
        raise SystemExit('not a Provider Manager plugin file')
    if f'//@version {EXPECTED_VERSION}\n' not in text:
        raise SystemExit(f'unsupported Provider Manager version; expected {EXPECTED_VERSION}')
    if 'async cacheObs(t)' in text or f'{ALLOWED_IPC} {DASHBOARD_PLUGIN}' in text:
        raise SystemExit('cache observability patch already present')

    text = replace_once(
        text,
        ALLOWED_IPC,
        f'{ALLOWED_IPC} {DASHBOARD_PLUGIN}',
        'mutual IPC whitelist',
    )
    text = replace_once(
        text,
        SWITCH_ANCHOR,
        'const n=!0===Do.ipcService?.enabled;if("status"===e.op||"cancel"===e.op||"cacheObservability"===e.op||n)switch(e.op){case"status":this.Qe(e);break;case"cacheObservability":await this.cacheObs(e);break;case"listModels":',
        'Provider Manager IPC operation switch',
    )
    text = replace_once(
        text,
        METHOD_ANCHOR,
        cache_observability_method(),
        'Provider Manager IPC method insertion point',
    )
    return text


def self_test() -> None:
    fixture = '\n'.join([
        '//@name provider-manager',
        '//@display-name Yumi Provider Manager v1.13.0',
        '//@version 1.13.0',
        '//@api 3.0 2.1 2.0',
        '//@link https://example.invalid/provider-manager',
        '//@update-url https://example.invalid/provider-manager.js',
        ALLOWED_IPC,
        '!function(){async function _m(){return[]}var Do={ipcService:{enabled:false}},Wx=new class{async Xe(t){const e=t;',
        SWITCH_ANCHOR,
        'x}Qe(t){this.cn(t,"status",{})',
        METHOD_ANCHOR,
        '([])}cn(){}rn(){}}}();}();',
    ])
    patched = patch_text(fixture)
    required = [
        f'{ALLOWED_IPC} {DASHBOARD_PLUGIN}',
        '"cacheObservability"===e.op',
        'async cacheObs(t)',
        'cacheReadInputTokens',
        'cacheCreationInputTokens',
        'cacheCreation5mTokens',
        'cacheCreation1hTokens',
        'provider-manager-request-log',
    ]
    for marker in required:
        if marker not in patched:
            raise SystemExit(f'self-test missing marker: {marker}')
    forbidden_projection = ['requestBody:String', 'responseBody:String', 'apiKey:', 'authorization:']
    for marker in forbidden_projection:
        if marker in cache_observability_method():
            raise SystemExit(f'self-test unsafe projection marker: {marker}')
    print('Provider Manager cache observability patcher self-test: OK')


def main() -> None:
    parser = argparse.ArgumentParser(description='Patch a local Provider Manager 1.13.0 file with a read-only cache-observability IPC operation.')
    parser.add_argument('input', nargs='?')
    parser.add_argument('-o', '--output')
    parser.add_argument('--in-place', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return
    if not args.input:
        parser.error('input is required unless --self-test is used')

    source = Path(args.input)
    if not source.is_file():
        raise SystemExit(f'file not found: {source}')
    original = source.read_text()
    patched = patch_text(original)

    if args.in_place:
        backup = source.with_suffix(source.suffix + '.before-cache-observability')
        if backup.exists():
            raise SystemExit(f'backup already exists: {backup}')
        shutil.copy2(source, backup)
        destination = source
    else:
        destination = Path(args.output) if args.output else source.with_name(source.stem + '-cache-observability' + source.suffix)

    destination.write_text(patched)
    print(f'patched: {destination}')
    print(f'source sha256: {hashlib.sha256(original.encode()).hexdigest()}')
    print(f'patched sha256: {hashlib.sha256(patched.encode()).hexdigest()}')
    print('This keeps Provider Manager calls/cache control unchanged; only a read-only IPC projection is added.')


if __name__ == '__main__':
    main()
