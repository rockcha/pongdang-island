# 그림자 맞추기

화면은 [오락실 공통 게임 UI](../design/arcade-games.md)를 따릅니다. 게임 플레이 / 랭킹 아이콘 탭, 보드 위 실전 시작(10골드)·연습 시작 오버레이를 사용합니다. 게임은 스크롤하지 않고 배너 전체 그림을 유지하며 랭킹 패널만 스크롤합니다. 분류 태그는 추리력입니다.

정오답은 긴 멘트 대신 이미지 영역의 색으로 표현합니다. 정답은 연한 초록 배경과 은은한 빛, 오답·시간 초과는 연한 붉은 배경과 2px 이내의 짧은 흔들림을 사용합니다. 정답 이름과 체크/엑스 아이콘을 이미지 위에 표시합니다. 마지막 문제도 이미지를 확인한 뒤 결과 보기로 넘어가며 모션 감소 설정에서는 효과를 생략합니다.

경로 `/arcade/shadow`. 등록은 `src/features/arcade/games.ts`, 화면은 `shadow-game.tsx`, RPC 계약은 `shadow-api.ts`입니다.

- 시작 10골드, 일일 제한 없음. 진행 중 게임 재접속은 추가 차감 없음.
- 지도 제외 물고기·쓰레기·장식물에서 이름이 서로 다른 4종을 선택합니다. 한 개체의 검은 썸네일 그림자를 보고 이름을 고릅니다.
- 일반모드는 문제당 서버 기준 8초, 정답당 1점, 최대 100점입니다. 오답·시간 초과는 찬스 1회 차감. 찬스 3회 소진 또는 100점 달성 시 종료합니다.
- 무료 연습모드는 같은 규칙을 브라우저에서 진행합니다. 참가비 차감·게임 시작/답변 RPC·서버 기록 저장을 하지 않습니다. 새로고침하면 연습 진행은 사라집니다. 문제 풀 읽기와 일반 순위 조회만 서버에 요청합니다.
- 정답 확인 후 다음 문제를 누르면 새 제한시간이 시작됩니다. 새로고침·다른 탭에서도 시작한 문제의 시간은 흐릅니다.
- 모든 완료 기록을 점수 내림차순, 동점은 먼저 완료한 순서로 정렬합니다. 계정 최고 기록만 남기지 않습니다. 상위 3개 기록 강조, 20개씩 더 보기로 전체 기록을 표시합니다.

## 서버 적용

일반모드 100점 제한은 후속 `supabase/migrations/20261016103215_shadow_score_cap.sql`에 있습니다. 기본 게임 SQL 적용 후 이 파일을 실행합니다. 이미 완료한 과거 기록은 수정하지 않습니다. 연습모드는 이 후속 SQL 없이도 동작하지만 일반모드 점수 제한은 서버에 후속 SQL이 적용되어야 합니다.

신규 `supabase/migrations/20261016101729_shadow_guessing_arcade.sql`에 테이블·권한·함수 전체를 기록했습니다. 기존 지갑·골드 거래·개체·프로필 테이블이 있는 호환 스키마 뒤에 적용합니다. 로컬 PGlite 검증 완료이며 원격에는 미적용입니다. Storage 서비스 키는 DDL을 실행할 수 없습니다. Dashboard SQL Editor에서 이 신규 파일만 적용하거나 연결된 CLI의 migration 상태를 검토하고 배포합니다. 기존 DB에 baseline을 재실행하지 않습니다.

`shadow_game`: state/start/answer/next. operation UUID로 중복 차감 방지, 계정당 활성 게임 1개. wallet → run 순서 잠금. 문제 선택지는 서버 스냅샷으로 고정하고 클라이언트 점수·시계·찬스를 신뢰하지 않습니다. 답변·다음 문제 재시도는 기존 결과를 반환합니다. 정답은 비공개 테이블에 저장합니다.

`shadow_leaderboard`: 로그인 사용자에게 닉네임·점수·완료 시각·본인 여부·순위만 반환합니다. 이메일·사용자 UUID·비공개 정답은 노출하지 않습니다. 공개 도감과 이미지가 있어 자동 이미지 대조 도구까지 차단하는 부정행위 방지 시스템은 포함하지 않습니다.

썸네일 `public/arcade/shadow-thumbnail.png`: built-in image_gen 생성. [최종 프롬프트](../../assets/references/shadow-game-thumbnail-manifest.json).

검증: tests/shadow-game-sql.test.ts, tests/shadow-game-ui.test.tsx.

8-second server deadline migration: `supabase/migrations/20261016114524_shadow_eight_seconds.sql`. Apply after the original shadow game migration. Existing active questions retain their deadline; newly generated questions use 8 seconds.
