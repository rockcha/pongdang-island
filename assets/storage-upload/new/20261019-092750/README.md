# 바닷속 심플·감성 테마

내장 image_gen으로 심플 6개와 감성 6개를 생성했다. 모든 장면은 수중 시점이며 심플은 물빛·햇빛·모래로 구성하고 감성은 해양 자연물을 가장자리와 하단에 더했다. 중앙의 열린 수영 공간, 등급별 디테일 차이, 서로 비슷한 색감의 구분을 비교 이미지로 검수했다. 완성 이미지에 물고기·캐릭터·글자를 포함하지 않았다.

최종 프롬프트와 생성 원본 경로는 manifest.json에 있다. manifest의 등급·가격은 생성 당시 기록이고 운영 원본은 supabase/catalog/catalog.json이다. PNG는 aquarium-backgrounds 버킷 루트의 동일 이름으로 업로드한다. 기존 `scripts/upload-aquarium-backgrounds.mjs`에 이 배치 경로와 `--dry-run` 또는 `--upload`를 전달한다. 업로더는 기존 파일을 덮어쓰지 않고 공개 다운로드 SHA-256과 로컬 원본의 일치를 확인한다.
