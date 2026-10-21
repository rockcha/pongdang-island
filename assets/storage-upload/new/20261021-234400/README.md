# 희귀 중심 미끼 이미지

기존 `public/items/baits/pearl-bubble.png`를 스타일 참고로 built-in image_gen으로 생성했다. 최종 프롬프트·원본·Storage 경로는 manifest.json에 있다.

`npm.cmd run storage:upload -- assets/storage-upload/new/20261021-234400`로 신규 PNG만 업로드하고 공개 다운로드 해시를 확인한다. DB 등록은 `supabase/migrations/20261021144433_add_rare_focused_fishing_baits.sql`을 사용한다. 업로드 성공은 DB 등록 성공을 의미하지 않는다.
