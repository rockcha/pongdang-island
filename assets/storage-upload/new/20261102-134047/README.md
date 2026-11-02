# 한국 테마 스페셜 어항 배경

원본은 내장 `image_gen`으로 생성했으며 프롬프트·도구 경로는 manifest에 보존합니다. `sources/`는 생성 원본, `aquarium-backgrounds/`는 실제 업로드 파일입니다. 원본을 자르거나 늘리지 않고 저장하며, 중앙은 유영 공간으로 비워두고 가장자리에 한국의 풍경을 배치했습니다.

카탈로그 원본에서 상품 정의를 관리하고, `theme-panoramas.json`으로 실제 어항에 연결합니다. 상점용 경량 미리보기는 `npm run images:background-previews`로 생성합니다.

공개 Storage 업로드·바이트 검증은 `node scripts/upload-aquarium-panoramas.mjs --manifest assets/storage-upload/new/20261102-134047/manifest.json`을 사용합니다. 생성 원본과 업로드 파일의 해시를 구분하며, 업로드 성공을 카탈로그 적용이나 프런트엔드 배포의 증거로 사용하지 않습니다.
