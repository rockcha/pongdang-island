# 개체·도감·어항 시스템

26부터 새 낚시 개체와 수령한 선물은 보관함(`tank_id=NULL`)에 들어갑니다. 지도·판매·미수령 예약 개체는 제외합니다. 아쿠아리움 보관함에서 여러 개를 골라 내 어항에 배정하며 실제 어항 정원은 50개입니다. `aquarium_state.inhabitants`에는 배치 개체만 반환하고 보관함은 페이지당 50개 조회합니다. 낚시 화면은 전체 보유 개체를 내려받거나 나열하지 않습니다. [26 적용 안내](../../supabase/sql/26-collectible-storage/README.md). 아래 최초 설치·이전 기능 설명은 도입 당시 동작을 포함합니다.

25부터 `decoration`(장식물), Storage `decorations/`를 사용합니다. 장식물 클릭 편집에서 위치·회전(0~360°)·배율(0.5~2배)을 미리 보고 저장하며, 드래그 위치 저장도 유지합니다. 모바일 수조는 화면 좌우를 채웁니다. 기존 DB는 [25 전환·적용 안내](../../supabase/sql/25-decoration-editing/README.md)에 따라 Storage 이동 → 25 → 24 순서로 적용합니다.

24는 일반 장식물 살구 불가사리·동글 따개비 무리·녹슨 꼬마 닻을 추가합니다. 크기 46~58px, 초기 5개 해역의 장식물 추첨 후보이며 생물 모양도 `decoration`로 고정 표시합니다. 기존 드래그 기능으로 수조 벽을 포함한 원하는 위치에 배치합니다. [등록·이미지 업로드 안내](../../supabase/sql/24-common-decorations/README.md).

최신 기준: 25 SQL(장식물 전환·회전·배율 저장). 기본 스키마 적용은 15 → 16 → 17, 추가 어종은 18(일반 5종)·19(대형 일반 5종), 20(기존 희귀 5종을 일반으로 변경), 21(희귀 상어·고래 5종)입니다. 이후 22(위치·판매), 23(선물), 25(장식물 편집), 24(장식물 3종)를 적용합니다. 이 문서는 저장소 코드 기준이며 원격 DB 적용 여부를 의미하지 않습니다.

## Phaser 어항 렌더링

22 기능: 모든 어항 개체를 드래그해 놓고 위치를 저장할 수 있습니다. 같은 종은 좌측 상단 목록 모달에서 ×N으로 묶어 표시하고 카테고리·등급별로 필터링합니다. 우측 상단 버튼으로 확대 상세보기 모달을 열 수 있습니다. 판매 수량은 실제 보유 개체만 세며 판매 후 어항·골드가 갱신됩니다. 상세 설정과 서버 권한 검증은 [22 적용 안내](../../supabase/sql/22-aquarium-management/README.md)를 참고하세요.

Phaser 4.2.1을 버전 고정으로 사용합니다. React는 어항 설정·배경·테스트 선택 UI와 접근성용 개체 이름 목록을 담당하고, 개체와 유리 클릭 효과는 Phaser의 투명 캔버스 하나에서 그립니다. AUTO 렌더러가 WebGL을 사용하고 사용 불가능하면 Canvas를 선택합니다. 엔진은 어항 컴포넌트에서 동적으로 불러옵니다.

같은 이미지 경로는 텍스처 하나를 공유합니다. 보유 개체 ID를 기준으로 Sprite를 추가·삭제하고 기존 개체의 정지·이동·회피 상태는 유지합니다. 장식물은 고정, 쓰레기는 회전하며 fish와 trash가 클릭에 반응합니다. 화면 크기 변경 시 Phaser 캔버스 크기도 변경합니다. 화면 밖 또는 숨겨진 탭에서는 렌더 루프를 멈추고, 화면을 떠날 때 게임·캔버스·리스너·텍스처를 정리합니다. 이미지 로딩 실패는 화면에 안내합니다.

검증: 전체 112개 테스트와 프로덕션 빌드 통과. 로컬 Chrome WebGL에서 250개체 / 공유 텍스처 5개를 실제 로딩하여 클릭 효과·개체 삭제·리사이즈·비가시 상태 정지·모션 감소·숨긴 상태에서 destroy를 확인했습니다. 이는 기능 검증이며 모바일 FPS나 이전 구현 대비 성능 개선 수치를 측정한 벤치마크는 아닙니다.

## 테이블 구조와 관계

20은 기존 19로 등록한 대형 5종을 common으로 변경합니다. 판매가는 180~260으로 유지하며 기존 보유 개체에도 변경 등급이 반영됩니다. 이미지 재업로드 없이 기존 fish/rare 경로를 사용합니다. 현재 19 등록 파일도 common으로 수정되어 재실행해도 희귀로 되돌아가지 않습니다.

`collectible_species`는 종류별 공통 설정, `player_collectibles`는 실제 획득한 개체입니다. 멸치를 세 번 잡으면 species는 한 행, player_collectibles는 세 행입니다. 종류의 이름·이미지·크기를 수정하면 그 종류의 보유 개체에도 반영됩니다.

| 테이블 | 한 행의 의미 | 키와 연결 |
| --- | --- | --- |
| collectible_species | 어종/아이템 한 종류 | PK id(text), 예: silver-anchovy |
| collectible_habitats | 한 종류와 한 지역 연결 | 복합 PK (species_id,region_id), species·regions FK |
| player_collectibles | 실제 보유 개체 한 마리/아이템 하나 | PK id(uuid), species_id → species, user_id → auth.users |
| player_discoveries | 사용자의 종류별 첫 발견 | 복합 PK (user_id,species_id), discovered_at으로 시각 저장 |
| fishing_attempts | 낚시 시도 한 번 | collectible_id → player_collectibles; 실패 시 NULL |
| aquarium_tanks | 사용자 어항 하나 | 보유 개체의 (tank_id,user_id) FK로 소유자가 같은 어항만 연결 |

### collectible_species 컬럼 (16 이후)

| 컬럼 | 타입 | 의미·제약 |
| --- | --- | --- |
| id | text PK | 종류 고유 ID |
| kind | collectible_kind enum | fish, trash, decoration, map |
| name / description | text NOT NULL | 표시 이름·설명 |
| rarity | game_rarity enum NOT NULL | common, rare, epic, mythic; 물고기 외 종류는 common |
| size | integer | 표시 컨테이너 16~180px; 작은 어항에서는 너비 40% 이하 |
| swim_y_min / swim_y_max | numeric | 이동 높이 비율 0~1; fish/trash는 필수, decoration/map은 NULL |
| speed | numeric | 0~0.5; fish/trash는 양수, decoration/map은 0. 현재 이동 주기를 정하는 기준값 |
| sprite_sheet_path | text | fish는 비어 있지 않은 경로 필수, 나머지는 NULL |
| thumbnail_path | text NOT NULL | 버킷 내부 썸네일 경로 |
| sell_price | integer | 판매가 0~1,000,000; 22에서 판매 UI와 서버 판매 RPC 구현 |

15의 sprite_paths 배열은 16에서 삭제되고 sprite_sheet_path로 바뀝니다. 18·19는 16/17 적용 후 실행합니다.

### player_collectibles 컬럼

| 컬럼 | 타입 | 의미 |
| --- | --- | --- |
| id | uuid PK | 개체 고유 ID, 기본값 gen_random_uuid() |
| user_id | uuid NOT NULL | 소유자 |
| species_id | text NOT NULL | 종류 ID |
| tank_id | uuid, NULL 허용 | 배치 어항; 지도는 어항에 배치하지 않음 |
| map_region_id | text, NULL 허용 | 지도 목적지 regions ID |
| animation_seed | integer | 획득 시 무작위 seed, 개체 ID와 함께 개인별 유영 경로 생성 |
| position_x / position_y | numeric, NULL 허용 | 0~1 배치 좌표; 장식물 배치 및 유영 개체의 저장된 시작 위치에 사용 |
| rotation / scale | numeric NOT NULL, 기본 0 / 1 | 25에서 추가. 장식물 회전 0~360°, 배율 0.5~2. 개체별 저장 |
| acquired_at | timestamptz | 획득 시각, 기본값 now() |
| sold_at | timestamptz, NULL 허용 | 판매 시각; NULL인 행만 보유 목록에 표시 |

같은 종을 다시 잡아도 player_discoveries는 복합 PK와 ON CONFLICT로 최초 발견 한 행만 유지합니다.

## 새 어종 추가 방식

물고기의 행동은 개체별 6초 간격으로 결정합니다. 약 30%는 2~4초 정지 후 천천히 출발하고, 약 8%는 1.2초 짧은 가속을 하며 나머지는 평소 유영합니다. 정지 중에도 지느러미 프레임은 느리게 재생됩니다. 클릭 회피 거리는 최대 32px의 작은 반응으로 줄였으며 약 0.65초 동안 살짝 이동한 뒤 짧게 같은 방향으로 흐르고, 약 1.8초 후 피한 위치와 방향에서 평소 유영을 이어갑니다. 원래 위치로 끌려오는 보간은 없습니다. 이 행동 변화는 fish에만 적용합니다.

어항에 포인터를 올리면 클릭 커서가 표시됩니다. 클릭/터치 지점에 유리를 두드리는 빛·원형 파동이 나타나고 근처 fish와 trash 개체가 반대 방향으로 살짝 이동합니다. 물고기는 회피 방향으로 약 1.8초 이동한 뒤 그 방향을 유지하는 경로로 이어가며, 쓰레기는 기존 회전을 유지합니다. 장식물과 먼 개체는 반응하지 않습니다. 모션 감소 설정에서는 도망 이동 없이 짧은 시각 표시만 제공합니다. 구현: tank-inhabitants.tsx, phaser-tank.ts, inhabitant-motion.ts. DB 변경은 없습니다.

21은 푸른 백상아리·모래 귀상어·별점 고래상어·밤빛 범고래·구름 혹등고래를 rare로 추가합니다. 크기 128~172px, 판매가 340~520, 높이 범위 0.15~0.80이며 초기 5개 해역에서 희귀 추첨 후보가 됩니다. 게임의 fish는 유영 개체 분류라 고래도 같은 kind를 사용합니다. [업로드 안내](../../assets/storage-upload/RARE-SHARKS-WHALES.md), [등록 SQL](../../supabase/sql/21-rare-sharks-whales/01-rare-sharks-whales.sql), 검증 스크립트 scripts/verify-rare-sharks-whales.mjs를 참고합니다. 21까지 적용한 전체 카탈로그는 22종(유영 생물 19종·기타 3종), PNG 41장입니다.

아쿠아리움 상단 바다 도감에서 물고기·장식물·쓰레기 상세를 열고 임시 넣기 버튼을 누르면 현재 어항에 표시됩니다. 미발견 개체도 추가할 수 있으며 지도는 제외합니다. 같은 종을 여러 번 넣을 수 있고 장식물 편집도 가능합니다. React 메모리에만 보관하며 DB·로컬 스토리지에 저장하지 않습니다. 새로고침하거나 아쿠아리움을 떠나면 사라집니다. 구현은 src/features/collection/collection-dialog.tsx와 src/pages/aquarium-page.tsx입니다.

1. 종류 ID·이름·설명·등급·크기·속도·높이·판매가를 정합니다.
2. 투명 2×2 4프레임 스프라이트와 별도 썸네일을 collectibles 버킷에 업로드합니다.
3. species에 설정을 등록하고 habitats에 낚시 가능한 지역을 연결합니다. 서식지 연결이 없으면 물고기 추첨 후보에 포함되지 않습니다.
4. SQL 마지막 조회로 설정과 서식지를 확인합니다. 이후 낚시에서 획득하면 보유 개체와 발견 기록이 자동 생성됩니다.

| 추가 SQL | 종류 | 크기 | 서식지 | 안내 |
| --- | --- | --- | --- | --- |
| [18](../../supabase/sql/18-common-ocean-fish/01-common-ocean-fish.sql) | 은빛 멸치·줄무늬 고등어·통통 전갱이·모래 망둑어·동글 쥐치 / common | 48~76px | pongdang, coral, mistmoon | [일반 5종](../../assets/storage-upload/COMMON-OCEAN-FISH.md) |
| [19](../../supabase/sql/19-rare-ocean-fish/01-rare-ocean-fish.sql) | 푸른 돛새치·산호빛 참돔·얼룩 왕그루퍼·은빛 방어·민트 만새기 / common | 96~120px | 초기 5개 지역 모두 | [대형 일반 5종](../../assets/storage-upload/RARE-OCEAN-FISH.md) |

18·19까지 적용하면 총 17종(물고기 14종, 기타 3종), PNG 31장입니다. 아래의 7종·11장 설명은 최초 기본 샘플 기준입니다.
18·19는 반복 실행 가능하며 기존 보유 개체·골드·미끼·어항을 보존합니다. 종류 설정을 갱신하고 부족한 서식지를 추가하지만 서식지 행을 삭제하지는 않습니다. 같은 등급 후보가 늘면 기존 종류의 상대 추첨 비율은 낮아지며 등급 당첨 확률은 유지됩니다.

로컬 검증: node scripts/verify-common-ocean-fish.mjs 및 node scripts/verify-rare-ocean-fish.mjs. PGlite에서 실제 카탈로그 DDL에 각 SQL을 두 번 적용해 제약·중복 방지·파일 경로·서식지 수를 확인합니다.

## 적용 및 초기화

01~14 적용 뒤 `supabase/sql/15-collectibles/01-collectibles.sql`을 SQL Editor에서 실행합니다. **모든 사용자의 기존 fishing_attempts 기록을 비우고 player_catch_counts 테이블을 제거합니다.** 골드, 미끼 재고, 거래 기록, 어항 및 배경은 보존합니다. 이 파일은 최초 한 번 적용하는 마이그레이션입니다. 로컬 파일 작성과 테스트만 수행했으며 원격 DB에는 자동 적용하지 않았습니다.

## 모델과 진입점

- `collectible_species`: 이름, 설명, kind, 크기(px), 등급, 판매가격, 썸네일, 2×2 4프레임 시트 한 장(sprite_sheet_path), swim_y_min/max(화면 높이의 0~1), speed(초당 어항 너비 비율).
- `collectible_habitats`: 한 종에 여러 서식 지역 연결. 샘플은 모든 지역에 서식합니다.
- `player_collectibles`: 획득 개체, 소유자, 어항, 지도 목적지, 애니메이션 seed, 미래 배치 좌표. 같은 종도 여러 개체를 소유합니다.
- `player_discoveries`: 개체와 별도로 유지하는 발견 도감.
- `fishing_attempts.collectible_id`: 해당 낚시에서 받은 개체. 실패면 null.
- `src/features/collection/`: API, 썸네일, `/collection` 바다 도감.
- `src/features/fishing/`: 구매·미끼 선택·낚시 모달·보유 개체 표시.
- `src/features/aquarium/tank-inhabitants.tsx`: 물고기 4프레임 유영, 쓰레기 회전 유영, 장식물 고정 표시.

샘플: 일반 퐁울복, 희귀 달물결 엔젤피쉬, 특급 별꼬리 가오리, 신화 여명 아로와나, 일반 쓰레기 잊힌 유리병, 일반 장식물 산호빛 작은 집, 일반 지도 잊힌 항로 조각. 물고기마다 시트 한 장과 썸네일 한 장을 사용합니다. 전체 7종, PNG 11개입니다.

## 획득 규칙

기존 미끼별 등급/실패 확률과 최소 등급 보장은 유지합니다. 등급 추첨 후 그 등급에 맞는 지역 후보 중 균등 추첨합니다. 일반 성공 후보에는 일반 물고기와 쓰레기, 해당 등급의 미해금 지도 목적지가 포함됩니다. 심해 인력석은 장식물을 보장하며 이제 사용 가능합니다.

지도·장식물·쓰레기는 모두 일반 등급입니다. 지도는 아직 잠긴 일반 지역(산호빛 여울·안개달 해역)만 목적지 후보입니다. 희귀·특급·신화 성공은 해당 등급 물고기를 받습니다. 지도 획득 즉시 player_map_fragments에 저장되어 항로가 열리고, 이미 해금된 목적지는 다음 추첨에서 빠집니다. 지도는 인벤에 보관하며 어항에 넣지 않습니다. 지도 habitat은 목적지, 나머지 종의 habitat은 낚시 가능한 지역을 의미합니다.

물고기·쓰레기·장식물은 무료 첫 어항(is_default)에 자동 배치합니다. 물고기는 swimY 범위 내 이동, 쓰레기는 썸네일 회전, 장식물은 고정됩니다. 22에서 드래그 위치 저장과 수량 판매를 구현했습니다. [적용 안내](../../supabase/sql/22-aquarium-management/README.md)를 참고하세요.

## 저장소

공개 `collectibles` 버킷에 `assets/storage-upload/collectibles/`의 fish/map/decorations/trash 폴더를 그대로 업로드합니다. 예: collectibles/fish/normal/pongul_sprite.png. 기존 개별 프레임 23개는 폐기하고 새 파일 11개를 사용합니다. [업로드 목록](../../assets/storage-upload/collectibles/README.md). Dashboard에서 직접 업로드하고 클라이언트 업로드 권한은 열지 않습니다. 버킷 공개 이미지와 개인 보유 데이터의 RLS 권한은 별개입니다.

## 안전성과 검증

공개 RPC collection_state/fishing_state/cast_fishing와 aquarium_state가 상태를 제공합니다. 개인 테이블은 본인 SELECT만 가능하고 직접 INSERT/UPDATE는 차단합니다. 낚시는 지역 advisory lock과 지갑 행 잠금 안에서 소모·개체·발견·지도·결과를 함께 저장합니다. 같은 operation_id 재시도는 같은 개체를 반환하며 미끼를 다시 소모하지 않습니다.

SQL 테스트는 기존 기록 삭제/지갑·어항 보존, 등급 확률, 재시도, 첫 어항 배치, 쓰레기 성공, 장식물 보장, 미해금 지도 획득/중복 제외, 소유권 격리를 확인합니다. 도감 UI 테스트는 필터와 상세 정보를 확인합니다. 이미지들은 built-in image_gen으로 생성한 투명 배경 정사각형 카툰 에셋입니다.

## 16 적용과 시트 재생

15가 이미 적용됐다면 16 → 17을 추가 실행합니다. 16까지 적용했다면 `supabase/sql/17-collectible-paths/01-paths.sql`만 실행합니다. 아직 15 이전이면 15 → 16 → 17 순서입니다. 15는 초기 낚시 기록 초기화, 16은 기존 보유 개체·골드·미끼·어항을 보존하며 이미지 경로/등급/추첨 규칙을 변경합니다. 16은 sprite_paths를 제거하고 sprite_sheet_path를 추가합니다. 원격 적용은 사용자가 SQL Editor에서 수행합니다.

시트는 같은 크기의 정사각형 셀 2×2, 순서는 좌상→우상→좌하→우하입니다. 현재 재생은 이동 행동에 따라 정지 중 느리게, 이동·가속 중 빠르게 전환합니다. Phaser가 원본 이미지 크기로 네 프레임을 분할하여 Sprite.setFrame으로 재생합니다. 개별 DOM 스타일을 프레임마다 변경하지 않고 하나의 투명 캔버스에서 렌더링합니다. 시스템 모션 감소 설정 시 첫 프레임으로 정지합니다. 기본 프롬프트는 assets/storage-upload/collectibles/GENERATION.md, 추가 어종 프롬프트는 assets/storage-upload/common-ocean-fish-prompts.json 및 rare-ocean-fish-prompts.json에 기록합니다.

유영 행동 계산은 src/features/aquarium/swim-motion.ts, 개체별 위치·회피 상태는 inhabitant-motion.ts, Phaser 렌더링은 phaser-tank.ts, React 연결은 tank-inhabitants.tsx입니다. 개체 ID와 animation_seed로 좌우 목적지와 이동 주기를 다르게 만들며 목적지 간 이동 가능 폭의 최소 44% 거리를 확보합니다. 어종의 높이 범위 안에서 좌우 이동보다 느린 독립적인 높이 변화로 완만한 대각선·곡선 경로를 만듭니다. 진행 방향에 맞춰 몸이 최대 30도 기울고 각도는 부드럽게 보간합니다. 주기적인 상하 흔들림은 없습니다. speed는 현재 목적지 이동 시간의 기준값이므로 실제 초당 이동 비율과 정확히 같지는 않습니다.

검증: tests/tank-inhabitants.test.tsx는 렌더러 생성·목록 변경·정리·오류 표시를 확인하고 tests/inhabitant-motion.test.ts와 tests/swim-motion.test.ts는 이동·정지·가속·회피 후 위치 유지·장식물 고정·모션 감소를 확인합니다. SQL 테스트는 정확히 7종·일반 등급의 지도/쓰레기/장식물·물고기 시트 제약·일반 지도 후보와 희귀 보장 미끼를 확인합니다.

## Storage 폴더 구조
물고기는 fish/normal, fish/rare, fish/epic, fish/mythic 아래에 종이름_sprite.png와 종이름_thumbnail.png를 함께 둡니다. map, decorations, trash도 normal/rare/epic/mythic 하위에 종이름_thumbnail.png를 둡니다. 현재 3종은 모두 normal입니다. v2 경로는 제거했습니다. 17 SQL은 경로 변경만 수행하며 반복 실행 가능합니다. 정확한 파일명은 업로드 목록을 참고합니다.

공통 등급 폴더: fish/trash/map/decorations 모두 normal·rare·epic·mythic으로 구분합니다. 기존 일반 쓰레기·지도·장식물 이미지는 각각 normal로 이동했습니다. 수정된 17 SQL을 재실행하면 DB 경로가 갱신됩니다.

## 추가 장식물 5종 (27)

라벤더 불가사리·민트 불가사리·꼬마 나무 팻말은 일반, 물결 산호 조각·버터 불가사리는 희귀 장식물입니다. [27 SQL 및 설정](../../supabase/sql/27-new-decorations/README.md). 새 이미지는 assets/storage-upload/new 아래에 모으며 업로드 시 new를 제외한 decorations/normal·rare 경로를 사용합니다. 기존 공통 등급 제약은 장식물의 여러 등급을 허용하도록 조정합니다.

## 해변 장식물 5종 (28)

길 잃은 화살표 팻말·소라빛 바람개비·진주 품은 조개는 일반, 잠든 꼬마 난파선·잠긴 우체통은 희귀입니다. 새 PNG는 assets/storage-upload/new 바로 아래에 저장하고 Storage 업로드 시 등급별로 분류합니다. [등록·업로드 경로](../../supabase/sql/28-coastal-decorations/README.md). 바람개비도 정적 장식물입니다.

## 희귀 장식물·퐁이 석상 (29)

달빛 해파리 풍등·산호 덮인 보물상자·잠든 해마 석상은 희귀, 퐁이 석상은 특급(epic)입니다. 진주 품은 조개는 일반·판매가 45골드로 조정하며 이미지는 그대로 사용합니다. [29 적용 안내](../../supabase/sql/29-statue-decorations/README.md). 새 PNG 4장은 assets/storage-upload/new 바로 아래에 있습니다.

## 토착 여부 (30)

native_region_id가 있는 물고기·쓰레기·장식물은 is_native=true로 자동 계산되며 해당 지역 하나에만 서식합니다. 관리자는 같은 트랜잭션에서 지정과 서식지 정리를 수행합니다. 도감 상세에서 토착 여부를 확인합니다. 기존 개체는 비토착으로 유지하며 산호빛 작은 집은 희귀로 변경합니다. 안개달 해역도 희귀이며 지도 추첨은 목적지 등급을 따릅니다. [30 SQL 안내](../../supabase/sql/30-native-collectibles/README.md).

## 안개달 토착 개체·지역 아이콘 (31)

쓰레기 2종(일반), 어종 2종(희귀), 장식물 2종(희귀)을 안개달 단일 서식지로 등록합니다. 공통 썸네일의 토착 배지는 public/region-icons의 지역별 SVG를 사용하며 도감·보관함·개체 목록·낚시 결과·우편함에 표시합니다. [31 등록·업로드 안내](../../supabase/sql/31-mistmoon-natives/README.md).

## 지역 지도·퐁당 토착 (32)

지역별 지도 5종은 지역과 동일 등급입니다. 기존 ocean-map은 보유 기록을 유지하고 새 추첨·카탈로그에서 제외합니다. 이름에 퐁당이 포함된 어종·쓰레기·장식물은 퐁당 토착으로 지정됩니다. 잠수부 퐁당이(특급 유영 개체), 퐁당 물고기(희귀 어종)를 등록합니다. 새 이미지는 assets/storage-upload/new/regional-fishing/. [32 안내](../../supabase/sql/32-regional-fishing/README.md).

## 구형 지도 제거 (34)

ocean-map은 지역별 지도 5종으로 대체하고 제거합니다. 유효한 목적지가 있는 기존 개체는 같은 ID로 새 지도 종류에 연결하며 발견 기록도 옮깁니다. 목적지가 없는 예외 개체는 제거하고 낚시 기록 연결만 해제합니다. 해금은 유지합니다. [34 SQL 안내](../../supabase/sql/34-remove-ocean-map/README.md).

## 개체 이동 방식 (35)

collectible_species의 movement_type(swim/pulse/crawl/fixed), flip_with_direction, travel_direction(both/left/right)을 렌더러가 읽습니다. 기존 어종은 유영·반전, 쓰레기는 부유·회전, 장식물은 고정을 유지합니다. 해파리는 pulse/반전 없음, 정면 꽃게는 crawl/반전 없음으로 설정할 수 있습니다. 새 개체는 추가하지 않습니다. [35 SQL과 설정 예시](../../supabase/sql/35-collectible-movement/README.md).

## pulse·crawl 어종 (36)

산호빛 여울 토착 6종은 [38 SQL](../../supabase/sql/38-coral-natives/01-coral-natives.sql)로 등록합니다. 산호콩 새우·분홍턱 베도라치(일반), 꽃산호 해룡·산호부채 나비고기·산호꽃 말미잘(희귀), 산호왕관 거북(특급)입니다. 말미잘은 장식물이고 나머지는 어종이며 모두 coral 서식지 하나로 제한됩니다. 저장된 등급별 그림체 참고를 적용하고 기존 산호 지역 토착 아이콘을 사용합니다.

공통 어종 18종은 [37 SQL](../../supabase/sql/37-shared-sea-species/01-shared-sea-species.sql)로 등록합니다. 일반 9종·희귀 6종·특급 3종이며 모두 기존 5개 해역 공통 서식이고 토착 아이콘은 붙이지 않습니다. 각 개체에 단일 썸네일·2×2 네 프레임 스프라이트와 swim/pulse/crawl 이동을 설정합니다.

도감은 판매가 낮은 순으로 표시하며, 같은 가격은 이름순으로 정렬합니다. 종류와 등급(일반·희귀·특급·신화) 필터를 함께 적용할 수 있습니다.

달방울 해파리는 안개달 토착 희귀 pulse, 산호집게 꽃게는 산호빛 여울 토착 희귀 crawl입니다. 복숭아 우산해파리는 일반 pulse, 조약돌 소라게는 일반 crawl이며 기존 5개 지역 공통입니다. 모두 kind=fish, 반전 없음, 전용 2×2 시트입니다. 새 PNG는 assets/storage-upload/new/20261015-114904/fish/normal·rare에 정리합니다. [36 안내](../../supabase/sql/36-pulse-crawl-species/README.md).
