# 할로윈 특급 퐁이

사용자 선택의 사탕 배달부·유령 이불 콘셉트를 기본 `image_gen` 도구로 제작했다. 특급 참고는 `assets/references/collectible-style/epic-mythic-starlight.png`의 채색·재질만, `common-rare-pongi.png`는 퐁이의 얼굴·귀·털·불가사리 정체성만 사용했다. 최종 프롬프트와 원본 경로는 `manifest.json`, 선택한 원본 바이트는 `sources/*.source`에 보존한다.

## 형태와 동작

두 종 모두 오른쪽을 향한 썸네일과 2×2 네 프레임 시트다. 사탕 가방을 안은 팔과 이불 앞자락을 잡은 팔은 안정적으로 두고, 뒷발·꼬리·망토·이불 끝으로 유영한다. 넓은 광륜은 제거했으며 칸 경계에 닿는 초안은 재생성했다. 얼굴·뿔·수염·꼬리가 잘리지 않는 최종 원본을 선택했다. 실루엣 밖의 낮은 알파 RGB는 실제 밝고 어두운 합성 화면에서 검수하며, 알파를 일괄 깎거나 반투명 수염을 삭제하지 않았다.

`node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261028-220318`로 투명 픽셀·셀 여백·빈 프레임을 검사했다. 최종 시트는 긴 꼬리와 천 끝에 여백을 확보해 원본 점유율이 약 66~73%인 예외다. 프레임마다 따로 자르거나 확대하지 않고 공통 런타임 배율 1.12를 사용했다. `anchor-config.json`의 눈·얼굴 패치를 실제 원본에서 확인한 뒤 `scripts/register-sprite-anchors.ps1`로 측정한 평행 이동만 적용했다. 결과는 `registration.json`과 `src/features/aquarium/reviewed-frame-layouts.json`에 연결했다.

`review.html`은 실제 어항·도감 컴포넌트를 사용한다. `verify-preview.mjs`로 두 종의 서로 다른 네 자세, 데스크톱·모바일, 모션 감소를 검사했다. 실행 파일 경로는 현재 환경 기준이다. 밝고 어두운 검수 화면 및 스크린샷은 `artifacts/previews/halloween-pongi/`, 실제 PNG 검사 도구는 `inspect-alpha.mjs`에 있다.

## 등록과 검증

카탈로그 원본을 수정하고 CLI로 생성한 `supabase/migrations/20261028131811_halloween_pongi_devil_and_ghost.sql`에 두 ID만 범위를 지정해 SQL을 생성했다. `npm.cmd run db:context`, `npm.cmd run db:verify`, 할로윈 기간·이동·프레임 회귀 테스트 35개와 TypeScript 검사를 통과했다.

프로젝트 `ewafafphiovbpjwogwzn`의 기존 이벤트 기간과 신규 ID 부재를 조회한 뒤 이미지 4장을 업로드하고 해당 migration만 원격 적용했다. 기존 migration 이력 차이는 repair하지 않았으며 다른 카탈로그·이벤트 일정·플레이어 데이터는 변경하지 않았다. 업로드는 `npm.cmd run storage:upload -- assets/storage-upload/new/20261028-220318`을 사용했다. 도구가 보존한 무손실 DEFLATE 재압축 바이트와 공개 다운로드의 SHA-256 일치는 `storage-verification.json`에 기록한다. 검사기가 만든 `review/*.png`는 위 검수 폴더로 옮겨야 업로드 경로 검사에 통과한다.

`halloween-` 접두사로 기존 서버의 시작 포함·종료 제외 규칙과 한정 필터를 사용한다. 원격 재조회에서 두 정의 전체·가격·각 15개 해역 연결·현재 획득 가능·종료 시각 획득 불가를 확인했다. 부분 근거는 `supabase/inspection/remote/halloween-pongi/verification.json`에 보존한다. 전체 원격 구조 비교나 실제 플레이어의 낚시 결과를 검증한 것은 아니다. 이미지·DB 적용은 완료했으며 프레임 보정과 신규 출시 표시의 프론트엔드 소스는 별도 앱 배포가 필요하다.
