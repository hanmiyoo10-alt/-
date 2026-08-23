# V3 plugin targeted reload

상태: **DONE 계열**

## 목적
V3 plugin 변경 시 전체를 무겁게 reload하지 않고 필요한 plugin 경로를 targeted reload.

확인된 관련 파일:
- `src/ts/plugins/apiV3/v3.svelte.ts`
- `src/ts/plugins/plugins.svelte.ts`

이 기능은 DB/save 성능 최적화와 별도 축이다.
