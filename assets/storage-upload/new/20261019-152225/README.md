# 별무늬 만타 교체 및 유영 기준점 검수

만타는 금장 정면 원본을 부드러운 보랏빛 별무늬의 오른쪽 원본으로 교체한다. 특급 스타일 참고는 `assets/references/collectible-style/epic-mythic-starlight.png`이며 최종 프롬프트는 manifest에 기록한다. 썸네일과 네 프레임이 같은 개체·방향을 유지한다. 시트는 2×2이며 날개와 꼬리의 유영 동작을 유지하고 머리 위치만 등록값으로 고정한다. 모션 감소에서는 기존 0프레임 처리를 유지한다.

은안개 망둑과 산수등 잉어는 원본 PNG를 수정하지 않는다. rigid head RGB patch 측정값을 `frame-registration.json`에 보존하며 앱의 `reviewed-frame-layouts.json`에서 적용한다. 프레임별 크기를 바꾸거나 꼬리 외곽을 기준으로 재중앙 정렬하지 않는다. 어항과 도감 미리보기는 같은 보정 함수를 사용한다.

재검수: `frame-registration-config.json`을 `scripts/register-sprite-anchors.ps1`에 입력한다. 만타 patch는 `manta-registration.json`에 기록돼 있다. `npx.cmd vitest run tests/swim-frame-layout.test.ts tests/mythic-swim.test.ts`로 위치 보정과 기존 시트 연결을 검사한다.

업로드는 이 폴더를 대상으로 `npm.cmd run storage:upload -- assets/storage-upload/new/20261019-152225 --overwrite`를 사용한다. 교체 대상은 manifest의 만타 PNG 2개뿐이다. 기존 버킷 경로를 유지하며 앱 URL revision을 함께 변경한다. 재업로드 후 공개 다운로드 해시를 로컬과 비교한다. 이 작업은 DB 카탈로그·migration·권한을 변경하지 않는다.
