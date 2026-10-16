# 아쿠아리움 추가 테마 7종

- 비 내리는 바다: 200골드, aquarium-backgrounds/rainsea.png
- 연둣빛 해초밭: 200골드, aquarium-backgrounds/seagrass.png
- 새벽 물안개: 250골드, aquarium-backgrounds/dawnmist.png
- 심해의 푸른 불꽃: 700골드, aquarium-backgrounds/blueflame.png
- 황금빛 물결 사막: 650골드, aquarium-backgrounds/goldendunes.png
- 시간이 잠든 바다: 800골드, aquarium-backgrounds/stilltime.png
- 장밋빛 소금 호수: 600골드, aquarium-backgrounds/rosesalt.png

built-in image_gen으로 생성했습니다. 중앙 유영 공간을 넓게 비우고 바닥·물빛·조명으로 테마를 구분합니다. 최종 프롬프트는 [manifest.json](manifest.json)에 기록했습니다. 카탈로그 기준은 supabase/catalog/catalog.json이며 변경 이력은 20261016093649_add_seven_aquarium_themes.sql입니다. 이미지와 카탈로그 행은 Storage/Data API로 등록하고 읽기 검증하며, 원격 CLI migration history에 적용 기록을 자동 추가하지 않습니다.
