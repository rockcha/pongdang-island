# 개체·도감

현재 코드와 SQL 진입점을 설명합니다. 이전 설치·카탈로그 추가·검증 내역은 [구현 기록](../history/collectibles-history.md)에 보존합니다. 원격 적용 상태는 별도 확인 대상입니다.

## 도감과 임시 개체

바다 도감은 아쿠아리움과 지역 낚시 화면에서 여는 모달입니다. 이름 검색과 종류·등급·서식 유형·지역 필터를 함께 적용하며 판매가 오름차순, 이름순, ID순으로 정렬합니다. 서식지가 한 곳이면 토착, 여러 곳이면 공통으로 필터링하고 지도는 이 구분에서 제외합니다. 지역 필터는 선택한 지역 중 한 곳이라도 서식하는 개체를 포함합니다. 낚시 화면에서는 임시 개체 추가 없이 조회만 제공합니다. 낚시 화면 도구와 임시 기록은 [낚시 화면 설계](../design/fishing-minigame.md#낚시-도구와-보관함-기록)를 따릅니다.

카드는 이미지·이름·설명·서식지 아이콘·가치를 표시합니다. 등급은 배경색과 스크린리더 텍스트로 전달하고 상세 모달·발견 상태·보유 수는 표시하지 않습니다. 도감 카드는 공통 썸네일에 species를 전달하지 않아 토착 배지를 표시하지 않습니다. 다른 화면의 배지는 [공통 UI](../ui-conventions.md)를 따릅니다.

카드 우상단 + 버튼으로 지도를 제외한 개체를 현재 어항에 반복 추가하며 도감을 닫지 않습니다. 임시 개체와 편집 값은 React 메모리에만 남고 새로고침하거나 페이지를 떠나면 사라집니다. 실제 보유·판매·선물 데이터와 구분합니다.

## 데이터와 획득

| 데이터 | 역할 |
| --- | --- |
| collectible_species | 종류의 이름·분류·등급·이미지·판매가·이동 설정 |
| collectible_habitats | 종류와 서식지역 연결. 지도는 목적지 지역 |
| player_collectibles | 획득 개체, 소유자, 배치 어항과 변환 값 |
| player_discoveries | 사용자·종류별 첫 발견 |
| fishing_attempts | 낚시 결과와 획득 개체 연결 |

클라이언트 타입은 `src/features/collection/api.ts`의 Species·OwnedCollectible·CatalogEntry입니다. 분류는 fish/trash/decoration/map, 등급은 common/rare/epic/mythic입니다. 물고기 외 분류도 여러 등급을 사용하므로 분류만으로 등급을 제한하지 않습니다.

새 획득·수령 개체는 보관함(tank_id=NULL)에 모으며 지도·판매·미수령 예약 개체는 어항 배정 대상에서 제외합니다. 보관함은 페이지당 50개를 조회하고 실제 어항 정원은 50개입니다. 배정·회수는 move_collectibles, 조회는 collectible_storage와 aquarium_state를 사용합니다. [26 보관함](../../supabase/sql/26-collectible-storage/README.md)을 확인합니다.

낚시의 준비·확정 API와 획득 확률은 [낚시](fishing.md), 예약·지급·재시도 처리는 [62 SQL 안내](../../supabase/sql/62-prepared-fishing/README.md)가 진입점입니다. 초기 cast_fishing·첫 어항 자동 배치 설명은 현재 흐름의 기준으로 사용하지 않습니다.

## 이미지·이동·편집

이미지는 공개 collectibles 버킷에서 읽습니다. 새 생성과 저장 경로는 [에셋 안내](../../assets/README.md)를 따르며 특정 배치의 파일 수·프롬프트를 현재 정책으로 사용하지 않습니다. 스프라이트는 2×2 네 프레임이며 썸네일과 구분합니다. 정적 장식물은 시트 없이 표시할 수 있고 idle_animated 설정을 가진 고정 개체는 제자리 시트를 재생합니다.

이동·렌더링·편집 제한은 [수족관](aquarium.md)에 모읍니다. 종 설정 변경은 종 ID나 이미지 경로로 [SQL 안내](../../supabase/sql/README.md)에서 관련 변경과 후속 SQL을 찾습니다. 과거 추가 순서에서 현재 분류·등급·이동 방식을 추정하지 않습니다.

## 코드와 검증

| 작업 | 코드 | 테스트 |
| --- | --- | --- |
| 도감 검색·필터·카드 | `src/features/collection/collection-dialog.tsx`, `habitat-icons.tsx` | `tests/collection.test.tsx` |
| 임시 추가·편집 | `src/pages/aquarium-page.tsx` | `tests/aquarium-temporary.test.tsx` |
| 보관함·어항 배정 | `src/features/aquarium/collectible-storage-dialog.tsx`, `api.ts` | `tests/collectible-storage-dialog.test.tsx` |
| 토착·서식지 | SQL 30 이후 관련 종 변경 | `tests/native-collectibles-sql.test.ts`, `tests/regional-fishing-sql.test.ts` |

실행 예와 기능별 SQL·테스트 연결은 [시스템 지도](../system-map.md)를 확인합니다. 이미지 교체는 해당 배치 manifest와 검증 스크립트도 확인합니다.
