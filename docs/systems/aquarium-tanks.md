# 여러 어항 관리

## 적용
01~09 적용 DB에 `supabase/sql/10-aquarium-tanks/01-tanks.sql`을 추가 실행합니다. 원격 적용은 아직 수행하지 않았습니다. 새 이미지 업로드는 필요 없습니다.

기존 player_aquariums의 배경은 무료 첫 어항으로 복사합니다. 새 계정은 상태 조회 시 무료 첫 어항을 자동 생성합니다. 추가 어항은 각각 200골드이며 개수 제한은 두지 않습니다. 구매 후 어항 목록에서 선택합니다.

## 화면
`/aquarium`: 내 어항 목록 → 선택 → 이름 수정(1~20자, 앞뒤 공백 제거) → 배경 적용. 구매한 배경은 계정 소유이며 모든 어항에 사용할 수 있습니다. 각 어항은 이름과 배경을 독립적으로 저장합니다. 현재 선택은 화면 상태이며 다시 방문하면 첫 어항을 표시합니다. 삭제/판매 및 물고기 배치는 아직 제공하지 않습니다.

## 구조
- `public.aquarium_tanks`: id, user_id, name, background_id, is_default, created_at.
- user_id 인덱스와 사용자별 기본 어항 부분 UNIQUE 인덱스. RLS 본인 SELECT만 허용, 브라우저 직접 쓰기 금지.
- `aquarium_state`: tanks, tankPrice=200, 보유 배경/카탈로그. 기존 background 필드는 기본 어항 배경으로 호환 유지.
- `buy_aquarium_tank`: 인증 → 지갑 행 잠금 → operation_id 재처리 방지 → 200골드 차감/어항 생성/거래 이력 원자적 저장.
- `manage_aquarium_tank`: 본인 어항 행 잠금 및 rename/equip 검사. 다른 사용자 어항 ID로 수정 불가. 배경 변경은 구매 여부 검사.
- 기존 aquarium_background의 buy는 유지, 모호한 equip은 TANK_REQUIRED로 차단. 장착은 반드시 어항 ID를 지정합니다.
- `src/features/aquarium/api.ts`: 상태/관리 RPC.
- `src/pages/aquarium-page.tsx`: 어항 선택/구매/이름/배경 UI.
- `src/features/gold/api.ts`: aquarium:tank 구매를 어항 RPC로 전달. GoldProvider의 중앙 효과와 헤더 갱신 사용.
- `tests/social-sql.test.ts`: 기본 어항 중복 생성 방지, 200골드 차감, 구매 재처리 방지, 다른 사용자 권한, 이름/개별 배경, 부족 잔액.

적용 후 기존 배경 보존 → 추가 구매 → 두 어항 이름·배경을 다르게 설정 → 새로고침 후 각각 유지되는지 확인합니다.
