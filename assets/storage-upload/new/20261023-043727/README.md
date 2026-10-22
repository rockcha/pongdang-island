# 냠냠 희귀 어종 추가·해역 아이콘

내장 `image_gen`으로 생성했습니다. [manifest](manifest.json)에는 개체별 이동 설정·가격·경로와 최종 프롬프트가 있으며, [생성 기록](generation-log.json)에는 어종·아이콘 입력 역할과 정확한 프롬프트를 보존합니다. 일반·희귀 스타일은 저장소의 퐁이 참고 이미지를 사용합니다. 아이콘은 기존 녹빛 고물섬 아이콘을 미니어처 해역 구성·채색 참고로 사용하고, 세이렌은 기존 지도에서 신전·리라 소재만 가져옵니다.

신규 어종은 썸네일과 2×2 시트를 분리했습니다. 붕어빵은 지느러미·꼬리 유영, 랍스터는 콘을 지고 작은 다리로 걷습니다. 원본은 `sources/*.source`에 보존하며 셀 전체에 같은 배율로 여백을 확보하고 몸통 기준점의 평행 이동만 등록합니다. 각 프레임 배율을 바꾸지 않습니다.

`prepare-nyamnyam-sprites.ps1 -Root <배치>` → `inspect-nyamnyam-art.ps1 -Root <배치> -RequireComplete` → `register-sprite-anchors.ps1` → `register-nyamnyam-extras.mjs` 순서로 검수·등록합니다. 카탈로그는 CLI 새 migration에 두 ID만 지정하여 `db:catalog`로 생성합니다. 어종 PNG 네 개는 기존 `storage:upload`로 업로드하고 공개 다운로드의 바이트를 대조합니다. 아이콘은 기존 관례대로 `public/region-icons/`에 저장하며 공통 `regionIcons`를 통해 배치합니다.
