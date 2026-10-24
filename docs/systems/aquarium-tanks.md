# 여러 어항 관리

현재 화면과 RPC 구조입니다. 초기 설치·검증 내역은 [구현 기록](../history/aquarium-tanks-history.md), 배경·렌더링은 [수족관](aquarium.md), 배치·보관함은 [개체](collectibles.md)를 확인합니다.

## 화면과 동작

무료 첫 어항과 추가 구매 어항을 관리합니다. 추가 어항 가격은 서버 상태의 tankPrice를 사용하며 SQL 10의 기본값은 200골드입니다. 어항마다 이름·배경을 독립적으로 저장하고 구매한 배경은 계정 내 모든 어항에 사용할 수 있습니다.

현재 어항 번호와 구매 버튼을 수조 상단에 표시합니다. 수조 양옆 중앙의 원형 화살표 버튼과 수조의 좌우 방향키로 전환합니다. 첫 어항의 이전 버튼과 마지막 어항의 다음 버튼은 비활성화하며 작업 중에는 이동을 막습니다. 이름은 수조 하단 모달에서 1~20자로 수정합니다. 현재 선택은 화면 상태이며 다시 방문하면 첫 어항부터 표시합니다. 실제 개체는 보관함에서 배정하며 어항 정원은 50개입니다.

## 구조와 검증

어항 선택창의 순서 편집에서 드래그·위아래 이동·맨 앞으로를 사용하고 저장한다. 첫 번째 어항은 친구 방문 시 먼저 표시하는 대표 어항이며, 선택 중인 어항과 대표 어항을 구분한다. 순서 변경은 어항 ID·이름·배경·개체 배치를 유지하고 표시 순서만 바꾸며 새로 구매한 어항은 마지막에 추가한다. 기존 무료 기본 어항 표시는 초기 생성·배경 호환성을 위한 내부 값으로 유지하고 대표 여부는 표시 순서로 판단한다.

서버는 본인 어항 전체 목록과 편집 시작 시 순서를 검증한다. 구매와 같은 잠금을 사용해 동시 추가를 직렬화하고, 다른 기기의 변경을 감지하면 목록을 새로 확인하도록 한다. 동일한 결과로 재저장하면 성공하므로 통신 오류 후 같은 순서로 다시 저장할 수 있다. 서버 migration을 먼저 적용한 뒤 편집 UI를 배포한다. 검증은 `aquarium-order-sql`과 `aquarium-order` 테스트를 사용한다.

| 항목 | 역할 |
| --- | --- |
| aquarium_tanks | 소유자, 이름, 배경, 기본 어항 여부 |
| aquarium_state | 어항·가격·배경 카탈로그·보유 목록·배치 개체·보관 수·정원 |
| buy_aquarium_tank | 인증·지갑 잠금·operation_id 재처리 방지·차감·생성 |
| manage_aquarium_tank | 본인 어항의 rename/equip, 이름·배경 보유 검증 |
| aquarium_background | 배경 구매. 어항 ID 없는 equip은 TANK_REQUIRED |

코드는 `src/pages/aquarium-page.tsx`, `src/features/aquarium/api.ts`, `aquarium-view.tsx`, `tank-swipe.ts`가 진입점입니다. 구매는 GoldProvider의 거래 처리를 사용합니다. SQL은 [10 어항](../../supabase/sql/10-aquarium-tanks/01-tanks.sql), 개체 배정은 [26 보관함](../../supabase/sql/26-collectible-storage/README.md)을 확인합니다.

`tests/social-sql.test.ts`는 구매·재처리·권한·개별 이름/배경을, `tests/aquarium-decoration.test.tsx`는 번호·구매·키보드 전환을, `tests/tank-swipe.test.ts`는 스와이프를 검증합니다. 실행 예는 [시스템 지도](../system-map.md)를 확인합니다. 원격 적용 여부는 별도 확인하며 과거의 “미적용” 문구를 현재 상태로 사용하지 않습니다.
