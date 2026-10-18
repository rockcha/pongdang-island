# 지도 상점

상점은 낚싯대·미끼·지도 탭으로 구성하며 `/shop?tab=maps`로 지도 탭을 바로 엽니다. 잠긴 해역에서도 지도 상점 링크를 제공합니다. 미끼 상점은 `fishing_state`의 실제 미끼 카탈로그를 사용하며, 구형 진주 조개 상품은 표시하지 않습니다.

지도는 `public.region_maps`에 가격과 썸네일 경로만 저장합니다. 등급은 없으며 `map_shop_state`와 항해용 `region_map`에도 지도 등급을 반환하지 않습니다. 기존 `regions.rarity` 및 과거 `collectible_species`의 map 행은 역사적 함수·아이템과의 호환을 위해 보존하지만 새 지도 상품이나 도감에서 사용하지 않습니다.

초기 가격: 산호빛 여울 500, 푸른골 해역 800, 안개달 해역 1,500, 별잠 유적 2,000, 꿈먹는 심연·태고의 원시섬 각각 3,000골드. 원본은 `supabase/catalog/catalog.json`의 `region_maps`입니다. 구매는 해역당 한 번이며 지도 실물 개체를 새로 만들지 않습니다.

해역별 시각적 의도와 보존 조건은 [해역 콘셉트](../design/region-concepts.md)를 확인합니다. 가격·순서는 카탈로그, 실제 적용 상태는 원격 조회로 확인하며 DB 변경은 [DB 관리](database-management.md)를 따릅니다.

`buy_region_map`은 인증 후 지갑을 잠그고 `operation_id`를 확인합니다. 성공한 동일 요청의 재시도에는 추가 차감하지 않습니다. 다른 상품의 같은 ID 사용, 이미 해금된 지도, 잔액 부족을 거부하며 골드 차감·해금·원장 기록은 한 트랜잭션입니다. 기존 해금과 과거 지도 아이템·선물·발견 기록은 삭제하지 않습니다.

새 낚시 추첨은 지도를 지급하지 않습니다. 이미 시작된 사전 낚시 예약과 과거 선물은 변경하지 않습니다. 바다 도감은 서버·클라이언트 양쪽에서 지도 카탈로그를 제외합니다.

새 DB는 migrations 순서대로 적용합니다. 기존 원격에는 `20261017054146_map_shop_routes.sql` 다음 `20261017054247_map_shop_catalog.sql`이 필요합니다. 별잠 유적의 실제 이미지 경로는 `map/epic/map-starruins_thumbnail.png`이며 후속 `20261017055506_correct_starruins_map_image.sql`로 정정했습니다. 이 폴더명은 과거 Storage 경로이며 지도 등급을 뜻하지 않습니다. 최초 설치용 통합본 `artifacts/map-shop-install.sql`에는 수정도 포함됩니다. 이미 설치했다면 통합본을 재실행하지 않습니다. 지도 상점 상태 문구는 '보유중'을 사용합니다. 기존 DB에 baseline이나 과거 번호 SQL을 다시 실행하지 않습니다. 원격 DDL 적용 여부는 별도 확인해야 하며 로컬 테스트는 실제 배포의 증거가 아닙니다.

검증: `tests/map-shop-sql.test.ts`, `tests/map-shop-ui.test.tsx`, `tests/collection.test.tsx`, `tests/region-map.test.tsx`. 로컬 전체 검증은 기존 legacy 39~62 동결 목록 불일치가 남아 있습니다.
