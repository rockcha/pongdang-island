# 섬 메뉴와 페이지

헤더의 햄버거 버튼으로 왼쪽 shadcn Sheet를 엽니다. 메뉴 선택 시 자동으로 닫고 현재 경로를 표시합니다. 배경 클릭/닫기/Escape, 포커스 처리는 Sheet의 Dialog 기능을 사용합니다. 메뉴에는 로그인 사용자의 아바타와 닉네임, 우체통의 전체 안 읽은 개수를 표시합니다.

| 메뉴 | 경로 | 화면 |
| --- | --- | --- |
| 퐁당마을 | `/` | 메인 허브, 선착장·아쿠아리움·우체통 바로가기 |
| 아쿠아리움 | `/aquarium` | 기본 수조 화면, 수집 기능 준비 안내 |
| 선착장 | `/harbor` | 항해 공간 기본 화면, 항해 기능 준비 안내 |
| 우체통 | `/notifications` | 기존 친구/일반 Realtime 알림함 |
| 마이페이지 | `/profile` | 아바타 수정·복원, 닉네임 수정 페이지 연결, 로그아웃 |
| 만남의 등대 | `/friends` | 친구·요청·친구 찾기, 확인창을 통한 친구 끊기 |

로그인 및 닉네임 설정을 마친 사용자에게 제공됩니다. 기존 `/notifications`, `/profile` 주소는 유지합니다. 아쿠아리움·항해는 아직 게임 로직이나 데이터 저장을 구현하지 않은 기본 페이지입니다.

## 코드

- `src/components/island-navigation.tsx`: 메뉴 정의, 선택 상태, 닫힘 처리, 안 읽은 개수
- `src/components/ui/sheet.tsx`: shadcn 왼쪽 drawer
- `src/layouts/app-layout.tsx`: 햄버거 버튼, 헤더 우체통/마이페이지
- `src/routes.tsx`: 페이지 라우팅과 인증 가드
- `src/pages/home-page.tsx`: 퐁당마을
- `src/pages/aquarium-page.tsx`, `harbor-page.tsx`: 새 기본 화면
- `src/features/notifications/notifications-page.tsx`: 우체통
- `src/features/profile/profile-page.tsx`: 마이페이지
- `tests/island-navigation.test.tsx`: 열기, 왼쪽 위치, 활성 경로, 배지, 선택 후 이동/닫힘

새 메뉴는 islandNavigation 배열과 routes.tsx를 함께 수정합니다. 친구 끊기는 07-friend-removal SQL을 추가 실행해야 합니다.

섬 상점(/shop): 구매·판매·테스트 골드 충전. [골드 시스템](gold-shop.md).

아쿠아리움은 기본 배경과 구매 배경 3종의 구매·장착을 제공합니다. 물고기 수집은 준비 중입니다. [설치/업로드](aquarium.md).

선착장: 지도 열기 모달에서 지역 5개를 넘겨볼 수 있습니다. [지역 시스템](regions.md).
