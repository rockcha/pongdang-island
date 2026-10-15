# 추가 장식물 5종

25·26을 적용한 DB에서 이미지 업로드 후 [01-new-decorations.sql](01-new-decorations.sql)을 실행합니다. 기존 24 장식물 등록 여부와 무관하게 실행 가능하며 반복 실행해도 보유 개체·발견·배치를 보존합니다. 원격 DB 적용은 SQL Editor에서 수행합니다.

| 이름 | 등급 | 기본 크기 | 판매 골드 | 파일 |
| --- | --- | --- | --- | --- |
| 라벤더 불가사리 | 일반 | 52 | 35 | normal/lavender-starfish_thumbnail.png |
| 민트 불가사리 | 일반 | 50 | 35 | normal/mint-starfish_thumbnail.png |
| 꼬마 나무 팻말 | 일반 | 54 | 40 | normal/tiny-wooden-sign_thumbnail.png |
| 물결 산호 조각 | 희귀 | 62 | 150 | rare/ripple-coral-fragment_thumbnail.png |
| 버터 불가사리 | 희귀 | 54 | 140 | rare/butter-starfish_thumbnail.png |

새 이미지는 `assets/storage-upload/new/decorations/` 아래에 있습니다. 이 폴더의 `normal`, `rare`를 **collectibles** 버킷의 **decorations/** 아래로 업로드합니다. Storage 경로에 `new/`를 포함하지 않습니다. 각 투명 PNG가 썸네일과 어항 표시 이미지를 겸합니다.

다섯 종 모두 퐁당·산호·안개달·별유적·꿈심연 지역에 연결됩니다. 기존 장식물 미끼의 후보 추첨 방식을 유지합니다. 희귀는 도감·표시·판매에 적용되는 등급이며 별도 희귀 확률은 도입하지 않습니다. 일반 미끼에서 장식물이 나오는 규칙을 추가하지 않습니다.

기존 `collectible_nonfish_common` 제약을 조정해 장식물의 희귀 등급을 허용하며 쓰레기·지도 카탈로그의 일반 등급 규칙은 유지합니다. 카탈로그를 조회하는 도감·보관함·테스트 개체 모달에는 SQL 적용 후 자동으로 표시됩니다.
