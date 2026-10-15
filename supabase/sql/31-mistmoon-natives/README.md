# 안개달 토착 개체 6종·지역 아이콘

30 이후 PNG 8장을 업로드하고 [01-mistmoon-natives.sql](01-mistmoon-natives.sql)을 실행합니다. 원격 적용은 SQL Editor에서 수행합니다. 기존 소유·배치·발견을 보존하며 반복 실행할 수 있습니다.

| 종류 | 이름 | 등급 | collectibles 버킷 대상 |
| --- | --- | --- | --- |
| 쓰레기 | 흐릿한 유리구슬 | 일반 | trash/normal/hazy-glass-marble_thumbnail.png |
| 쓰레기 | 젖은 달빛 엽서 | 일반 | trash/normal/soaked-moonlight-postcard_thumbnail.png |
| 어종 | 은안개 망둑 | 희귀 | fish/rare/silver-mist-goby_thumbnail.png 및 silver-mist-goby_sprite.png |
| 어종 | 초승달 해마 | 희귀 | fish/rare/crescent-seahorse_thumbnail.png 및 crescent-seahorse_sprite.png |
| 장식물 | 달잠 수련 | 희귀 | decorations/rare/moon-sleep-waterlily_thumbnail.png |
| 장식물 | 안개종 풍경 | 희귀 | decorations/rare/mist-bell-windchime_thumbnail.png |

PNG는 `assets/storage-upload/new/1052/`에 평면으로 저장합니다. 물고기는 별도의 2×2 시트를 사용하고 쓰레기·장식물은 정적 썸네일을 표시합니다. 모든 개체의 native_region_id는 mistmoon, 서식지는 안개달 하나입니다. 일반 쓰레기는 일반 미끼의 일반 결과, 희귀 어종은 희귀 결과, 장식물은 장식물 미끼 후보로 들어갑니다. 별도 확률 변경은 없습니다.

지역별 공통 SVG는 `public/region-icons/{pongdang,coral,mistmoon,starruins,dreamabyss}.svg`로 관리합니다. 각각 야자섬·산호·안개달·별유적·심연 물결을 표현하는 단순한 원형 아이콘입니다. `src/features/regions/region-icons.ts`가 이름과 경로를 연결합니다. `NativeRegionBadge`는 is_native=true이고 알려진 native_region_id가 있을 때만 표시합니다.

도감·보관함·어항 개체 목록·낚시 결과·우편함의 공통 썸네일 우측 아래에 지역 배지를 표시합니다. 키보드 포커스와 툴팁으로 지역 이름·토착 여부를 제공합니다. 개체 그림 위에 항상 표시되는 월드 UI는 추가하지 않습니다. 이전 선물 스냅샷에 토착 정보가 없으면 배지는 생략합니다.

이미지 생성 도구는 내장 image_gen입니다. 업로드 매핑과 프롬프트는 `assets/storage-upload/new/1052/manifest.json`에 기록합니다. 지역 SVG는 기존 UI에 맞춘 코드 기반 벡터입니다.
