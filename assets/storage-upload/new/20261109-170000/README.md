# 날씨 요정 제작 배치

사용자 요청에 따라 인간형 정령 5종을 앳된 동화풍 요정으로 제작했다. 초기 성인 여신 시안은 채택하지 않았다. 이름·외형·동작·최종 프롬프트·참고 역할은 `manifest.json`에 보존한다. `image_gen.imagegen` 기본 도구를 사용했다.

8프레임은 4열×2행이며 기존 신화 렌더러의 6초 반복을 사용한다. 날개·머리카락·옷자락과 각자의 마법 소품이 움직인다. 얼굴 패치를 실제 이미지에서 확인해 정수 평행 이동을 최종 PNG에 반영했으며, 프레임마다 배율을 바꾸지 않는다. 작은 마법 동작의 여백을 확보한 원본을 사용하고 공통 표시 배율로 게임 내 크기를 맞춘다.

`audit.json`은 생성 원본, `final-audit.json`은 정렬한 최종 시트 검사다. `registration.json`과 `registered-final-8.json`은 원본 위치·최종 잔차를 구분한다. `review/preview-desktop.png`, `review/preview-mobile.png`는 실제 도감 컴포넌트의 로컬 브라우저 캡처다. 운영 접속이나 플레이어의 어항 검증을 뜻하지 않는다.

판매가는 사용자 지정값을 따른다. 날씨 전체 추첨 확률은 유지하며 `weather_weight`가 같은 날씨 후보 사이의 상대 비중만 조절한다. 기본값을 변경하면 기존 개체 간 확률도 달라지므로 정령 추가를 이유로 전체 날씨 확률이나 일반 낚시 후보를 바꾸지 않는다.

현재 로컬 제작·등록·검증 상태이며 Storage 업로드·원격 migration·운영 앱 배포는 하지 않았다. 출시 시에는 먼저 새 버전 이미지 10개의 공개 다운로드 해시를 로컬 최종본과 비교하고, 가중치 migration 다음에 카탈로그 migration을 적용한다. 기존 baseline이나 과거 이력을 재실행하지 않는다. 운영 적용 직전에 실제 출시 시각으로 `species-releases.json`에 5종을 등록하고 앱의 새 8프레임 연결도 함께 배포한다.

업로드는 PNG 원본·가이드·검토 이미지를 제외한 `fish/mythic/` 최종 파일만 임시 배치 폴더에 복사해 `npm run storage:upload -- <임시 배치>`로 수행한다. 업로드 도구는 가이드 PNG가 들어 있는 `sources/`를 업로드 대상으로 허용하지 않는다.

재검증: `node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261109-170000`와 `--final`, 날씨 SQL·에셋·선택 UI·신화 애니메이션 테스트, `npm run db:verify`, `npm run client-data:check`, 앱 빌드를 실행한다. 카탈로그의 원본은 `supabase/catalog/catalog.json`이다.
