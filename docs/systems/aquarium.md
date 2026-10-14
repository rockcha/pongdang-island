# 아쿠아리움 배경

## 적용과 이미지 업로드
1. 기존 01~08 SQL 다음에 `supabase/sql/09-aquarium/01-backgrounds.sql` 실행.
2. Supabase Storage의 public 버킷 `aquarium-backgrounds` 확인(SQL에서 생성).
3. `assets/storage-upload/aquarium-backgrounds/`의 아래 PNG를 버킷 루트에 같은 이름으로 업로드. 추가 하위 폴더를 만들지 않습니다.

| 파일 | 배경 | 골드 |
| --- | --- | --- |
| default.png | 맑은 물빛 | 기본 무료 |
| coral.png | 산호 정원 | 100 |
| moon.png | 달빛 바다 | 300 |
| pearl.png | 진주 동굴 | 500 |

업로드는 관리자 Dashboard에서 수행합니다. 일반 사용자에게 이미지 쓰기 권한은 부여하지 않습니다. 이미지가 없거나 실패하면 대체 화면을 표시합니다. 원격 SQL과 Storage 업로드는 이 작업에서 수행하지 않았습니다.

## 코드와 DB
- `src/pages/aquarium-page.tsx`: 수조 배경, 배경 구매·장착, 업로드 누락 대체 화면.
- `src/features/aquarium/api.ts`: Storage public URL, 상태와 장착 RPC.
- `src/features/gold/api.ts`: background: 접두사의 구매를 아쿠아리움 RPC로 전달. 기존 GoldProvider의 중복 방지·골드 효과·헤더 갱신 재사용.
- `public.aquarium_backgrounds`: 서버 기준 이름/가격/Storage 경로 카탈로그.
- `public.player_aquariums`: 사용자당 현재 배경.
- `public.owned_aquarium_backgrounds`: 사용자/배경 고유 보유 기록. 기본 배경은 항상 무료 사용.
- `aquarium_state`: 상태와 카탈로그 조회.
- `aquarium_background`: buy는 지갑 잠금 후 보유 기록·골드 차감·gold_transactions를 원자적으로 처리. equip은 보유 검사 후 무료 변경. 금액은 클라이언트에서 받지 않습니다.

보유한 배경은 재구매 불가. 같은 operation_id 재요청은 추가 차감하지 않습니다. 일반 사용자는 테이블 읽기만 가능하고 개인 테이블은 본인만 읽습니다. 이미지가 공개되어도 장착 권한은 DB에서 검증합니다. 구매 후 적용하기를 눌러 장착합니다. 물고기 수집/전시는 아직 구현하지 않았습니다.

## 생성 이미지
built-in image_gen 사용, 3:2 카툰 수중 배경, 중앙은 미래 물고기 배치용 빈 공간, 글자/물고기/UI 없음. 기본은 맑은 물과 모래·해초, 산호는 파스텔 정원, 달빛은 푸른 바다와 빛나는 수초, 진주는 라벤더빛 동굴과 조개. 프로젝트 업로드 폴더에 원본 저장.

## 검증
`tests/social-sql.test.ts`: 기본 상태, 구매 차감, 중복 방지, 보유 장착, 잔액 부족, 미보유 장착 차단, 다른 사용자 보유 조회 및 직접 수정 차단.
실제 적용 후 구매 → 적용 → 기본 복원 → 새로고침으로 보유/장착 유지 확인.

다중 어항 추가: [어항 관리](aquarium-tanks.md). 10 SQL 적용 후 기본 어항과 200골드 추가 어항을 관리합니다. equip은 manage_aquarium_tank에 어항 ID를 지정합니다.

최신 세로 배경: assets/storage-upload/aquarium-backgrounds-portrait/의 PNG 4개. 기존 스타일을 참고해 9:16 구도로 재생성했습니다. Storage의 기존 aquarium-backgrounds 버킷 루트에 같은 이름으로 교체하며 SQL 변경은 없습니다. 현재 화면 표시 비율은 별도 UI 변경 대상입니다.


15 적용 후 어항은 세로 9:16 비율이며 실제 개체를 표시합니다. [유영/회전/구조물 및 첫 어항 자동 배치](collectibles.md).

기본 기포 연출: src/features/aquarium/tank-bubbles.tsx 및 tank-bubbles.css. 어항 배경 위·개체 아래 6~11px 기포 12개가 서로 다른 주기로 천천히 올라갑니다. 모션 감소 설정에서는 숨깁니다. SQL/이미지 추가 없음.
