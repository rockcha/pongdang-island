# pulse·crawl 어종 4종

35까지 적용한 DB에 새 PNG 8장을 업로드하고 [01-pulse-crawl-species.sql](01-pulse-crawl-species.sql)을 실행합니다. 반복 실행 가능하며 기존 소유·위치·발견을 보존합니다. 원격 SQL 실행은 사용자가 SQL Editor에서 수행합니다.

| 이름 | 등급 | 이동 | 서식 | 크기 | 판매 골드 |
| --- | --- | --- | --- | --- | --- |
| 달방울 해파리 | 희귀 | pulse | 안개달 해역 토착 | 60 | 170 |
| 복숭아 우산해파리 | 일반 | pulse | 기존 5개 해역 공통 | 56 | 35 |
| 산호집게 꽃게 | 희귀 | crawl | 산호빛 여울 토착 | 64 | 180 |
| 조약돌 소라게 | 일반 | crawl | 기존 5개 해역 공통 | 52 | 30 |

모두 게임상 kind=fish이며 전용 2×2 시트를 사용합니다. pulse는 갓 수축·촉수 움직임과 위아래 추진, crawl은 다리 움직임과 바닥 좌우 이동입니다. 네 종 모두 flip_with_direction=false, travel_direction=both로 정면 그림을 유지합니다. 두 토착 개체는 기존 공통 토착 지역 배지가 자동 표시됩니다.

이미지 위치는 **assets/storage-upload/new/20261015-114904/**(한국 시간)입니다. 해당 폴더 안의 `fish/normal`·`fish/rare`를 **collectibles** 버킷 같은 경로에 업로드합니다. 생성시간 폴더나 README·manifest는 업로드하지 않습니다. [업로드 목록](../../../assets/storage-upload/new/20261015-114904/README.md).

PNG는 내장 image_gen으로 생성합니다. 썸네일 4장·시트 4장이고 시트는 좌상→우상→좌하→우하 순서의 같은 개체 동작 4프레임입니다. 최종 프롬프트와 버킷 경로는 같은 폴더의 manifest.json에 기록합니다.
