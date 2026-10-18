# 원격 DB 조회 요약

## 근거와 범위

2026-10-18 대화에서 Supabase MCP로 읽기 전용 조회했다. DB가 반환한 첫 조회 시각은 2026-10-18 08:10:24 KST (2026-10-17T23:10:24Z), database는 postgres, PostgreSQL은 17.11이다. 대상 프로젝트 식별자는 독립 검증하지 않았으므로 아래 결과는 이 세션의 MCP 연결 DB에 한정한다.

전체 schema export나 최신 migrations와의 자동 비교를 수행한 결과가 아니다. 기존 comparison.json을 이번 조회 결과로 갱신하지 않았다. 로컬 기대 상태의 migration SHA-256은 docs/db/CONTEXT.md에 기록된 144db3df07696b1aa59b3266ef63d4b84a2c2f9c071ca674ca84c2d164d92f3f이며, 이번 부분 조회로 그 해시와 원격의 동등성을 검증한 것은 아니다.

## 확인된 상태

| 항목 | 조회 결과 | 확인 한계 |
| --- | --- | --- |
| 해역 | 10개, 로컬 카탈로그의 해역 ID 목록과 일치 | 전체 컬럼 값은 대조하지 않음 |
| 퐁당 고유 5종 | 문어·복어·해마·고래·퐁이 인형 등록, native_region_id=pongdang, 서식지 수 각각 1 | 판매가·설명·유영 값과 서식지 ID 전체는 미대조 |
| 공통 신화 5종 | 수평선고래·이름먹는 소라·오르페온·별을 삼킨 제사장·신탁의 삼면어 등록, native_region_id=null, 서식지 수 각각 10 | 전체 패치 실행 사실이나 실행 시점의 증거는 아님 |
| 이미지 경로 | 이번 10종의 thumbnail_path와 sprite_sheet_path 조회 | 실제 Storage 파일·공개 URL은 이번에 검증하지 않음 |
| 고철섬 | scrapisle 해역과 native_region_id=scrapisle인 26종 존재 | 지도·낚싯대·확률 함수 등 설치 SQL 전체는 미대조 |
| 주요 RPC | prepare_fishing, finish_fishing, cast_fishing, arrange_collectible, notice_save, auction_state, feed_friend_aquarium, clean_friend_aquarium 존재 | public/app_private 시그니처와 authenticated EXECUTE 확인. 본문·내부 인가·게임 실행은 미검증 |
| 앱 테이블 RLS | 조회한 public/app_private 일반 테이블 42개 모두 활성화 | 정책의 적절성이나 전체 권한 안전성을 보증하지 않음 |
| 희귀 쓰레기 제약 | collectible_nonfish_common 이름의 제약 없음 | 다른 제약 전체는 미검토 |
| migration 이력 | MCP list_migrations 결과 빈 목록 | 기능 미설치를 뜻하지 않음. 로컬 이력과 원격 적용 이력 일치도 증명하지 않음 |

현재 fishing-panel.tsx는 prepareFishing과 finishFishing을 호출하고 api.ts에 해당 RPC 호출이 있다. 따라서 10월 16일 기록의 “앱이 cast_fishing만 사용하는 경로”를 현재 앱의 설명으로 사용하면 안 된다. cast_fishing 호출 함수 자체는 api.ts에 남아 있다. 실제 낚시 동작과 전체 호환성은 별도 검증이 필요하다.

## 문서와 SQL 관리 기준

- [10월 16일 전체 구조 검토](../history/remote-review-20261016.md)는 당시 비교 기록으로 보존한다.
- 퐁당 설치 SQL은 확인된 등록 상태의 참고 패치로 보관한다. 전체 migration 적용 완료라고 표시하지 않는다.
- 고철섬 SQL은 일부 등록 확인 상태다. 전체 패치 대조 전에는 완료·미적용을 단정하지 않는다.
- 로컬 생성 문서는 계속 로컬 기대 상태로 관리한다. 원격에 맞춘다는 이유로 수기 덮어쓰기하지 않는다.
- 다음 DB 정합성 작업은 프로젝트 식별 → 최신 전체 export → db:remote 비교 → 차이 검토 순서다. baseline 재실행·migration repair·원격 reset은 자동 수행하지 않는다.

이번 조회와 문서 정리에서 원격 데이터·스키마·migration history는 변경하지 않았다. Auth 설정·Storage 실제 파일·런타임 플래그·플레이어 데이터는 조회하지 않았다.
