> 생성 배치 기록입니다. 현재 생성·저장 규칙은 [에셋 안내](../../../README.md)를 따릅니다.

# 안개달 토착 개체 6종

투명 PNG 8장을 이 폴더 바로 아래에 저장합니다. collectibles 버킷에 아래 경로로 분류해 업로드한 뒤 [31 등록 SQL](../../../../supabase/sql/31-mistmoon-natives/01-mistmoon-natives.sql)을 실행합니다. 먼저 30번 토착 구조 SQL이 적용되어 있어야 합니다.

| 파일 | 버킷 내 경로 |
| --- | --- |
| hazy-glass-marble_thumbnail.png | trash/normal/hazy-glass-marble_thumbnail.png |
| soaked-moonlight-postcard_thumbnail.png | trash/normal/soaked-moonlight-postcard_thumbnail.png |
| silver-mist-goby_thumbnail.png | fish/rare/silver-mist-goby_thumbnail.png |
| silver-mist-goby_sprite.png | fish/rare/silver-mist-goby_sprite.png |
| crescent-seahorse_thumbnail.png | fish/rare/crescent-seahorse_thumbnail.png |
| crescent-seahorse_sprite.png | fish/rare/crescent-seahorse_sprite.png |
| moon-sleep-waterlily_thumbnail.png | decorations/rare/moon-sleep-waterlily_thumbnail.png |
| mist-bell-windchime_thumbnail.png | decorations/rare/mist-bell-windchime_thumbnail.png |

물고기 시트는 2×2, 순서는 좌상→우상→좌하→우하이며 모두 오른쪽을 바라봅니다. 지역 배지는 Storage 업로드 대상이 아닌 public/region-icons의 SVG입니다.

내장 image_gen으로 PNG를 생성했습니다. [manifest.json](manifest.json)에 최종 프롬프트와 대상 경로를 기록합니다.
