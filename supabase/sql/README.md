# SQL 설치 순서

개체 보관함: 25 적용 후 [26 보관함·일괄 어항 배정](26-collectible-storage/01-storage.sql)을 추가 실행합니다. 새 획득·수령 개체를 보관함에 모으고 어항당 50개까지 배정합니다. 기존 배치는 보존합니다. [적용 및 사용 안내](26-collectible-storage/README.md).

Supabase SQL Editor에서 다음 파일을 순서대로 실행합니다. 최초 설치용 SQL입니다. 각 파일은 트랜잭션으로 묶여 있습니다.

1. [프로필](01-profiles/01-tables.sql)
2. [친구 요청 / 프로필 읽기 정책](02-friends/01-tables.sql)
3. [친구·일반 알림](03-notifications/01-tables.sql)
4. [서버 함수 / 공개 RPC](04-functions/01-social-api.sql)
5. [Realtime Publication](05-realtime/01-publication.sql)
6. [아바타 / Storage](06-avatars/01-avatar-storage.sql)
7. [친구 끊기](07-friend-removal/01-remove-friend.sql)
8. [설치 확인](verification/check-setup.sql) — 읽기 전용

1~7을 모두 적용한 뒤 앱을 새로고침합니다. 기존 사용자는 닉네임이 있으면 프로필과 친구 코드가 자동 생성됩니다. 공개 키만으로는 DDL을 적용할 수 없어 대시보드의 DB 소유자 권한으로 실행해야 합니다.

`examples/`는 자동 실행 대상이 아닙니다. 일반 알림 예제의 사용자 UUID를 실제 `player_profiles.id`로 바꿔 실행합니다.

자세한 설명과 두 계정 점검 순서: [친구·실시간 알림](../../docs/systems/realtime-social.md).

기존 01~05 적용을 완료했다면 아바타 기능에는 06 SQL만 추가 실행하면 됩니다. [아바타 안내](../../docs/systems/avatar.md).


기존 01~06을 적용했다면 **07-friend-removal/01-remove-friend.sql만 추가 실행**합니다. 친구 끊기 RPC와 removed 상태를 추가합니다.

골드 DB 연동: 기존 01~07 후 [08 골드/상점](08-gold/01-wallet.sql)을 추가 실행합니다. [시스템 문서](../../docs/systems/gold-shop.md).

아쿠아리움: 기존 01~08 후 [09 배경 구매/장착](09-aquarium/01-backgrounds.sql) 실행. 이미지 업로드 경로는 [문서](../../docs/systems/aquarium.md).

다중 어항: 01~09 후 [10 어항 관리](10-aquarium-tanks/01-tanks.sql) 실행. 기존 배경을 첫 어항으로 보존합니다.

지역 지도: 01~10 후 [11 지역/공통 등급](11-regions/01-regions.sql) 실행. [업로드·구조](../../docs/systems/regions.md).

지역 이동: 01~11 후 [12 출항/잠금 테스트](12-region-travel/01-travel.sql) 실행. [운영 스위치와 흐름](../../docs/systems/region-travel.md).

미끼/낚시: 01~12 후 [13 낚시 시스템](13-fishing/01-fishing.sql) 실행. [확률·구조](../../docs/systems/fishing.md). 일반 미끼 기존 테스트 상점 가격도 갱신합니다.

미끼 도감: 01~13 후 [14 미끼 도감](14-bait-catalog/01-baits.sql) 실행. 기존 재고 유지, 명칭/상세 설명/이미지/판매 정책과 신종2개 추가.


실제 개체/도감: 01~14 뒤 [15 개체 시스템](15-collectibles/01-collectibles.sql) 실행. **전체 기존 낚시 기록과 등급별 수량을 삭제**하며 골드·미끼·어항은 보존합니다. [구조 및 Storage 업로드](../../docs/systems/collectibles.md).



카툰 개체: 15 다음 16-cartoon-collectibles/01-cartoon-collectibles.sql 추가 실행. 총 7종(등급별 물고기 4 + 일반 지도/장식물/쓰레기). 물고기 sprite_sheet_path는 2×2 시트 한 장. collectibles 버킷의 fish/normal·rare·epic·mythic, map, decorations, trash에 PNG 11개 업로드. 자세한 구조는 collectibles.md 참고.

폴더 재배치: 16 적용 후 17-collectible-paths/01-paths.sql 실행. 종이름_sprite.png 및 종이름_thumbnail.png 형식, v2 제거. 기존 데이터 보존.

공통 등급 폴더: fish/trash/map/decorations 모두 normal·rare·epic·mythic으로 구분합니다. 기존 일반 쓰레기·지도·장식물 이미지는 각각 normal로 이동했습니다. 수정된 17 SQL을 재실행하면 DB 경로가 갱신됩니다.

개체 관리: 16/17 뒤 [22 드래그 위치 저장·판매](22-aquarium-management/01-management.sql)를 실행합니다. 데이터 초기화 없음.

선물: 22 뒤 [23 선물·우편함](23-collectible-gifts/01-gifts.sql)을 실행합니다. 메모·수령·이모지 답장·선물 알림과 예약 개체 보호를 추가합니다. [적용 안내](23-collectible-gifts/README.md). 이미지 재업로드 없음.

일반 장식물: [24 등록 SQL](24-common-decorations/01-common-decorations.sql)로 살구 불가사리·동글 따개비 무리·녹슨 꼬마 닻을 추가합니다. 투명 PNG 3장 업로드 후 실행합니다. [적용 안내](24-common-decorations/README.md).

장식물 전환·편집: 기존 DB는 먼저 Storage `structures/` → `decorations/` 이동 후 [25 전환 SQL](25-decoration-editing/01-decoration-editing.sql), 그다음 24를 실행합니다. 기존 개체를 보존하고 종류명을 `decoration`으로 변경하며 클릭 회전·0.5~2배 크기·위치 저장을 추가합니다. 신규 설치도 현재 01~23 → 25 → 24 순서입니다. [전체 적용 안내](25-decoration-editing/README.md).

추가 장식물 5종: 25·26 이후 [27 등록 SQL](27-new-decorations/01-new-decorations.sql)을 실행합니다. 일반 3종·희귀 2종, 이미지 위치는 assets/storage-upload/new/decorations/입니다. [업로드·설정 안내](27-new-decorations/README.md).

해변 장식물 5종: 27 이후 [28 등록 SQL](28-coastal-decorations/01-coastal-decorations.sql). 길 잃은 화살표 팻말·소라빛 바람개비·진주 품은 조개(일반), 잠든 꼬마 난파선·잠긴 우체통(희귀). 새 PNG는 assets/storage-upload/new 바로 아래에 저장합니다. [업로드 안내](28-coastal-decorations/README.md).

희귀 장식물·특급 석상: 28 이후 [29 등록·조개 등급 조정](29-statue-decorations/01-statue-decorations.sql). 달빛 해파리 풍등·산호 덮인 보물상자·잠든 해마 석상(희귀), 퐁이 석상(특급)을 추가합니다. 진주 품은 조개는 일반·45골드로 조정하며 이미지 경로를 유지합니다. [적용 안내](29-statue-decorations/README.md).

토착 개체·지역 등급: 29 이후 [30 구조·등급 SQL](30-native-collectibles/01-native-collectibles.sql). native_region_id와 자동 is_native를 추가하고 토착 개체의 단일 서식지를 강제합니다. 산호빛 작은 집·안개달 해역은 희귀로 변경하고 기존 서식지는 유지합니다. [안내](30-native-collectibles/README.md).

안개달 토착 6종: 30 이후 [31 등록 SQL](31-mistmoon-natives/01-mistmoon-natives.sql). 쓰레기·어종·장식물 각 2종, PNG는 assets/storage-upload/new/1052/. [업로드·아이콘 안내](31-mistmoon-natives/README.md).

해역 낚시·지역 지도·퐁당 개체: 31 이후 [32 SQL](32-regional-fishing/01-regional-fishing.sql). 해역별 등급 확률, 별도 지도 5% 추첨, 지역과 동일 등급 지도 5종, 특급 잠수부 퐁당이·희귀 퐁당 물고기를 추가합니다. 이름에 퐁당이 들어가는 개체는 퐁당 토착입니다. [설정·업로드 안내](32-regional-fishing/README.md).

잠수부 퐁당이 분류 수정: 32 적용 DB는 [33 수정 SQL](33-swimming-diver/01-swimming-diver.sql)을 실행합니다. 유영 개체(fish)와 새 썸네일·2×2 시트로 변경합니다. [안내](33-swimming-diver/README.md).

구형 지도 제거: 32 이후 [34 ocean-map 제거 SQL](34-remove-ocean-map/01-remove-ocean-map.sql). 유효한 기존 개체는 지역별 지도로 전환하고 구형 카탈로그를 삭제합니다. 지역 해금과 낚시 기록은 유지합니다.

개체 이동 방식: 34 이후 [35 이동 설정 SQL](35-collectible-movement/01-collectible-movement.sql). swim·pulse·crawl·fixed, 그림 반전, 한 방향 이동을 지원하고 기존 움직임과 보유 데이터를 유지합니다. [설정 예시](35-collectible-movement/README.md).

특수 이동 어종 4종: 35 이후 [36 pulse·crawl 등록 SQL](36-pulse-crawl-species/01-pulse-crawl-species.sql). 달방울 해파리(안개달 토착), 산호집게 꽃게(산호 토착), 복숭아 우산해파리·조약돌 소라게를 추가합니다. [설정·업로드 안내](36-pulse-crawl-species/README.md).

공통 어종 18종: 36 이후 [37 공통 어종 SQL](37-shared-sea-species/01-shared-sea-species.sql). 일반 9종·희귀 6종·특급 3종, 기존 5개 해역 공통 서식입니다. [설정·업로드 안내](37-shared-sea-species/README.md).

산호빛 여울 토착 6종: 37 이후 [38 산호 토착 SQL](38-coral-natives/01-coral-natives.sql). 일반 2종·희귀 3종·특급 1종, 어종 5종과 고정 장식물 산호꽃 말미잘이며 서식지는 coral 하나입니다. [이미지·설정 안내](38-coral-natives/README.md).
