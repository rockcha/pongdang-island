# 냠냠바다 특급 퐁이

도넛 튜브·꼬마 제빵사·팝콘 배달부 콘셉트를 기본 `image_gen` 도구로 제작했다. `assets/references/collectible-style/epic-mythic-starlight.png`는 특급 채색·재질만, `common-rare-pongi.png`는 퐁이 정체성만 참고했다. 최종 프롬프트·생성 원본 경로는 `manifest.json`, 선택한 원본 바이트는 `sources/*.source`에 보존한다.

## 형태·검수

모두 오른쪽을 향한 썸네일과 2×2 네 프레임 시트다. 도넛·팝콘 퐁이는 소품을 안정적으로 안고 발·꼬리·리본으로 유영하며, 제빵사는 바구니를 유지하고 짧은 다리로 바닥을 걷는다. 프레임을 눈 상태만으로 구성하지 않았다.

`node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261028-232704`로 원본 6장의 투명 픽셀·셀 여백·빈 프레임을 검사했다. 팝콘 퐁이는 긴 꼬리와 수염을 포함한 폭이 일부 프레임에서 약 91%인 예외이며 끝부분이 완결되고 셀을 침범하지 않는다. `inspect-alpha.mjs`의 실제 밝고 어두운 합성과 게임 표시 크기에서 가장자리를 확인했다. 이미지의 알파를 일괄 깎거나 프레임별로 자르기·확대하지 않았다.

`anchor-config.json`의 눈·얼굴 패치를 실제 시트에서 확인한 뒤 등록 도구로 불투명 표본·매칭 오차를 검사했다. 측정값은 `registration.json`, 앱 연결은 `src/features/aquarium/reviewed-frame-layouts.json`이다. 실제 컴포넌트의 `review.html`, 환경별 브라우저 경로를 쓰는 `verify-preview.mjs`로 각 네 자세·데스크톱·모바일·모션 감소와 제빵사 바닥 위치를 확인했다. 검수 이미지는 `artifacts/previews/nyamnyam-pongi/`에 있다.

## 등록·적용

가격은 냠냠바다의 실제 특급 어종 범위를 확인해 정했다. 카탈로그 원본의 신규 세 종과 냠냠바다 서식지만 범위를 지정해 `supabase/migrations/20261028144007_nyamnyam_three_pongi_collectibles.sql`을 생성했다. 원격의 기존 `facing_direction` 컬럼은 로컬 기대 스키마에 없으므로 `20261028144617_nyamnyam_pongi_remote_facing_metadata.sql`에서 컬럼이 존재할 때 검수한 세 종의 오른쪽 값만 갱신한다. 로컬 스키마에 해당 컬럼을 추가하거나 원격 구조로 덮어쓰지 않는다.

원격 프로젝트 `ewafafphiovbpjwogwzn`의 신규 ID 부재·지역·특급 가격대를 조회한 뒤 이미지와 두 migration만 적용했다. `npm.cmd run storage:upload -- assets/storage-upload/new/20261028-232704`는 무손실 DEFLATE 재압축한 바이트를 로컬에도 저장한다. 공개 이미지 6장의 SHA-256 일치는 `storage-verification.json`에 있다. 업로드 전 검사기가 만든 `review/*.png`는 위 검수 폴더로 옮긴다.

원격 재조회에서 카탈로그 정의 전체·가격·토착 지역·서식지·이동·오른쪽 메타데이터와 할로윈 종료 후에도 획득 가능함을 확인했다. 부분 근거는 `supabase/inspection/remote/nyamnyam-pongi/verification.json`에 보존한다. 다른 개체 변경과 기존 원격/로컬 이력 차이를 유지했으며 전체 구조 비교·실제 플레이어 낚시 검증은 아니다.

`db:context`, `db:verify`, 토착·지역 추첨·이동·프레임 회귀 테스트 46개와 TypeScript 검사를 통과했다. 프레임 보정과 신규 출시 표시는 로컬 앱 소스에 연결했으며 운영 앱 배포는 별도다.
