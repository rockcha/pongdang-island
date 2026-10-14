# 미끼·인벤토리·기본 낚시

최신 미끼5종·이름·판매 정책은 [미끼 도감](bait-catalog.md)과 14 SQL을 따릅니다. 아래 13의 3종 가격표는 초기 구현 기록이며, 14 이후 퐁당 지렁이만 30골드에 판매합니다.

## 적용
기존 01~12 다음에 `supabase/sql/13-fishing/01-fishing.sql`을 실행합니다. 원격 DB에는 아직 적용하지 않았습니다. 이미지는 `public/items/baits/`에 포함되어 별도 Storage 업로드가 필요 없습니다.

선착장의 **미끼 상점 · 인벤토리**에서 구매/보유 수량을 확인합니다. 지역(`/region/:regionId`)에 도착하면 미끼 선택 → 낚시 → 등급/실패 결과를 확인할 수 있습니다. 구매·낚시는 한 번에 한 개씩입니다. 실패해도 미끼 한 개가 소모됩니다.

## 가격과 확률
모든 지역은 현재 같은 확률을 사용합니다. 지역의 표시 등급은 물고기의 포획 결과를 제한하지 않습니다.

| 미끼 | 가격 | 일반 | 희귀 | 특급 | 신화 | 실패 |
| --- | --- | --- | --- | --- | --- | --- |
| 일반 | 30 | 30% | 10% | 1% | 0.3% | 58.7% |
| 특수 | 300 | 0% | 98.7% | 1% | 0.3% | 0% |
| 안전 | 100 | 41.74% | 10% | 1% | 0.3% | 46.96% |

특수는 최소 희귀를 보장하기 위해 기존 일반/실패 구간을 희귀로 올립니다. 안전의 ‘실패율 20% 경감’은 **상대 감소**(58.7 × 0.8 = 46.96)로 해석했으며, 감소한 11.74%p를 일반에 더합니다. 20%p 차감이 아닙니다. 값은 fishing_baits의 basis point(1/100%) 정수로 관리하고 UI도 DB 값을 표시합니다.

현재는 등급별 획득 수량과 최근 낚시 10건을 보여줍니다. 개별 물고기 종류·이미지·어항 배치·판매·지역별 차등 확률은 아직 없습니다.

## 코드
- `src/features/fishing/api.ts`: 타입, fishing_state/cast_fishing RPC, 오류 메시지.
- `src/features/fishing/fishing-panel.tsx`: 재사용 구매/인벤토리/낚시 UI, 네트워크 실패 시 같은 operation_id로 결과 재확인.
- `src/pages/harbor-page.tsx`: 구매/인벤토리 모달.
- `src/features/regions/region-page.tsx`: 도착 확인 후 FishingPanel.
- `src/features/gold/api.ts`: fishing:미끼ID 구매를 buy_fishing_bait로 전달. 골드 효과·헤더 갱신 재사용.
- `public/items/baits/normal.png`, `special.png`, `safe.png`: 생성한 아이콘.

## DB와 권한
- fishing_baits: 가격, 설명, 이미지, 확률 카탈로그. 합계 10000 CHECK.
- player_wallets.inventory: 기존 JSONB 인벤토리 재사용. 일반 bait / 특수 bait_special / 안전 bait_safe 키. 기존 bait 보유 수량 유지.
- fishing_attempts: 계정/operation_id PK, 지역/미끼/등급(null=실패)/시각. 최근 조회 인덱스.
- player_catch_counts: 계정/등급 PK, 누적 획득 마릿수.
- gold_transactions: 미끼 구매 이력, 구매당 골드 차감과 재고 증가를 같은 트랜잭션으로 저장.
- fishing_state: 카탈로그/등급별 수량/최근 10건 반환.
- buy_fishing_bait: auth.uid, 지갑 행 잠금, 서버 가격과 재고 처리, operation_id 중복 구매 방지.
- cast_fishing: 계정별 지역 advisory lock → 지갑 행 잠금 → 이전 결과 재생 또는 현재 위치/지도 조각/미끼 검사 → 서버 random 추첨 → 미끼 1개 소모/결과/획득 카운터 원자 저장.
- resolve_fishing: private 순수 확률 resolver. 일반 사용자 실행 권한 없음. 추첨값은 클라이언트가 전달할 수 없음.

테이블은 RLS 활성화, 카탈로그 SELECT와 본인 이력 SELECT만 허용합니다. 직접 재고/결과 수정 불가. RPC는 private DEFINER+public INVOKER, 빈 search_path와 인증 검사, PUBLIC/anon 실행 금지.
같은 cast operation_id를 재전송해도 추첨과 소모는 반복하지 않습니다. 같은 ID에 다른 지역/미끼를 넣으면 거절합니다. 네트워크 결과가 불명확하면 화면에서 다른 미끼 선택을 잠그고 결과 재확인을 제공합니다. 화면을 나간 뒤에는 최근 내역으로 처리 결과를 확인할 수 있습니다.

기존 테스트 상점의 일반 미끼는 이름과 가격을 새 체계(구매30/판매18)로 맞췄습니다. 기존 legacy trade_gold도 같은 가격으로 갱신해 새 미끼를 싸게 사서 비싸게 파는 차익을 방지합니다. 다른 기존 상품은 유지합니다.

## 검증
`tests/social-sql.test.ts`: 미끼별 10000개 전체 구간을 검사해 정확한 확률과 특수 보장 확인, 가격·구매 재전송, 소모·결과 재생·등급 수량, 다른 지역/잠긴 지역 차단, RLS·직접 조작 차단.
`tests/fishing-panel.test.tsx`: 1개 구매, 결과 표시/갱신, 네트워크 재시도 같은 ID 사용.
기존 가격 관련 테스트는 새 일반 미끼 가격으로 갱신합니다.

## 이미지
built-in image_gen 생성. 공통: 따뜻한 카툰 재질, 작은 크기에도 읽히는 실루엣, 투명 배경, 단일 아이템, 글자 없음. 일반은 복숭아빛 지렁이와 금색 낚싯바늘, 특수는 진주/파란 보석 새우 루어, 안전은 잎에 싸인 민트색 떡밥과 작은 금빛 방패 장식.

낚시 모달 추가: [랜덤 연출](fishing-presentation.md). 지역 낚시 실행 시 최소3초 스프라이트·TMI 모달 후 결과를 표시합니다. 실패 문구는 랜덤 연출이며 확률에 영향 없습니다.


## 최신 변경 (15)
[개체 시스템](collectibles.md)이 위의 등급별 수량/최근 내역 UI를 대체합니다. 성공 여부는 collectible_id로 판단하며 쓰레기는 rarity=null이어도 성공입니다. 심해 인력석은 이제 구조물을 보장합니다. 실제 보유 개체와 도감에서 결과를 확인합니다.
