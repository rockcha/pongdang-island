# 낚싯대 인벤토리와 창고

`/shop`에서 실제 골드로 낚싯대를 구매하고 구매가의 절반에 판매합니다. 종류별로 1개만 보유하며, 입문용은 무료 기본 지급·판매 불가입니다. 상점 거래는 공통 확인 모달에서 금액을 확인합니다. `/warehouse`의 낚싯대 창고는 보유 장비의 장착·반값 판매, 미끼 창고는 실제 보유 수량을 보여줍니다. 낚시 화면 선택도 같은 DB 장착 상태를 사용합니다.

## 데이터와 RPC

- `public.fishing_rods`: 서버 카탈로그·고정 가격·향후 효과 수치. 실제 낚시 확률은 이번 변경에서 적용하지 않습니다.
- `public.player_fishing_rods`: `(user_id,rod_id)` 기본키로 중복 보유를 막습니다. 첫 조회에 `basic`을 무료 지급합니다. 임시 sessionStorage 기록은 가져오지 않습니다.
- `public.player_rod_loadouts`: 장착 상태. 복합 외래키로 본인 보유 장비만 참조합니다. 장착 장비를 팔면 입문용으로 자동 전환합니다.
- 미끼 수량은 기존 `player_wallets.inventory`, 미끼 정의는 기존 `fishing_baits`를 사용합니다. 중복 재고 테이블을 만들지 않습니다.
- `fishing_rod_state()`: 본인 보유·장착·낚싯대/미끼 카탈로그를 반환합니다.
- `trade_fishing_rod(p_rod_id,p_action,p_operation_id)`: 서버 가격으로 구매·반값 판매. 기존 지갑을 먼저 잠근 뒤 재고·골드·gold_transactions를 같은 트랜잭션으로 갱신합니다. 같은 거래 ID의 재시도는 delta 0을 반환합니다. 다른 거래에 ID를 재사용하면 거부합니다.
- `equip_fishing_rod(p_rod_id)`: 본인 보유만 장착. 성공 응답 후 화면을 갱신합니다.

RLS는 카탈로그와 본인 데이터 SELECT만 허용하고 직접 쓰기를 차단합니다. 공개 INVOKER RPC는 인증을 검사하는 비공개 스키마의 DEFINER 구현을 호출합니다. 가격·사용자 ID·수량을 클라이언트에서 받아 거래하지 않습니다.

## 앱 연결

`RodProvider`는 계정별로 다시 생성되어 이전 사용자의 보유 정보를 재사용하지 않습니다. 포커스·온라인 복귀와 거래 성공 시 서버에서 재조회합니다. 로딩·오류 시 구매·판매·장착을 막고 재조회 버튼을 표시합니다. 장착은 서버 성공 전 낙관적으로 바꾸지 않습니다. 골드 거래와 재시도 ID 관리는 기존 `GoldProvider`를 공유합니다. 임시 구매 hook은 제거했습니다.

이미지는 기존 [9종 낚싯대 기록](../../assets/storage-upload/new/20261016-155626/README.md)을 사용합니다. 입문용 휠 배경은 어두운 회색이며 몸통은 밝은 갈색 대나무 마디로 표시합니다. 창고는 `public/banners/warehouse.png`를 사용하며 [built-in image_gen 프롬프트](../../assets/references/warehouse-banner-manifest.json)를 보관합니다.

## 배포와 검증

신규 변경은 [20261016074241_fishing_rod_inventory.sql](../../supabase/migrations/20261016074241_fishing_rod_inventory.sql) 하나입니다. [DB 관리 절차](database-management.md)에 따라 원격 구조·프로젝트·migration history를 확인하고 이 증분 변경만 배포합니다. 기존 원격 DB에 baseline을 재실행하거나 history를 자동 repair하지 않습니다. 이 migration은 기존 낚시 준비·완료·확률 RPC를 재정의하지 않습니다.

2026-10-16 로컬 PGlite에서 migration 재생, 재실행 시 보유 보존, 기본 지급, 구매·반값 판매, 중복 요청·잔액 부족·골드 한도·타 계정 접근·직접 쓰기 거부를 확인했습니다. 실제 원격 migration 적용은 수행하지 않았습니다. 전체 `db:verify`는 기존 39~62번 SQL이 동결 manifest에 없는 문제로 중단됩니다. 이번 migration은 별도 재생·거래 테스트로 검증했습니다.

```powershell
npm test -- tests/fishing-rods-sql.test.ts tests/fishing-rod-ui.test.tsx tests/rod-api.test.tsx
npm run db:context
```
