# 골드와 상점 — DB 연동

## 적용

상점은 가게 내부 풍경 배너와 Store 아이콘·24px 중간 굵기 제목, 미끼 상점 / 낚싯대 상점 탭을 사용합니다. 낚싯대도 실제 골드로 구매·반값 판매하며 보유와 장착을 DB에 저장합니다. 기본 지급 입문용은 판매할 수 없습니다. [내부 배너 생성 기록](../../assets/references/shop-interior-manifest.json), [낚싯대 인벤토리·창고와 migration](rod-inventory.md).

외형 정보는 `src/features/fishing/fishing-rods.ts`, 실제 이름·가격·보유·장착·효과 수치는 서버 카탈로그와 RPC 응답을 사용합니다. 입문용은 무료, 청동은 800골드·실패율 −1%p, 지역 장비는 1,500골드·실패율 −2%p·해당 지역 토착 +2%p, 루네아는 3,000골드·실패율 −2%p·안개달 토착 +2%p, 잔물결은 2,000골드·실패율 −3%p 설정입니다. 확률 효과는 사용자 요청에 따라 설정·표시에만 사용하며 실제 추첨·게이지에는 적용하지 않습니다. 임시 구매·sessionStorage 소유는 제거했으며 계정별 보유와 장착은 DB에서 불러옵니다. 장착 장비를 팔면 입문용으로 전환합니다.
신규 변경과 원격 적용은 [DB 관리](database-management.md)의 migration 절차를 따릅니다. 과거 SQL08 재실행은 현재 설치 기준이 아닙니다. 기존 임시 잔액·구매 기록은 서버 데이터로 가져오지 않습니다.

## 위치와 흐름

9종 모두 상점 썸네일·고정 릴 테두리·회전판·찌 PNG를 Storage `collectibles/equipment/rods/{folder}/`에서 불러옵니다. 기본 지급 ID `basic`은 유지하되 새 이미지 폴더는 `starter`, 청동은 `bronze`이며 나머지는 ID와 같습니다. 청동은 이전 첫물결의 이미지를 이어받고 입문용은 소박한 대나무·무광 철제 릴·빨간 찌로 구분합니다. 이전 `equipment/rods/basic/` 파일은 기록용으로 남기며 현재 UI는 사용하지 않습니다. 이미지 로드 실패 시 SVG로 대체합니다. 회전판만 기존 회전 변환을 따라 움직이고 찌는 기존 위치·입질·잠김 변환을 사용합니다. 낚싯대 몸통은 기존 곡선 위에 굵기·재질·문양을 표시하며 버튼 범위, 게이지, 회전량, 휘어짐과 확률은 바뀌지 않습니다. [현재 이미지·프롬프트·업로드 기록](../../assets/storage-upload/new/20261016-155626/README.md).
- `/shop`: 햄버거 메뉴의 섬 상점. 구매·판매, 보유 수량, 계정당 1회 1,000골드 테스트 충전.
- `src/features/gold/api.ts`: get_gold_wallet / trade_gold RPC 및 오류 표시.
- `src/features/gold/gold-provider.tsx`: DB 상태 로드, 거래 중 잠금, 성공 응답의 delta에만 중앙 효과. 포커스/온라인 복귀 시 재조회. 실패한 전송은 같은 거래를 다시 눌러 같은 operation_id로 확인합니다. 계정 변경 시 상태와 진행 작업을 분리합니다.
- `src/features/gold/wallet.ts`: 상품 표시 정보와 Wallet/Trade 타입. 실제 거래 계산은 SQL이 수행합니다.
- `src/features/gold/shop-page.tsx`: 상점 UI, 로딩/오류/재조회, 처리 중 버튼 잠금.
- `public/currency/gold-coin-starfish.png`: 투명 배경의 불가사리 양각 금화. 공통 GoldIcon을 통해 헤더·상점·거래 효과에 사용합니다. 골드 증감은 배경 없이 초록/빨강 빛으로 제자리에서 페이드아웃합니다.
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

이미지는 built-in image_gen으로 생성: 단일 황금 동전, 퐁이 불가사리 양각, 카툰 음영, 투명 배경, 글자 없음. [생성 프롬프트](../../assets/references/gold-starfish-manifest.json).

헤더: src/layouts/app-layout.tsx에서 GoldProvider의 DB 잔액을 표시합니다. 모바일 폭을 고려해 헤더 둘째 줄 오른쪽에 동전과 잔액을 배치하며 상점으로 연결됩니다. 로딩은 …, 조회 오류는 —로 표시합니다.

일반 미끼 가격 변경: 13 SQL 적용 시 bait 구매30/판매18로 변경. 특수300/안전100과 선착장·지역 구매 및 소모는 [낚시 시스템](fishing.md). 기존 미끼 재고는 유지합니다.
