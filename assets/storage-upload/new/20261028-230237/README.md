# 할로윈 마법사·호박 마차 퐁이

기본 `image_gen` 도구로 제작했다. 특급 참고 `assets/references/collectible-style/epic-mythic-starlight.png`는 채색·재질만, `common-rare-pongi.png`는 퐁이의 얼굴·귀·털·불가사리 정체성만 사용했다. 최종 프롬프트·생성 원본 경로는 `manifest.json`, 선택한 원본 바이트는 `sources/*.source`에 보존한다.

두 종 모두 오른쪽을 향한 썸네일과 2×2 네 프레임 시트다. 마법사는 얼굴·빗자루 축을 안정적으로 유지하고 모자 끝·망토·빗자루 솔이 흐른다. 호박 마차는 운전석·창문·얼굴을 유지하고 잎사귀 추진기·바퀴·목도리가 움직인다. `anchor-config.json`의 눈·얼굴 패치를 실제 PNG에서 확인하고 등록 도구의 불투명 표본 검사와 낮은 오차를 확인했다. 마차의 0 이동은 실제 고정된 얼굴을 측정한 결과이며 기본값으로 대신하지 않았다.

`node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261028-230237`로 원본 4장의 투명 픽셀·셀 여백·빈 프레임을 검사했다. 마법사 썸네일은 긴 빗자루를 포함한 폭이 약 94%인 형태상 예외이며 끝부분이 모두 완결되고 실제 투명 여백이 있다. 시트는 빗자루·모자·추진기 잘림을 피하도록 생성했고, 마차의 작은 점유율은 모든 프레임에 공통 런타임 배율 1.12를 적용했다. 각 프레임을 따로 확대하거나 알파를 깎지 않았다. `inspect-alpha.mjs`와 밝고 어두운 합성 화면, 실제 어항·도감 미리보기로 가장자리를 확인했다.

위치 보정은 `registration.json`에서 `src/features/aquarium/reviewed-frame-layouts.json`으로 연결했다. 실제 컴포넌트의 `review.html`, 환경별 브라우저 경로를 사용하는 `verify-preview.mjs`로 두 종 각각 네 자세·데스크톱·모바일·모션 감소를 확인했다. 검수 이미지는 `artifacts/previews/halloween-pongi-extra/`에 있다.

카탈로그 원본을 수정하고 CLI로 생성한 `supabase/migrations/20261028141353_halloween_pongi_wizard_and_coach.sql`에 두 ID만 범위를 지정해 SQL을 생성했다. `db:context`, `db:verify`, 할로윈 기간·이동·프레임 회귀 테스트 35개와 TypeScript 검사를 통과했다.

프로젝트 `ewafafphiovbpjwogwzn`의 신규 ID 부재·기존 할로윈 기간을 조회한 뒤 이미지 4장을 업로드하고 해당 migration만 적용했다. 업로드는 `npm.cmd run storage:upload -- assets/storage-upload/new/20261028-230237`을 사용하며 무손실 DEFLATE 재압축 바이트와 공개 이미지의 SHA-256 일치는 `storage-verification.json`에 있다. 검사기가 만든 `review/*.png`는 검수 폴더로 옮겨야 업로드 경로 검사에 통과한다.

`halloween-` 접두사로 기존 이벤트의 시작 포함·종료 제외 규칙과 한정 필터를 사용한다. 원격 재조회에서 두 종의 카탈로그 정의 전체·판매가·각 15개 해역·현재 획득 가능·종료 시각 획득 불가를 확인했다. 근거는 `supabase/inspection/remote/halloween-pongi-extra/verification.json`이며 전체 원격 구조·이력 동등성이나 실제 플레이어 낚시를 확인한 것은 아니다. 기존 이력 차이는 repair하지 않았다.

사용자 지정에 따라 이번 커밋·푸시는 프레임 보정 파일 하나만 대상으로 한다. 신규 출시 표시는 로컬 메타데이터로 기록하되 커밋 대상에 넣지 않는다. 이미지·카탈로그·migration·파생 문서는 로컬에 보존한다.
