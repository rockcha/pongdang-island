# 섬 오락실

게임을 만들거나 수정할 때 [오락실 공통 게임 UI](../design/arcade-games.md)를 먼저 읽습니다. 공통 아이콘 탭·보드 시작 오버레이·배너 보존·스크롤 제한·썸네일과 분류 태그를 두 게임에 동일하게 적용합니다.

`/arcade`에서 게임 목록을 보여주고 `/arcade/:gameId`로 이동합니다. 장소 이동은 헤더 빠른 내비게이션의 headerPlaces 항목만 사용합니다. 게임 안에 별도 목록으로 버튼을 두지 않습니다. 하위 게임에서도 오락실 배너를 유지합니다.

현재 [그림자 맞추기](shadow-game.md)와 [카드 짝맞추기](memory-game.md)는 10골드 참가·서버 판정·기록 및 무료 연습모드를 구현했습니다. [퐁이의 홀짝 조개](../design/odd-even-game.md)는 첫 베팅금 10골드, 즉시 수령형 보상과 무료 연습을 구현했습니다. 나머지 게임 2개는 준비 중 예시입니다. 게임별 서버 기능은 각 시스템 문서를 따릅니다.

## 게임 추가

`src/features/arcade/games.ts`의 arcadeGames에 고유 id, title, description, icon, status를 추가합니다. 게임 구현 컴포넌트를 component에 연결하고 status를 ready로 바꾸면 상세 페이지에 렌더링됩니다. 큰 게임은 별도 폴더와 React.lazy로 분리할 수 있습니다. rewardMode는 settlement(정산형) 또는 instant(즉시 지급형)이며 메타데이터만으로 실제 보상 지급을 실행하지 않습니다.

entryFee: 생략은 미정, null 또는 0은 무료, 양수는 골드 참가비입니다. dailyLimit: 생략은 미정, null은 무제한, 양수는 하루 참가 한도입니다. 공통 설정은 안내 메타데이터입니다. 실제 차감·횟수 판정은 각 게임 서버가 검증해야 하며 그림자 맞추기는 서버에서 10골드를 차감합니다.

유료 게임 구현 시 클라이언트 설정으로 돈을 차감하지 않습니다. 서버가 가격·일일 기준 시각·참가 한도·보상·재시도 중복 방지를 검증하는 참가/완료 API를 별도로 설계해야 합니다. 그림자 맞추기의 DB 변경과 적용 상태는 해당 문서를 확인합니다.

배너: public/banners/arcade.png. 생성 프롬프트는 assets/references/arcade-banner-manifest.json에 기록합니다.
