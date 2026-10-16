# SQL 찾기와 적용 안내

일반 기능 수정에서는 아래에서 관련 SQL만 찾습니다. 전체 SQL이나 설치 기록을 매번 읽지 않습니다. 코드·테스트 위치는 [시스템 지도](../../docs/system-map.md), 현재 동작은 [기능 문서 목차](../../docs/README.md)를 확인합니다.

## 기능별 진입점

번호는 변경 기록입니다. 같은 함수가 여러 파일에서 재정의될 수 있으므로 관련 이름으로 검색하고 후속 변경을 확인합니다.

| 작업 | 먼저 확인할 SQL·안내 |
| --- | --- |
| 프로필·친구·알림 | [01 프로필](01-profiles/01-tables.sql), [02 친구](02-friends/01-tables.sql), [03 알림](03-notifications/01-tables.sql), [04 RPC](04-functions/01-social-api.sql), [05 Realtime](05-realtime/01-publication.sql), [07 친구 끊기](07-friend-removal/01-remove-friend.sql) |
| 아바타·Storage | [06 아바타](06-avatars/01-avatar-storage.sql) |
| 골드·상점 | [08 지갑](08-gold/01-wallet.sql) |
| 배경·다중 어항 | [09 배경](09-aquarium/01-backgrounds.sql), [10 어항](10-aquarium-tanks/01-tanks.sql) |
| 지역·출항 | [11 지역](11-regions/01-regions.sql), [12 출항](12-region-travel/01-travel.sql) |
| 미끼·낚시 | [13 초기 낚시](13-fishing/01-fishing.sql), [14 미끼](14-bait-catalog/01-baits.sql), [32 지역 낚시](32-regional-fishing/README.md), [62 사전 추첨 API](62-prepared-fishing/README.md) |
| 개체·도감 구조 | [15 개체](15-collectibles/01-collectibles.sql), [16 시트](16-cartoon-collectibles/01-cartoon-collectibles.sql), [17 경로](17-collectible-paths/01-paths.sql), [30 토착](30-native-collectibles/README.md), [34 구형 지도 제거](34-remove-ocean-map/README.md) |
| 판매·선물·보관함 | [22 관리](22-aquarium-management/README.md), [23 선물](23-collectible-gifts/README.md), [26 보관함](26-collectible-storage/README.md) |
| 위치·반전·회전·크기 | [25 장식물 전환](25-decoration-editing/README.md), [46 변환](46-collectible-transforms/README.md), [47 제한](47-fixed-collectible-editing/README.md) |
| 이동·방향·제자리 애니메이션 | [35 이동](35-collectible-movement/README.md), [39 방향](39-artwork-facing/README.md), [49 idle_animated](49-coral-collection/README.md), [52 장식품 분류](52-animated-decoration-types/README.md) |
| 특정 종·이미지·서식지 | 종 ID 또는 Storage 경로로 이 폴더를 검색하고 해당 번호 폴더의 README와 후속 SQL만 확인 |

예: 저장소 루트에서 `rg -n 'prepare_fishing|finish_fishing' supabase/sql`로 관련 정의를 찾습니다. 번호가 큰 파일 하나만 읽어 의존 조건을 추정하지 않습니다.

## 설치·추가 적용

- 기존 DB는 대상 환경의 적용 상태를 먼저 확인하고 해당 폴더 README의 선행 조건에 맞춰 필요한 변경만 적용합니다.
- 신규 설치·과거 변경 조사 때만 [설치·변경 기록](installation-history.md)을 참고합니다. 01~07 초기 설치와 후속 변경 안내가 섞인 기록이며 전체 설치를 검증한 실행 목록은 아닙니다.
- 알려진 순서 예외는 25 → 24입니다. 46·47 및 61·62의 조건은 각 README에서 확인합니다.
- 15는 기존 낚시 기록을 초기화하는 변경을 포함합니다. 설치 기록이나 SQL 전체를 기존 DB에 일괄 재실행하지 않습니다.
- [설치 확인](verification/check-setup.sql)은 읽기 전용 초기 구성 점검이며 전체 기능·후속 적용을 보증하지 않습니다. `examples/`는 자동 실행 대상이 아닙니다.

## 원격 상태 기록

로컬 SQL과 테스트 통과만으로 원격 적용·Storage 업로드 완료를 판단하지 않습니다. 상태는 해당 변경 기록에 확인 날짜(Asia/Seoul), 대상 환경, 확인 방법·결과와 함께 남기며 비밀 값은 기록하지 않습니다. 날짜·환경이 없는 기존 “완료/대기” 문구는 과거 기록으로 취급합니다.
