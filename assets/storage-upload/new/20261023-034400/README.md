# 냠냠 한상바다 개체 아트

내장 `image_gen`으로 만든 해역 개체입니다. [manifest](manifest.json)가 종류·가격·이동 방식·Storage 경로와 최종 프롬프트를 관리하며, [생성 입력 기록](generation-log.json)은 개체 ID와 생성 단계로 찾습니다. 등급별 스타일 참고는 manifest의 `referenceStyle`에 기록합니다.

신화 어종은 앞 4프레임 기본 유영, 뒤 4프레임 고유 행동의 4×2 시트입니다. 기존 클라이언트용 2×2 시트도 함께 보존하며, 앱은 등록된 별칭을 통해 8프레임 원본을 선택합니다. 용왕솥은 특급 고정 장식품의 4프레임 시트입니다.

`sources/*.source`는 생성된 PNG 원본 바이트입니다. 재생성 시 같은 개체의 여백·동작을 먼저 검수합니다. 잘린 원본을 축소해 사용하지 않습니다. 최종 내보내기는 시트 전체에 동일 배율을 적용하고, 프레임 위치는 `registration.json`의 몸통 기준점 측정으로 보정합니다. 개별 프레임 크기를 따로 바꾸지 않습니다.

검수 순서: `prepare-nyamnyam-sprites.ps1` → `inspect-nyamnyam-art.ps1 -RequireComplete` → `register-sprite-anchors.ps1`(4·8프레임 각각) → `export-nyamnyam-compat.ps1` → `register-nyamnyam-catalog.mjs`. 원본 여백과 최종 알파 경계는 `registration.json`, `sprite-audit.json`으로 확인합니다.

`review.html`은 개발 서버에서 실제 어항 렌더러로 확인하는 미리보기입니다. `verify-nyamnyam-preview.mjs`는 로컬 이미지를 연결해 확인하며, 원격 배포 여부를 증명하지 않습니다. 원격 파일 바이트 검증은 `verify-nyamnyam-upload.mjs`로 별도로 수행합니다. Storage 경로를 덮어쓰는 교체 대신 새 버전 이름을 사용합니다.
