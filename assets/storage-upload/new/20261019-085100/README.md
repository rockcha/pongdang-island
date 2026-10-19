# 아쿠아리움 공간 테마

내장 image_gen으로 생성한 세로형 PNG 7개다. 중앙은 개체 표시 공간으로 비우고 가장자리와 하단에 공간의 특징을 배치했다. 생성 프롬프트와 원본 경로는 manifest.json에 보관한다.

`aquarium-backgrounds/` 아래 PNG는 동일 이름으로 해당 Storage 버킷 루트에 업로드한다. 재현 시 `node scripts/upload-aquarium-backgrounds.mjs assets/storage-upload/new/20261019-085100 --dry-run`으로 대상을 확인하고 `--upload`로 업로드한다. 기존 파일을 덮어쓰지 않으며 공개 URL의 내려받은 내용과 로컬 SHA-256을 비교한다. 가격의 기준은 supabase/catalog/catalog.json이며 manifest는 생성 당시 기록이다.
