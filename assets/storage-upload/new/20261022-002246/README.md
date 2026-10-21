# 세이렌 해협의 음악 장식물

일반·희귀 공통 스타일 참고를 사용해 built-in image_gen으로 만든 고정형 장식물 세 점이다. 썸네일을 그대로 어항에 표시하며 유영 시트를 재사용하지 않는다. 프롬프트·원본·버킷 경로는 manifest.json을 따른다.

`npm.cmd run storage:upload -- assets/storage-upload/new/20261022-002246`로 신규 PNG만 업로드한다. DB 기대 상태는 `supabase/migrations/20261021152249_add_siren_music_decorations.sql`에 있고, 신규 세 점의 등록과 기존 신상의 가격 조정을 포함한다. 실제 원격 반영 범위는 registration.json, 이미지 다운로드 검증은 upload-verification.json으로 확인한다.
