# 지역 지도와 공통 등급

현재 지도 획득 방식은 [지도 상점](map-shop.md)입니다. 지도에는 등급을 표시하지 않고, 상점 구매 즉시 해역을 해금합니다. 낚시에서는 지도를 추첨하지 않으며 도감에서도 제외합니다. 아래는 전환 이전 구현 기록으로, SQL 설치 순서는 [DB 관리](database-management.md)와 최신 migrations를 따릅니다.

## 과거 적용 기록
기존 01~10 다음에 `supabase/sql/11-regions/01-regions.sql` 실행. SQL이 public Storage 버킷 `regions`를 생성합니다. `assets/storage-upload/regions/`의 PNG 5개를 버킷 루트에 같은 이름으로 업로드합니다. 원격 SQL과 업로드는 이 작업에서 수행하지 않았습니다.

| 지역 ID / 이미지 | 이름 | 등급 |
| --- | --- | --- |
| pongdang / pongdang.png | 퐁당섬 앞바다 | common / 일반 |
| bluegrove / bluegrove.png | 푸른골 해역 | common / 일반 |
| coral / coral.png | 산호빛 여울 | common / 일반 |
| mistmoon / mistmoon.png | 안개달 해역 | common / 일반 |
| starruins / starruins.png | 별잠 유적 | rare / 희귀 |
| dreamabyss / dreamabyss.png | 꿈먹는 심연 | epic / 특급 |

## 푸른골 해역

맑은 청록빛 얕은 바다 사이로 짙푸른 수중 골짜기가 이어지는 일반 해역입니다. 기존 해역 뒤에 표시하며 지도 조각이 있어야 출항할 수 있습니다. 공통 어종·장식물 58종을 연결해 모든 포획 등급과 장식물 미끼에 후보가 있습니다. 전용 토착 어종은 아직 추가하지 않았습니다. 일반 지도 조각은 기존 지도 추첨 경로를 따릅니다.

등록 SQL은 [20261016155535_bluegrove_region_catalog.sql](../../supabase/migrations/20261016155535_bluegrove_region_catalog.sql)입니다. 기존 카탈로그·서식지·보유 기록은 보존하며 기존 낚시 RPC를 재정의하지 않습니다. 원격 DB 적용은 수행하지 않았습니다. [이미지·업로드 기록과 프롬프트](../../assets/storage-upload/new/20261017-005542/README.md), [낚싯대](rod-inventory.md)를 함께 봅니다.

## 공통 등급
- `public.game_rarity`: common, rare, epic, mythic. 향후 물고기/아이템 rarity 컬럼에도 이 enum을 사용합니다.
- `src/lib/game/rarity.ts`: 한국어 이름, 순위, CSS 클래스. 물고기 포획 UI에서도 재사용합니다.
- `src/components/rarity-badge.tsx`: 공통 등급 배지.
- `src/index.css`: rarity-common(회색), rarity-rare(파랑), rarity-epic(보라), rarity-mythic(임시 금빛), --rarity-glow 토큰.
- 신화 지역과 물고기 포획 기능은 아직 없습니다. 신화 색은 금빛 임시값입니다.

## 지도
- `src/pages/harbor-page.tsx`: 선착장 현재 지역, shadcn Dialog 지도. 현재 지역에서 열기, 이전/다음, 좌우 스와이프, 잠금 흑백 이미지/아이콘. 이름·설명·등급은 잠겨도 표시. 이미지 실패 대체 화면, 로딩/오류/재조회.
- `src/features/regions/api.ts`: 지도/이동 RPC, regions Storage URL.
- `public.regions`: 카탈로그, 표시 순서, 등급, 이미지 경로, 조각 필요 여부.
- `public.player_map_fragments`: (user_id,region_id) 고유 보유 기록. 현재는 조각 1종 보유 여부만 모델링합니다. 획득/소모/조합 방법은 미구현이며 추후 결정합니다.
- `public.player_navigation`: 계정당 현재 지역. 기본 pongdang, DB 저장.
- `region_map`: 본인 현재 지역과 조각 보유 여부, 전체 카탈로그 반환.
- `travel_region`: 존재/인증/조각 보유를 서버에서도 검사 후 현재 지역 변경. 조각을 소모하지 않습니다. 지역 변경만 구현했으며 낚시·난이도 계산은 아직 없습니다.

세 테이블 모두 RLS. 카탈로그는 authenticated SELECT, 개인 데이터는 본인 SELECT만. 클라이언트 INSERT/UPDATE/DELETE 없음. PUBLIC/anon RPC 실행 차단, private DEFINER에 인증 검사 및 빈 search_path. 유저가 직접 지도 조각을 지급하는 RPC는 없습니다. 향후 지급은 신뢰된 서버의 검증된 보상 흐름에 연결해야 합니다.

처음에는 퐁당섬 앞바다만 열립니다. 이후 지도 조각의 서버 보유 기록이 생기면 지도 재열기 때 잠금 해제와 이동 버튼에 반영됩니다. 실제 획득 규칙은 임의로 추가하지 않았습니다. 이미지가 공개되어 있어도 서버의 이동 검사를 우회할 수 없습니다.

## 검증
`tests/social-sql.test.ts`: 최초 지역/등급, 잠긴 이동 차단, 서버 지급 기록 반영, 현재 지역 유지, 다른 사용자 보유 조회/위조 차단.
`tests/region-map.test.tsx`: 모달 열기/넘기기, 잠금 흑백·설명·희귀 색·비활성 버튼.
원격 적용 후 첫 지역과 나머지 4곳 잠금, 등급, 이미지, 설명, 모달 닫기 확인.

## 이미지 생성
built-in image_gen. 정사각형 1:1, 부드러운 카툰 페인팅, 바다 중심 지역 전경, 글자/UI/사람/물고기 없음. 퐁당은 햇살·초록섬·부두, 산호는 파스텔 산호 여울, 안개달은 은빛 안개·초승달, 별잠은 별빛 고대 수중 유적, 심연은 보랏빛 소용돌이·암초. 원본은 assets/storage-upload/regions/에 보관.

지역 잠금 테스트/이동 추가: [출항 시스템](region-travel.md). 12 SQL 추가 적용. 지도 해제 테스트, 5초 스프라이트 전환, /region/:regionId 도착 페이지. 실제 획득 규칙은 아직 미구현.

지역 낚시 연결: 13 SQL과 [낚시 문서](fishing.md). 현재 위치/잠금 검사를 통과한 도착 화면에서 FishingPanel로 낚시합니다. 지역별 포획 확률은 현재 공통입니다.
