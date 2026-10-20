# DB 관리와 컨텍스트

## 작업 시 원격 확인

DB·RPC·권한·카탈로그 변경과 실제 데이터·적용 여부에 관련된 오류는 대상 프로젝트와 관련 원격 상태를 읽기 전용으로 먼저 확인합니다. 원격 적용 뒤에는 해당 결과를 재조회합니다. UI·스타일·이미지 작업은 DB와 관련 있을 때만 조회합니다.

MCP 또는 읽기 전용 export로 필요한 범위만 확인합니다. 연결이나 프로젝트 식별이 불확실하면 그 한계를 밝히고, 독립적인 로컬 조사·검증만 진행합니다. 부분 조회·로컬 검증·과거 캡처를 전체 원격 호환성의 증거로 사용하지 않습니다.

일상 조회마다 보고서를 만들지 않습니다. 배포·장애 조사·중요한 차이 추적에 필요한 경우만 프로젝트·시각·범위·미확인 항목을 기록합니다. 원격 조회는 migrations와 로컬 검증을 대체하지 않습니다.

## 근거의 구분

| 질문 | 먼저 볼 근거 | 한계 |
| --- | --- | --- |
| 코드가 기대하는 현재 테이블·함수는? | [생성된 컨텍스트](../db/CONTEXT.md), [전체 정의](../db/local-schema.json) | 로컬 migration 재생 결과. 원격 상태 아님 |
| 무엇을 어떤 순서로 배포하나? | `supabase/migrations/`, CLI migration list | 실제 원격 history는 연결해서 조회해야 함 |
| 어떤 종·가격·서식지가 기준인가? | `supabase/catalog/catalog.json` | 원격 카탈로그와 자동 동기화되지 않음 |
| 앱이 실제로 호출하는 API는? | `src/features/*/api.ts`, `src/lib/database.types.ts` | 수기 타입은 일부 테이블만 표현 |
| 실제 원격 구조는? | 아래 읽기 전용 export와 비교 결과 | 캡처 시점의 메타데이터. 프로젝트 확인 필요 |

2026-10-16 전환 시점: 로컬 전체 재생은 검증했다. **실제 원격 적용 상태는 미확인이다.** 저장소 문서의 과거 “미적용” 문장은 특정 작업 당시 기록이며 지금도 미적용이라는 근거가 아니다.

2026-10-16 전체 구조 비교는 당시 기록으로 보존했다. 2026-10-18 MCP 부분 조회에서 퐁당 10종·고철섬 26종 및 주요 RPC의 존재를 확인했고 migration 이력 조회는 빈 목록이었다. 현재 앱은 낚시 준비·완료 RPC를 호출한다. 확인 범위와 남은 차이는 [원격 조회 요약](../db/REMOTE_REVIEW.md)을 따른다. 전체 구조·배포 이력의 동등성은 아직 검증하지 않았다.

## 기존 프로젝트의 전환

`supabase/sql/01-*`~`38-*`는 삭제하지 않고 동결했다. 테스트·기존 링크가 사용한다. `supabase/legacy-manifest.json`에 파일 해시와 CLI가 만든 baseline을 고정했다. baseline은 이 38개를 한 트랜잭션으로 재현하고 기존 앱 테이블이 있으면 중단한다. 과거 SQL15의 초기화까지 포함하므로 **기존 DB에는 실행하지 않는다.**

빈 새 DB는 migrations를 순서대로 적용한다. 기존 DB는 다음 절차를 거친다.

1. Dashboard의 대상 프로젝트를 확인하고 아래 metadata export를 저장한다. 사용 중인 Postgres 버전과 `config.toml`의 major_version도 대조한다. 현재 로컬 설정 17은 원격 확인값이 아니다.
2. `npm run db:remote -- 내보낸파일.json`으로 비교한다. 차이가 있으면 누락·별도 수정·권한·버전 표현 차이를 검토한다. 결과는 git에서 제외한 `supabase/inspection/remote/comparison.json`에 저장된다.
3. 구조 외에 현재 카탈로그, 테스트 충전·지역 잠금 플래그, Storage 이미지·Auth 설정을 점검한다. 구조 일치만으로 데이터·배포 이력이 일치한다고 판단하지 않는다.
4. 필요하면 **그 DB의 상태에서 출발하는 변경 SQL**을 만든다. 기존 DB를 빈 DB로 만들거나 baseline 전체를 재실행하지 않는다.
5. 현재 상태가 baseline과 동등한 것으로 검토된 뒤에만 CLI history에 baseline을 적용 완료로 등록한다. `migration repair --help`로 확인 후 `supabase migration repair <baseline 파일의 timestamp> --status applied`를 사용한다. 이것은 SQL 실행이 아니라 이력 변경이다. 원격 history가 이미 있다면 기존 history와 먼저 조정한다.
6. `migration list`와 `db push --dry-run`에서 이후 변경만 예정되는지 확인한 뒤 배포한다.

이 저장소 정비는 원격 연결·repair·배포를 수행하지 않았다. MCP는 필수가 아니다. Dashboard export + 로컬 비교로 구조를 확인할 수 있고, CLI는 연결된 환경에서 배포 이력을 관리한다.

## MCP 없는 원격 확인

Dashboard SQL Editor에서 [schema.sql](../../supabase/inspection/schema.sql) 전체를 **DB 소유자 권한으로 읽기 전용 실행**하고 결과를 JSON으로 내보낸다. 플레이어 행·이메일·토큰을 조회하지 않는다. 이 결과에는 함수 코드와 스키마가 포함되므로 공개 게시하지 않는다.

```powershell
npm.cmd run db:remote -- C:\경로\schema-export.json
```

출력의 `capturedAt`, `serverVersion`, `migrationHash`, `changedSections`를 확인한다. 비교는 매번 최신 migrations를 재생한다. 차이가 있으면 종료 코드 1이며 자동 수정하지 않는다. JSON 단일 객체와 SQL Editor의 `[{"snapshot": {...}}]` 형식을 받는다.

검사 범위: 앱 테이블·컬럼·제약·인덱스·함수 본문·트리거·enum·뷰 정의와 옵션·시퀀스 정의·RLS·앱 테이블/컬럼/함수/스키마 권한·아바타 및 공지 이미지 Storage 정책·Realtime publication·5개 버킷 설정. 공개 스키마의 추가 앱 객체도 차이로 표시한다. 플랫폼 extension 함수는 제외한다. 다른 Postgres 버전/기본 권한 때문에 차이가 날 수 있어 사람이 검토한다.

검사하지 않는 것: 사용자 데이터, 카탈로그 행, 런타임 플래그, 실제 Storage 파일, Dashboard Auth/Data API 설정, 실제 Realtime 전달, 플랫폼 소유 스키마 전체, migration history. export의 DB 이름 `postgres`는 프로젝트 식별자가 아니다. Dashboard 대상 프로젝트를 별도로 확인한다. 오래된 export를 현재 상태로 단정하지 않는다.

## 새 변경과 카탈로그

Supabase CLI를 설치한 환경에서 먼저 `supabase --help`, `supabase migration new --help`로 명령을 확인한다. 로컬 개발에는 Docker 기반 Supabase가 필요하고, 빠른 구조 검증은 이미 설치된 PGlite를 사용한다. 이번 초기화에는 캐시의 CLI 2.39.2를 사용했다. 최신 CLI로 업그레이드할 때 config 호환성을 확인한다.

구조·권한·RPC 변경은 CLI로 새 migration 파일을 만든 후 변경 SQL을 작성한다. 적용된 과거 파일을 수정하지 않는다. 최종 함수 정의는 명시하고 기존 함수 본문을 문자열 치환하지 않는다.

카탈로그 변경:

원격에만 남아 있는 기존 종의 가격만 조정해야 할 때는 카탈로그의 `retained_species_prices`에 ID와 판매가를 선언합니다. 이 목록은 존재하는 행의 가격만 갱신하며 종을 새로 만들거나 다른 속성·서식지·보유 데이터를 바꾸지 않습니다. 로컬 검증은 해당 행이 존재하면 실제 가격을 대조하고, 없는 종의 정의는 복원하지 않습니다. 신규 종 등록이나 퇴역을 이 목록으로 대신하지 않습니다.

```powershell
# 1. supabase/catalog/catalog.json에서 필요한 항목만 수정
supabase migration new update_collectible_catalog
# 2. 방금 CLI가 만든 실제 파일 경로를 사용
npm.cmd run db:catalog -- supabase/migrations/<timestamp>_update_collectible_catalog.sql
npm.cmd run db:context
npm.cmd run db:verify
```

생성기는 비어 있는 CLI migration만 채우며 기존 SQL은 덮어쓰지 않는다. ID를 유지한 UPSERT와 관리 종의 서식지 갱신만 생성한다. 종·보유 개체·지갑을 삭제하지 않는다. 기준 파일에서 종을 지웠다고 DB의 종이 삭제되지는 않으며, 검증에서 불일치를 알린다. 종 퇴역·ID 변경·기존 선물 snapshot 변경·unique 값 맞교환 등은 별도 설계와 migration이 필요하다. 매 변경의 생성 SQL을 반드시 검토한다.

일부 상품 카탈로그만 변경할 때는 생성 명령 뒤에 `--table harbor_vessels`처럼 관리 테이블을 지정할 수 있다. 이 경우 해당 카탈로그의 UPSERT만 생성하고 다른 카탈로그나 개체 서식지는 건드리지 않는다. 전체 기대 상태의 일치는 기존 `db:verify`로 계속 검사한다.

`seed.sql` 자동 실행은 꺼 두었다. 운영 카탈로그는 migration으로 배포하고, 개발용 가짜 플레이어 seed와 섞지 않는다. 최초 baseline에는 역사 재현용 데이터가 있지만 이후 기준은 catalog.json이며 검증으로 두 경로의 불일치를 막는다.

## 검증과 읽기 효율

```powershell
npm.cmd run db:verify
npm.cmd test -- tests/social-sql.test.ts tests/native-collectibles-sql.test.ts tests/regional-fishing-sql.test.ts tests/collectible-movement-sql.test.ts
```

`db:verify`는 동결 파일 변경·baseline 동등성·전체 migration 재생·RLS·공개 RPC invoker·카탈로그 일치·반복 적용 시 개체/지갑 보존·생성 문서 최신성을 검사한다. Supabase Auth/Storage는 최소 모사하므로 실제 서비스 검증을 대체하지 않는다. 원격 타입도 자동 검증하지 않는다.

`.github/workflows/database.yml`은 push/PR에서 같은 검증과 SQL 테스트 4개 묶음을 실행한다. 과거 SQL의 해시는 Windows CRLF와 CI의 LF 차이만 정규화한다. Vitest는 `.env`를 읽지 않도록 설정하여 실제 계정 정보와 무관하게 실행한다.

작업 시작 시 짧은 CONTEXT → 필요한 함수/테이블만 JSON에서 검색 → 관련 앱 코드 → 변경 migration 순서로 읽는다. 과거 변환 경위를 알아야 할 때만 legacy SQL을 읽는다. 기능 문서는 게임 동작을 설명하고 DB 설치 순서의 기준으로 사용하지 않는다. `database.types.ts`는 수기 앱 계약이므로 원격에서 생성한 타입은 별도 파일로 비교하고 필요한 도메인 타입과 구분해서 도입한다.

공식 근거: [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [CLI](https://supabase.com/docs/reference/cli/introduction).
