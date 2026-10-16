# Repository context

- DB 작업: 먼저 `docs/systems/database-management.md`, `docs/db/CONTEXT.md`를 읽는다. 필요한 최종 함수·컬럼·RLS·권한은 `docs/db/local-schema.json`에서 찾는다. 전체 과거 SQL을 매번 읽지 않는다.
- 원격 캡처 검토는 `docs/db/REMOTE_REVIEW.md`를 확인한다. 2026-10-16 캡처에는 로컬에 없는 준비/완료 낚시와 편집 RPC가 있으며 기존 cast_fishing은 원격에서 차단된다. 로컬 검증 성공을 원격 호환성으로 해석하지 않는다.
- `docs/db/*`는 migrations를 로컬 PGlite로 재생한 **기대 상태**다. 실제 원격 상태나 적용 완료의 증거로 표현하지 않는다. `supabase/inspection/remote/comparison.json`이 없으면 원격 상태는 미확인이다. 있어도 프로젝트·캡처 시각·migrationHash·검사 범위를 확인한다.
- `supabase/sql/01-*`~`38-*`와 최초 baseline은 동결된 과거 이력이다. 수정·재실행 지시·새 번호 폴더 추가를 하지 않는다. 신규 변경은 Supabase CLI `migration new`로 생성한다. DB 작업은 Supabase/Postgres 스킬을 따른다.
- 현재 카탈로그 원본은 `supabase/catalog/catalog.json`. 카탈로그 변경은 원본 편집 → `db:catalog`로 빈 CLI migration에 SQL 생성 → 검토·검증 순서다. 파일 삭제를 종/플레이어 데이터 삭제로 해석하지 않는다. 퇴역은 별도 migration으로 명시한다.
- `npm run db:verify`는 동결 이력·baseline·최신 migration·카탈로그·스냅샷 일치를 검사한다. 변경 후 `npm run db:context`로 파생 문서를 갱신한다. 카탈로그 변경이 migration에 없으면 생성도 실패한다.
- `src/lib/database.types.ts`는 앱용 수기 계약이다. 전체 DB 스키마로 취급하지 않는다. 원격 타입 생성본으로 바로 덮어쓰지 않는다.
- 오래된 기능 문서의 SQL 실행 안내보다 DB 관리 문서를 우선한다. 원격 DB와 로컬 이력이 다르면 먼저 차이를 보고하며, baseline 재실행·이력 repair·원격 reset을 자동으로 하지 않는다.
