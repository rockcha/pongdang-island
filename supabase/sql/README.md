# SQL 설치 순서

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



카툰 개체: 15 다음 16-cartoon-collectibles/01-cartoon-collectibles.sql 추가 실행. 총 7종(등급별 물고기 4 + 일반 지도/구조물/쓰레기). 물고기 sprite_sheet_path는 2×2 시트 한 장. collectibles 버킷의 fish/normal·rare·epic·mythic, map, structures, trash에 PNG 11개 업로드. 자세한 구조는 collectibles.md 참고.

폴더 재배치: 16 적용 후 17-collectible-paths/01-paths.sql 실행. 종이름_sprite.png 및 종이름_thumbnail.png 형식, v2 제거. 기존 데이터 보존.

공통 등급 폴더: fish/trash/map/structures 모두 normal·rare·epic·mythic으로 구분합니다. 기존 일반 쓰레기·지도·구조물 이미지는 각각 normal로 이동했습니다. 수정된 17 SQL을 재실행하면 DB 경로가 갱신됩니다.

개체 관리: 16/17 뒤 [22 드래그 위치 저장·판매](22-aquarium-management/01-management.sql)를 실행합니다. 데이터 초기화 없음.

선물: 22 뒤 [23 선물·파도 우편함](23-collectible-gifts/01-gifts.sql)을 실행합니다. 메모·수령·이모지 답장·선물 알림과 예약 개체 보호를 추가합니다. [적용 안내](23-collectible-gifts/README.md). 이미지 재업로드 없음.
