# 퐁이의 홀짝 조개

분류는 운(`luck`), 보상 방식은 즉시 지급형입니다. 주간 정산·랭킹 보상과 분리합니다. 무료 연습에서는 가상 금액만 사용하며 지갑·실전 기록을 변경하지 않습니다. `/arcade/odd-even`에 서버 실전 및 로컬 연습 엔진을 구현했습니다.

## 연출과 화면

퐁이가 큰 조개 안에 진주를 숨기고 플레이어는 홀·짝을 고릅니다. 시작·재도전 시 별도 2×2 섞기 시트 4프레임을 순환하며 1.2초 동안 닫힌 조개를 섞고, 열기 시트의 첫 프레임(닫힌 조개)으로 질문합니다. 섞는 동안 입력을 막습니다. 답 제출 후 서버 응답을 기다리는 동안 닫힌 조개를 유지하고, 응답 후 별도 2×2 열기 시트 4프레임을 720ms 동안 순서대로 재생합니다. 마지막 프레임의 빈 조개 위에 실제 진주 개수를 표시합니다. 금액 변화와 정오답 색상도 열기 이후에 공개합니다. 정답은 초록빛, 오답은 코랄빛 효과를 사용하며 모션 감소 설정에서는 연출을 생략합니다. 포스터는 게임 목록과 시작 오버레이에서 사용하며 배너 오른쪽에는 넣지 않습니다.

게임 보드에는 현재 확보 금액·다음 성공 시 금액·홀/짝 선택을 명확하게 표시합니다. 홀·짝 버튼 옆 숫자, 실전·연습 상태 줄, 연속 성공·최대 횟수 문구는 표시하지 않습니다. 성공 후에는 **보상 받기 / 묻고 더블로 가 !**를 표시합니다. 보상 받기는 확보한 금액을 지갑에 즉시 지급하고 종료합니다. 재도전은 확보 금액 전체를 다음 문제에 걸며, 실패하면 그 판의 확보 금액이 0이 됩니다. 지갑에서 재도전 비용을 중복 차감하지 않습니다. 서버 한도에 도달하면 최대 안내 문구나 비활성 도전 버튼을 두지 않고 수령 버튼만 남깁니다.

현재 스프라이트는 `public/arcade/odd-even/pongi-mix-sprite.png`와 `pongi-open-sprite.png`, 최종 프롬프트와 원본 경로는 `assets/references/odd-even-detailed-sprites-manifest.json`입니다. 이전 통합 시트는 생성 이력으로 보존하고 실행 화면에서는 참조하지 않습니다. 셀 단위 배경 위치로 재생하며 원본을 자르거나 프레임별로 확대하지 않습니다. 진주는 CSS로 서버 결과 수만큼 올려 이미지에 고정된 진주가 정답과 달라지는 문제를 방지합니다.

## 확정 금액 규칙

사용자 확정: **10골드가 첫 베팅금**입니다. 별도 참가비나 추가 베팅금 입력은 없습니다.

시작 시 10골드만 차감하고 성공할 때마다 20→40→80→160… 확보합니다. 재도전에서는 지갑에서 추가 차감하지 않습니다. 운영 한도는 20회 연속 성공(10,485,760골드)이며 이때 수령만 가능합니다. 일일 횟수 제한은 없습니다. 20골드 수령은 원금 포함 총 지급액으로 첫 판 순이익은 10골드입니다.

회차당 성공 확률은 50%이며 서버에서 진주 1~10개를 균등 추첨합니다. 진주는 답을 제출할 때 생성하므로 선택 전에 정답 정보가 없습니다. 무료 연습도 같은 규칙입니다. 랭킹은 실전에서 실제 수령한 개인 최고 금액이며 동점은 먼저 수령한 순서입니다. 수령 전 확보 금액·실패·연습은 제외합니다. 20개씩 더 보기를 지원하고 1~3등을 강조합니다. 랭킹 보상과 주간 정산은 없습니다. 다른 플레이어 행에는 친구 요청 아이콘을 표시하고 기존 `send_friend_request` API를 사용합니다. 본인에게는 버튼을 표시하지 않으며 이미 친구·요청 중인 관계는 비활성화합니다. 서버에서 관계 상태를 조회하고 클라이언트 중복 클릭을 막으며 요청 후 공통 소셜 상태를 갱신합니다.

## 서버와 배포

`20261016124501_odd_even_arcade.sql`이 `odd_even_runs`, 실전 RPC와 랭킹 RPC를 추가합니다. 테이블 직접 접근과 내부 응답 함수는 차단하며 인증된 RPC로만 진행합니다. 모든 변경은 기존 지갑을 먼저 잠그고 진행 행을 잠급니다. 시작 UUID·회차 번호·종료 상태·별도 지급 거래 UUID로 재시도 중복을 막습니다. 수령 실패 시 트랜잭션이 취소되어 확보 금액은 유지됩니다. 다른 사용자 진행에는 접근할 수 없습니다.

이 migration은 로컬에서 검증했습니다. 원격 SQL 적용은 별도이며 Storage/Data API 키만으로 새 테이블·함수를 만들 수 없습니다. 기존 baseline은 실행하지 말고 원격 현재 상태를 확인한 뒤 신규 migration만 적용합니다.

`20261016131521_odd_even_rank_friends.sql`은 기존 수령액 정렬을 유지하면서 랭킹에 친구 코드·관계 상태를 추가합니다. 최초 홀짝 migration 이후 적용합니다. 신규 친구 요청 RPC나 별도의 친구 테이블은 만들지 않습니다.

실전 추첨·배팅·결과·수령은 서버가 처리하고 요청 재전송으로 차감·지급이 반복되지 않아야 합니다. 성공 직후 아직 받지 않은 금액은 서버에 보관해 재접속 시 복구합니다. 페이지 이탈 확인 모달과 새로고침 경고는 기존 게임 컨벤션을 따릅니다.

## Pearl reveal and frame stabilization

Pearls appear during opening, starting at 360ms (the third opening frame), staggered by 22ms with a short falling/bounce motion. They remain mounted when the scene changes to result, so opening does not replay their animation. Results and wallet amounts still wait for the opening to finish.

Both 627px-cell sheets use per-frame translation offsets measured from the eye/nose centers, aligned to (330,199). No per-frame scaling or image edits are used. The pearl overlay follows the corrected final bowl position. The artificial waiting bob was removed; only the hands and clam poses provide movement. Reduced-motion settings skip animation.

상단의 다음 성공 금액 안내는 결과·수령 상태에서도 한 줄 높이를 유지합니다. 문구가 사라질 때 퐁이 영역의 높이와 중심이 바뀌지 않도록 합니다.
