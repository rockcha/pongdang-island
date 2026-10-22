# 지도 상점

상점은 낚싯대·미끼·지도 탭으로 구성하며 `/shop?tab=maps`로 지도 탭을 바로 엽니다. 잠긴 해역에서도 지도 상점 링크를 제공합니다. 미끼 상점은 `fishing_state`의 실제 미끼 카탈로그를 사용하며, 구형 진주 조개 상품은 표시하지 않습니다.

지도는 `public.region_maps`에 가격과 썸네일 경로만 저장합니다. 등급은 없으며 `map_shop_state`와 항해용 `region_map`에도 지도 등급을 반환하지 않습니다. 기존 `regions.rarity` 및 과거 `collectible_species`의 map 행은 역사적 함수·아이템과의 호환을 위해 보존하지만 새 지도 상품이나 도감에서 사용하지 않습니다.

초기 가격: 산호빛 여울 500, 푸른골 해역 800, 안개달 해역 1,500, 별잠 유적 2,000, 꿈먹는 심연·태고의 원시섬 각각 3,000골드. 원본은 `supabase/catalog/catalog.json`의 `region_maps`입니다. 구매는 해역당 한 번이며 지도 실물 개체를 새로 만들지 않습니다.

해역별 시각적 의도와 보존 조건은 [해역 콘셉트](../design/region-concepts.md)를 확인합니다. 가격·순서는 카탈로그, 실제 적용 상태는 원격 조회로 확인하며 DB 변경은 [DB 관리](database-management.md)를 따릅니다.

`buy_region_map`은 인증 후 지갑을 잠그고 `operation_id`를 확인합니다. 성공한 동일 요청의 재시도에는 추가 차감하지 않습니다. 다른 상품의 같은 ID 사용, 이미 해금된 지도, 잔액 부족을 거부하며 골드 차감·해금·원장 기록은 한 트랜잭션입니다. 기존 해금과 과거 지도 아이템·선물·발견 기록은 삭제하지 않습니다.

기존 판매 지도는 낚시로 지급하지 않습니다. 신규 해역은 `fishing_map_blueprints`로 명시적으로 등록하면 지도 조각 수집으로 해금합니다. 미끼가 희귀 등급을 뽑았을 때, 물고기를 대상으로 하는 낚시에 한해 미획득 조각 하나를 희귀 후보 하나로 포함합니다. 별도의 지도 등장률이나 새로운 등급은 없으며, 희귀 등급이 나오지 않는 미끼에는 조각도 나오지 않습니다. 조각은 모든 해역에서 등장하고, 찾은 조각과 이미 해금된 지도의 조각은 후보에서 빠집니다. 현재는 직접 낚시에 적용하며 통발에는 적용하지 않습니다.

조각은 예약에 고정하고 조작 성공 시 기록합니다. 실패·취소에는 지급하지 않으며, 동일 요청 재시도는 기존 결과를 반환합니다. 보관함·판매·선물·도감 개체로 만들지 않습니다. 모든 번호를 수집하면 기존 해역 해금 기록을 생성하므로 항해 권한 검사는 기존 경로를 사용합니다. 기존 예약과 해금 기록은 변경하지 않습니다.

등록할 때는 카탈로그 원본에 `fishing_map_blueprints` 배열을 추가하고 `region_id`, `piece_count`, `thumbnail_path`, `enabled`를 지정합니다. 잠긴 신규 해역을 먼저 등록하고 해당 해역을 `region_maps` 판매 상품에 넣지 않습니다. CLI로 빈 migration을 만든 뒤 `db:catalog -- <파일> --table regions --table fishing_map_blueprints`로 생성·검토하고 `db:context`, `db:verify`와 지도 조각 테스트를 실행합니다. 등록 후 조각 수·해역 ID는 변경할 수 없으며, 중단은 `enabled`로 처리합니다. 지도에는 번호별 발견 상태와 진행도가 표시됩니다. 새 해역이나 실제 조각 카탈로그는 이 시스템 설치만으로 생성하지 않습니다.

새 DB는 migrations 순서대로 적용합니다. 기존 원격에는 `20261017054146_map_shop_routes.sql` 다음 `20261017054247_map_shop_catalog.sql`이 필요합니다. 별잠 유적의 실제 이미지 경로는 `map/epic/map-starruins_thumbnail.png`이며 후속 `20261017055506_correct_starruins_map_image.sql`로 정정했습니다. 이 폴더명은 과거 Storage 경로이며 지도 등급을 뜻하지 않습니다. 최초 설치용 통합본 `artifacts/map-shop-install.sql`에는 수정도 포함됩니다. 이미 설치했다면 통합본을 재실행하지 않습니다. 지도 상점 상태 문구는 '보유중'을 사용합니다. 기존 DB에 baseline이나 과거 번호 SQL을 다시 실행하지 않습니다. 원격 DDL 적용 여부는 별도 확인해야 하며 로컬 테스트는 실제 배포의 증거가 아닙니다.

검증: `tests/map-shop-sql.test.ts`, `tests/map-shop-ui.test.tsx`, `tests/collection.test.tsx`, `tests/region-map.test.tsx`. 로컬 전체 검증은 기존 legacy 39~62 동결 목록 불일치가 남아 있습니다.
