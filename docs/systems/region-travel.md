# 지역 잠금 테스트와 출항/도착

## 적용
기존 01~11 적용 후 `supabase/sql/12-region-travel/01-travel.sql`을 추가 실행합니다. 원격 SQL 적용은 이 작업에서 하지 않았습니다. 퐁이 출항 스프라이트는 `public/sprites/pongi-sailing.png`에 포함하므로 별도 Storage 업로드가 필요 없습니다. 지역 이미지는 기존 `regions` 버킷을 사용합니다.

## 흐름
- 선착장 지도에서 지역별 `테스트: 지역 잠금 해제/잠그기`로 본인의 지도 조각을 추가/제거합니다.
- 앞바다는 항상 열려 있으며 잠글 수 없습니다. 현재 지역을 잠그면 DB 현재 위치도 앞바다로 복귀합니다. 다른 사용자 상태는 변경하지 않습니다.
- 열린 지역 선택 → `/sailing/:regionId` → 잠금 확인 → 퐁이 뗏목 애니메이션 약 1.5초 → travel_region 서버 재검사/위치 저장 → `/region/:regionId` 도착 이미지.
- 예: `/sailing/coral` → `/region/coral`. 현재 지역 둘러보기는 출항 없이 도착 화면으로 이동합니다.
- 이동 전환 중 선착장으로 돌아가면 타이머를 정리합니다. 1.5초 후 요청이 이미 서버로 전송됐다면 요청 처리는 완료될 수 있습니다. 서버 응답이 늦으면 전환 화면도 더 오래 유지합니다. 실패 시 도착 페이지로 보내지 않고 재시도를 제공합니다.
- 직접 `/region/...`에 접근하면 지역 존재·잠금·서버 현재 위치를 확인합니다. 미도착 지역은 출항 링크, 잠긴 지역은 안내만 제공합니다. 도착 확인 없이 직접 위치를 바꾸지 않습니다.

## 코드
- `src/pages/harbor-page.tsx`: 지도, 테스트 잠금 버튼, 출항 링크.
- `src/features/regions/sailing-page.tsx`: SAILING_DURATION=1500, 전환 페이지, 타이머/계정 변경 정리.
- `src/features/regions/region-page.tsx`: 도착 지역 이미지/이름/설명/등급, 직접 접근 검사.
- `src/features/regions/api.ts`: setRegionTestLock, region_map, travel_region.
- `src/routes.tsx`: 인증·닉네임 가드 아래 두 경로.
- `src/index.css`: 2x2 네 프레임 노젓기, 뗏목 움직임, 진행 바. 동작 줄이기 설정에서는 애니메이션 정지.
- `public/sprites/pongi-sailing.png`: 투명 배경 스프라이트.

## 테스트 잠금 보안
일반 게임 플레이용 무료 해제 기능이 아니라 개발 테스트용입니다. 관리자 권한을 가정하지 않으며, 현재 설정이 켜져 있으면 로그인한 누구나 **본인 계정**의 지역 잠금을 변경할 수 있습니다. 실제 지도 조각 보유 테이블을 수정합니다.

운영 전에 DB 관리자 SQL로 기능을 끕니다. UI 숨김과 RPC 서버 차단에 함께 반영됩니다.
```sql
update app_private.region_settings set test_lock_controls=false where id=true;
```
이미 테스트로 지급한 지도 조각은 스위치 종료로 자동 회수하지 않습니다. 정식 획득 방법은 추후 연결합니다.
`set_region_test_lock`는 auth.uid만 사용하고 사용자 ID를 입력받지 않습니다. private DEFINER + public INVOKER, PUBLIC/anon 실행 금지, 설정 테이블 접근 금지. 잠금 변경과 이동은 계정별 advisory lock으로 직렬화합니다. 기존 테이블 직접 쓰기는 계속 차단합니다.

## 검증
`tests/sailing.test.tsx`: 1.5초 전 이동 호출 없음, 완료 후 URL 변경, 잠긴 경로 차단, 언마운트 타이머 정리.
`tests/social-sql.test.ts`: 본인 잠금 토글, 타 사용자 격리, 현재 지역 잠금 시 복귀, 기본 지역 보호, 테스트 기능 종료, 미인증 차단.

## 이미지 제작
built-in image_gen. 사용자 제공 Downloads/pongi.png를 퐁이 정체성 참고로 사용. 따뜻한 갈색 해달, 크림색 얼굴/배, 별 머리핀, 목재 뗏목과 노. 2x2 네 프레임 노젓기, 동일 카메라/크기, 투명 배경, 각 셀 안쪽 여백, 글자 없음. 참고 이미지 자체나 기존 메인 로고는 교체하지 않습니다.

## 랜덤 출항 장면
출항/재시도마다 `sailing-scenes.ts`에서 세 장면을 같은 확률로 선택하고 useState 초기화로 항해 중 선택을 고정합니다.
- public/sprites/pongi-sailing.png: 뗏목 노젓기
- public/sprites/pongi-telescope.png: 돛단배에서 망원경 보기
- public/sprites/pongi-shell-map.png: 조개 배에서 지도 펼쳐 보기
장면별 접근성 이름과 작은 안내 문구도 함께 바뀝니다. 1.5초 이동과 서버 검사 흐름은 동일합니다. SQL/Storage 추가 적용은 없습니다. `tests/sailing-scenes.test.ts`에서 각 선택 구간을 검증합니다.
새 스프라이트는 built-in image_gen으로 기존 퐁이 시트를 정체성과 스타일 참고로 삼아 생성했습니다. 공통 프롬프트: 투명 배경, 2x2 동일 크기 4프레임, 동일 카메라·배 기준점, 각 셀 안쪽 충분한 여백, 따뜻한 갈색 해달·크림색 배·별 머리핀. 망원경 버전은 작은 돛단배에서 바라보는 방향 변화, 조개 배 버전은 지도 읽기·고개 기울이기·가리키기 동작입니다.

## 출항 프레임 위치 보정
세 시트 모두1254×1254, 셀627×627. 노/물방울을 포함한 전체 외곽 대신 배 중앙 하단의 넓은 불투명 영역으로 바닥을 측정했습니다.
- 뗏목 기준 y: 545,545,512,516 → 모두545로 정렬.
- 망원경 돛단배 기준 y: 573,574,555,557 → 모두573.
- 지도 조개 배 기준 y: 568,568,532,532 → 모두568.
프레임별 좌측 기준점도 맞췄습니다. sailing-page의 data-scene과 index.css의 pongi-sailing-* 키프레임이 background-position을 보정합니다. 요소 자체의 위치 이동 없이 step-end로 프레임만 교체합니다. 항로 조회 전후에는 진행 바 공간을 미리 확보해 화면 중앙 배치가 밀리지 않도록 했습니다. 원본 그림의 배 윤곽 차이는 남으며, 이미지 교체 시 좌표를 다시 측정해야 합니다.
