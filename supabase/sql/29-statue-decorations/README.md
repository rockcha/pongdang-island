# 희귀 장식물 3종·특급 퐁이 석상

28 적용 후 새 PNG 4장을 업로드하고 [01-statue-decorations.sql](01-statue-decorations.sql)을 실행합니다. 원격 DB 적용은 SQL Editor에서 수행합니다. 재실행해도 보유 개체·발견·위치·회전·크기는 보존됩니다.

| 이름 | 등급 | 기본 크기 | 판매 골드 | collectibles 버킷 경로 |
| --- | --- | --- | --- | --- |
| 달빛 해파리 풍등 | 희귀 | 62 | 160 | decorations/rare/moonlit-jellyfish-lantern_thumbnail.png |
| 산호 덮인 보물상자 | 희귀 | 72 | 190 | decorations/rare/coral-covered-treasure-chest_thumbnail.png |
| 잠든 해마 석상 | 희귀 | 68 | 170 | decorations/rare/sleeping-seahorse-statue_thumbnail.png |
| 퐁이 석상 | 특급 | 86 | 600 | decorations/epic/pongi-statue_thumbnail.png |

새 투명 PNG는 요청대로 `assets/storage-upload/new/` 바로 아래에 저장합니다. 각 PNG가 썸네일과 어항 표시 이미지를 겸합니다. 모두 정적 장식물이며 기존 장식물 미끼의 5개 지역 후보에 연결합니다. 등급별 추첨 가중치나 애니메이션은 추가하지 않습니다.

퐁이 석상은 제공된 퐁이 이미지의 둥근 머리·귀·볼·앉은 자세·꼬리·불가사리 장식을 참고한 청회색 석상입니다. 낚싯줄과 바늘 대신 작은 조개를 품고 낮은 받침 위에 앉아 있습니다.

**진주 품은 조개는 희귀 → 일반, 판매가 160 → 45골드로 변경합니다.** 기존 이미지를 그대로 쓰므로 `decorations/rare/pearl-bearing-clam_thumbnail.png` 경로를 유지합니다. 폴더명과 달리 실제 표시 등급은 카탈로그의 `common`입니다. 새 이미지 생성·재업로드는 필요 없습니다. 신규 설치용 28 SQL에도 일반 등급을 반영했습니다. 과거 선물에 기록된 스냅샷은 유지합니다.

생성 도구는 내장 image_gen입니다. 당시 기록에서 참조한 `statue-decorations.json`은 현재 저장소에 없습니다. 업로드 매핑은 위 표와 [등록 SQL](01-statue-decorations.sql)을 기준으로 확인합니다.
