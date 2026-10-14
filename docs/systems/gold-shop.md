# 골드와 상점 — DB 연동

## 적용
기존 01~07 적용 후 `supabase/sql/08-gold/01-wallet.sql`을 Supabase SQL Editor에서 실행합니다. 원격 DB 적용은 이 작업에서 수행하지 않았습니다. 기존 localStorage 테스트 잔액과 아이템은 신뢰할 수 없으므로 이전하지 않습니다. DB 잔액은 0부터 시작합니다.

## 위치와 흐름
- `/shop`: 햄버거 메뉴의 섬 상점. 구매·판매, 보유 수량, 계정당 1회 1,000골드 테스트 충전.
- `src/features/gold/api.ts`: get_gold_wallet / trade_gold RPC 및 오류 표시.
- `src/features/gold/gold-provider.tsx`: DB 상태 로드, 거래 중 잠금, 성공 응답의 delta에만 중앙 효과. 포커스/온라인 복귀 시 재조회. 실패한 전송은 같은 거래를 다시 눌러 같은 operation_id로 확인합니다. 계정 변경 시 상태와 진행 작업을 분리합니다.
- `src/features/gold/wallet.ts`: 상품 표시 정보와 Wallet/Trade 타입. 실제 거래 계산은 SQL이 수행합니다.
- `src/features/gold/shop-page.tsx`: 상점 UI, 로딩/오류/재조회, 처리 중 버튼 잠금.
- `public/currency/gold-coin.png`: 투명 배경 생성 동전. 숫자 다음에 동전 표시. 배경 없이 초록/빨강 빛, 제자리에서 함께 페이드아웃.
- `tests/social-sql.test.ts`: 실제 PostgreSQL(PGlite)에서 거래·중복·권한·부족 잔액·재고 검사.

## DB
- public.player_wallets: user_id PK, gold 정수 0~10억, inventory JSONB, test_claimed, updated_at. 현재 상품 2종의 재고만 서버 함수가 변경합니다.
- public.gold_transactions: (user_id, operation_id) PK, action, item_id, delta, created_at. 본인 이력만 읽을 수 있습니다.
- app_private.gold_settings: 관리자가 테스트 충전 활성 여부를 설정. 브라우저 접근 권한 없음.
- 공개 RPC는 INVOKER 래퍼, private DEFINER 구현은 auth.uid 검사 및 빈 search_path 사용. 일반 사용자는 테이블 SELECT만 허용하며 직접 INSERT/UPDATE/DELETE 불가.
- 사용자 지갑 행 잠금 후 서버 고정 가격으로 거래합니다. 골드와 재고 및 거래 이력은 같은 트랜잭션입니다. 재요청 operation_id는 재처리하지 않습니다. 같은 ID의 다른 거래는 거부합니다.
- 구매: 미끼 100/조개 300, 판매: 미끼 60/조개 180. 수량은 거래당 1개. 클라이언트 가격·금액·사용자 ID를 받지 않습니다.

테스트 충전을 종료하려면 관리자가 실행:
```sql
update app_private.gold_settings set test_charge_enabled=false where id=true;
```
실제 결제 기능은 없습니다. 자유로운 골드 증액 RPC는 제공하지 않습니다. 향후 보상은 신뢰된 서버가 지급 사유·중복 방지 키를 검증하는 별도 함수를 추가해야 합니다. 현재 골드 상태는 거래 응답과 화면 포커스 복귀에 갱신하며 Realtime 구독은 하지 않습니다.

## 확인
08 적용 → 새로고침 → 테스트 충전 → 구매 → 판매 → 새로고침/다른 기기 로그인 후 잔액·수량 유지 확인. SQL 미적용 시 오류와 재조회 버튼을 표시하며 브라우저 저장으로 대체하지 않습니다.

이미지는 built-in image_gen으로 생성: 단일 황금 동전, 물고기 양각, 카툰 음영, 투명 배경, 글자 없음.

헤더: src/layouts/app-layout.tsx에서 GoldProvider의 DB 잔액을 표시합니다. 모바일 폭을 고려해 헤더 둘째 줄 오른쪽에 동전과 잔액을 배치하며 상점으로 연결됩니다. 로딩은 …, 조회 오류는 —로 표시합니다.

일반 미끼 가격 변경: 13 SQL 적용 시 bait 구매30/판매18로 변경. 특수300/안전100과 선착장·지역 구매 및 소모는 [낚시 시스템](fishing.md). 기존 미끼 재고는 유지합니다.
