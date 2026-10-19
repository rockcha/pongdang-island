# 수족관·배경·렌더링

현재 코드의 진입점과 데이터 흐름입니다. 이전 생성·설치·이동 변경 내역은 [구현 기록](../history/aquarium-history.md)에 보존합니다. 화면 기준은 [공통 UI](../ui-conventions.md), 구매·이름·전환은 [어항 관리](aquarium-tanks.md)를 따릅니다.

## 배경과 상태

등급별 제작 기준과 미제작 테마 추천은 [테마 등급 기획](aquarium-theme-tiers.md)을 따른다.

테마 등급은 가격이나 희귀도가 아니라 화면의 디테일 기준이다. 심플은 물빛과 여백 중심, 감성은 빛·색감·자연 풍경을 더한 배경, 스페셜은 건물·소품으로 공간을 구성한 배경이다. 물고기가 잘 보이는 중앙 여백은 모든 등급에서 유지한다. 등급은 카탈로그 원본의 tier로 관리하고, 테마 창의 보유·구매 목록 모두 같은 필터를 적용한다. 기존 가격과 보유권은 등급 변경만으로 바꾸지 않는다.

`src/pages/aquarium-page.tsx`가 상태와 작업을 연결하고 `src/features/aquarium/aquarium-view.tsx`가 수조를 표시합니다. aquarium_state는 어항, 배경 카탈로그·보유 목록, 배치 개체, 보관 수와 정원을 반환합니다. 실제 개체와 임시 추가는 [개체 문서](collectibles.md)를 확인합니다.

배경은 공개 aquarium-backgrounds 버킷에서 읽고 수조 전체에 object-cover로 표시합니다. 이미지 로딩 실패 시 대체 배경을 사용합니다. 세로 배경 원본은 [배경 이미지 안내](../../assets/storage-upload/aquarium-backgrounds-portrait/README.md)에 있습니다. 파일 존재 여부는 원격 업로드를 뜻하지 않습니다.

배경 구매는 aquarium_background, 어항별 장착은 manage_aquarium_tank를 사용합니다. 서버가 가격·보유 여부를 검증하고 구매 operation_id 재시도로 중복 차감하지 않습니다. 초기 구조는 SQL 09·10이 진입점입니다.

## 렌더링과 이동

양방향 유영 개체를 드래그하면 놓은 위치에서 새 로컬 경로를 시작하며 현재 진행 방향을 유지합니다(가장자리에서는 안쪽). 예전 경로의 시간·위치 오프셋을 이어 쓰지 않습니다. 변경 없는 서버 스냅샷은 로컬 드래그 위치를 덮어쓰지 않습니다. 실제 서버 배치 좌표가 변경된 경우에는 반영합니다. 드래그 종료 시 이동 차분과 회전 상태도 초기화합니다. 이 동작은 서버 저장 기능을 추가하지 않습니다.

신화 어종은 4×2의 8프레임 시트를 사용합니다. 앞 4장은 기본 동작, 뒤 4장은 개체별 추가 행동이며 6초 주기로 재생합니다. 모션 감소 설정에서는 0프레임을 표시합니다. 몸통 기준점의 이동만 보정하고 프레임별 크기·전체 불투명도를 바꾸지 않습니다. 새 신화 어종을 추가할 때는 시트 생성과 mythic-swim.ts 연결을 함께 완료해야 하며, tests/mythic-swim.test.ts가 카탈로그 전체의 누락을 검사합니다.

유영 시트는 `public/aquarium/swim/lunea-mistmoon-goddess_swim8_sprite.png`에서 앱과 함께 제공합니다. SQL·Storage 업로드 없이 동작하며 원본·프롬프트·검수 기록은 [생성 배치](../../assets/storage-upload/new/20261017-091000/README.md)에 보관합니다. [미리보기](../../artifacts/lunea-turn-preview.html)에서 유영과 포즈 정지 비교를 할 수 있습니다.

React의 tank-inhabitants.tsx가 Phaser 렌더러를 연결합니다. phaser-tank.ts는 투명 캔버스와 공유 텍스처를 사용하고 일반 시트는 2×2, 신화 행동 시트는 4×2로 나눕니다. 생성·개체 변경·리사이즈·화면 비가시 상태·정리를 관리합니다. 기포는 tank-bubbles.tsx와 CSS가 표시하며 모션 감소 설정에서 숨깁니다.

| 설정 | 현재 클라이언트 해석 |
| --- | --- |
| movement_type | swim/pulse/crawl/fixed. 장식물·지도는 fixed |
| travel_direction | both/left/right. 장식물·지도는 both |
| 그림 방향 | movement-settings.ts에서 경로별 검토 값 우선, 이후 DB facing_direction |
| 진행 방향 반전 | 이동 중 fish 또는 flip_with_direction=true인 개체. fixed 제외 |
| idle_animated | 편집 가능한 고정 개체의 제자리 네 프레임을 약 1.2fps로 재생. 편집 중·모션 감소 시 프레임 0 |

inhabitant-motion.ts와 swim-motion.ts가 위치·정지·가속·클릭 회피를 계산합니다. 평상시 유영은 몸통 각도를 0도로 유지하고 클릭 회피의 기울기는 복귀시킵니다. swim-frame-layout.ts는 이미지 경로별 프레임 기준점·배율을 보정합니다. 시트 교체 시 방향과 기준점을 함께 검토합니다.

## 드래그와 편집

영구 변환 편집 대상은 장식물과 movement_type=fixed인 fish입니다. 좌우 반전, 15도 회전, 0.1배 크기 변경(0.5~2배)을 자동 저장합니다. 변환 시 중심과 도구 모음 기준점을 유지하고 유리 가장자리에서는 범위 안으로 보정합니다. 유리 배경을 누르면 선택을 해제합니다.

유영·pulse·crawl 어종과 쓰레기도 일시적으로 옮길 수 있으나 변환 메뉴·고정 좌표 저장은 제공하지 않습니다. 고정 개체는 투명 여백을 포함한 사각 영역으로 잡을 수 있고 이동 개체는 불투명 픽셀 기준으로 입력을 판정합니다. 구현은 movement-settings.ts, aquarium-view.tsx, decoration-editor.tsx, phaser-tank.ts입니다.

서버는 place_collectible·arrange_collectible에서 소유권과 편집 제한을 검사합니다. SQL 25·46·47의 조건은 [SQL 안내](../../supabase/sql/README.md)에서 확인합니다. 임시 개체는 동일한 화면 도구를 쓰되 서버에 저장하지 않습니다.

## 검증

배경은 `tests/aquarium-background-dialog.test.tsx`와 `tests/social-sql.test.ts`, 변환·자동 저장·실패 복원은 `tests/aquarium-decoration.test.tsx`와 `tests/collectible-transforms-sql.test.ts`를 확인합니다. 렌더러 연결은 `tests/tank-inhabitants.test.tsx`, 이동·기준점은 `tests/inhabitant-motion.test.ts`, `tests/swim-motion.test.ts`, `tests/swim-frame-layout.test.ts`가 진입점입니다. 실행 예는 [시스템 지도](../system-map.md)를 확인합니다.
