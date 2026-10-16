# 분위기별 배경 5종

- 가을이 잠긴 연못: 350골드, aquarium-backgrounds/autumnpond.png
- 먹빛 수묵 바다: 650골드, aquarium-backgrounds/inksea.png
- 구름이 잠긴 바다: 600골드, aquarium-backgrounds/cloudsea.png
- 물속의 오로라: 800골드, aquarium-backgrounds/aurorasea.png
- 빙하 속 기포: 700골드, aquarium-backgrounds/icebubbles.png

built-in image_gen으로 생성했습니다. 최종 프롬프트와 파일별 원본은 [manifest.json](manifest.json)에 기록했습니다. PNG는 aquarium-backgrounds 버킷, 카탈로그는 supabase/catalog/catalog.json 기준입니다. 변경 migration은 20261016095304_add_atmospheric_aquarium_backgrounds.sql입니다. Storage/Data API로 이미지와 카탈로그 행을 등록하고 읽기 검증합니다. 원격 CLI migration history는 변경하지 않습니다.
