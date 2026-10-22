# 네메리온 고대 바다뱀 교체

사용자가 선택한 길고 거대한 고대 바다뱀으로 기존 실러캔스 시안을 교체한다. 동일 종 ID, 원시섬 주 서식지, 신화 등급, 가격과 이동 범위는 유지한다. 그림하울 표시 이름도 사용자가 확정한 기존 이름을 유지한다.

내장 `image_gen`으로 생성했다. 스타일 입력은 `assets/references/collectible-style/epic-mythic-starlight.png`의 채색·빛·재질에 한정하며 가오리 구조를 복제하지 않는다. 썸네일은 동일성, 배치 가이드는 위치·크기 참고다. 정확한 단계별 프롬프트와 생성 경로는 [generation-log.json](generation-log.json), 최종 입력은 [manifest.json](manifest.json)에 기록한다. 원본 바이트는 `sources/*.source`에 보존한다.

긴 몸을 따라 전달되는 파동이 기본 유영이며, 뒤 네 자세는 몸 굽히기 준비 → 큰 S 굽힘과 입 벌림 → 펴기 → 안정이다. 머리를 기준으로 위치만 보정하고 각 프레임의 크기는 바꾸지 않는다. 안전한 큰 동작 여백 때문에 원본의 가장 넓은 자세는 셀 폭 약 66%이며 전체 표시 배율로 보완한다. 첫 시트는 원본 여백이 8% 미만이라 제외하고 재생성했다. 최종 원본과 셀 경계 검사는 [registration.json](registration.json), [sprite-audit.json](sprite-audit.json)에 남긴다.

버전 2 썸네일·8프레임·호환 4프레임은 기존 Storage 경로를 덮어쓰지 않는다. `prepare-nyamnyam-sprites.ps1`, `inspect-nyamnyam-art.ps1`, `register-sprite-anchors.ps1`, `export-nyamnyam-compat.ps1` 다음 `register-nemerion-serpent.mjs`로 등록한다. 업로드 도구가 무손실 압축한 뒤 등록을 다시 실행하여 공개 앱 시트와 검수 해시를 최종 전송 바이트에 맞춘다. 공개 다운로드는 `verify-nyamnyam-upload.mjs`로 대조한다.

앱은 신·구 카탈로그 별칭 모두 버전 2의 8프레임으로 연결한다. 종 출시일은 갱신하지 않는다. `verify-ocean-creatures-preview.mjs`에 이 배치 경로를 전달하면 실제 어항·도감에서 6초 행동 주기, 모션 감소의 정지 자세, PC·모바일 화면을 확인한다. Storage/DB 적용과 앱 코드 배포는 별개다.
