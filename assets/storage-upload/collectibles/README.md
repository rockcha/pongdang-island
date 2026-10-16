# 개체 이미지 업로드

추가 일반 장식물 3종: `decorations/normal/apricot-starfish_thumbnail.png`, `decorations/normal/round-barnacle-cluster_thumbnail.png`, `decorations/normal/rusty-mini-anchor_thumbnail.png`. 각 투명 PNG 한 장을 표시 이미지와 썸네일로 공용 사용합니다. [24 적용 안내](../../../supabase/sql/24-common-decorations/README.md), [이미지 생성 프롬프트](common-decorations-prompts-history.md).

아래는 초기 배치의 업로드 목록입니다. 공개 **collectibles** 버킷에 당시 구조 그대로 PNG 11개를 업로드하는 안내이며 현재 전체 목록이 아닙니다. v2 폴더는 없습니다. 문서 파일은 업로드하지 않습니다.

| 폴더 | 파일 | 종 / 등급 |
| --- | --- | --- |
| fish/normal | pongul_sprite.png, pongul_thumbnail.png | 퐁울복 / 일반 |
| fish/rare | moon-angelfish_sprite.png, moon-angelfish_thumbnail.png | 달물결 엔젤피쉬 / 희귀 |
| fish/epic | star-ray_sprite.png, star-ray_thumbnail.png | 별꼬리 가오리 / 특급 |
| fish/mythic | dawn-arowana_sprite.png, dawn-arowana_thumbnail.png | 여명 아로와나 / 신화 |
| trash/normal | glass-bottle_thumbnail.png | 잊힌 유리병 / 일반 |
| decorations/normal | coral-house_thumbnail.png | 산호빛 작은 집 / 일반 |

예: collectibles/fish/rare/moon-angelfish_sprite.png. sprite 파일은 투명 정사각형 2×2 4프레임이며 thumbnail은 별도 투명 정사각형 한 장입니다. 새 물고기도 fish/등급/종이름_sprite.png와 종이름_thumbnail.png를 같은 폴더에 배치합니다.

이미 16 SQL을 적용했다면 **17-collectible-paths/01-paths.sql**만 추가 실행하세요. 경로만 변경하고 보유 개체·골드·미끼·어항은 보존합니다. 새 설치는 15 → 16 → 17 순서입니다. 세부 구조: docs/systems/collectibles.md.
모든 종류(fish, trash, map, decorations)는 normal/rare/epic/mythic 하위 폴더를 공통으로 사용합니다. 현재 비물고기 3종은 모두 일반이므로 normal에 들어갑니다. 나머지 등급 폴더는 빈 상태입니다. 빈 폴더는 Storage에서 보이지 않을 수 있으며 해당 경로로 파일을 올리면 표시됩니다. 이미 17을 실행했어도 수정된 17 SQL을 다시 실행하면 경로가 반영됩니다.

추가 장식물 등 후속 생성 배치는 [../new/README.md](../new/README.md)에 모았습니다. 업로드 대상은 같은 collectibles 버킷의 decorations/normal·rare입니다.

기존 ocean-map은 [34 제거 SQL](../../../supabase/sql/34-remove-ocean-map/01-remove-ocean-map.sql)로 제거합니다. 현재 지도 업로드 대상은 지역별 map-지역ID 이미지 5종입니다.
