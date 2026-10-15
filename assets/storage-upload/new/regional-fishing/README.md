> 생성 배치 기록입니다. 현재 생성·저장 규칙은 [에셋 안내](../../../README.md)를 따릅니다.

# 해역 지도·퐁당 개체 업로드

새 투명 PNG 9장을 이 폴더에 저장합니다. collectibles 버킷에 아래 경로로 업로드하고 [32 SQL](../../../../supabase/sql/32-regional-fishing/01-regional-fishing.sql)을 실행합니다. 먼저 31까지 적용되어 있어야 합니다.

| 파일 | 버킷 내 폴더 |
| --- | --- |
| map-pongdang_thumbnail.png | map/normal |
| map-coral_thumbnail.png | map/normal |
| map-mistmoon_thumbnail.png | map/rare |
| map-starruins_thumbnail.png | map/rare |
| map-dreamabyss_thumbnail.png | map/epic |
| diver-pongdang-swimming_thumbnail.png | fish/epic |
| diver-pongdang-swimming_sprite.png | fish/epic |
| pongdang-fish_thumbnail.png | fish/rare |
| pongdang-fish_sprite.png | fish/rare |

퐁당 물고기 시트는 2×2, 좌상→우상→좌하→우하 순서입니다. [최종 프롬프트·매핑](manifest.json). 생성 도구는 내장 image_gen입니다.

32를 이미 실행했다면 [33 수정 SQL](../../../../supabase/sql/33-swimming-diver/01-swimming-diver.sql)을 적용합니다. 기존 장식물용 잠수부 이미지는 새 유영 이미지로 교체했습니다.
