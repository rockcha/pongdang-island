# 일반 공통 개체 이미지

기본 이미지 생성 도구 `image_gen`으로 제작했다. 스타일 참고는 `assets/references/collectible-style/common-rare-pongi.png`이며, 썸네일을 생물 시트의 동일 개체 참고로 사용했다. 최종 프롬프트·생성 원본 경로는 `manifest.json`, 원본 바이트는 `sources/*.source`에 보존한다.

## 제작·검수

얇은 갈색 윤곽과 따뜻한 채색, 작은 눈과 정돈된 실루엣을 사용했다. 머리빗의 떨어진 조각은 생성 도구로 제거했다. 생물은 오른쪽 원본의 2×2 걷기 시트이며 다리·발·촉수가 움직인다. 실커튼과 머리빗은 정적 개체다.

`node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261028-214526`로 원본 6장의 실제 투명 픽셀·셀 여백·빈 프레임을 검사한다. 밝고 어두운 접촉 시트와 실제 어항·도감 미리보기를 확인했다. 옆새우는 가는 촉수를 포함한 최대 폭이 셀의 약 91%인 형태상 예외이며 모든 촉수 끝이 셀 안에 있고 본체와 가장자리 잘림이 없다. PNG를 개별 확대·축소하거나 알파를 깎지 않았다.

`anchor-config.json`의 눈·등껍질 패치를 실제 원본에서 확인하고 `scripts/register-sprite-anchors.ps1`로 측정했다. `registration.json`의 보정은 `src/features/aquarium/reviewed-frame-layouts.json`에 연결했다. 실제 컴포넌트를 사용하는 `review.html`과 `verify-preview.mjs`로 데스크톱·모바일, 네 가지 자세, 모션 감소를 확인했다. 브라우저 스크립트의 실행 경로는 현재 환경 기준이다.

## 업로드·적용

업로드 전에 검사기가 만든 `review/*.png` 접촉 시트를 `artifacts/previews/common-cute/`로 옮긴다. 업로드 도구는 버킷 경로가 아닌 PNG를 거절한다.

`npm.cmd run storage:upload -- assets/storage-upload/new/20261028-214526 --dry-run`으로 대상 6장을 확인한 뒤 같은 명령에서 `--dry-run`을 빼고 업로드했다. 무손실 DEFLATE 재압축한 업로드 바이트는 로컬 PNG에도 저장되며, 공개 다운로드의 SHA-256 일치는 `storage-verification.json`에 기록했다. 버전 경로를 재사용해 덮어쓰지 않는다.

카탈로그 원본의 신규 4종만 `--table collectible_species`와 해당 `--id`로 생성한 `supabase/migrations/20261028125215_four_cute_common_collectibles.sql`을 프로젝트 `ewafafphiovbpjwogwzn`에 적용했다. 원격 기록 버전은 `20261028125600`이다. 기존 이력 차이를 repair하지 않았으며 전체 push나 baseline 실행을 하지 않았다. 원격 재조회에서 대상 정의·판매가·이동과 60개 서식지 연결을 확인했다. 전체 원격 구조나 실제 플레이어의 낚시 결과는 확인 범위가 아니다.

`npm.cmd run db:context`, `npm.cmd run db:verify`, 이동·프레임 관련 회귀 테스트 55개와 TypeScript 검사를 통과했다. 앱의 프레임 보정·신규 출시 표시 변경은 로컬 소스이며 별도 프론트엔드 배포가 필요하다.
