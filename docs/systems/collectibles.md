# 개체·도감·어항 시스템

최신 기준: 17 SQL (15 → 16 → 17). 이전 등급별 수량/최근 기록 화면을 실제 개체 인벤토리로 교체했습니다.

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
- `src/features/aquarium/tank-inhabitants.tsx`: 물고기 4프레임 유영, 쓰레기 회전 유영, 구조물 고정 표시.

샘플: 일반 퐁울복, 희귀 달물결 엔젤피쉬, 특급 별꼬리 가오리, 신화 여명 아로와나, 일반 쓰레기 잊힌 유리병, 일반 구조물 산호빛 작은 집, 일반 지도 잊힌 항로 조각. 물고기마다 시트 한 장과 썸네일 한 장을 사용합니다. 전체 7종, PNG 11개입니다.

## 획득 규칙

기존 미끼별 등급/실패 확률과 최소 등급 보장은 유지합니다. 등급 추첨 후 그 등급에 맞는 지역 후보 중 균등 추첨합니다. 일반 성공 후보에는 일반 물고기와 쓰레기, 해당 등급의 미해금 지도 목적지가 포함됩니다. 심해 인력석은 구조물을 보장하며 이제 사용 가능합니다.

지도·구조물·쓰레기는 모두 일반 등급입니다. 지도는 아직 잠긴 일반 지역(산호빛 여울·안개달 해역)만 목적지 후보입니다. 희귀·특급·신화 성공은 해당 등급 물고기를 받습니다. 지도 획득 즉시 player_map_fragments에 저장되어 항로가 열리고, 이미 해금된 목적지는 다음 추첨에서 빠집니다. 지도는 인벤에 보관하며 어항에 넣지 않습니다. 지도 habitat은 목적지, 나머지 종의 habitat은 낚시 가능한 지역을 의미합니다.

물고기·쓰레기·구조물은 무료 첫 어항(is_default)에 자동 배치합니다. 물고기는 swimY 범위 내 이동, 쓰레기는 썸네일 회전, 구조물은 고정됩니다. 위치 지정 UI와 개체 판매 UI는 아직 구현하지 않았고 가격/좌표 데이터만 준비했습니다.

## 저장소

공개 `collectibles` 버킷에 `assets/storage-upload/collectibles/`의 fish/map/structures/trash 폴더를 그대로 업로드합니다. 예: collectibles/fish/normal/pongul_sprite.png. 기존 개별 프레임 23개는 폐기하고 새 파일 11개를 사용합니다. [업로드 목록](../../assets/storage-upload/collectibles/README.md). Dashboard에서 직접 업로드하고 클라이언트 업로드 권한은 열지 않습니다. 버킷 공개 이미지와 개인 보유 데이터의 RLS 권한은 별개입니다.

## 안전성과 검증

공개 RPC collection_state/fishing_state/cast_fishing와 aquarium_state가 상태를 제공합니다. 개인 테이블은 본인 SELECT만 가능하고 직접 INSERT/UPDATE는 차단합니다. 낚시는 지역 advisory lock과 지갑 행 잠금 안에서 소모·개체·발견·지도·결과를 함께 저장합니다. 같은 operation_id 재시도는 같은 개체를 반환하며 미끼를 다시 소모하지 않습니다.

SQL 테스트는 기존 기록 삭제/지갑·어항 보존, 등급 확률, 재시도, 첫 어항 배치, 쓰레기 성공, 구조물 보장, 미해금 지도 획득/중복 제외, 소유권 격리를 확인합니다. 도감 UI 테스트는 필터와 상세 정보를 확인합니다. 이미지들은 built-in image_gen으로 생성한 투명 배경 정사각형 카툰 에셋입니다.

## 16 적용과 시트 재생

15가 이미 적용됐다면 16 → 17을 추가 실행합니다. 16까지 적용했다면 `supabase/sql/17-collectible-paths/01-paths.sql`만 실행합니다. 아직 15 이전이면 15 → 16 → 17 순서입니다. 15는 초기 낚시 기록 초기화, 16은 기존 보유 개체·골드·미끼·어항을 보존하며 이미지 경로/등급/추첨 규칙을 변경합니다. 16은 sprite_paths를 제거하고 sprite_sheet_path를 추가합니다. 원격 적용은 사용자가 SQL Editor에서 수행합니다.

시트는 같은 크기의 정사각형 셀 2×2, 순서는 좌상→우상→좌하→우하, 초당 5프레임입니다. CSS background-size 200% 200%와 background-position으로 한 셀씩 보여주며 시트 DOM 자체는 이동하지 않습니다. 유영은 별도 바깥 요소가 담당합니다. 시스템 모션 감소 설정 시 정지합니다. 퐁이를 스타일 참조로 둥근 윤곽·갈색 선·따뜻한 음영의 카툰풍으로 재생성했습니다. 프롬프트는 assets/storage-upload/collectibles/GENERATION.md에 기록합니다.

검증: tests/tank-inhabitants.test.tsx는 한 시트의 네 셀만 전환되는지와 쓰레기 회전/구조물 고정을 확인합니다. SQL 테스트는 정확히 7종·일반 등급의 지도/쓰레기/구조물·물고기 시트 제약·일반 지도 후보와 희귀 보장 미끼를 확인합니다.

## Storage 폴더 구조
물고기는 fish/normal, fish/rare, fish/epic, fish/mythic 아래에 종이름_sprite.png와 종이름_thumbnail.png를 함께 둡니다. map, structures, trash도 normal/rare/epic/mythic 하위에 종이름_thumbnail.png를 둡니다. 현재 3종은 모두 normal입니다. v2 경로는 제거했습니다. 17 SQL은 경로 변경만 수행하며 반복 실행 가능합니다. 정확한 파일명은 업로드 목록을 참고합니다.

공통 등급 폴더: fish/trash/map/structures 모두 normal·rare·epic·mythic으로 구분합니다. 기존 일반 쓰레기·지도·구조물 이미지는 각각 normal로 이동했습니다. 수정된 17 SQL을 재실행하면 DB 경로가 갱신됩니다.
