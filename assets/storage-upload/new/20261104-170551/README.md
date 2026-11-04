# 날씨 퐁이

날씨별 두 종을 카탈로그 원본과 별도 CLI migration으로 관리한다. 실제 출시 시각은 `manifest.json`과 개체 출시 목록에 기록한다.

공통 그림체는 `assets/references/collectible-style/common-rare-pongi.png`이며, 썸네일과 2×2 네 프레임 유영 시트는 image_gen으로 생성했다. 모든 원본은 오른쪽을 향한다. 기존 스키마의 `common` 값은 내부 호환용이고, 날씨 풀 추첨과 표시에는 일반·희귀 등의 등급 가중치를 사용하지 않는다. 판매가는 사용자가 지정한 2,000~2,500골드 범위다.

`manifest.json`은 프롬프트·원본 경로·가격·이동 설정·최종 경로를 기록한다. `sources/*.source`는 생성 PNG 원본 바이트로, 업로드 대상이 아니다. `guides/`는 프레임 위치 참고용이며 최종 애니메이션으로 사용하지 않는다. `fish/normal/` 아래 PNG만 collectibles 버킷의 같은 상대 경로로 올린다. 배치 폴더 전체를 업로드하면 가이드 PNG도 섞이므로 올리지 않는다.

검수 및 재현 순서:

1. `node scripts/prepare-weather-pongi-assets.mjs`로 썸네일 정규화·가이드·원본 보존을 준비한다.
2. `scripts/register-sprite-anchors.ps1`에 `anchors-config.json`을 넘겨 원본 머리 패치를 측정한다.
3. `node scripts/align-weather-pongi-assets.mjs`로 전체 프레임을 정수 픽셀 평행 이동하고 동일한 투명 패딩을 더한다. 개별 확대나 형태·색·알파 편집은 하지 않는다.
4. `anchors-final-config.json`으로 다시 측정해 이동 잔차를 확인한다. `node scripts/audit-collectible-images.mjs assets/storage-upload/new/20261104-170551 --final`로 셀·투명도·여백을 검사하고 밝고 어두운 접촉 시트를 확인한다.
5. `node scripts/sync-weather-pongi-catalog.mjs`는 원본 카탈로그와 테스트용 파생 목록을 맞춘다. 카탈로그 변경 후에는 빈 CLI migration에 `db:catalog`를 실행하고 DB 검증을 진행한다.

개체별 머리 패치는 `anchors-config.json`, 측정 결과는 `anchors-original.json`·`anchors-final.json`에 있다. 운영자 날씨 테스트의 ‘퐁이 선택’에서 실제 게임과 같은 미리보기 렌더러로 시트를 확인한다. 개발 서버는 이 배치의 로컬 파일을 사용하고, 운영 번들은 Storage 경로를 사용한다. 테스트 결과는 보상 RPC에 전달하지 않는다.

`node scripts/create-weather-pongi-review.mjs`는 계정 없이 볼 수 있는 `review/swimming.html`을 만든다. 밝은색·어두운색·바다 배경으로 바꾸고 네 프레임을 최소 세 주기 확인할 수 있다. 이 정적 검수 화면과 자동 검사 성공은 실제 모바일 기기의 운영 렌더링을 확인했다는 뜻이 아니다.
