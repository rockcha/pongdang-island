# 공간 테마 두 번째 묶음

내장 image_gen으로 제작한 세로 배경 8개다. 사용자가 적절하다고 지정한 심해 우체국 이미지를 생성 도구에 스타일·구도 참고로 전달했다. 소품은 가장자리와 하단의 대표 묶음으로 제한하고 중앙은 물고기 표시 공간으로 비웠다. 전체 이미지를 비교해 중앙 여백과 참고 이미지 대비 디테일 밀도를 검수했다. 최종 프롬프트·참고 이미지·생성 원본 경로는 manifest.json에 보존한다.

`aquarium-backgrounds/`의 PNG를 해당 Storage 버킷 루트에 같은 이름으로 올린다. `node scripts/upload-aquarium-backgrounds.mjs assets/storage-upload/new/20261019-085940 --dry-run`으로 대상을 확인하고 `--upload`로 업로드한다. 업로더는 덮어쓰기를 하지 않고 공개 URL의 다운로드 SHA-256을 로컬 원본과 비교한다. 운영 가격의 원본은 supabase/catalog/catalog.json이며 manifest의 가격은 생성 당시 기록이다.
